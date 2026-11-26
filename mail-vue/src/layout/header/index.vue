<template>
  <div class="top-chrome" ref="chromeRef">
    <!-- Single-Row Top Bar -->
    <div class="header-bar">
      <div class="header-left">
        <button type="button" class="brand-lockup" @click="navigateTo('email')">
          <span class="brand-logo-wrap">
            <img class="brand-logo" :src="logoUrl" alt="Logo" />
          </span>
          <span class="brand-title">{{ settingStore.settings.title }}</span>
        </button>

        <span class="header-slash" aria-hidden="true">/</span>

        <!-- Hidden Menu Trigger Pill -->
        <button
          type="button"
          class="menu-trigger"
          :class="{ open: navMenuOpen }"
          :aria-expanded="navMenuOpen"
          :aria-label="$t('navMenu')"
          @click.stop="navMenuOpen = !navMenuOpen"
        >
          <Icon :icon="currentRouteIcon" width="15" height="15" class="trigger-route-icon" />
          <span class="trigger-route-label">{{ $t(route.meta.title) }}</span>
          <Icon icon="lucide:chevron-down" width="14" height="14" class="trigger-caret" :class="{ open: navMenuOpen }" />
        </button>
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
      <div v-else class="header-spacer"></div>

      <div class="toolbar">
        <button
          v-perm="'email:send'"
          type="button"
          class="compose-cta"
          @click="openSend"
        >
          <Icon icon="lucide:square-pen" width="15" height="15" />
          <span class="compose-label">{{ $t('compose') }}</span>
        </button>

        <button
          type="button"
          class="icon-action-btn"
          :title="uiStore.dark ? $t('lightTheme') : $t('darkTheme')"
          :aria-label="uiStore.dark ? $t('lightTheme') : $t('darkTheme')"
          @click="toggleTheme"
        >
          <Icon :icon="uiStore.dark ? 'lucide:sun' : 'lucide:moon'" width="16" height="16" />
        </button>

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

    <!-- Collapsible Floating Top Menu Drawer -->
    <Transition name="nav-backdrop-fade">
      <div v-if="navMenuOpen" class="nav-backdrop" @click="navMenuOpen = false"></div>
    </Transition>

    <Transition name="nav-drawer-drop">
      <nav v-if="navMenuOpen" class="floating-nav-drawer" aria-label="Primary" @click.stop>
        <div class="drawer-inner">
          <div class="drawer-group">
            <div class="drawer-group-label">{{ $t('inbox') }}</div>
            <div class="drawer-grid">
              <button
                type="button"
                class="drawer-nav-item"
                :class="{ active: isActive('email', 'inbox') }"
                @click="navigateTo('email')"
              >
                <span class="drawer-icon"><Icon icon="lucide:inbox" width="16" height="16" /></span>
                <span>{{ $t('inbox') }}</span>
              </button>

              <button
                v-perm="'email:send'"
                type="button"
                class="drawer-nav-item"
                :class="{ active: isActive('send', 'sent') }"
                @click="navigateTo('send')"
              >
                <span class="drawer-icon"><Icon icon="lucide:send" width="15" height="15" /></span>
                <span>{{ $t('sent') }}</span>
              </button>

              <button
                v-perm="'email:send'"
                type="button"
                class="drawer-nav-item"
                :class="{ active: route.meta.name === 'draft' }"
                @click="navigateTo('draft')"
              >
                <span class="drawer-icon"><Icon icon="lucide:file-text" width="16" height="16" /></span>
                <span>{{ $t('drafts') }}</span>
              </button>

              <button
                type="button"
                class="drawer-nav-item"
                :class="{ active: isActive('star', 'starred') }"
                @click="navigateTo('star')"
              >
                <span class="drawer-icon"><Icon icon="lucide:star" width="16" height="16" /></span>
                <span>{{ $t('starred') }}</span>
              </button>

              <button
                type="button"
                class="drawer-nav-item"
                :class="{ active: route.meta.name === 'setting' }"
                @click="navigateTo('setting')"
              >
                <span class="drawer-icon"><Icon icon="lucide:settings" width="16" height="16" /></span>
                <span>{{ $t('settings') }}</span>
              </button>
            </div>
          </div>

          <div
            class="drawer-group drawer-group--manage"
            v-perm="['all-email:query','user:query','role:query','setting:query','analysis:query','reg-key:query']"
          >
            <div class="drawer-group-label">{{ $t('manage') }}</div>
            <div class="drawer-grid">
              <button
                v-perm="'analysis:query'"
                type="button"
                class="drawer-nav-item"
                :class="{ active: route.meta.name === 'analysis' }"
                @click="navigateTo('analysis')"
              >
                <span class="drawer-icon"><Icon icon="lucide:bar-chart-2" width="16" height="16" /></span>
                <span>{{ $t('analytics') }}</span>
              </button>

              <button
                v-perm="'user:query'"
                type="button"
                class="drawer-nav-item"
                :class="{ active: route.meta.name === 'user' }"
                @click="navigateTo('user')"
              >
                <span class="drawer-icon"><Icon icon="lucide:users" width="16" height="16" /></span>
                <span>{{ $t('allUsers') }}</span>
              </button>

              <button
                v-perm="'all-email:query'"
                type="button"
                class="drawer-nav-item"
                :class="{ active: isActive('all-email', 'all-mail') }"
                @click="navigateTo('all-email')"
              >
                <span class="drawer-icon"><Icon icon="lucide:mails" width="16" height="16" /></span>
                <span>{{ $t('allMail') }}</span>
              </button>

              <button
                v-perm="'role:query'"
                type="button"
                class="drawer-nav-item"
                :class="{ active: route.meta.name === 'role' }"
                @click="navigateTo('role')"
              >
                <span class="drawer-icon"><Icon icon="lucide:shield" width="16" height="16" /></span>
                <span>{{ $t('permissions') }}</span>
              </button>

              <button
                v-perm="'reg-key:query'"
                type="button"
                class="drawer-nav-item"
                :class="{ active: route.meta.name === 'reg-key' }"
                @click="navigateTo('reg-key')"
              >
                <span class="drawer-icon"><Icon icon="lucide:key-round" width="16" height="16" /></span>
                <span>{{ $t('inviteCode') }}</span>
              </button>

              <button
                v-perm="'setting:query'"
                type="button"
                class="drawer-nav-item"
                :class="{ active: route.meta.name === 'sys-setting' }"
                @click="navigateTo('sys-setting')"
              >
                <span class="drawer-icon"><Icon icon="lucide:sliders" width="16" height="16" /></span>
                <span>{{ $t('SystemSettings') }}</span>
              </button>
            </div>
          </div>
        </div>
      </nav>
    </Transition>
  </div>
</template>

<script setup>
import router from "@/router";
import {logout} from "@/request/login.js";
import {Icon} from "@iconify/vue";
import {useUiStore} from "@/store/ui.js";
import {useUserStore} from "@/store/user.js";
import {useRoute} from "vue-router";
import {computed, onBeforeUnmount, onMounted, ref, watch} from "vue";
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
const logoUrl = `${import.meta.env.BASE_URL}mail.png`
const chromeRef = ref(null)
const navMenuOpen = ref(false)
const logoutLoading = ref(false)
const userDropdownRef = ref(null)
const userCardVisible = ref(false)
const outsidePointerEvents = ['mousedown', 'pointerup', 'mouseup', 'click', 'pointercancel']
let blockOutsideClick = false

const ROUTE_ICONS = {
  email: 'lucide:inbox',
  send: 'lucide:send',
  draft: 'lucide:file-text',
  star: 'lucide:star',
  setting: 'lucide:settings',
  analysis: 'lucide:bar-chart-2',
  user: 'lucide:users',
  'all-email': 'lucide:mails',
  role: 'lucide:shield',
  'reg-key': 'lucide:key-round',
  'sys-setting': 'lucide:sliders',
}

const currentRouteIcon = computed(() => {
  if (route.meta.name === 'content') {
    const map = { inbox: 'lucide:inbox', sent: 'lucide:send', starred: 'lucide:star', 'all-mail': 'lucide:mails' }
    return map[route.params.mailbox] || 'lucide:mail'
  }
  return ROUTE_ICONS[route.meta.name] || 'lucide:menu'
})

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

watch(() => route.fullPath, () => {
  navMenuOpen.value = false
})

function navigateTo(name) {
  navMenuOpen.value = false
  router.push({ name })
}

function isActive(routeName, mailbox) {
  if (route.meta.name === routeName) return true
  return route.meta.name === 'content' && route.params.mailbox === mailbox
}

function isMailboxDetail(mailbox) {
  return route.meta.name === 'content' && route.params.mailbox === mailbox
}

function returnToList(listName) {
  if (route.meta.name !== 'content') return
  router.push({name: listName})
}

function toggleTheme() {
  const nextIsDark = !uiStore.dark
  document.documentElement.classList.toggle('dark', nextIsDark)
  document.getElementById('theme-color-meta')?.setAttribute('content', nextIsDark ? '#0B0D12' : '#F4F5F8')
  uiStore.dark = nextIsDark
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
  navMenuOpen.value = false
  uiStore.writerRef.open()
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
  if (navMenuOpen.value && chromeRef.value && !chromeRef.value.contains(event.target)) {
    navMenuOpen.value = false
  }

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

function handleKeyDown(event) {
  if (event.key === 'Escape' && navMenuOpen.value) {
    navMenuOpen.value = false
  }
}

onMounted(() => {
  document.addEventListener('pointerdown', handleUserCardPointerDown, true)
  document.addEventListener('keydown', handleKeyDown)
  outsidePointerEvents.forEach(type => {
    document.addEventListener(type, handleUserCardPointerEvent, true)
  })
})

onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', handleUserCardPointerDown, true)
  document.removeEventListener('keydown', handleKeyDown)
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
.top-chrome {
  position: relative;
  background: var(--surface-primary);
  border-bottom: 1px solid var(--border-subtle);
  user-select: none;
  z-index: 80;
}

.header-bar {
  position: relative;
  height: 56px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  background: var(--surface-primary);
  z-index: 82;

  @media (max-width: 767px) {
    height: 52px;
    padding: 0 12px;
    gap: 8px;
  }
}

.header-left {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  flex-shrink: 0;

  @media (max-width: 767px) {
    gap: 6px;
  }
}

.brand-lockup {
  display: inline-flex;
  align-items: center;
  gap: 9px;
  padding: 4px 2px;
  border: none;
  background: transparent;
  cursor: pointer;
  flex-shrink: 0;
}

.brand-logo-wrap {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.brand-logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.brand-title {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--text-primary);
  white-space: nowrap;
  max-width: 160px;
  overflow: hidden;
  text-overflow: ellipsis;

  @media (max-width: 560px) {
    display: none;
  }
}

.header-slash {
  color: var(--border-strong);
  font-size: 16px;
  font-weight: 300;
  line-height: 1;

  @media (max-width: 560px) {
    display: none;
  }
}

.menu-trigger {
  height: 34px;
  padding: 0 11px 0 10px;
  border-radius: 9px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-subtle);
  color: var(--text-primary);
  font-size: 13.5px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease, box-shadow 150ms ease;

  .trigger-route-icon {
    color: var(--brand-primary);
    flex-shrink: 0;
  }

  .trigger-caret {
    color: var(--text-muted);
    transition: transform 180ms ease;

    &.open {
      transform: rotate(180deg);
      color: var(--brand-primary);
    }
  }

  &:hover {
    background: var(--surface-hover);
    border-color: var(--border-strong);
  }

  &.open {
    border-color: var(--brand-primary);
    background: var(--brand-primary-soft);
    color: var(--brand-primary);
    box-shadow: 0 0 0 3px var(--brand-primary-soft);
  }
}

.header-search-slot {
  flex: 1;
  min-width: 0;
  display: flex;
  justify-content: center;
  max-width: 460px;

  @media (max-width: 767px) {
    justify-content: flex-end;
    max-width: none;
  }
}

.header-spacer {
  flex: 1;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}

.compose-cta {
  height: 34px;
  padding: 0 14px;
  border-radius: 999px;
  border: none;
  background: var(--brand-primary);
  color: #ffffff;
  font-size: 13px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;
  box-shadow: 0 1px 4px rgba(37, 99, 235, 0.3);
  transition: background-color 150ms ease, transform 120ms ease, box-shadow 150ms ease;

  &:hover {
    background: var(--brand-primary-hover);
    box-shadow: 0 3px 10px -2px rgba(37, 99, 235, 0.45);
  }

  &:active {
    transform: scale(0.98);
  }

  @media (max-width: 640px) {
    width: 34px;
    padding: 0;
    justify-content: center;

    .compose-label {
      display: none;
    }
  }
}

.icon-action-btn {
  width: 34px;
  height: 34px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-subtle);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease, color 150ms ease;

  &:hover {
    background: var(--surface-hover);
    border-color: var(--border-strong);
    color: var(--text-primary);
  }
}

.user-trigger {
  height: 34px;
  padding: 3px 10px 3px 4px;
  border-radius: 999px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-subtle);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  transition: background-color 150ms ease, border-color 150ms ease;

  &:hover {
    background: var(--surface-hover);
    border-color: var(--border-strong);
  }

  @media (max-width: 767px) {
    padding: 3px;
    gap: 0;
  }
}

.avatar-badge {
  width: 26px;
  height: 26px;
  border-radius: 999px;
  background: var(--brand-primary);
  color: #ffffff;
  font-size: 12px;
  font-weight: 700;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.trigger-name {
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  max-width: 120px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;

  @media (max-width: 767px) {
    display: none;
  }
}

.chevron-icon {
  color: var(--text-muted);

  @media (max-width: 767px) {
    display: none;
  }
}

/* Hidden Collapsible Top Menu Drawer */
.nav-backdrop {
  position: fixed;
  top: 56px;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.24);
  backdrop-filter: blur(2px);
  z-index: 80;

  @media (max-width: 767px) {
    top: 52px;
  }
}

.floating-nav-drawer {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--surface-elevated);
  border-bottom: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-lg);
  z-index: 81;
}

.drawer-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 18px 24px 22px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 767px) {
    padding: 14px 14px 18px;
    gap: 14px;
  }
}

.drawer-group {
  display: flex;
  flex-direction: column;
  gap: 8px;

  &--manage {
    padding-top: 14px;
    border-top: 1px solid var(--border-subtle);
  }
}

.drawer-group-label {
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  color: var(--text-muted);
  padding-left: 4px;
}

.drawer-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.drawer-nav-item {
  height: 38px;
  padding: 0 14px 0 11px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-subtle);
  color: var(--text-secondary);
  font-size: 13.5px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 9px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, transform 120ms ease;

  .drawer-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    transition: color 140ms ease;
  }

  &:hover {
    background: var(--surface-hover);
    border-color: var(--border-strong);
    color: var(--text-primary);

    .drawer-icon {
      color: var(--text-primary);
    }
  }

  &.active {
    background: var(--brand-primary-soft);
    border-color: var(--brand-primary);
    color: var(--brand-primary);
    font-weight: 600;

    .drawer-icon {
      color: var(--brand-primary);
    }
  }

  @media (max-width: 520px) {
    flex: 1 1 calc(50% - 4px);
    min-width: 132px;
  }
}

.nav-backdrop-fade-enter-active,
.nav-backdrop-fade-leave-active {
  transition: opacity 180ms ease;
}

.nav-backdrop-fade-enter-from,
.nav-backdrop-fade-leave-to {
  opacity: 0;
}

.nav-drawer-drop-enter-active,
.nav-drawer-drop-leave-active {
  transition: opacity 180ms ease, transform 200ms cubic-bezier(0.22, 1, 0.36, 1);
}

.nav-drawer-drop-enter-from,
.nav-drawer-drop-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

/* User Popover Card */
.user-details {
  width: 300px;
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;

  @media (max-width: 400px) {
    width: calc(100vw - 28px);
  }
}

.user-card-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.details-avatar {
  width: 38px;
  height: 38px;
  border-radius: 10px;
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
  font-size: 15px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-card-meta {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.detail-email {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  color: var(--text-muted);
  cursor: pointer;
  max-width: 100%;
  margin-top: 2px;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    color: var(--brand-primary);
  }
}

.role-pill {
  flex-shrink: 0;
}

.quota-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.quota-card {
  padding: 10px;
  border-radius: 10px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quota-label {
  font-size: 11.5px;
  color: var(--text-muted);
}

.quota-value {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.quota-num {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.logout {
  padding-top: 2px;
}

.logout-btn {
  width: 100%;
  height: 36px;
}
</style>
