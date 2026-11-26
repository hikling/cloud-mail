<template>
  <div class="settings-page">
    <el-scrollbar height="100%">
      <div class="settings-shell">
        <header class="settings-head">
          <h1 class="settings-title">{{ $t('settings') }}</h1>
        </header>

        <!-- Identity Summary Strip -->
        <div class="identity-banner">
          <div class="identity-avatar">
            {{ (userStore.user?.email || 'U')[0]?.toUpperCase() }}
          </div>
          <div class="identity-meta">
            <div class="identity-name-row">
              <span class="identity-name">{{ userStore.user?.name || userStore.user?.email }}</span>
              <el-tag v-if="userStore.user?.role?.name" size="small" effect="plain">
                {{ userStore.user.role.name }}
              </el-tag>
            </div>
            <div class="identity-email">{{ userStore.user?.email }}</div>
          </div>
        </div>

        <!-- Profile Section -->
        <section class="setting-group">
          <div class="group-heading">{{ $t('profile') }}</div>
          <div class="setting-sheet">
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

        <!-- Appearance & Language Section -->
        <section class="setting-group">
          <div class="group-heading">{{ $t('themeStyle') }} &amp; {{ $t('language') }}</div>
          <div class="setting-sheet">
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
          </div>
        </section>

        <!-- System Notice Section -->
        <section class="setting-group">
          <div class="group-heading">{{ $t('noticeTitle') }}</div>
          <div class="setting-sheet">
            <div class="setting-row">
              <div class="row-info">
                <div class="row-label">{{ $t('noticeTitle') }}</div>
                <div class="row-desc">{{ $t('noticeInfo') }}</div>
              </div>
              <div class="row-control">
                <el-button size="small" @click="uiStore.showNotice()">
                  {{ $t('viewNotice') }}
                </el-button>
              </div>
            </div>
          </div>
        </section>

        <!-- Danger Zone Section -->
        <section class="setting-group" v-perm="'my:delete'">
          <div class="group-heading group-heading--danger">{{ $t('deleteUser') }}</div>
          <div class="setting-sheet setting-sheet--danger">
            <div class="setting-row">
              <div class="row-info">
                <div class="row-label">{{ $t('deleteUser') }}</div>
                <div class="row-desc">{{ $t('delAccountMsg') }}</div>
              </div>
              <div class="row-control">
                <el-button type="danger" plain size="small" @click="deleteConfirm">
                  {{ $t('deleteUserBtn') }}
                </el-button>
              </div>
            </div>
          </div>
        </section>

        <el-dialog v-model="pwdShow" :title="$t('changePassword')" width="380">
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
import {reactive, ref, defineOptions} from 'vue'
import {resetPassword, userDelete} from "@/request/my.js";
import {useUserStore} from "@/store/user.js";
import router from "@/router/index.js";
import {accountSetName} from "@/request/account.js";
import {useAccountStore} from "@/store/account.js";
import {useI18n} from "vue-i18n";
import {useSettingStore} from "@/store/setting.js";
import {useUiStore} from "@/store/ui.js";
import ThemeSelector from "@/components/theme-selector/index.vue";

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
  max-width: 760px;
  margin: 0 auto;
  padding: 28px 24px 56px;
  display: flex;
  flex-direction: column;
  gap: 24px;

  @media (max-width: 767px) {
    padding: 18px 14px 36px;
    gap: 20px;
  }
}

.settings-head {
  padding-bottom: 2px;
}

.settings-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--text-primary);
}

.identity-banner {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 18px 20px;
  border-radius: 16px;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-xs);
}

.identity-avatar {
  width: 46px;
  height: 46px;
  border-radius: 12px;
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
  font-size: 18px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.identity-meta {
  min-width: 0;
  flex: 1;
}

.identity-name-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.identity-name {
  font-size: 15.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.identity-email {
  margin-top: 2px;
  font-size: 13px;
  color: var(--text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.group-heading {
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-muted);
  padding-left: 4px;

  &--danger {
    color: #ef4444;
  }
}

.setting-sheet {
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  box-shadow: var(--shadow-xs);
  overflow: hidden;

  &--danger {
    border-color: rgba(239, 68, 68, 0.25);
  }
}

.setting-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-subtle);

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
}

.row-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--text-primary);
  line-height: 1.4;
}

.row-desc {
  margin-top: 3px;
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
