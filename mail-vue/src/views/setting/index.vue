<template>
  <div class="settings-page">
    <el-scrollbar height="100%">
      <div class="settings-container">
        <div class="settings-header">
          <div class="settings-title">{{ $t('settings') }}</div>
        </div>

        <!-- Profile Card -->
        <section class="settings-card">
          <div class="card-head">
            <span class="card-icon card-icon--blue">
              <Icon icon="lucide:users" width="16" height="16" />
            </span>
            <h2 class="card-title">{{ $t('profile') }}</h2>
          </div>

          <div class="setting-list">
            <div class="setting-row">
              <div class="row-label">{{ $t('username') }}</div>
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
                </div>
                <div v-else class="user-name">
                  <span class="name-text">{{ userStore.user.name }}</span>
                  <button type="button" class="text-action" @click="showSetName">
                    {{ $t('change') }}
                  </button>
                </div>
              </div>
            </div>

            <div class="setting-row">
              <div class="row-label">{{ $t('emailAccount') }}</div>
              <div class="row-control">
                <span class="mono-value">{{ userStore.user.email }}</span>
              </div>
            </div>

            <div class="setting-row">
              <div class="row-label">{{ $t('password') }}</div>
              <div class="row-control">
                <el-button type="primary" plain @click="pwdShow = true">
                  {{ $t('changePwdBtn') }}
                </el-button>
              </div>
            </div>
          </div>
        </section>

        <!-- Preferences Card -->
        <section class="settings-card">
          <div class="card-head">
            <span class="card-icon card-icon--violet">
              <Icon icon="lucide:palette" width="16" height="16" />
            </span>
            <h2 class="card-title">{{ $t('themeStyle') }} &amp; {{ $t('language') }}</h2>
          </div>

          <div class="setting-list">
            <div class="setting-row">
              <div class="row-label">{{ $t('preferredLanguage') }}</div>
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

            <div class="setting-row setting-row--stack">
              <div class="row-label" id="theme-label">{{ $t('themeStyle') }}</div>
              <div class="row-control">
                <ThemeSelector />
              </div>
            </div>
          </div>
        </section>

        <!-- Notice Card -->
        <section class="settings-card">
          <div class="card-head">
            <span class="card-icon card-icon--amber">
              <Icon icon="lucide:bell" width="16" height="16" />
            </span>
            <h2 class="card-title">{{ $t('noticeTitle') }}</h2>
          </div>

          <div class="setting-list">
            <div class="setting-row">
              <div class="row-label">{{ $t('noticeInfo') }}</div>
              <div class="row-control">
                <el-button @click="uiStore.showNotice()">{{ $t('viewNotice') }}</el-button>
              </div>
            </div>
          </div>
        </section>

        <!-- Danger Zone -->
        <section class="settings-card settings-card--danger" v-perm="'my:delete'">
          <div class="card-head">
            <span class="card-icon card-icon--danger">
              <Icon icon="lucide:trash-2" width="16" height="16" />
            </span>
            <h2 class="card-title">{{ $t('deleteUser') }}</h2>
          </div>

          <div class="danger-body">
            <p class="danger-desc">{{ $t('delAccountMsg') }}</p>
            <div>
              <el-button type="danger" plain @click="deleteConfirm">{{ $t('deleteUserBtn') }}</el-button>
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
import {Icon} from '@iconify/vue'
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

.settings-container {
  max-width: 820px;
  padding: 24px 28px 40px;
  display: flex;
  flex-direction: column;
  gap: 16px;

  @media (max-width: 767px) {
    padding: 16px 14px 28px;
    gap: 12px;
  }
}

.settings-header {
  padding: 2px 2px 4px;
}

.settings-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.settings-card {
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  padding: 18px 20px;
  box-shadow: var(--shadow-xs);

  @media (max-width: 767px) {
    padding: 16px;
  }

  &--danger {
    border-color: rgba(239, 68, 68, 0.25);
  }
}

.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--border-subtle);
  margin-bottom: 4px;
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

.card-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.setting-list {
  display: flex;
  flex-direction: column;
}

.setting-row {
  display: grid;
  grid-template-columns: 180px minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  padding: 14px 0;
  border-bottom: 1px solid var(--border-subtle);

  &:last-child {
    border-bottom: none;
    padding-bottom: 2px;
  }

  &--stack {
    align-items: start;
  }

  @media (max-width: 640px) {
    grid-template-columns: 1fr;
    gap: 8px;
  }
}

.row-label {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-secondary);
}

.row-control {
  min-width: 0;
  display: flex;
  align-items: center;
}

.mono-value {
  font-size: 13.5px;
  color: var(--text-primary);
  font-weight: 500;
  word-break: break-all;
}

.user-name {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
  max-width: 100%;

  .name-text {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.text-action {
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
  border: none;
  border-radius: 6px;
  padding: 3px 10px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 150ms ease;

  &:hover {
    background: rgba(37, 99, 235, 0.18);
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
  width: 160px;
  max-width: 100%;
}

.danger-body {
  padding-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.danger-desc {
  margin: 0;
  font-size: 13.5px;
  line-height: 1.6;
  color: var(--text-secondary);
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
