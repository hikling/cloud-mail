import { defineStore } from 'pinia'
import { EmailUnreadEnum } from '@/enums/email-enum.js'
import { sanitizeEmailHtml } from '@/utils/email-html.js'
import { emailDetail } from '@/request/email.js'
import { allEmailDetail } from '@/request/all-email.js'

const MAX_DETAIL_CACHE = 60
const pendingDetailRequests = new Map()
const detailCacheOrder = []

export const useEmailStore = defineStore('email', {
    state: () => ({
        deleteIds: 0,
        starScroll: null,
        emailScroll: null,
        cancelStarEmailId: 0,
        addStarEmailId: 0,
        contentData: {
            email: null,
            delType: null,
            showStar: true,
            showReply: true,
            showUnread: false
        },
        // 仅持久化轻量元数据（不存整封 HTML 正文到 localStorage），刷新详情页时按 emailId 按需拉取
        contentMeta: {
            emailId: 0,
            delType: null,
            showStar: true,
            showReply: true,
            showUnread: false,
        },
        sendScroll: null,
        detailMap: {},
        detailLoading: false,
        inboxTab: 'inbox',
        searchParams: {
            text: '',
            type: 'subject',
            startDate: '',
            endDate: '',
        },
    }),
    persist: {
        pick: ['contentMeta'],
    },
    actions: {
        setContentEmail(email, flags = {}) {
            const meta = {
                emailId: Number(email?.emailId) || 0,
                delType: flags.delType ?? this.contentData.delType,
                showStar: flags.showStar ?? this.contentData.showStar,
                showReply: flags.showReply ?? this.contentData.showReply,
                showUnread: flags.showUnread ?? this.contentData.showUnread,
            }
            this.contentData.email = email
            if ('delType' in flags) this.contentData.delType = flags.delType
            if ('showStar' in flags) this.contentData.showStar = flags.showStar
            if ('showReply' in flags) this.contentData.showReply = flags.showReply
            if ('showUnread' in flags) this.contentData.showUnread = flags.showUnread
            this.contentMeta = meta
        },
        syncContentMeta() {
            this.contentMeta = {
                emailId: Number(this.contentData.email?.emailId) || 0,
                delType: this.contentData.delType,
                showStar: this.contentData.showStar,
                showReply: this.contentData.showReply,
                showUnread: this.contentData.showUnread,
            }
        },
        setInboxTab(tab) {
            this.inboxTab = tab === 'noone' ? 'noone' : 'inbox'
        },
        setSearchParams(params) {
            this.searchParams = {
                ...this.searchParams,
                ...params,
            }
        },
        fetchList(request) {
            // 仅请求摘要列表（full=0），正文与附件改为按需单封加载，避免批量解析整页 HTML 触发 Worker 1102 资源超限
            return request(0)
        },
        cacheDetail(id, item) {
            const idx = detailCacheOrder.indexOf(id)
            if (idx > -1) {
                detailCacheOrder.splice(idx, 1)
            }
            detailCacheOrder.push(id)
            this.detailMap[id] = item
            while (detailCacheOrder.length > MAX_DETAIL_CACHE) {
                const evictId = detailCacheOrder.shift()
                if (evictId !== this.contentData.email?.emailId) {
                    delete this.detailMap[evictId]
                } else {
                    detailCacheOrder.push(evictId)
                    break
                }
            }
        },
        async loadDetail(emailId, isAllEmail = false) {
            const id = Number(emailId)
            if (!id) return null
            if (this.detailMap[id]) {
                if (this.contentData.email?.emailId === id || !this.contentData.email) {
                    this.contentData.email = this.detailMap[id]
                }
                return this.detailMap[id]
            }

            const reqKey = `${isAllEmail ? 'all' : 'user'}:${id}`
            if (pendingDetailRequests.has(reqKey)) {
                return pendingDetailRequests.get(reqKey)
            }

            this.detailLoading = true
            const req = (isAllEmail ? allEmailDetail(id) : emailDetail(id))
                .then(detail => {
                    if (detail?.emailId) {
                        this.applyFullList([detail])
                        return this.detailMap[detail.emailId]
                    }
                    return null
                })
                .finally(() => {
                    pendingDetailRequests.delete(reqKey)
                    if (pendingDetailRequests.size === 0) {
                        this.detailLoading = false
                    }
                })

            pendingDetailRequests.set(reqKey, req)
            return req
        },
        applyFullList(list) {
            if (!list?.length) return
            const currentId = this.contentData.email?.emailId || this.contentMeta.emailId
            for (const item of list) {
                if (!item?.emailId) continue
                if (item.content) item.content = sanitizeEmailHtml(item.content)
                if (!item.attList) item.attList = []
                // 完整列表可能早于「标已读」返回，避免把本地已读状态盖回未读
                const prev = this.detailMap[item.emailId]
                const keepRead = prev?.unread === EmailUnreadEnum.READ
                    || (currentId === item.emailId && this.contentData.email?.unread === EmailUnreadEnum.READ)
                if (keepRead) {
                    item.unread = EmailUnreadEnum.READ
                }
                if (currentId === item.emailId && this.contentData.email?.isStar !== undefined) {
                    item.isStar = this.contentData.email.isStar
                } else if (prev?.isStar !== undefined) {
                    item.isStar = prev.isStar
                }
                this.cacheDetail(item.emailId, item)
                if (currentId && item.emailId === currentId) {
                    this.contentData.email = item
                }
            }
        },
        toContentEmail(email) {
            const id = email?.emailId
            if (id && this.detailMap[id]) {
                return this.detailMap[id]
            }
            return {
                ...email,
                emailId: id || 0,
                content: '',
                text: '',
                attList: [],
                recipient: email?.recipient || '[]',
            }
        },
        markListRead(emailId) {
            const scrolls = [this.emailScroll, this.starScroll, this.sendScroll]
            for (const scroll of scrolls) {
                const list = scroll?.emailList
                if (!list?.length) continue
                const item = list.find(e => e.emailId === emailId)
                if (item) item.unread = EmailUnreadEnum.READ
            }
        },
        resetSession() {
            pendingDetailRequests.clear()
            detailCacheOrder.length = 0
            this.detailMap = {}
            this.detailLoading = false
            this.deleteIds = 0
            this.cancelStarEmailId = 0
            this.addStarEmailId = 0
            this.emailScroll = null
            this.starScroll = null
            this.sendScroll = null
            this.inboxTab = 'inbox'
            this.contentData = {
                email: null,
                delType: null,
                showStar: true,
                showReply: true,
                showUnread: false
            }
            this.contentMeta = {
                emailId: 0,
                delType: null,
                showStar: true,
                showReply: true,
                showUnread: false
            }
            this.searchParams = {
                text: '',
                type: 'subject',
                startDate: '',
                endDate: '',
            }
        }
    },
})
