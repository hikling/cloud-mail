<template>
  <div class="detail-page">
    <div class="header-actions">
      <div class="actions-left">
        <button type="button" class="action-pill" @click="handleBack">
          <Icon icon="lucide:arrow-left" width="16" height="16" />
        </button>
        <div class="actions-divider"></div>
        <button
          v-if="emailStore.contentData.showStar"
          type="button"
          class="action-pill"
          :class="{ starred: email.isStar }"
          @click="changeStar"
          :title="$t('star')"
        >
          <Icon :icon="email.isStar ? 'lucide:star-filled' : 'lucide:star'" width="16" height="16"/>
        </button>
        <button
          v-if="emailStore.contentData.showReply"
          v-perm="'email:send'"
          type="button"
          class="action-pill with-label"
          @click="openReply"
        >
          <Icon icon="lucide:reply" width="15" height="15" />
          <span>{{ $t('reply') }}</span>
        </button>
        <button
          v-if="emailStore.contentData.showReply"
          v-perm="'email:send'"
          type="button"
          class="action-pill with-label"
          @click="openForward"
        >
          <Icon icon="lucide:forward" width="15" height="15" />
          <span>{{ $t('forward') }}</span>
        </button>
      </div>

      <button
        v-if="canDelete"
        type="button"
        class="action-pill danger"
        @click="handleDelete"
        :title="$t('delete')"
      >
        <Icon icon="lucide:trash-2" width="16" height="16" />
      </button>
    </div>

    <el-scrollbar class="scrollbar">
      <div class="container">
        <h1 class="email-title">{{ email.subject || '(' + $t('noSubject') + ')' }}</h1>

        <div class="meta-card">
          <div class="sender-row">
            <div class="sender-avatar">
              {{ (email.name || email.sendEmail || 'M')[0]?.toUpperCase() }}
            </div>
            <div class="sender-details">
              <div class="send-name" ref="sendNameRef" :class="{ 'is-wrapped': senderWrapped }">
                <span class="send-name-title">{{ email.name }}</span>
                <span class="send-email">&lt;{{ email.sendEmail }}&gt;</span>
                <span class="sent-via" v-if="sentViaEmail">
                  <el-tooltip effect="dark" :content="$t('sentVia', { email: sentViaEmail })">
                    <span>
                      <el-tag size="small" disable-transitions>{{ $t('sentViaTag') }}</el-tag>
                    </span>
                  </el-tooltip>
                </span>
              </div>
              <div class="date">{{ formatDetailDate(email.createTime) }}</div>
            </div>
          </div>

          <div class="recipients-grid">
            <div class="recipient-row">
              <span class="meta-label">{{ $t('recipient') }}</span>
              <span class="meta-value">{{ formateReceive(email.recipient) }}</span>
            </div>
            <div class="recipient-row" v-if="ccText">
              <span class="meta-label">{{ $t('cc') }}</span>
              <span class="meta-value">{{ ccText }}</span>
            </div>
          </div>

          <el-alert v-if="email.status === 3" :closable="false" :title="toMessage(email.message)" class="email-msg" type="error" show-icon />
          <el-alert v-if="email.status === 4" :closable="false" :title="$t('complained')" class="email-msg" type="warning" show-icon />
          <el-alert v-if="email.status === 5" :closable="false" :title="$t('delayed')" class="email-msg" type="warning" show-icon />
        </div>

        <div class="body-card" :class="{ 'has-attachments': email.attList?.length > 0 }">
          <div v-if="isDetailLoading" class="detail-loading">
            <loading />
          </div>
          <el-scrollbar v-else class="htm-scrollbar">
            <ShadowHtml class="shadow-html" :html="formatImage(email.content)" v-if="email.content" />
            <pre v-else class="email-text">{{ email.text }}</pre>
          </el-scrollbar>
        </div>

        <div class="att" v-if="email.attList?.length > 0">
          <div class="att-header">
            <div class="att-title">
              <Icon icon="lucide:paperclip" width="15" height="15" />
              <span>{{ $t('attachments') }}</span>
            </div>
            <span class="att-count">{{ $t('attCount', {total: email.attList.length}) }}</span>
          </div>
          <div class="att-box">
            <div class="att-item" v-for="att in email.attList" :key="att.attId" @click="showImage(att.key)">
              <div class="att-icon">
                <Icon v-bind="getIconByName(att.filename)" />
              </div>
              <div class="att-info">
                <div class="att-name">{{ att.filename }}</div>
                <div class="att-size">{{ formatBytes(att.size) }}</div>
              </div>
              <div class="opt-icon" @click.stop>
                <button
                  v-if="isImage(att.filename)"
                  type="button"
                  class="att-action-btn"
                  @click="showImage(att.key)"
                  :aria-label="$t('preview')"
                >
                  <Icon icon="lucide:eye" width="15" height="15" />
                </button>
                <a class="att-action-btn" :href="cvtR2Url(att.key)" download>
                  <Icon icon="lucide:download" width="15" height="15"/>
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>
    </el-scrollbar>

    <el-image-viewer
      v-if="showPreview"
      :url-list="srcList"
      show-progress
      @close="showPreview = false"
    />
  </div>
</template>

<script setup>
import ShadowHtml from '@/components/shadow-html/index.vue'
import loading from '@/components/loading/index.vue'
import {computed, reactive, ref, watch, onMounted, onUnmounted, nextTick} from "vue";
import {useRouter} from 'vue-router'
import {ElMessage, ElMessageBox} from 'element-plus'
import {emailDelete, emailRead} from "@/request/email.js";
import {Icon} from "@iconify/vue";
import {useEmailStore} from "@/store/email.js";
import {useAccountStore} from "@/store/account.js";
import {formatDetailDate} from "@/utils/day.js";
import {starAdd, starCancel} from "@/request/star.js";
import {getExtName, formatBytes} from "@/utils/file-utils.js";
import {cvtR2Url,toOssDomain} from "@/utils/convert.js";
import {getIconByName} from "@/utils/icon-utils.js";
import {useSettingStore} from "@/store/setting.js";
import {allEmailDelete} from "@/request/all-email.js";
import {useUiStore} from "@/store/ui.js";
import {useI18n} from "vue-i18n";
import {hasPerm} from "@/perm/perm.js";
import {EmailUnreadEnum} from "@/enums/email-enum.js";
const { t } = useI18n()

const uiStore = useUiStore();
const settingStore = useSettingStore();
const accountStore = useAccountStore();
const emailStore = useEmailStore();
const router = useRouter()
const sendNameRef = ref(null)
const senderWrapped = ref(false)
let senderResizeObserver = null

const canDelete = computed(() =>
  emailStore.contentData.delType === 'physics' ? hasPerm('all-email:delete') : hasPerm('email:delete')
)

const showPreview = ref(false)
const srcList = reactive([])

const email = computed(() => emailStore.contentData.email || {
  emailId: 0,
  attList: [],
  content: '',
  text: '',
  recipient: '[]',
})

const ccText = computed(() => formateReceive(email.value.cc))

const sentViaEmail = computed(() => {
  const raw = String(email.value.senderEmail || '').trim()
  if (!raw) return ''
  const matched = raw.match(/<([^>]+)>/)
  const address = (matched ? matched[1] : raw).trim()
  if (!address || address.toLowerCase() === String(email.value.sendEmail || '').trim().toLowerCase()) return ''
  return address
})

watch(() => accountStore.currentAccountId, () => {
  handleBack()
})

let readRequesting = false

function contentWidth(el) {
  const range = document.createRange()
  range.selectNodeContents(el)
  const width = range.getBoundingClientRect().width
  range.detach()
  return width
}

function updateSenderWrap() {
  const root = sendNameRef.value
  if (!root) return
  const name = root.querySelector('.send-name-title')
  const mail = root.querySelector('.send-email')
  const tag = root.querySelector('.sent-via')
  if (!name || !mail) {
    senderWrapped.value = false
    return
  }
  const gap = 6
  let need = contentWidth(name) + gap + contentWidth(mail)
  if (tag) need += gap + contentWidth(tag)
  senderWrapped.value = need > root.clientWidth + 0.5
}

function tryMarkRead() {
  if (!emailStore.contentData.showUnread || readRequesting) return
  const current = email.value
  if (!current?.emailId || current.unread !== EmailUnreadEnum.UNREAD) return

  const full = emailStore.detailMap[current.emailId]
  const detailReady = !!full || !!(current.content || current.text)
  if (!detailReady) return

  readRequesting = true
  const emailId = current.emailId
  current.unread = EmailUnreadEnum.READ
  if (emailStore.detailMap[emailId]) {
    emailStore.detailMap[emailId].unread = EmailUnreadEnum.READ
  }
  emailStore.markListRead(emailId)
  emailRead([emailId]).finally(() => {
    readRequesting = false
  })
}

const isDetailLoading = computed(() => {
  const id = email.value?.emailId
  return Boolean(id && !emailStore.detailMap[id] && emailStore.detailLoading)
})

async function ensureDetailLoaded() {
  const id = email.value?.emailId
  if (!id || emailStore.detailMap[id]) return
  try {
    await emailStore.loadDetail(id, emailStore.contentData.delType === 'physics')
  } catch (e) {
    console.error(e)
  }
}

watch(
  () => email.value?.emailId,
  () => {
    void ensureDetailLoaded()
  },
  { immediate: true }
)

watch(
  () => [
    email.value?.emailId,
    email.value?.content,
    email.value?.text,
    emailStore.detailMap[email.value?.emailId]
  ],
  () => tryMarkRead(),
  { flush: 'post' }
)

watch(
  () => [email.value?.name, email.value?.sendEmail, sentViaEmail.value],
  () => nextTick(updateSenderWrap)
)

onMounted(() => {
  void ensureDetailLoaded()
  tryMarkRead()
  window.addEventListener('keydown', handleKeyDown);
  senderResizeObserver = new ResizeObserver(() => updateSenderWrap())
  if (sendNameRef.value) senderResizeObserver.observe(sendNameRef.value)
  nextTick(updateSenderWrap)
})

onUnmounted(() => {
  emailStore.contentData.showUnread = false;
  readRequesting = false
  window.removeEventListener('keydown', handleKeyDown);
  senderResizeObserver?.disconnect()
})

function handleKeyDown(event) {
  if (event.key !== 'Escape') return;
  if (showPreview.value) return;
  if (document.querySelector('.el-message-box')) return;
  const writeBox = document.querySelector('.write-box');
  if (writeBox && writeBox.offsetParent !== null) return;
  handleBack();
}

async function openReply() {
  await ensureDetailLoaded()
  uiStore.writerRef.openReply(email.value)
}

async function openForward() {
  await ensureDetailLoaded()
  uiStore.writerRef.openForward(email.value)
}

function toMessage(message) {
  return message ? JSON.parse(message).message : '';
}

function formatImage(content) {
  content = content || '';
  const domain = settingStore.settings.r2Domain;
  return content.replace(/{{domain}}/g, toOssDomain(domain) + '/');
}

function showImage(key) {
  if (!isImage(key)) return;
  const url = cvtR2Url(key)
  srcList.length = 0
  srcList.push(url)
  showPreview.value = true
}

function isImage(filename) {
  return ['png', 'jpg', 'jpeg', 'bmp', 'gif','jfif'].includes(getExtName(filename))
}

function formateReceive(recipient) {
  if (!recipient) return ''
  recipient = JSON.parse(recipient)
  return recipient.map(item => item.address).join(', ')
}

function changeStar() {
  if (email.value.isStar) {
    email.value.isStar = 0;
    starCancel(email.value.emailId).then(() => {
      email.value.isStar = 0;
      emailStore.cancelStarEmailId = email.value.emailId
      setTimeout(() => emailStore.cancelStarEmailId = 0)
      emailStore.starScroll?.deleteEmail([email.value.emailId])
    }).catch((e) => {
      console.error(e)
      email.value.isStar = 1;
    })
  } else {
    email.value.isStar = 1;
    starAdd(email.value.emailId).then(() => {
      email.value.isStar = 1;
      emailStore.addStarEmailId = email.value.emailId
      setTimeout(() => emailStore.addStarEmailId = 0)
      emailStore.starScroll?.addItem(email.value)
    }).catch((e) => {
      console.error(e)
      email.value.isStar = 0;
    })
  }
}

const handleBack = () => {
  router.back()
}

const handleDelete = () => {
  ElMessageBox.confirm(t('delEmailConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    if (emailStore.contentData.delType === 'logic') {
      emailDelete(email.value.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.value.emailId]
      })
    } else {
      allEmailDelete(email.value.emailId).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true,
        })
        emailStore.deleteIds = [email.value.emailId]
      })
    }
    router.back()
  })
}
</script>

<style scoped lang="scss">
.detail-page {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--app-canvas);
}

.header-actions {
  height: 48px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface-primary);
  backdrop-filter: blur(16px) saturate(160%);
  -webkit-backdrop-filter: blur(16px) saturate(160%);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.actions-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.actions-divider {
  width: 1px;
  height: 16px;
  background: var(--border-subtle);
  margin: 0 4px;
}

.action-pill {
  height: 30px;
  min-width: 30px;
  padding: 0 8px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease, border-color 0.14s ease, transform 0.12s ease;

  &:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  &:active {
    transform: scale(0.95);
  }

  &.with-label {
    padding: 0 10px;
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);

    &:hover {
      border-color: var(--border-strong);
    }

    @media (max-width: 480px) {
      span {
        display: none;
      }
      padding: 0 8px;
    }
  }

  &.starred {
    color: #F59E0B;
  }

  &.danger:hover {
    background: rgba(239, 68, 68, 0.1);
    color: var(--el-color-danger);
  }
}

.scrollbar {
  flex: 1;
  min-height: 0;
  width: 100%;
}

.container {
  max-width: 960px;
  margin: 0 auto;
  padding: 26px 28px 48px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 1023px) {
    padding: 18px 14px 36px;
    gap: 12px;
  }
}

.email-title {
  font-size: 22px;
  line-height: 1.35;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  word-break: break-word;

  @media (max-width: 767px) {
    font-size: 18px;
  }
}

.meta-card {
  background: var(--surface-elevated);
  backdrop-filter: blur(18px) saturate(165%);
  -webkit-backdrop-filter: blur(18px) saturate(165%);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  padding: 16px 18px;
  box-shadow: var(--card-shadow);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.sender-row {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.sender-avatar {
  width: 38px;
  height: 38px;
  border-radius: 11px;
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.sender-details {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 12px;

  @media (max-width: 767px) {
    flex-direction: column;
    gap: 4px;
  }
}

.send-name {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  column-gap: 6px;
  row-gap: 2px;
  min-width: 0;

  .send-name-title {
    font-size: 14.5px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .send-email {
    font-size: 13px;
    color: var(--text-secondary);
    max-width: 100%;
    overflow-wrap: anywhere;
  }

  &.is-wrapped {
    .send-name-title { order: 1; }
    .sent-via { order: 2; }
    .send-email { order: 3; flex-basis: 100%; }
  }
}

.date {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  flex-shrink: 0;
  padding-top: 2px;
}

.recipients-grid {
  padding-top: 10px;
  border-top: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.recipient-row {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  column-gap: 10px;
  font-size: 13px;
  align-items: baseline;
}

.meta-label {
  color: var(--text-muted);
  font-weight: 500;
  white-space: nowrap;
}

.meta-value {
  color: var(--text-secondary);
  word-break: break-word;
}

.email-msg {
  max-width: 440px;
  width: fit-content;
}

.body-card {
  background: var(--surface-elevated);
  backdrop-filter: blur(18px) saturate(165%);
  -webkit-backdrop-filter: blur(18px) saturate(165%);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  padding: 20px;
  box-shadow: var(--card-shadow);
  overflow: hidden;

  @media (max-width: 767px) {
    padding: 14px;
  }
}

.detail-loading {
  min-height: 180px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.shadow-html {
  border-radius: 8px;
  overflow: hidden;
  background: #FFFFFF;
}

.shadow-html::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--message-block-color);
  pointer-events: none;
}

.email-text {
  font-family: inherit;
  font-size: 14px;
  line-height: 1.7;
  color: var(--text-primary);
  white-space: pre-wrap;
  word-break: break-word;
  margin: 0;
}

.att {
  background: var(--surface-elevated);
  backdrop-filter: blur(18px) saturate(165%);
  -webkit-backdrop-filter: blur(18px) saturate(165%);
  border: 1px solid var(--border-subtle);
  padding: 16px 18px;
  border-radius: 14px;
  box-shadow: var(--card-shadow);
}

.att-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 12px;
}

.att-title {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.att-count {
  font-size: 12px;
  color: var(--text-muted);
}

.att-box {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 10px;
}

.att-item {
  cursor: pointer;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  padding: 10px 12px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 10px;
  transition: border-color 0.16s ease, background-color 0.16s ease, transform 0.16s ease, box-shadow 0.16s ease;

  &:hover {
    border-color: var(--border-strong);
    background: var(--surface-hover);
    transform: translateY(-1px);
    box-shadow: var(--shadow-xs);
  }
}

.att-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.att-info {
  flex: 1;
  min-width: 0;
}

.att-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.att-size {
  font-size: 11.5px;
  color: var(--text-muted);
}

.opt-icon {
  display: flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.att-action-btn {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;

  &:hover {
    background: var(--surface-muted);
    color: var(--brand-primary);
  }
}
</style>
