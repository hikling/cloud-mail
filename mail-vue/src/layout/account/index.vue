<template>
  <div class="account-box" :class="{ 'is-dark': uiStore.dark }">
    <div class="head-opt">
      <div class="head-title">
        <span class="head-title-icon">
          <Icon icon="lucide:mail" width="14" height="14" />
        </span>
        <span>{{ $t('account') }}</span>
        <span v-if="accounts.length" class="head-count">{{ accounts.length }}</span>
      </div>
      <div class="head-actions">
        <button
          v-perm="'account:add'"
          type="button"
          class="rail-add-btn"
          @click="add"
          :aria-label="$t('addAccount')"
        >
          <Icon icon="lucide:plus" width="14" height="14" />
          <span>{{ $t('add') }}</span>
        </button>
        <button type="button" class="rail-icon-btn" @click="refresh" aria-label="Refresh">
          <Icon icon="lucide:refresh-cw" width="14" height="14" :class="{ spinning: loading }" />
        </button>
      </div>
    </div>

    <el-scrollbar class="scrollbar" ref="scrollbarRef">
      <div class="account-list" v-infinite-scroll="getAccountList" :infinite-scroll-distance="600" :infinite-scroll-immediate="false">
        <button
          v-if="showNooneShortcut"
          type="button"
          class="noone-shortcut-card"
          :class="{ 'item-choose': emailStore.inboxTab === 'noone' }"
          @click="selectNoone"
        >
          <span class="noone-shortcut-icon">
            <Icon icon="lucide:at-sign" width="17" height="17" />
          </span>
          <span class="noone-shortcut-meta">
            <span class="noone-shortcut-title">{{ $t('noRecipientTitle') }}</span>
            <span class="noone-shortcut-desc">{{ $t('noRecipientInboxDesc') }}</span>
          </span>
          <span class="noone-shortcut-arrow">
            <Icon icon="lucide:chevron-right" width="15" height="15" />
          </span>
        </button>

        <div v-if="showNooneShortcut && accounts.length" class="rail-section-label">
          <span>{{ $t('accountListSection') }}</span>
          <span class="rail-section-count">{{ accounts.length }}</span>
        </div>

        <div
          class="account-card"
          :class="{ 'item-choose': isAccountSelected(item) }"
          v-for="(item, index) in accounts"
          :key="item.accountId"
          @click="changeAccount(item)"
        >
          <div class="card-main">
            <div
              class="account-avatar"
              :class="{ active: isAccountSelected(item) }"
              :style="isAccountSelected(item) ? null : avatarStyle(item.email)"
            >
              {{ (item.email?.[0] || '@').toUpperCase() }}
            </div>
            <div class="account-meta">
              <div class="account-title-row">
                <span class="account-local" :title="item.email">{{ splitEmail(item.email).local }}</span>
                <span
                  v-if="item.accountId === userStore.user.account.accountId"
                  class="primary-badge"
                >{{ $t('accountPrimary') }}</span>
              </div>
              <div class="account-domain" :title="item.email">
                <span class="domain-part">{{ splitEmail(item.email).domain }}</span>
                <span v-if="item.name && item.name !== splitEmail(item.email).local" class="account-alias">
                  · {{ item.name }}
                </span>
              </div>
            </div>
            <div class="card-corner-more" @click.stop>
              <span v-if="showNullSetting(item)" class="rail-more-disabled">
                <Icon icon="lucide:more-horizontal" width="15" height="15" />
              </span>
              <el-dropdown v-else trigger="click">
                <button type="button" class="corner-more-btn" :aria-label="$t('manage')">
                  <Icon icon="lucide:more-horizontal" width="15" height="15" />
                </button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item v-if="hasPerm('email:send')" @click="openSetName(item)">{{ $t('rename') }}</el-dropdown-item>
                    <el-dropdown-item v-if="item.accountId !== userStore.user.account.accountId" @click="setAsTop(item, index)">{{ $t('pin') }}</el-dropdown-item>
                    <el-dropdown-item
                      v-if="item.accountId !== userStore.user.account.accountId && hasPerm('account:delete')"
                      @click="remove(item)"
                    >{{ $t('delete') }}</el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>

          <div class="card-footer" @click.stop>
            <el-tooltip
              :content="item.allReceive ? $t('accountScopeAllTip') : $t('accountScopeSingleTip')"
              placement="top"
              :show-after="400"
            >
              <button
                type="button"
                class="scope-pill"
                :class="{ enabled: !!item.allReceive }"
                @click="setAllReceive(item)"
              >
                <span v-if="item.allReceive" class="scope-dot"></span>
                <Icon v-else icon="lucide:inbox" width="12.5" height="12.5" />
                <span>{{ item.allReceive ? $t('accountScopeAll') : $t('accountScopeSingle') }}</span>
              </button>
            </el-tooltip>

            <button
              type="button"
              class="copy-pill-btn"
              :class="{ copied: copiedId === item.accountId }"
              @click="copyAccount(item.email, item.accountId)"
              :aria-label="$t('copy')"
            >
              <Icon :icon="copiedId === item.accountId ? 'lucide:check' : 'lucide:copy'" width="12.5" height="12.5" />
              <span>{{ copiedId === item.accountId ? $t('copiedShort') : $t('copy') }}</span>
            </button>
          </div>
        </div>

        <!-- Initial Loading Skeleton -->
        <template v-if="loading">
          <div class="account-card skeleton-card" v-for="i in skeletonRows" :key="i">
            <el-skeleton animated>
              <template #template>
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px">
                  <el-skeleton-item variant="rect" style="width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0" />
                  <div style="flex: 1; display: flex; flex-direction: column; gap: 6px">
                    <el-skeleton-item variant="text" style="width: 62%; height: 15px" />
                    <el-skeleton-item variant="text" style="width: 82%; height: 12px" />
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 9px; border-top: 1px solid var(--border-subtle)">
                  <el-skeleton-item variant="text" style="width: 82px; height: 24px; border-radius: 8px" />
                  <el-skeleton-item variant="text" style="width: 56px; height: 24px; border-radius: 8px" />
                </div>
              </template>
            </el-skeleton>
          </div>
        </template>

        <!-- Follow Loading Skeleton -->
        <template v-if="accounts.length > 0 && !noLoading">
          <div class="account-card skeleton-card">
            <el-skeleton animated>
              <template #template>
                <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 12px">
                  <el-skeleton-item variant="rect" style="width: 38px; height: 38px; border-radius: 11px; flex-shrink: 0" />
                  <div style="flex: 1; display: flex; flex-direction: column; gap: 6px">
                    <el-skeleton-item variant="text" style="width: 62%; height: 15px" />
                    <el-skeleton-item variant="text" style="width: 82%; height: 12px" />
                  </div>
                </div>
                <div style="display: flex; justify-content: space-between; padding-top: 9px; border-top: 1px solid var(--border-subtle)">
                  <el-skeleton-item variant="text" style="width: 82px; height: 24px; border-radius: 8px" />
                  <el-skeleton-item variant="text" style="width: 56px; height: 24px; border-radius: 8px" />
                </div>
              </template>
            </el-skeleton>
          </div>
        </template>

        <div class="noLoading" v-if="noLoading && accounts.length > 0">
          <div>{{ $t('noMoreData') }}</div>
        </div>
        <div class="empty" v-if="noLoading && accounts.length === 0">
          <el-empty :image-size="72" :description="$t('noMessagesFound')"/>
        </div>
      </div>
    </el-scrollbar>

    <el-dialog v-model="showAdd" :title="$t('addAccount')" append-to-body align-center class="account-modal-dialog">
      <div class="container">
        <el-input v-model="addForm.email" ref="addRef" size="large" type="text" :placeholder="$t('emailAccount')" autocomplete="off" @keyup.enter="submit">
          <template #append>
            <div class="domain-trigger" @click.stop="openSelect">
              <el-select
                  ref="mySelect"
                  v-model="addForm.suffix"
                  :placeholder="$t('select')"
                  class="select"
              >
                <el-option
                    v-for="item in domainList"
                    :key="item"
                    :label="item"
                    :value="item"
                />
              </el-select>
              <div class="domain-label">
                <span>{{ addForm.suffix }}</span>
                <Icon class="setting-icon" icon="lucide:chevron-down" width="14" height="14"/>
              </div>
            </div>
          </template>
        </el-input>
        <el-button class="btn" size="large" type="primary" @click="submit" :loading="addLoading">
          {{ $t('add') }}
        </el-button>
      </div>
      <div
          ref="turnstileContainer"
          :key="turnstileContainerKey"
          class="add-email-turnstile"
          :class="verifyShow ? 'turnstile-show' : 'turnstile-hide'"
          :data-sitekey="settingStore.settings.siteKey"
          data-callback="onTurnstileSuccess"
          data-error-callback="onTurnstileError"
      >
        <span style="font-size: 12px;color: #F56C6C" v-if="botJsError">{{ $t('verifyModuleFailed', {action: $t('add')}) }}</span>
      </div>
    </el-dialog>

    <el-dialog v-model="setNameShow" :title="$t('changeUserName')" append-to-body align-center class="account-modal-dialog">
      <div class="container">
        <el-input v-model="accountName" size="large" type="text" :placeholder="$t('username')" autocomplete="off" @keyup.enter="setName" />
        <el-button class="btn" size="large" type="primary" @click="setName" :loading="setNameLoading">
          {{ $t('save') }}
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {Icon} from "@iconify/vue";
import {computed, nextTick, reactive, ref, watch} from "vue";
import {
  accountList,
  accountAdd,
  accountDelete,
  accountSetName,
  accountSetAllReceive,
  accountSetAsTop
} from "@/request/account.js";
import {sleep} from "@/utils/time-utils.js"
import {isEmail} from "@/utils/verify-utils.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {useEmailStore} from "@/store/email.js";
import {useUserStore} from "@/store/user.js";
import {useUiStore} from "@/store/ui.js";
import {hasPerm} from "@/perm/perm.js"
import {useI18n} from "vue-i18n";
import {useRoute, useRouter} from "vue-router";
import {AccountAllReceiveEnum} from "@/enums/account-enum.js";
import {reloadTurnstileScript} from "@/utils/turnstile-script.js";

const {t} = useI18n();
const route = useRoute();
const router = useRouter();
const uiStore = useUiStore();
const userStore = useUserStore();
const accountStore = useAccountStore();
const settingStore = useSettingStore();
const emailStore = useEmailStore();

const showNooneShortcut = computed(() => {
  if (!hasPerm('all-email:query')) return false
  return route.meta.name === 'email' || (route.meta.name === 'content' && route.params.mailbox === 'inbox')
})

const AVATAR_TONES_LIGHT = [
  { bg: 'rgba(37, 99, 235, 0.13)', fg: '#2563EB' },
  { bg: 'rgba(14, 165, 233, 0.14)', fg: '#0284C7' },
  { bg: 'rgba(16, 185, 129, 0.13)', fg: '#059669' },
  { bg: 'rgba(139, 92, 246, 0.13)', fg: '#7C3AED' },
  { bg: 'rgba(236, 72, 153, 0.13)', fg: '#DB2777' },
]

const AVATAR_TONES_DARK = [
  { bg: 'rgba(59, 130, 246, 0.26)', fg: '#93C5FD' },
  { bg: 'rgba(14, 165, 233, 0.26)', fg: '#7DD3FC' },
  { bg: 'rgba(16, 185, 129, 0.26)', fg: '#6EE7B7' },
  { bg: 'rgba(139, 92, 246, 0.26)', fg: '#D8B4FE' },
  { bg: 'rgba(236, 72, 153, 0.26)', fg: '#F9A8D4' },
]

function avatarStyle(seed) {
  const str = String(seed || 'M')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  const tones = uiStore.dark ? AVATAR_TONES_DARK : AVATAR_TONES_LIGHT
  const tone = tones[hash % tones.length]
  return { backgroundColor: tone.bg, color: tone.fg }
}

function splitEmail(email) {
  const raw = String(email || '')
  const at = raw.indexOf('@')
  if (at === -1) return { local: raw, domain: '' }
  return { local: raw.slice(0, at), domain: raw.slice(at) }
}

function isAccountSelected(item) {
  return accountStore.currentAccountId === item.accountId && !(showNooneShortcut.value && emailStore.inboxTab === 'noone')
}
const showAdd = ref(false)
const addLoading = ref(false);
const domainList = computed(() => settingStore.domainList)
const accounts = reactive([])
const noLoading = ref(false)
const loading = ref(false)
const followLoading = ref(false);
const verifyShow = ref(false)
const setNameShow = ref(false)
const setNameLoading = ref(false)
const accountName = ref(null)
const addRef = ref({})
const scrollbarRef = ref({})
const copiedId = ref(null)
let account = null
let turnstileId = null
const botJsError = ref(false)
let verifyToken = ''
let verifyErrorCount = 0
let turnstileRecoveryAttempted = false
const turnstileContainer = ref(null)
const turnstileContainerKey = ref(0)
let first = true
const addForm = reactive({
  email: '',
  suffix: settingStore.domainList[0]
})
let skeletonRows = 10
const queryParams = {
  size: 30
}

const mySelect = ref()

if (hasPerm('account:query')) {
  getAccountList()
}

watch(() => accountStore.changeUserAccountName, () => {
  if (accounts[0]) {
    accounts[0].name = accountStore.changeUserAccountName
  }
})

watch(() => settingStore.domainList, (list) => {
  if (!addForm.suffix && list.length > 0) {
    addForm.suffix = list[0]
  }
}, {immediate: true})

const openSelect = () => {
  mySelect.value.toggleMenu()
}

async function recoverTurnstile() {
  if (turnstileRecoveryAttempted) return
  turnstileRecoveryAttempted = true
  botJsError.value = false
  verifyToken = ''
  turnstileId = null
  turnstileContainerKey.value++
  try {
    const api = await reloadTurnstileScript()
    await nextTick()
    if (!showAdd.value || !turnstileContainer.value) return
    turnstileId = api.render(turnstileContainer.value)
  } catch (error) {
    botJsError.value = true
    console.warn('Turnstile recovery failed', error)
  } finally {
    turnstileRecoveryAttempted = false
  }
}

window.onTurnstileError = (e) => {
  if (verifyErrorCount >= 4) {
    return
  }
  verifyErrorCount++
  console.warn('人机验加载失败', e)
  setTimeout(() => {
    nextTick(() => {
      if (!turnstileId) {
        turnstileId = window.turnstile.render('.add-email-turnstile')
      } else {
        window.turnstile.reset(turnstileId);
      }
    })
  }, 1500)
};

window.onTurnstileSuccess = (token) => {
  verifyToken = token;
};

function getSkeletonRows() {
  if (accounts.length > 20) return skeletonRows = 20
  if (accounts.length === 0) return skeletonRows = 1
  skeletonRows = accounts.length
}

function setName() {
  if (setNameLoading.value) return
  let name = accountName.value
  if (name === account.name) {
    setNameShow.value = false
    return
  }
  if (!name) {
    ElMessage({
      message: t('emptyUserNameMsg'),
      type: 'error',
      plain: true,
    })
    return;
  }

  setNameLoading.value = true
  accountSetName(account.accountId, name).then(() => {
    account.name = name
    setNameShow.value = false

    if (account.accountId === userStore.user.account.accountId) {
      userStore.user.name = name
    }

    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
  }).finally(() => {
    setNameLoading.value = false
  })
}

function openSetName(accountItem) {
  accountName.value = accountItem.name
  account = accountItem
  setNameShow.value = true
}

function setAllReceive(account) {
  let allReceiveAccount = accounts.find(account => account.allReceive === AccountAllReceiveEnum.ENABLED);
  if (allReceiveAccount && allReceiveAccount.accountId !== account.accountId) allReceiveAccount.allReceive = AccountAllReceiveEnum.DISABLED;
  account.allReceive = account.allReceive === AccountAllReceiveEnum.DISABLED ? AccountAllReceiveEnum.ENABLED : AccountAllReceiveEnum.DISABLED;
  accountSetAllReceive(account.accountId).catch(() => {
    account.allReceive = account.allReceive === AccountAllReceiveEnum.DISABLED ? AccountAllReceiveEnum.ENABLED : AccountAllReceiveEnum.DISABLED;
    if (allReceiveAccount) allReceiveAccount.allReceive = AccountAllReceiveEnum.ENABLED;
  }).then(() => {
    changeAccount(account);
    emailStore.emailScroll?.refreshList();
    emailStore.sendScroll?.refreshList();
  })
}

function showNullSetting(item) {
  return !hasPerm('email:send') && !(item.accountId !== userStore.user.account.accountId && hasPerm('account:delete'))
}

function remove(account) {
  ElMessageBox.confirm(t('delConfirm', {msg: account.email}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    accountDelete(account.accountId).then(() => {
      const index = accounts.findIndex(item => item.accountId === account.accountId);
      accounts.splice(index, 1);
      if (accounts.length < queryParams.size) {
        getAccountList()
      }
      ElMessage({
        message: t('delSuccessMsg'),
        type: 'success',
        plain: true,
      })
    })
  });
}

function refresh() {
  if (loading.value) {
    return
  }
  loading.value = false
  followLoading.value = false
  noLoading.value = false
  queryParams.accountId = 0
  queryParams.lastSort = null
  getSkeletonRows();
  scrollbarRef.value.setScrollTop(0)
  accounts.splice(0, accounts.length)
  getAccountList()
}

function selectNoone() {
  emailStore.setInboxTab('noone')
  if (route.meta.name === 'content') {
    router.push({ name: 'email' })
  }
  if (window.innerWidth <= 767) {
    uiStore.accountShow = false
  }
}

function changeAccount(account) {
  emailStore.setInboxTab('inbox')
  accountStore.currentAccountId = account.accountId
  accountStore.currentAccount = account
  if (route.meta.name === 'content' && route.params.mailbox === 'inbox') {
    router.push({ name: 'email' })
  }
  if (window.innerWidth <= 767) {
    uiStore.accountShow = false
  }
}

function add() {
  addForm.suffix = addForm.suffix || settingStore.domainList[0]
  showAdd.value = true
  setTimeout(() => {
    addRef.value.focus()
  }, 100)
}

function setAsTop(account, index) {
  accountSetAsTop(account.accountId).then(() => {
    ElMessage({
      message: t('setSuccess'),
      type: 'success',
      plain: true,
    })

    const [item] = accounts.splice(index, 1);
    accounts.splice(1, 0, item);
  });
}

async function copyAccount(account, accountId) {
  try {
    await navigator.clipboard.writeText(account);
    copiedId.value = accountId
    setTimeout(() => {
      if (copiedId.value === accountId) copiedId.value = null
    }, 1500)
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

function getAccountList() {
  if (loading.value || followLoading.value || noLoading.value) return;

  if (accounts.length === 0) {
    loading.value = true
  } else {
    followLoading.value = true
  }

  let start = Date.now();
  const accountId = accounts.length > 0 ? accounts.at(-1).accountId : 0;
  const lastSort = accounts.length > 0 ? accounts.at(-1).sort : null;

  accountList(accountId, queryParams.size, lastSort).then(async list => {
    let end = Date.now();
    let duration = end - start;
    if (duration < 300) {
      await sleep(300 - duration)
    }

    if (list.length < queryParams.size) {
      noLoading.value = true
    }
    if (accounts.length === 0) {
      accountStore.currentAccount = list[0]
    }

    accounts.push(...list)
    loading.value = false
    followLoading.value = false
    first = false
  }).catch(() => {
    loading.value = false
    followLoading.value = false
  })
}

function submit() {
  if (addLoading.value) return

  if (!addForm.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (addForm.email.length < settingStore.settings.minEmailPrefix) {
    ElMessage({
      message: t('minEmailPrefix', {msg: settingStore.settings.minEmailPrefix}),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!isEmail(addForm.email + addForm.suffix)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (!verifyToken && (settingStore.settings.addEmailVerify === 0 || (settingStore.settings.addEmailVerify === 2 && settingStore.settings.addVerifyOpen))) {
    if (turnstileRecoveryAttempted) return
    if (!verifyShow.value) {
      verifyShow.value = true
      nextTick(() => {
        if (!turnstileId) {
          try {
            turnstileId = window.turnstile.render('.add-email-turnstile')
          } catch (e) {
            botJsError.value = true
            console.log('人机验证js加载失败')
            recoverTurnstile()
          }
        } else {
          window.turnstile.reset('.add-email-turnstile')
        }
      })
    } else if (botJsError.value) {
      recoverTurnstile()
    } else {
      ElMessage({
        message: t('botVerifyMsg'),
        type: "error",
        plain: true
      })
    }
    return;
  }

  addLoading.value = true
  accountAdd(addForm.email + addForm.suffix, verifyToken).then(account => {
    addLoading.value = false
    addForm.email = ''
    accounts.push(account)
    verifyToken = ''
    settingStore.settings.addVerifyOpen = account.addVerifyOpen
    ElMessage({
      message: t('addSuccessMsg'),
      type: "success",
      plain: true
    })
    verifyShow.value = false
    showAdd.value = false
    userStore.refreshUserInfo()
  }).catch(res => {
    if (res.code === 400) {
      verifyToken = ''
      if (turnstileId) {
        window.turnstile.reset(turnstileId)
      } else {
        nextTick(() => {
          turnstileId = window.turnstile.render('.add-email-turnstile')
        })
      }
      verifyShow.value = true
    }
    addLoading.value = false
  })
}
</script>

<style scoped lang="scss">
.account-box {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border-subtle);
  background-color: var(--surface-subtle);
  backdrop-filter: blur(var(--ws-blur, 20px)) saturate(165%);
  -webkit-backdrop-filter: blur(var(--ws-blur, 20px)) saturate(165%);
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.head-opt {
  height: 48px;
  padding: 0 14px 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.head-title {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  font-weight: 650;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.head-title-icon {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.head-count {
  padding: 1px 7px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  background: var(--surface-muted);
  color: var(--text-secondary);
}

.head-actions {
  display: flex;
  align-items: center;
  gap: 6px;
}

.rail-add-btn {
  height: 30px;
  padding: 0 10px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--brand-primary);
  background: var(--brand-primary-soft);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease, transform 0.12s ease;

  &:hover {
    background: var(--brand-primary);
    color: #ffffff;
  }

  &:active {
    transform: scale(0.95);
  }
}

.rail-icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  background: var(--surface-primary);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease, border-color 0.14s ease, transform 0.12s ease;

  &:hover {
    color: var(--text-primary);
    border-color: var(--border-strong);
  }

  &:active {
    transform: scale(0.92);
  }
}

.spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.scrollbar {
  flex: 1;
  min-height: 0;
  width: 100%;
}

.account-list {
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.rail-section-label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px 4px 0;
  font-size: 11.5px;
  font-weight: 600;
  color: var(--text-muted);
  letter-spacing: 0.02em;
}

.rail-section-count {
  font-variant-numeric: tabular-nums;
  opacity: 0.85;
}

.noone-shortcut-card {
  position: relative;
  width: 100%;
  text-align: left;
  padding: 12px 13px;
  border-radius: 13px;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--card-shadow);
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.16s ease, background-color 0.16s ease, box-shadow 0.16s ease, transform 0.16s ease;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 10px;
    bottom: 10px;
    width: 3px;
    border-radius: 0 3px 3px 0;
    background: #f59e0b;
    opacity: 0;
    transition: opacity 0.16s ease;
  }

  &:hover {
    border-color: rgba(245, 158, 11, 0.45);
    box-shadow: var(--card-shadow-hover);
    transform: translateY(-1px);

    .noone-shortcut-arrow {
      color: #d97706;
      transform: translateX(2px);
    }
  }

  &:active {
    transform: scale(0.985);
  }

  &.item-choose {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.10) 0%, var(--surface-elevated) 72%);
    border-color: rgba(245, 158, 11, 0.50);
    box-shadow: var(--card-shadow-hover);

    &::before {
      opacity: 1;
    }

    .noone-shortcut-icon {
      background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
      color: #ffffff;
      box-shadow: 0 3px 10px rgba(245, 158, 11, 0.28);
    }

    .noone-shortcut-arrow {
      color: #d97706;
    }
  }
}

.noone-shortcut-icon {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: rgba(245, 158, 11, 0.13);
  color: #d97706;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background-color 0.16s ease, color 0.16s ease, box-shadow 0.16s ease;

  :global(.dark) & {
    color: #fbbf24;
    background: rgba(245, 158, 11, 0.18);
  }
}

.noone-shortcut-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.noone-shortcut-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  line-height: 1.3;
}

.noone-shortcut-desc {
  font-size: 12px;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.noone-shortcut-arrow {
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  flex-shrink: 0;
  transition: transform 0.16s ease, color 0.16s ease;
}

.account-card {
  position: relative;
  padding: 13px 14px 11px;
  border-radius: 14px;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--card-shadow);
  cursor: pointer;
  overflow: hidden;
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease, transform 0.16s ease;

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 15px;
    bottom: 15px;
    width: 3px;
    border-radius: 0 99px 99px 0;
    background: linear-gradient(180deg, #3b82f6 0%, #2563eb 100%);
    opacity: 0;
    transform: scaleY(0.5);
    transition: opacity 0.18s ease, transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  }

  &:hover {
    border-color: var(--border-strong);
    box-shadow: var(--card-shadow-hover);
    transform: translateY(-1px);

    .corner-more-btn {
      opacity: 1;
    }
  }

  &:active {
    transform: scale(0.985);
  }

  &.item-choose {
    background: linear-gradient(145deg, rgba(37, 99, 235, 0.06) 0%, var(--surface-elevated) 62%);
    border-color: rgba(37, 99, 235, 0.38);
    box-shadow: 0 4px 14px -4px rgba(37, 99, 235, 0.16), var(--card-shadow);

    &::before {
      opacity: 1;
      transform: scaleY(1);
    }
  }
}

.skeleton-card {
  cursor: default;
  box-shadow: none;
  &:hover {
    border-color: var(--border-subtle);
    box-shadow: none;
    transform: none;
  }
}

.card-main {
  display: flex;
  align-items: center;
  gap: 12px;
}

.account-avatar {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: 15.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.18s ease, color 0.18s ease, box-shadow 0.18s ease;

  &.active {
    background: linear-gradient(135deg, #2563eb 0%, #3b82f6 100%);
    color: #ffffff;
    box-shadow: 0 4px 12px -2px rgba(37, 99, 235, 0.36), inset 0 1px 0 rgba(255, 255, 255, 0.25);
  }
}

.account-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.account-title-row {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
}

.account-local {
  font-size: 14.5px;
  font-weight: 650;
  letter-spacing: -0.015em;
  color: var(--text-primary);
  line-height: 1.3;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.primary-badge {
  flex-shrink: 0;
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: 600;
  line-height: 1.5;
  background: var(--brand-primary-soft);
  border: 1px solid rgba(37, 99, 235, 0.16);
  color: var(--brand-primary);
}

.account-domain {
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  font-size: 12.5px;
  line-height: 1.35;
  color: var(--text-secondary);

  .domain-part {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .account-alias {
    flex-shrink: 0;
    max-width: 84px;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    color: var(--text-muted);
  }
}

.card-corner-more {
  align-self: flex-start;
  margin-top: -2px;
  margin-right: -4px;
  flex-shrink: 0;
}

.corner-more-btn,
.rail-more-disabled {
  width: 26px;
  height: 26px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.corner-more-btn {
  background: transparent;
  border: 1px solid transparent;
  cursor: pointer;
  opacity: 0.7;
  transition: opacity 0.14s ease, background-color 0.14s ease, color 0.14s ease, border-color 0.14s ease, transform 0.12s ease;

  @media (hover: none) {
    opacity: 1;
  }

  &:hover {
    opacity: 1;
    background: var(--surface-subtle);
    border-color: var(--border-subtle);
    color: var(--text-primary);
  }

  &:active {
    transform: scale(0.9);
  }
}

.rail-more-disabled {
  opacity: 0.3;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: 10px;
  padding-top: 9px;
  border-top: 1px solid rgba(15, 23, 42, 0.06);

  :global(.dark) & {
    border-top-color: rgba(255, 255, 255, 0.06);
  }
}

.scope-pill {
  height: 26px;
  padding: 0 9px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--surface-subtle);
  border: 1px solid transparent;
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease, border-color 0.14s ease, transform 0.12s ease;

  .scope-dot {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--brand-primary);
    box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.18);
    flex-shrink: 0;
  }

  &:hover {
    color: var(--text-primary);
    border-color: var(--border-subtle);
    background: var(--surface-hover);
  }

  &:active {
    transform: scale(0.95);
  }

  &.enabled {
    color: var(--brand-primary);
    background: var(--brand-primary-soft);
    border-color: rgba(37, 99, 235, 0.2);

    &:hover {
      border-color: rgba(37, 99, 235, 0.38);
    }
  }
}

.copy-pill-btn {
  height: 26px;
  padding: 0 9px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary);
  background: transparent;
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease, border-color 0.14s ease, transform 0.12s ease;

  &:hover {
    background: var(--surface-subtle);
    border-color: var(--border-strong);
    color: var(--text-primary);
  }

  &:active {
    transform: scale(0.94);
  }

  &.copied {
    background: rgba(16, 185, 129, 0.12);
    border-color: rgba(16, 185, 129, 0.3);
    color: #059669;

    :global(.dark) & {
      color: #34d399;
      background: rgba(16, 185, 129, 0.18);
    }
  }
}

.empty {
  padding: 28px 10px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.noLoading {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 8px 0 4px;
  font-size: 12px;
  color: var(--text-muted);
}

.btn {
  width: 100%;
  margin-top: 14px;
}

.domain-trigger {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.domain-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-primary);
}

.setting-icon {
  color: var(--text-muted);
}

:deep(.el-input-group__append) {
  padding: 0 10px !important;
  background: var(--surface-subtle) !important;
}

:deep(.el-dialog) {
  width: 400px !important;
  @media (max-width: 440px) {
    width: calc(100% - 32px) !important;
    margin-right: 16px !important;
    margin-left: 16px !important;
  }
}

.select {
  position: absolute;
  right: 0;
  width: 100px;
  opacity: 0;
  pointer-events: none;
}

.add-email-turnstile {
  margin-top: 14px;
}

.turnstile-show {
  opacity: 1;
}

.turnstile-hide {
  opacity: 0;
  pointer-events: none;
  position: fixed;
}

.account-box.is-dark {
  .noone-shortcut-icon {
    background: rgba(245, 158, 11, 0.22);
    color: #fbbf24;
  }

  .noone-shortcut-card.item-choose {
    background: linear-gradient(135deg, rgba(245, 158, 11, 0.22) 0%, var(--surface-elevated) 75%);
    border-color: rgba(251, 191, 36, 0.52);

    .noone-shortcut-arrow {
      color: #fbbf24;
    }
  }

  .account-card.item-choose {
    background: linear-gradient(145deg, rgba(59, 130, 246, 0.22) 0%, var(--surface-elevated) 70%);
    border-color: rgba(96, 165, 250, 0.52);
    box-shadow: 0 6px 20px -6px rgba(37, 99, 235, 0.35), var(--card-shadow);
  }

  .primary-badge {
    background: rgba(59, 130, 246, 0.24);
    border-color: rgba(96, 165, 250, 0.32);
    color: #93c5fd;
  }

  .card-footer {
    border-top-color: rgba(148, 163, 184, 0.14);
  }

  .scope-pill {
    background: rgba(38, 52, 82, 0.65);
    color: #cbd5e1;

    &.enabled {
      background: rgba(59, 130, 246, 0.24);
      border-color: rgba(96, 165, 250, 0.35);
      color: #93c5fd;
    }
  }

  .copy-pill-btn {
    color: #cbd5e1;
    border-color: rgba(148, 163, 184, 0.24);

    &:hover {
      background: rgba(51, 65, 95, 0.72);
      border-color: rgba(148, 163, 184, 0.42);
      color: #f8fafc;
    }

    &.copied {
      background: rgba(16, 185, 129, 0.22);
      border-color: rgba(52, 211, 153, 0.42);
      color: #6ee7b7;
    }
  }

  .corner-more-btn {
    color: #94a3b8;
    opacity: 0.85;

    &:hover {
      color: #f8fafc;
      background: rgba(51, 65, 95, 0.72);
    }
  }
}
</style>

<style lang="scss">
.account-modal-dialog {
  .el-input-group__append {
    padding: 0 12px !important;
    background: var(--surface-muted) !important;
  }
}
</style>
