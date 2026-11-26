<template>
  <div class="settings-page">
    <el-scrollbar height="100%">
      <div class="settings-shell">
        <header class="page-header">
          <div class="header-copy">
            <h1 class="settings-title">{{ $t('settings') }}</h1>
          </div>
        </header>

        <div class="settings-grid">
          <!-- Left Column: Profile Hero & Quotas + Danger Zone -->
          <aside class="profile-col">
            <div class="profile-hero-card">
              <div class="hero-cover" aria-hidden="true"></div>
              <div class="hero-body">
                <div class="hero-avatar">
                  {{ (userStore.user?.email || 'U')[0]?.toUpperCase() }}
                </div>
                <div class="hero-identity">
                  <div class="hero-name-row">
                    <span class="hero-name">{{ userStore.user?.name || userStore.user?.email }}</span>
                    <el-tag v-if="userStore.user?.role?.name" size="small" effect="light">
                      {{ userStore.user.role.name }}
                    </el-tag>
                  </div>
                  <button type="button" class="hero-email-btn" @click="copyEmail(userStore.user?.email)">
                    <span>{{ userStore.user?.email }}</span>
                    <Icon icon="lucide:copy" width="12" height="12" />
                  </button>
                </div>

                <div class="hero-quotas">
                  <div class="quota-box">
                    <div class="quota-label">{{ $t('sendCount') }}</div>
                    <div class="quota-val">
                      <span v-if="sendCount" class="quota-num">{{ sendCount }}</span>
                      <el-tag size="small" effect="plain">{{ sendType }}</el-tag>
                    </div>
                  </div>
                  <div class="quota-box">
                    <div class="quota-label">{{ $t('accountCount') }}</div>
                    <div class="quota-val">
                      <el-tag size="small" type="info" v-if="settingStore.settings.manyEmail || settingStore.settings.addEmail">
                        {{ $t('disabled') }}
                      </el-tag>
                      <span v-else-if="accountCount && hasPerm('account:add')" class="quota-num">
                        {{ $t('totalUserAccount', { msg: accountCount }) }}
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

                <div class="hero-actions">
                  <el-button type="primary" plain class="hero-action-btn" @click="pwdShow = true">
                    <Icon icon="lucide:key-round" width="14" height="14" style="margin-right: 6px" />
                    {{ $t('changePwdBtn') }}
                  </el-button>
                </div>
              </div>
            </div>

            <!-- Danger Zone -->
            <section class="danger-card" v-perm="'my:delete'">
              <div class="danger-head">
                <span class="card-icon card-icon--danger">
                  <Icon icon="lucide:trash-2" width="15" height="15" />
                </span>
                <span class="danger-title">{{ $t('deleteUser') }}</span>
              </div>
              <p class="danger-desc">{{ $t('delAccountMsg') }}</p>
              <el-button type="danger" plain class="danger-btn" @click="deleteConfirm">
                {{ $t('deleteUserBtn') }}
              </el-button>
            </section>
          </aside>

          <!-- Right Column: Account Settings + Appearance & Language + Notice -->
          <main class="main-col">
            <!-- Profile & Security -->
            <section class="panel-card">
              <div class="panel-head">
                <span class="card-icon card-icon--blue">
                  <Icon icon="lucide:users" width="16" height="16" />
                </span>
                <h2 class="panel-title">{{ $t('profile') }}</h2>
              </div>

              <div class="panel-rows">
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('username') }}</div>
                  </div>
                  <div class="row-control">
                    <div v-if="setNameShow" class="edit-name-group">
                      <el-input
                        v-model="accountName"
                        class="name-input"
                        @keyup.enter="setName"
                      />
                      <el-button type="primary" size="small" @click="setName">
                        {{ $t('save') }}
                      </el-button>
                      <el-button size="small" @click="setNameShow = false">
                        {{ $t('cancel') }}
                      </el-button>
                    </div>
                    <div v-else class="user-name">
                      <span class="name-text">{{ userStore.user.name }}</span>
                      <el-button size="small" @click="showSetName">
                        {{ $t('change') }}
                      </el-button>
                    </div>
                  </div>
                </div>

                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('emailAccount') }}</div>
                  </div>
                  <div class="row-control">
                    <span class="mono-value">{{ userStore.user.email }}</span>
                  </div>
                </div>

                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('password') }}</div>
                  </div>
                  <div class="row-control">
                    <el-button size="small" @click="pwdShow = true">
                      {{ $t('changePwdBtn') }}
                    </el-button>
                  </div>
                </div>
              </div>
            </section>

            <!-- Appearance & Language -->
            <section class="panel-card">
              <div class="panel-head">
                <span class="card-icon card-icon--violet">
                  <Icon icon="lucide:palette" width="16" height="16" />
                </span>
                <h2 class="panel-title">{{ $t('themeStyle') }} &amp; {{ $t('language') }}</h2>
              </div>

              <div class="panel-rows">
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('preferredLanguage') }}</div>
                  </div>
                  <div class="row-control">
                    <el-select
                      :model-value="langSelect"
                      class="language-select"
                      placeholder="Select"
                      @change="changeLang"
                    >
                      <el-option label="中文" value="zh" @pointerdown.prevent.stop="changeLang('zh')" />
                      <el-option label="English" value="en" @pointerdown.prevent.stop="changeLang('en')" />
                    </el-select>
                  </div>
                </div>

                <div class="setting-row setting-row--vertical">
                  <div class="row-info">
                    <div class="row-label" id="theme-label">{{ $t('themeStyle') }}</div>
                  </div>
                  <div class="row-control row-control--full">
                    <ThemeSelector />
                  </div>
                </div>

                <div class="setting-row setting-row--vertical">
                  <div class="row-info">
                    <div class="row-label">{{ $t('auroraThemeTitle') }}</div>
                    <div class="row-desc">{{ $t('auroraThemeDesc') }}</div>
                  </div>
                  <div class="row-control row-control--full">
                    <AuroraPicker />
                  </div>
                </div>
              </div>
            </section>
          </main>
        </div>

        <el-dialog v-model="pwdShow" :title="$t('changePassword')" width="380" append-to-body align-center>
          <div class="update-pwd">
            <el-input
              type="password"
              show-password
              :placeholder="$t('newPassword')"
              v-model="form.password"
              autocomplete="off"
              @keyup.enter="submitPwd"
            />
            <el-input
              type="password"
              show-password
              :placeholder="$t('confirmPassword')"
              v-model="form.newPwd"
              autocomplete="off"
              @keyup.enter="submitPwd"
            />
            <el-button class="pwd-submit" type="primary" :loading="setPwdLoading" @click="submitPwd">
              {{ $t('save') }}
            </el-button>
          </div>
        </el-dialog>
      </div>
    </el-scrollbar>
  </div>
</template>

<script setup>
import {computed, reactive, ref, defineOptions} from 'vue'
import {Icon} from '@iconify/vue'
import {resetPassword, userDelete} from "@/request/my.js";
import {useUserStore} from "@/store/user.js";
import router from "@/router/index.js";
import {accountSetName} from "@/request/account.js";
import {useAccountStore} from "@/store/account.js";
import {useI18n} from "vue-i18n";
import {useSettingStore} from "@/store/setting.js";
import {useUiStore} from "@/store/ui.js";
import {hasPerm} from "@/perm/perm.js";
import ThemeSelector from "@/components/theme-selector/index.vue";
import AuroraPicker from "@/components/aurora-picker/index.vue";

const { t } = useI18n()
const accountStore = useAccountStore()
const settingStore = useSettingStore()
const uiStore = useUiStore()
const userStore = useUserStore();
const setPwdLoading = ref(false)
const setNameShow = ref(false)
const accountName = ref(null)
const langSelect = ref(settingStore.lang)

defineOptions({
  name: 'setting'
})

const accountCount = computed(() => userStore.user?.role?.accountCount)

const sendType = computed(() => {
  if (settingStore.settings.send === 1) return t('disabled')
  if (!hasPerm('email:send')) return t('unauthorized')
  const role = userStore.user?.role
  if (!role) return t('unlimited')
  if (role.sendType === 'ban') return t('sendBanned')
  if (role.sendType === 'internal') return t('sendInternal')
  if (!role.sendCount) return t('unlimited')
  if (role.sendType === 'day') return t('daily')
  if (role.sendType === 'count') return t('total')
  return t('unlimited')
})

const sendCount = computed(() => {
  const role = userStore.user?.role
  if (!role || !hasPerm('email:send')) return null
  if (role.sendType === 'ban' || role.sendType === 'internal') return null
  if (!role.sendCount || settingStore.settings.send === 1) return null
  return userStore.user.sendCount + '/' + role.sendCount
})

async function copyEmail(email) {
  if (!email) return
  try {
    await navigator.clipboard.writeText(email)
    ElMessage({ message: t('copySuccessMsg'), type: 'success', plain: true })
  } catch {
    ElMessage({ message: t('copyFailMsg'), type: 'error', plain: true })
  }
}

function showSetName() {
  accountName.value = userStore.user.name
  setNameShow.value = true
}

function setName() {

  if (!accountName.value) {
    ElMessage({
      message: t('emptyUserNameMsg'),
      type: 'error',
      plain: true,
    })
    return;
  }

  setNameShow.value = false
  let name = accountName.value

  if (name === userStore.user.name) {
    return
  }

  userStore.user.name = accountName.value

  accountSetName(userStore.user.account.accountId,name).then(() => {
    ElMessage({
      message: t('saveSuccessMsg'),
      type: 'success',
      plain: true,
    })

    accountStore.changeUserAccountName = name

  }).catch(() => {
    userStore.user.name = name
  })
}

function changeLang(lang) {
  let setting = {}
  try {
    setting = JSON.parse(localStorage.getItem('setting') || '{}')
  } catch (e) {
    setting = {}
  }
  localStorage.setItem('setting', JSON.stringify({...setting, lang}))
  window.location.reload()
}

const pwdShow = ref(false)
const form = reactive({
  password: '',
  newPwd: '',
})

const deleteConfirm = () => {
  ElMessageBox.confirm(t('delAccountConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userDelete().then(() => {
      localStorage.removeItem('token');
      router.replace('/login');
      ElMessage({
        message: t('delSuccessMsg'),
        type: 'success',
        plain: true,
      })
    })
  })
}


function submitPwd() {

  if (setPwdLoading.value) return

  if (!form.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (form.password.length < 6) {
    ElMessage({
      message: t('pwdLengthMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (form.password !== form.newPwd) {
    ElMessage({
      message: t('confirmPwdFailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  setPwdLoading.value = true
  resetPassword(form.password).then(() => {
    ElMessage({
      message: t('saveSuccessMsg'),
      type: 'success',
      plain: true,
    })
    pwdShow.value = false
    setPwdLoading.value = false
    form.password = ''
    form.newPwd = ''
  }).catch(() => {
    setPwdLoading.value = false
  })

}
</script>

<style scoped lang="scss">
.settings-page {
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  background: var(--app-canvas);
}

.settings-shell {
  max-width: 1220px;
  margin: 0 auto;
  padding: 28px 32px 56px;
  display: flex;
  flex-direction: column;
  gap: 22px;

  @media (max-width: 900px) {
    padding: 18px 14px 36px;
    gap: 16px;
  }
}

.page-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.settings-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--text-primary);
}

.settings-grid {
  display: grid;
  grid-template-columns: 350px minmax(0, 1fr);
  gap: 24px;
  align-items: start;

  @media (max-width: 960px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 18px;
  }
}

.profile-col,
.main-col {
  display: flex;
  flex-direction: column;
  gap: 20px;
  min-width: 0;
}

/* Profile Hero Card */
.profile-hero-card {
  background: var(--surface-elevated);
  backdrop-filter: blur(var(--ws-blur, 20px)) saturate(175%);
  -webkit-backdrop-filter: blur(var(--ws-blur, 20px)) saturate(175%);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.hero-cover {
  height: 76px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.16) 0%, rgba(99, 102, 241, 0.12) 55%, rgba(14, 165, 233, 0.12) 100%);
  border-bottom: 1px solid var(--border-subtle);
}

.hero-body {
  padding: 0 22px 22px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.hero-avatar {
  margin-top: -28px;
  width: 58px;
  height: 58px;
  border-radius: 16px;
  background: var(--brand-primary);
  color: #ffffff;
  font-size: 22px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3px solid var(--surface-elevated);
  box-shadow: var(--shadow-sm);
}

.hero-identity {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-width: 0;
}

.hero-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.hero-name {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  letter-spacing: -0.02em;
}

.hero-email-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13px;
  cursor: pointer;
  max-width: 100%;
  text-align: left;

  span {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  &:hover {
    color: var(--brand-primary);
  }
}

.hero-quotas {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.quota-box {
  padding: 12px;
  border-radius: 12px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.quota-label {
  font-size: 12px;
  color: var(--text-muted);
}

.quota-val {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-wrap: wrap;
}

.quota-num {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
}

.hero-actions {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;

  .hero-action-btn {
    margin: 0;
    height: 38px;
  }
}

/* Danger Zone Card */
.danger-card {
  background: var(--surface-elevated);
  backdrop-filter: blur(var(--ws-blur, 20px)) saturate(175%);
  -webkit-backdrop-filter: blur(var(--ws-blur, 20px)) saturate(175%);
  border: 1px solid rgba(239, 68, 68, 0.28);
  border-radius: 16px;
  padding: 18px 20px;
  box-shadow: var(--card-shadow);
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.danger-head {
  display: flex;
  align-items: center;
  gap: 10px;
}

.danger-title {
  font-size: 14.5px;
  font-weight: 600;
  color: #ef4444;
}

.danger-desc {
  margin: 0;
  font-size: 13px;
  line-height: 1.55;
  color: var(--text-secondary);
}

.danger-btn {
  align-self: flex-start;
}

/* Main Right Cards */
.panel-card {
  background: var(--surface-elevated);
  backdrop-filter: blur(var(--ws-blur, 20px)) saturate(175%);
  -webkit-backdrop-filter: blur(var(--ws-blur, 20px)) saturate(175%);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  box-shadow: var(--card-shadow);
  overflow: hidden;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.panel-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 22px;
  border-bottom: 1px solid var(--border-subtle);
}

.panel-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &--blue {
    background: var(--brand-primary-soft);
    color: var(--brand-primary);
  }

  &--violet {
    background: rgba(124, 58, 237, 0.12);
    color: #7c3aed;
  }

  &--amber {
    background: rgba(245, 158, 11, 0.14);
    color: #d97706;
  }

  &--danger {
    background: rgba(239, 68, 68, 0.12);
    color: #ef4444;
  }
}

.panel-rows {
  display: flex;
  flex-direction: column;
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 22px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background-color 0.14s ease;

  &:not(.setting-row--vertical):hover {
    background: var(--row-hover-tint);
  }

  &:last-child {
    border-bottom: none;
  }

  &--vertical {
    flex-direction: column;
    align-items: flex-start;
    gap: 14px;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 14px 16px;
  }
}

.row-info {
  min-width: 0;
  flex: 1;

  &--with-icon {
    display: flex;
    align-items: center;
    gap: 12px;
  }
}

.row-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
}

.row-desc {
  margin-top: 2px;
  font-size: 12.5px;
  line-height: 1.5;
  color: var(--text-muted);
}

.row-control {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  min-width: 0;

  &--full {
    width: 100%;
    justify-content: flex-start;
  }

  @media (max-width: 600px) {
    width: 100%;
    justify-content: flex-start;
  }
}

.mono-value {
  font-size: 13.5px;
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  word-break: break-all;
}

.user-name {
  display: inline-flex;
  align-items: center;
  gap: 12px;
  max-width: 100%;

  .name-text {
    font-size: 14px;
    font-weight: 500;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.edit-name-group {
  display: flex;
  align-items: center;
  gap: 8px;
  width: min(320px, 100%);

  .name-input {
    flex: 1;
    min-width: 0;
  }
}

.language-select {
  width: 150px;
  max-width: 100%;
}

.update-pwd {
  display: flex;
  flex-direction: column;
  gap: 14px;

  .pwd-submit {
    width: 100%;
    height: 38px;
  }
}
</style>
