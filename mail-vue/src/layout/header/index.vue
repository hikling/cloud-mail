<template>
  <div class="header">
    <div class="header-left">
      <hanburger :is-active="uiStore.asideShow" @click="changeAside"></hanburger>
      <div class="title-wrap">
        <span class="breadcrumb-item">{{ $t(route.meta.title) }}</span>
      </div>
    </div>

    <div class="header-search-slot" v-if="showInboxSearch || showSentSearch || showAllMailSearch">
      <email-search
        v-if="showInboxSearch"
        :store="emailStore"
        :search-options="inboxSearchOptions"
        @search="returnToList('email')"
        @reset="returnToList('email')"
      />
      <email-search
        v-else-if="showSentSearch"
        :store="sendStore"
        :search-options="sentSearchOptions"
        @search="returnToList('send')"
        @reset="returnToList('send')"
      />
      <all-email-search
        v-else-if="showAllMailSearch"
        @search="returnToList('all-email')"
        @reset="returnToList('all-email')"
      />
    </div>

    <div class="toolbar">
      <div v-perm="'email:send'" class="writer-box">
        <button
          type="button"
          class="mobile-icon-btn"
          :aria-label="$t('compose')"
          @click="openSend"
        >
          <Icon icon="lucide:square-pen" width="19" height="19" />
        </button>
      </div>

      <el-dropdown
        ref="userDropdownRef"
        trigger="click"
        :teleported="false"
        popper-class="detail-dropdown"
        @visible-change="userCardVisible = $event"
      >
        <button type="button" class="user-trigger">
          <div class="avatar-badge">
            {{ formatName(userStore.user?.email || '') }}
          </div>
          <span class="trigger-name">{{ userStore.user?.name || userStore.user?.email }}</span>
          <Icon class="chevron-icon" icon="lucide:chevron-down" width="14" height="14"/>
        </button>
        <template #dropdown>
          <div class="user-details">
            <div class="user-card-head">
              <div class="details-avatar">
                {{ formatName(userStore.user?.email || '') }}
              </div>
              <div class="user-card-meta">
                <div class="user-name">{{ userStore.user?.name }}</div>
                <div class="detail-email" @click="copyEmail(userStore.user?.email)">
                  <span>{{ userStore.user?.email }}</span>
                  <Icon icon="lucide:copy" width="12" height="12" />
                </div>
              </div>
              <el-tag size="small" effect="plain" class="role-pill">{{ userStore.user?.role?.name }}</el-tag>
            </div>

            <div class="quota-grid">
              <div class="quota-card">
                <div class="quota-label">{{ $t('sendCount') }}</div>
                <div class="quota-value">
                  <span v-if="sendCount" class="quota-num">{{ sendCount }}</span>
                  <el-tag size="small" effect="light">{{ sendType }}</el-tag>
                </div>
              </div>
              <div class="quota-card">
                <div class="quota-label">{{ $t('accountCount') }}</div>
                <div class="quota-value">
                  <el-tag size="small" type="info" v-if="settingStore.settings.manyEmail || settingStore.settings.addEmail">
                    {{ $t('disabled') }}
                  </el-tag>
                  <span v-else-if="accountCount && hasPerm('account:add')" class="quota-num">
                    {{ $t('totalUserAccount', {msg: accountCount}) }}
                  </span>
                  <el-tag size="small" type="success" v-else-if="!accountCount && hasPerm('account:add')">
                    {{ $t('unlimited') }}
                  </el-tag>
                  <el-tag size="small" type="info" v-else-if="!hasPerm('account:add')">
                    {{ $t('unauthorized') }}
                  </el-tag>
                </div>
              </div>
            </div>

            <div class="logout">
              <el-button class="logout-btn" :loading="logoutLoading" @click="clickLogout">
                <Icon icon="lucide:log-out" width="15" height="15" style="margin-right: 6px" />
                {{ $t('logOut') }}
              </el-button>
            </div>
          </div>
        </template>
      </el-dropdown>
    </div>
  </div>
</template>

<script setup>
import router from "@/router";
import hanburger from '@/components/hamburger/index.vue'
import {logout} from "@/request/login.js";
import {Icon} from "@iconify/vue";
import {useUiStore} from "@/store/ui.js";
import {useUserStore} from "@/store/user.js";
import {useRoute} from "vue-router";
import {computed, onBeforeUnmount, onMounted, ref} from "vue";
import {useSettingStore} from "@/store/setting.js";
import {hasPerm} from "@/perm/perm.js"
import {useI18n} from "vue-i18n";
import emailSearch from '@/components/email-search/index.vue'
import allEmailSearch from '@/components/all-email-search/index.vue'
import {useEmailStore} from '@/store/email.js'
import {useSendStore} from '@/store/send.js'

const {t} = useI18n();
const route = useRoute();
const settingStore = useSettingStore();
const userStore = useUserStore();
const uiStore = useUiStore();
const emailStore = useEmailStore()
const sendStore = useSendStore()
const logoutLoading = ref(false)
const userDropdownRef = ref(null)
const userCardVisible = ref(false)
const outsidePointerEvents = ['mousedown', 'pointerup', 'mouseup', 'click', 'pointercancel']
let blockOutsideClick = false

const inboxSearchOptions = computed(() => [
  {label: t('subject'), type: 'subject'},
  {label: t('searchSummaryContent'), type: 'content'},
  {label: t('sender'), type: 'sender'},
  {label: t('searchSenderAddress'), type: 'senderAddress'},
])
const sentSearchOptions = computed(() => [
  {label: t('subject'), type: 'subject'},
  {label: t('searchSummaryContent'), type: 'content'},
  {label: t('searchRecipientAddress'), type: 'recipientAddress'},
])

const showInboxSearch = computed(() =>
  route.meta.name === 'email' || isMailboxDetail('inbox')
)
const showSentSearch = computed(() =>
  route.meta.name === 'send' || isMailboxDetail('sent')
)
const showAllMailSearch = computed(() =>
  route.meta.name === 'all-email' || isMailboxDetail('all-mail')
)

function isMailboxDetail(mailbox) {
  return route.meta.name === 'content' && route.params.mailbox === mailbox
}

function returnToList(listName) {
  if (route.meta.name !== 'content') return
  router.push({name: listName})
}

const accountCount = computed(() => {
  return userStore.user?.role?.accountCount
})

const sendType = computed(() => {
  if (settingStore.settings.send === 1) {
    return t('disabled')
  }
  if (!hasPerm('email:send')) {
    return t('unauthorized')
  }
  if (userStore.user.role.sendType === 'ban') {
    return t('sendBanned')
  }
  if (userStore.user.role.sendType === 'internal') {
    return t('sendInternal')
  }
  if (!userStore.user.role.sendCount) {
    return t('unlimited')
  }
  if (userStore.user.role.sendType === 'day') {
    return t('daily')
  }
  if (userStore.user.role.sendType === 'count') {
    return t('total')
  }
})

const sendCount = computed(() => {
  if (!hasPerm('email:send')) return null
  if (userStore.user.role.sendType === 'ban') return null
  if (userStore.user.role.sendType === 'internal') return null
  if (!userStore.user.role.sendCount) return null
  if (settingStore.settings.send === 1) return null
  return userStore.user.sendCount + '/' + userStore.user.role.sendCount
})

async function copyEmail(email) {
  if (!email) return
  try {
    await navigator.clipboard.writeText(email);
    ElMessage({
      message: t('copySuccessMsg'),
      type: 'success',
      plain: true,
    })
  } catch (err) {
    console.error(`${t('copyFailMsg')}:`, err);
    ElMessage({
      message: t('copyFailMsg'),
      type: 'error',
      plain: true,
    })
  }
}

function openSend() {
  uiStore.writerRef.open()
}

function changeAside() {
  uiStore.asideShow = !uiStore.asideShow
}

function clickLogout() {
  logoutLoading.value = true
  logout().then(() => {
    localStorage.removeItem("token")
    router.replace('/login')
  }).finally(() => {
    logoutLoading.value = false
  })
}

function formatName(email) {
  return email?.[0]?.toUpperCase() || 'U'
}

function isInsideUserCard(target) {
  const element = target instanceof Element ? target : target?.parentElement
  if (!(element instanceof Element)) return false
  if (userDropdownRef.value?.$el?.contains(element)) return true
  return !!element.closest('.detail-dropdown')
}

function handleUserCardPointerDown(event) {
  blockOutsideClick = userCardVisible.value && !isInsideUserCard(event.target)
  if (!blockOutsideClick) return

  event.preventDefault()
  event.stopPropagation()
  userDropdownRef.value?.handleClose()
}

function handleUserCardPointerEvent(event) {
  if (!blockOutsideClick) return
  event.preventDefault()
  event.stopPropagation()
  if (event.type === 'pointerup' || event.type === 'pointercancel') {
    setTimeout(() => {
      blockOutsideClick = false
    })
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleUserCardPointerDown, true)
  outsidePointerEvents.forEach(type => {
    document.addEventListener(type, handleUserCardPointerEvent, true)
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleUserCardPointerDown, true)
  outsidePointerEvents.forEach(type => {
    document.removeEventListener(type, handleUserCardPointerEvent, true)
  })
})
</script>

<style>
.detail-dropdown {
  color: var(--text-primary) !important;
}
</style>

<style lang="scss" scoped>
.header {
  height: 100%;
  padding: 0 16px 0 12px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  position: relative;

  @media (max-width: 767px) {
    padding: 0 12px 0 8px;
    gap: 8px;
  }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  flex-shrink: 0;
}

.title-wrap {
  display: flex;
  align-items: center;
  min-width: 0;
}

.breadcrumb-item {
  font-weight: 600;
  font-size: 15px;
  letter-spacing: -0.015em;
  color: var(--text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.header-search-slot {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  max-width: 520px;
  margin: 0 auto;

  @media (max-width: 767px) {
    flex: 0 0 auto;
    margin-left: auto;
    margin-right: 0;
  }
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
  margin-left: auto;
}

@media (max-width: 767px) {
  .header-search-slot + .toolbar {
    margin-left: 0;
  }
}

.writer-box {
  display: none;

  @media (max-width: 767px) {
    display: flex;
    align-items: center;
  }
}

.mobile-icon-btn {
  width: 34px;
  height: 34px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--brand-primary);
  background: var(--brand-primary-soft);
  cursor: pointer;

  &:active {
    transform: scale(0.96);
  }
}

.user-trigger {
  height: 36px;
  padding: 3px 10px 3px 4px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background-color 0.15s ease, border-color 0.15s ease;

  &:hover {
    background: var(--surface-hover);
    border-color: var(--border-strong);
  }

  @media (max-width: 767px) {
    padding: 3px 6px 3px 3px;
    gap: 4px;
  }
}

.avatar-badge {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--brand-primary), #0EA5E9);
  color: #FFFFFF;
  font-size: 12.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.trigger-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  max-width: 130px;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;

  @media (max-width: 767px) {
    display: none;
  }
}

.chevron-icon {
  color: var(--text-muted);
}

.user-details {
  width: 284px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.user-card-head {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 6px;
  padding-top: 4px;
}

.details-avatar {
  width: 46px;
  height: 46px;
  border-radius: 14px;
  background: linear-gradient(135deg, var(--brand-primary), #0EA5E9);
  color: #FFFFFF;
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 6px 14px -4px rgba(37, 99, 235, 0.38);
  margin-bottom: 2px;
}

.user-card-meta {
  width: 100%;
  min-width: 0;
}

.user-name {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.detail-email {
  margin-top: 3px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  max-width: 100%;
  padding: 2px 8px;
  border-radius: 6px;
  font-size: 12px;
  color: var(--text-secondary);
  background: var(--surface-subtle);
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;

  span {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  &:hover {
    background: var(--surface-hover);
    color: var(--brand-primary);
  }
}

.role-pill {
  margin-top: 2px;
}

.quota-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}

.quota-card {
  padding: 10px;
  border-radius: 10px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 5px;
  text-align: left;
}

.quota-label {
  font-size: 11.5px;
  color: var(--text-muted);
}

.quota-value {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 4px;
}

.quota-num {
  font-size: 13px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--text-primary);
}

.logout {
  width: 100%;

  .logout-btn {
    width: 100%;
    height: 34px;
    border-radius: 8px;
    color: var(--el-color-danger);
    border-color: rgba(239, 68, 68, 0.22);
    background: rgba(239, 68, 68, 0.06);

    &:hover {
      background: rgba(239, 68, 68, 0.12);
      border-color: rgba(239, 68, 68, 0.35);
      color: var(--el-color-danger);
    }
  }
}

.el-tooltip__trigger:first-child:focus-visible {
  outline: unset;
}
</style>
