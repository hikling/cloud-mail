<template>
  <div class="account-box">
    <div class="head-opt">
      <div class="head-title">
        <Icon icon="lucide:mail" width="15" height="15" />
        <span>{{ $t('account') }}</span>
        <span v-if="accounts.length" class="head-count">{{ accounts.length }}</span>
      </div>
      <div class="head-actions">
        <el-tooltip v-perm="'account:add'" :content="$t('addAccount')" placement="bottom">
          <button v-perm="'account:add'" type="button" class="rail-icon-btn primary" @click="add" :aria-label="$t('addAccount')">
            <Icon icon="lucide:plus" width="16" height="16" />
          </button>
        </el-tooltip>
        <button type="button" class="rail-icon-btn" @click="refresh" aria-label="Refresh">
          <Icon icon="lucide:refresh-cw" width="14" height="14" :class="{ spinning: loading }" />
        </button>
      </div>
    </div>

    <el-scrollbar class="scrollbar" ref="scrollbarRef">
      <div class="account-list" v-infinite-scroll="getAccountList" :infinite-scroll-distance="600" :infinite-scroll-immediate="false">
        <div
          class="account-card"
          :class="{ 'item-choose': accountStore.currentAccountId === item.accountId }"
          v-for="(item, index) in accounts"
          :key="item.accountId"
          @click="changeAccount(item)"
        >
          <div class="card-top">
            <div class="account-avatar" :class="{ active: accountStore.currentAccountId === item.accountId }">
              {{ item.email?.[0]?.toUpperCase() || '@' }}
            </div>
            <div class="account-meta">
              <div class="account-email" :title="item.email">{{ item.email }}</div>
              <div class="account-sub" v-if="item.name && item.name !== item.email.split('@')[0]">{{ item.name }}</div>
            </div>
            <button
              type="button"
              class="copy-mini-btn"
              @click.stop="copyAccount(item.email, item.accountId)"
              :title="$t('copy')"
            >
              <Icon :icon="copiedId === item.accountId ? 'lucide:check' : 'lucide:copy'" width="13" height="13" />
            </button>
          </div>

          <div class="card-opt" @click.stop>
            <button
              type="button"
              class="all-receive-pill"
              :class="{ enabled: !!item.allReceive }"
              @click="setAllReceive(item)"
            >
              <Icon :icon="item.allReceive ? 'lucide:layers' : 'lucide:inbox'" width="12" height="12" />
              <span>{{ item.allReceive ? $t('all') : $t('account') }}</span>
            </button>

            <div class="card-actions">
              <span v-if="showNullSetting(item)" class="rail-more-disabled">
                <Icon icon="lucide:more-horizontal" width="15" height="15" />
              </span>
              <el-dropdown v-else trigger="click">
                <button type="button" class="rail-more-btn">
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
        </div>

        <!-- Initial Loading Skeleton -->
        <template v-if="loading">
          <div class="account-card skeleton-card" v-for="i in skeletonRows" :key="i">
            <el-skeleton animated>
              <template #template>
                <div style="display: flex; align-items: center; gap: 10px; margin-bottom: 10px">
                  <el-skeleton-item variant="circle" style="width: 28px; height: 28px; flex-shrink: 0" />
                  <el-skeleton-item variant="text" style="width: 75%; height: 14px" />
                </div>
                <div style="display: flex; justify-content: space-between">
                  <el-skeleton-item variant="text" style="width: 56px; height: 18px" />
                  <el-skeleton-item variant="text" style="width: 24px; height: 18px" />
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
                <el-skeleton-item variant="text" style="width: 75%; height: 14px; margin-bottom: 12px" />
                <div style="display: flex; justify-content: space-between">
                  <el-skeleton-item variant="text" style="width: 56px; height: 18px" />
                  <el-skeleton-item variant="text" style="width: 24px; height: 18px" />
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

    <el-dialog v-model="showAdd" :title="$t('addAccount')">
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

    <el-dialog v-model="setNameShow" :title="$t('changeUserName')">
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
import {hasPerm} from "@/perm/perm.js"
import {useI18n} from "vue-i18n";
import {AccountAllReceiveEnum} from "@/enums/account-enum.js";
import {reloadTurnstileScript} from "@/utils/turnstile-script.js";

const {t} = useI18n();
const userStore = useUserStore();
const accountStore = useAccountStore();
const settingStore = useSettingStore();
const emailStore = useEmailStore();
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

function changeAccount(account) {
  accountStore.currentAccountId = account.accountId
  accountStore.currentAccount = account
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
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.head-opt {
  height: 46px;
  padding: 0 12px 0 14px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.head-title {
  display: flex;
  align-items: center;
  gap: 7px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
}

.head-count {
  padding: 1px 6px;
  border-radius: 999px;
  font-size: 11px;
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

.rail-icon-btn {
  width: 28px;
  height: 28px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  background: var(--surface-primary);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.14s ease;

  &:hover {
    color: var(--text-primary);
    border-color: var(--border-strong);
  }

  &.primary {
    color: var(--brand-primary);
    background: var(--brand-primary-soft);
    border-color: transparent;

    &:hover {
      background: var(--brand-primary);
      color: #FFFFFF;
    }
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
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.account-card {
  position: relative;
  padding: 10px 11px;
  border-radius: 10px;
  background: var(--surface-primary);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease, box-shadow 0.15s ease;

  &:hover {
    border-color: var(--border-strong);
    box-shadow: var(--shadow-xs);

    .copy-mini-btn {
      opacity: 1;
    }
  }

  &.item-choose {
    background: var(--surface-elevated);
    border-color: var(--brand-primary);
    box-shadow: 0 0 0 1px var(--brand-primary), var(--shadow-xs);
  }
}

.skeleton-card {
  cursor: default;
  &:hover {
    border-color: var(--border-subtle);
    box-shadow: none;
  }
}

.card-top {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-bottom: 9px;
}

.account-avatar {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all 0.15s ease;

  &.active {
    background: var(--brand-primary-soft);
    color: var(--brand-primary);
  }
}

.account-meta {
  flex: 1;
  min-width: 0;
}

.account-email {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.account-sub {
  font-size: 11.5px;
  color: var(--text-muted);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.copy-mini-btn {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
  cursor: pointer;
  opacity: 0.55;
  transition: opacity 0.14s ease, background-color 0.14s ease, color 0.14s ease;
  flex-shrink: 0;

  @media (hover: none) {
    opacity: 1;
  }

  &:hover {
    opacity: 1;
    background: var(--surface-muted);
    color: var(--brand-primary);
  }
}

.card-opt {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.all-receive-pill {
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text-muted);
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.15s ease;

  &:hover {
    color: var(--text-primary);
    border-color: var(--border-strong);
  }

  &.enabled {
    color: var(--brand-primary);
    background: var(--brand-primary-soft);
    border-color: transparent;
  }
}

.card-actions {
  display: flex;
  align-items: center;
}

.rail-more-btn,
.rail-more-disabled {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-muted);
}

.rail-more-btn {
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;

  &:hover {
    background: var(--surface-muted);
    color: var(--text-primary);
  }
}

.rail-more-disabled {
  opacity: 0.35;
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
</style>
