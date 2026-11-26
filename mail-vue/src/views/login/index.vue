<template>
  <div class="login-page" :class="{ 'has-custom-bg': !!settingStore.settings.background }">
    <div class="oauth-loading" :class="oauthLoading ? 'loading-show' : 'loading-hide'">
      <loading/>
    </div>

    <!-- Default Atmospheric Backdrop vs Custom Background -->
    <div v-if="!settingStore.settings.background" class="ambient-bg" aria-hidden="true">
      <div class="ambient-orb orb-1"></div>
      <div class="ambient-orb orb-2"></div>
      <div class="ambient-orb orb-3"></div>
      <div class="ambient-grid"></div>
    </div>
    <div v-else class="custom-bg-layer" :style="background">
      <div class="custom-bg-scrim"></div>
    </div>

    <!-- Top Floating Controls -->
    <div class="top-controls">
      <button type="button" class="control-pill" @click="toggleLang" :title="settingStore.lang === 'zh' ? 'English' : '中文'">
        <Icon icon="lucide:globe" width="15" height="15"/>
        <span>{{ settingStore.lang === 'zh' ? 'EN' : '中文' }}</span>
      </button>
      <button type="button" class="control-pill icon-only" @click="toggleTheme" :aria-label="uiStore.dark ? $t('lightTheme') : $t('darkTheme')">
        <Icon :icon="uiStore.dark ? 'lucide:sun' : 'lucide:moon'" width="16" height="16"/>
      </button>
    </div>

    <div class="login-shell" :class="{ 'single-column': !!settingStore.settings.background }">
      <!-- Editorial Showcase Column (shown when no custom wallpaper overrides it) -->
      <div v-if="!settingStore.settings.background" class="hero-pane">
        <div class="hero-inner">
          <div class="brand-badge">
            <div class="brand-logo-box">
              <img :src="logoUrl" alt="Logo" class="brand-logo"/>
            </div>
            <span class="brand-name">{{ settingStore.settings.title || 'Cloud Mail' }}</span>
          </div>

          <h1 class="hero-headline">
            <template v-if="settingStore.lang === 'zh'">
              轻盈、优雅的<br/><span>个人云端邮箱</span>
            </template>
            <template v-else>
              Modern, effortless<br/><span>Personal Webmail</span>
            </template>
          </h1>

          <p class="hero-sub">
            <template v-if="settingStore.lang === 'zh'">
              基于 Cloudflare 边缘网络构建，支持多域名收发、无人收件、实时推送与 AI 验证码识别。
            </template>
            <template v-else>
              Built on Cloudflare Workers &amp; D1. Multi-domain routing, catch-all inbox, real-time WebSocket sync, and AI verification code extraction.
            </template>
          </p>

          <!-- Clean UI Preview Artifact -->
          <div class="preview-card">
            <div class="preview-card-bar">
              <div class="preview-dots"><i></i><i></i><i></i></div>
              <span class="preview-domain">{{ domainList[0] ? `inbox${domainList[0].startsWith('@') ? domainList[0] : '@' + domainList[0]}` : 'inbox@cloudmail' }}</span>
            </div>
            <div class="preview-row is-unread">
              <div class="preview-avatar blue">G</div>
              <div class="preview-meta">
                <div class="preview-top">
                  <span class="preview-sender">GitHub</span>
                  <span class="preview-time">Just now</span>
                </div>
                <div class="preview-subject">
                  <span class="preview-code">849201</span>
                  <span>Verification code for sign in</span>
                </div>
              </div>
            </div>
            <div class="preview-row">
              <div class="preview-avatar teal">C</div>
              <div class="preview-meta">
                <div class="preview-top">
                  <span class="preview-sender">Cloudflare</span>
                  <span class="preview-time">12m</span>
                </div>
                <div class="preview-subject">
                  <span>Email Routing active for your domain</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Auth Card Column -->
      <div class="auth-pane">
        <div class="auth-card" :class="{ 'glass-card': !!settingStore.settings.background }">
          <div class="card-brand">
            <div class="card-logo-box">
              <img :src="logoUrl" alt="Logo" class="card-logo"/>
            </div>
            <div class="card-brand-text">
              <div class="form-title">{{ settingStore.settings.title || 'Cloud Mail' }}</div>
              <div class="form-desc">{{ show === 'login' ? $t('loginTitle') : $t('initAdminTitle') }}</div>
            </div>
          </div>

          <div v-if="allowInitialRegister" class="mode-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              :aria-selected="show === 'login'"
              class="mode-tab"
              :class="{ active: show === 'login' }"
              @click="show = 'login'"
            >
              {{ $t('loginBtn') }}
            </button>
            <button
              type="button"
              role="tab"
              :aria-selected="show === 'register'"
              class="mode-tab"
              :class="{ active: show === 'register' }"
              @click="show = 'register'"
            >
              {{ $t('initAdminBtn') }}
            </button>
          </div>

          <!-- Login Form -->
          <div v-show="show === 'login'" class="auth-form">
            <div class="field-group">
              <el-input
                :class="!hideLoginDomain ? 'email-input' : ''"
                v-model="form.email"
                type="text"
                size="large"
                :placeholder="$t('emailAccount')"
                autocomplete="off"
                @keyup.enter="submit"
              >
                <template #append v-if="!hideLoginDomain">
                  <div class="domain-trigger" @click.stop="openSelect">
                    <el-select
                      v-if="show === 'login'"
                      ref="mySelect"
                      v-model="suffix"
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
                      <span>{{ suffix }}</span>
                      <Icon class="setting-icon" icon="lucide:chevron-down" width="14" height="14"/>
                    </div>
                  </div>
                </template>
              </el-input>
            </div>

            <div class="field-group">
              <el-input
                v-model="form.password"
                size="large"
                :placeholder="$t('password')"
                type="password"
                show-password
                autocomplete="off"
                @keyup.enter="submit"
              />
            </div>

            <div id="login-turnstile">
              <div v-if="show === 'login' && verifyShow" class="auth-turnstile">
                <div ref="loginTurnstileContainer" :key="turnstileContainerKey"></div>
                <span class="turnstile-error" v-if="botJsError">{{ $t('verifyModuleFailed', {action: $t('loginBtn')}) }}</span>
              </div>
            </div>

            <el-button class="submit-btn" size="large" type="primary" @click="submit" :loading="loginLoading">
              {{ $t('loginBtn') }}
            </el-button>

            <template v-if="oauthProviders.length > 0">
              <div class="oauth-divider">
                <span>OAuth2</span>
              </div>
              <div class="oauth-grid">
                <button
                  v-for="p in oauthProviders"
                  :key="p.key"
                  type="button"
                  class="oauth-btn"
                  @click="oauthLogin(p.key)"
                >
                  <el-avatar v-if="p.iconType === 'image'" :src="p.icon" :size="18"/>
                  <Icon v-else :icon="p.icon" width="18" height="18"/>
                  <span>{{ p.label }}</span>
                </button>
              </div>
            </template>
          </div>

          <!-- Initial Admin Setup Form (only available before any user exists) -->
          <div v-show="allowInitialRegister && show !== 'login'" class="auth-form">
            <div class="field-group">
              <el-input
                :class="!hideLoginDomain ? 'email-input' : ''"
                v-model="registerForm.email"
                type="text"
                size="large"
                :placeholder="$t('emailAccount')"
                autocomplete="off"
                @keyup.enter="submitRegister"
              >
                <template #append v-if="!hideLoginDomain">
                  <div class="domain-trigger" @click.stop="openSelect">
                    <el-select
                      v-if="show !== 'login'"
                      ref="mySelect"
                      v-model="suffix"
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
                      <span>{{ suffix }}</span>
                      <Icon class="setting-icon" icon="lucide:chevron-down" width="14" height="14"/>
                    </div>
                  </div>
                </template>
              </el-input>
            </div>

            <div class="field-group">
              <el-input
                v-model="registerForm.password"
                size="large"
                :placeholder="$t('password')"
                type="password"
                show-password
                autocomplete="off"
                @keyup.enter="submitRegister"
              />
            </div>

            <div class="field-group">
              <el-input
                v-model="registerForm.confirmPassword"
                size="large"
                :placeholder="$t('confirmPwd')"
                type="password"
                show-password
                autocomplete="off"
                @keyup.enter="submitRegister"
              />
            </div>

            <el-button class="submit-btn" size="large" type="primary" @click="submitRegister" :loading="registerLoading">
              {{ $t('initAdminBtn') }}
            </el-button>
          </div>

          <template v-if="allowInitialRegister">
            <div class="switch-row" v-if="show === 'login'" @click="show = 'register'">
              {{ $t('noAccount') }} <span>{{ $t('initAdminBtn') }}</span>
            </div>
            <div class="switch-row" v-else @click="show = 'login'">
              {{ $t('hasAccount') }} <span>{{ $t('loginSwitch') }}</span>
            </div>
          </template>
        </div>
      </div>
    </div>

    <el-dialog class="bind-dialog" v-model="showBindForm" title="注册邮箱">
      <div class="bind-container">
        <el-input
          :class="!hideLoginDomain ? 'email-input' : ''"
          v-model="bindForm.email"
          size="large"
          type="text"
          :placeholder="$t('emailAccount')"
          autocomplete="off"
          @keyup.enter="bind"
        >
          <template #append v-if="!hideLoginDomain">
            <div class="domain-trigger" @click.stop="openSelect">
              <el-select
                ref="mySelect"
                v-model="suffix"
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
                <span>{{ suffix }}</span>
                <Icon class="setting-icon" icon="lucide:chevron-down" width="14" height="14"/>
              </div>
            </div>
          </template>
        </el-input>
        <el-input
          v-if="settingStore.settings.regKey === 0"
          v-model="bindForm.code"
          size="large"
          :placeholder="$t('regKey')"
          type="text"
          autocomplete="off"
          @keyup.enter="bind"
        />
        <el-input
          v-if="settingStore.settings.regKey === 2"
          v-model="bindForm.code"
          size="large"
          :placeholder="$t('regKeyOptional')"
          type="text"
          autocomplete="off"
          @keyup.enter="bind"
        />
        <el-button class="submit-btn" size="large" type="primary" @click="bind" :loading="bindLoading">
          绑定
        </el-button>
      </div>
    </el-dialog>

    <a v-show="settingStore.settings.projectLink" class="github-link" href="https://github.com/maillab/cloud-mail" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
      <Icon icon="mingcute:github-line" width="18" height="18"/>
    </a>
  </div>
</template>

<script setup>
import router from "@/router";
import {useRoute} from "vue-router";
import {computed, nextTick, onBeforeUnmount, reactive, ref, watch} from "vue";
import {login, register} from "@/request/login.js";
import {websiteConfig} from "@/request/setting.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useSettingStore} from "@/store/setting.js";
import {useAccountStore} from "@/store/account.js";
import {useUserStore} from "@/store/user.js";
import {useUiStore} from "@/store/ui.js";
import {Icon} from "@iconify/vue";
import {cvtR2Url} from "@/utils/convert.js";
import {loginUserInfo} from "@/request/my.js";
import {permsToRouter} from "@/perm/perm.js";
import {useI18n} from "vue-i18n";
import {oauthBindUser, oauthLinuxDoLogin, oauthGithubLogin, oauthGoogleLogin} from "@/request/ouath.js";
import {reloadTurnstileScript} from "@/utils/turnstile-script.js";
import {setExtend} from "@/utils/day.js";
import loading from "@/components/loading/index.vue";

const {t} = useI18n();
const accountStore = useAccountStore();
const userStore = useUserStore();
const uiStore = useUiStore();
const settingStore = useSettingStore();
const route = useRoute();
const loginLoading = ref(false)
const bindLoading = ref(false)
const oauthLoading = ref(false);
const showBindForm = ref(false);
const show = ref('login')
const logoUrl = `${import.meta.env.BASE_URL}mail.png`
const allowInitialRegister = computed(() => settingStore.settings.allowAdminRegister === true)

watch(allowInitialRegister, (allowed) => {
  if (!allowed && show.value !== 'login') {
    show.value = 'login'
  }
}, { immediate: true })

const oauthKeys = ['linuxdo', 'github', 'google']

const oauthProvider = computed(() => {
  const fromState = route.query.state
  if (oauthKeys.includes(fromState)) return fromState
  const fromStore = sessionStorage.getItem('oauthProvider')
  return oauthKeys.includes(fromStore) ? fromStore : null
})

const oauthProviders = computed(() => {
  const allProviders = [
    { key: 'google', label: 'Google', icon: 'devicon:google', iconType: 'iconify' },
    { key: 'github', label: 'GitHub', icon: 'codicon:github-inverted', iconType: 'iconify' },
    { key: 'linuxdo', label: 'LinuxDo', icon: '/image/linuxdo.webp', iconType: 'image' },
  ]
  return allProviders.filter(p => settingStore.settings[p.key + 'Switch'] === 0)
})

const bindForm = reactive({
  email: '',
  oauthUserId: '',
  code: ''
})

const form = reactive({
  email: '',
  password: '',
});
const mySelect = ref()
const suffix = ref('')
const registerForm = reactive({
  email: '',
  password: '',
  confirmPassword: '',
  code: null
})
const domainList = settingStore.domainList;
const registerLoading = ref(false)
suffix.value = domainList[0]
const verifyShow = ref(false)
let verifyToken = ''
let turnstileId = null
const botJsError = ref(false)
let turnstileLoading = false
const loginTurnstileContainer = ref(null)
const registerTurnstileContainer = ref(null)
const turnstileContainer = computed(() => show.value === 'login' ? loginTurnstileContainer.value : registerTurnstileContainer.value)
const turnstileContainerKey = ref(0)

function toggleTheme() {
  const nextIsDark = !uiStore.dark
  document.documentElement.classList.toggle('dark', nextIsDark)
  document.getElementById('theme-color-meta')?.setAttribute('content', nextIsDark ? '#0B0D12' : '#F4F5F8')
  uiStore.dark = nextIsDark
}

function toggleLang() {
  const nextLang = settingStore.lang === 'zh' ? 'en' : 'zh'
  setExtend(nextLang === 'en' ? 'en' : 'zh-cn')
  settingStore.lang = nextLang
}

function clearTurnstile() {
  if (turnstileId !== null) window.turnstile?.remove(turnstileId)
  turnstileId = null
  verifyShow.value = false
  botJsError.value = false
  verifyToken = ''
}

watch(show, clearTurnstile)
onBeforeUnmount(clearTurnstile)

function renderTurnstile(api, container) {
  turnstileId = api.render(container, {
    sitekey: settingStore.settings.siteKey,
    size: 'flexible',
    callback: (token) => {
      if (turnstileContainer.value !== container) return
      verifyToken = token
      botJsError.value = false
    },
    'expired-callback': () => {
      if (turnstileContainer.value === container) verifyToken = ''
    },
    'error-callback': () => {
      if (turnstileContainer.value !== container) return true
      verifyToken = ''
      botJsError.value = true
      return true
    }
  })
}

async function showTurnstile() {
  if (turnstileLoading) return
  verifyToken = ''
  botJsError.value = false
  verifyShow.value = true
  turnstileLoading = true
  await nextTick()
  let container = turnstileContainer.value
  try {
    if (!container) return
    if (turnstileId !== null) {
      window.turnstile.reset(turnstileId)
    } else {
      renderTurnstile(window.turnstile, container)
    }
  } catch (error) {
    if (turnstileContainer.value !== container) return
    turnstileId = null
    turnstileContainerKey.value++
    await nextTick()
    container = turnstileContainer.value
    try {
      if (!container) return
      const api = await reloadTurnstileScript()
      if (turnstileContainer.value === container) renderTurnstile(api, container)
    } catch (error) {
      if (turnstileContainer.value === container) botJsError.value = true
      console.warn('Turnstile recovery failed', error)
    }
  } finally {
    turnstileLoading = false
  }
}

function needsTurnstile(mode, open) {
  if (verifyToken || (mode !== 0 && !(mode === 2 && open))) return false
  if (!verifyShow.value || botJsError.value) showTurnstile()
  else if (!turnstileLoading) ElMessage({message: t('botVerifyMsg'), type: 'error', plain: true})
  return true
}

const loginOpacity = computed(() => {
  const opacity = settingStore.settings.loginOpacity ?? 0.9
  return uiStore.dark ? `rgba(17, 20, 27, ${opacity})` : `rgba(255, 255, 255, ${opacity})`
})

const hideLoginDomain = computed(() => settingStore.settings.loginDomain === 1)

const background = computed(() => {
  return settingStore.settings.background ? {
    'background-image': `url(${cvtR2Url(settingStore.settings.background)})`,
    'background-repeat': 'no-repeat',
    'background-size': 'cover',
    'background-position': 'center'
  } : ''
})

const openSelect = () => {
  mySelect.value.toggleMenu()
}

const getFullEmail = (email) => {
  return hideLoginDomain.value ? email : email + suffix.value
}

const getEmailName = (email) => {
  return email.split('@')[0]
}

function oauthLogin(provider) {
  const clientId = settingStore.settings[provider + 'ClientId']
  const redirectUri = encodeURIComponent(window.location.origin + '/login')
  sessionStorage.setItem('oauthProvider', provider)
  const authorizeUrls = {
    linuxdo: `https://connect.linux.do/oauth2/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid+profile+email&state=${provider}`,
    github: `https://github.com/login/oauth/authorize?client_id=${clientId}&redirect_uri=${redirectUri}&scope=user:email&state=${provider}`,
    google: `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=openid+profile+email&state=${provider}`,
  }
  window.location.href = authorizeUrls[provider]
}

const loginFns = {
  linuxdo: oauthLinuxDoLogin,
  github: oauthGithubLogin,
  google: oauthGoogleLogin,
}

oauthGetUser();

async function oauthGetUser() {
  const params = new URLSearchParams(window.location.search)
  const code = params.get('code')
  if (!code || !oauthProvider.value) return

  const provider = oauthProvider.value
  oauthLoading.value = true
  sessionStorage.removeItem('oauthProvider')
  window.history.replaceState({}, '', window.location.origin + window.location.pathname)

  loginFns[provider](code, window.location.origin + '/login').then(data => {
    bindForm.oauthUserId = data.userInfo.oauthUserId;

    if (!data.token) {
      showBindForm.value = true
      oauthLoading.value = false
      ElMessage({
        message: '请注册绑定一个邮箱',
        type: 'warning',
        duration: 4000,
        plain: true,
      })
      return;
    }

    saveToken(data.token);
  }).catch(() => {
    oauthLoading.value = false
  })
}

function bind() {
  if (bindLoading.value) return

  if (!bindForm.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (getEmailName(bindForm.email).length < settingStore.settings.minEmailPrefix) {
    ElMessage({
      message: t('minEmailPrefix', {msg: settingStore.settings.minEmailPrefix}),
      type: 'error',
      plain: true,
    })
    return
  }

  let email = getFullEmail(bindForm.email);

  if (!isEmail(email)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (settingStore.settings.regKey === 0) {
    if (!bindForm.code) {
      ElMessage({
        message: t('emptyRegKeyMsg'),
        type: 'error',
        plain: true,
      })
      return
    }
  }

  const form = {email, oauthUserId: bindForm.oauthUserId, code: bindForm.code}

  bindLoading.value = true
  oauthBindUser(form).then(data => {
    saveToken(data.token)
  }).catch(() => {
    bindLoading.value = false
  })
}

const submit = () => {
  if (loginLoading.value) return

  if (!form.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  let email = getFullEmail(form.email);

  if (!isEmail(email)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!form.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  const {loginVerify, loginVerifyOpen} = settingStore.settings
  if (needsTurnstile(loginVerify, loginVerifyOpen)) return

  const token = verifyToken
  loginLoading.value = true
  login(email, form.password, token).then(data => saveToken(data.token)).catch(res => {
    if (res.code === 400) settingStore.settings.loginVerifyOpen = true
    if (show.value === 'login' && (token || res.code === 400)) showTurnstile()
  }).finally(() => {
    loginLoading.value = false
  })
}

async function saveToken(token) {
  localStorage.setItem('token', token)
  refreshWebsiteConfig()
  const user = await loginUserInfo();
  accountStore.currentAccountId = user.account.accountId;
  accountStore.currentAccount = user.account;
  userStore.user = user;
  const routers = permsToRouter(user.permKeys);
  routers.forEach(routerData => {
    router.addRoute('layout', routerData);
  });
  await router.replace({name: 'layout'})
  uiStore.showNotice()
  oauthLoading.value = false;
  bindLoading.value = false;
}

function refreshWebsiteConfig() {
  websiteConfig().then(setting => {
    settingStore.settings = setting
    settingStore.domainList = setting.domainList
    if (!suffix.value && setting.domainList.length > 0) {
      suffix.value = setting.domainList[0]
    }
    document.title = setting.title
  }).catch(e => {
    console.error(e)
  })
}

function submitRegister() {
  if (registerLoading.value) return

  if (!registerForm.email) {
    ElMessage({
      message: t('emptyEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (getEmailName(registerForm.email).length < settingStore.settings.minEmailPrefix) {
    ElMessage({
      message: t('minEmailPrefix', {msg: settingStore.settings.minEmailPrefix}),
      type: 'error',
      plain: true,
    })
    return
  }

  const email = getFullEmail(registerForm.email);

  if (!isEmail(email)) {
    ElMessage({
      message: t('notEmailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!registerForm.password) {
    ElMessage({
      message: t('emptyPwdMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (registerForm.password.length < 6) {
    ElMessage({
      message: t('pwdLengthMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (registerForm.password !== registerForm.confirmPassword) {
    ElMessage({
      message: t('confirmPwdFailMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!allowInitialRegister.value) {
    return
  }

  registerLoading.value = true

  const form = {
    email,
    password: registerForm.password,
    token: '',
    code: ''
  }

  register(form).then(() => {
    settingStore.settings.allowAdminRegister = false
    settingStore.settings.register = 1
    show.value = 'login'
    registerForm.email = ''
    registerForm.password = ''
    registerForm.confirmPassword = ''
    registerForm.code = ''
    registerLoading.value = false
    ElMessage({
      message: t('regSuccessMsg'),
      type: 'success',
      plain: true,
    })
  }).catch(() => {
    registerLoading.value = false
  });
}
</script>

<style>
.el-select-dropdown__item {
  padding: 0 15px;
}
</style>

<style lang="scss" scoped>
.login-page {
  position: relative;
  width: 100%;
  min-height: 100%;
  height: 100%;
  overflow-y: auto;
  overflow-x: hidden;
  background: var(--app-canvas);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ambient-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
  background: radial-gradient(circle at 12% 18%, rgba(37, 99, 235, 0.08), transparent 46%),
              radial-gradient(circle at 86% 82%, rgba(14, 165, 233, 0.08), transparent 44%),
              var(--app-canvas);
}

.dark .ambient-bg {
  background: radial-gradient(circle at 12% 18%, rgba(59, 130, 246, 0.14), transparent 48%),
              radial-gradient(circle at 86% 82%, rgba(99, 102, 241, 0.12), transparent 46%),
              var(--app-canvas);
}

.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.55;
}

.orb-1 {
  width: 420px;
  height: 420px;
  top: -120px;
  left: -80px;
  background: rgba(59, 130, 246, 0.18);
}

.orb-2 {
  width: 360px;
  height: 360px;
  bottom: -100px;
  right: 12%;
  background: rgba(14, 165, 233, 0.14);
}

.orb-3 {
  width: 280px;
  height: 280px;
  top: 40%;
  left: 38%;
  background: rgba(99, 102, 241, 0.1);
}

.ambient-grid {
  position: absolute;
  inset: 0;
  background-image: radial-gradient(rgba(15, 23, 42, 0.07) 1px, transparent 1px);
  background-size: 28px 28px;
  mask-image: radial-gradient(ellipse 80% 70% at 50% 45%, black 30%, transparent 100%);
}

.dark .ambient-grid {
  background-image: radial-gradient(rgba(255, 255, 255, 0.06) 1px, transparent 1px);
}

.custom-bg-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
}

.custom-bg-scrim {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(15, 23, 42, 0.08), rgba(15, 23, 42, 0.35));
}

.top-controls {
  position: fixed;
  top: 18px;
  right: 20px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-pill {
  height: 34px;
  padding: 0 12px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-xs);
  cursor: pointer;
  transition: all 0.16s ease;

  &.icon-only {
    width: 34px;
    padding: 0;
  }

  &:hover {
    color: var(--text-primary);
    border-color: var(--border-strong);
    transform: translateY(-1px);
  }
}

.login-shell {
  position: relative;
  z-index: 10;
  width: min(1080px, calc(100% - 40px));
  display: grid;
  grid-template-columns: 1.08fr 430px;
  gap: 56px;
  align-items: center;
  padding: 40px 0;

  &.single-column {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  @media (max-width: 960px) {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 24px;
    width: min(440px, calc(100% - 32px));
    padding: 56px 0 36px;
  }
}

.hero-pane {
  @media (max-width: 960px) {
    display: none;
  }
}

.hero-inner {
  max-width: 500px;
}

.brand-badge {
  display: inline-flex;
  align-items: center;
  gap: 10px;
  padding: 6px 14px 6px 6px;
  border-radius: 999px;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-xs);
  margin-bottom: 24px;
}

.brand-logo-box {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--brand-primary-soft);
  display: flex;
  align-items: center;
  justify-content: center;
}

.brand-logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.brand-name {
  font-size: 13.5px;
  font-weight: 600;
  color: var(--text-primary);
  letter-spacing: -0.01em;
}

.hero-headline {
  font-size: 40px;
  line-height: 1.16;
  font-weight: 700;
  letter-spacing: -0.03em;
  color: var(--text-primary);
  margin-bottom: 16px;

  span {
    background: linear-gradient(135deg, var(--brand-primary), #0EA5E9);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
  }
}

.hero-sub {
  font-size: 15px;
  line-height: 1.65;
  color: var(--text-secondary);
  margin-bottom: 30px;
}

.preview-card {
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  box-shadow: var(--shadow-md);
  overflow: hidden;
}

.preview-card-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 16px;
  background: var(--surface-subtle);
  border-bottom: 1px solid var(--border-subtle);
}

.preview-dots {
  display: flex;
  gap: 6px;

  i {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--border-strong);
  }
}

.preview-domain {
  font-size: 12px;
  color: var(--text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
}

.preview-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid var(--border-subtle);

  &:last-child {
    border-bottom: none;
  }

  &.is-unread {
    background: var(--surface-hover);

    .preview-sender,
    .preview-subject {
      font-weight: 600;
      color: var(--text-primary);
    }
  }
}

.preview-avatar {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 600;
  flex-shrink: 0;

  &.blue {
    background: rgba(37, 99, 235, 0.12);
    color: var(--brand-primary);
  }

  &.teal {
    background: rgba(16, 185, 129, 0.12);
    color: #10B981;
  }
}

.preview-meta {
  flex: 1;
  min-width: 0;
}

.preview-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2px;
}

.preview-sender {
  font-size: 13.5px;
  color: var(--text-secondary);
}

.preview-time {
  font-size: 11.5px;
  color: var(--text-muted);
}

.preview-subject {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12.5px;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-code {
  padding: 1px 7px;
  border-radius: 5px;
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  font-weight: 600;
}

.auth-pane {
  width: 100%;
  max-width: 430px;
}

.auth-card {
  width: 100%;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  padding: 32px 30px 28px;
  box-shadow: var(--shadow-lg);

  &.glass-card {
    background: v-bind(loginOpacity);
    backdrop-filter: blur(22px) saturate(160%);
    -webkit-backdrop-filter: blur(22px) saturate(160%);
  }

  @media (max-width: 480px) {
    padding: 26px 20px 22px;
    border-radius: 16px;
  }
}

.card-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 22px;
}

.card-logo-box {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-logo {
  width: 26px;
  height: 26px;
  object-fit: contain;
}

.card-brand-text {
  min-width: 0;
}

.form-title {
  font-size: 19px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.form-desc {
  font-size: 13px;
  color: var(--form-desc-color);
  margin-top: 2px;
}

.mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 10px;
  background: var(--surface-muted);
  margin-bottom: 20px;
}

.mode-tab {
  height: 34px;
  border-radius: 7px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 0.16s ease;

  &.active {
    background: var(--surface-elevated);
    color: var(--text-primary);
    box-shadow: var(--shadow-xs);
  }
}

.auth-form {
  display: flex;
  flex-direction: column;
}

.field-group {
  margin-bottom: 14px;
}

.email-input :deep(.el-input__wrapper) {
  border-radius: 8px 0 0 8px !important;
}

:deep(.el-input-group__append) {
  padding: 0 10px !important;
  border-radius: 0 8px 8px 0 !important;
  background: var(--surface-subtle) !important;
  cursor: pointer;
}

.domain-trigger {
  display: flex;
  align-items: center;
  height: 100%;
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

.select {
  position: absolute;
  right: 0;
  width: 100px;
  opacity: 0;
  pointer-events: none;
  visibility: hidden;
}

.auth-turnstile {
  margin-bottom: 14px;
}

.turnstile-error {
  font-size: 12px;
  color: var(--el-color-danger);
}

.submit-btn {
  width: 100%;
  height: 42px;
  font-size: 14.5px;
  font-weight: 600;
  margin-top: 2px;
}

.oauth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 18px 0 14px;
  color: var(--text-muted);
  font-size: 12px;

  &::before,
  &::after {
    content: '';
    flex: 1;
    height: 1px;
    background: var(--border-subtle);
  }
}

.oauth-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  gap: 8px;
}

.oauth-btn {
  height: 38px;
  padding: 0 12px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-primary);
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.16s ease;

  &:hover {
    background: var(--surface-hover);
    border-color: var(--border-strong);
  }
}

.switch-row {
  margin-top: 18px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;

  span {
    color: var(--login-switch-color);
    font-weight: 600;
    margin-left: 4px;
  }

  &:hover span {
    text-decoration: underline;
  }
}

:deep(.bind-dialog) {
  width: 400px !important;
  @media (max-width: 440px) {
    width: calc(100% - 32px) !important;
  }
}

.bind-container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.github-link {
  position: fixed;
  width: 36px;
  height: 36px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  background: var(--surface-elevated);
  color: var(--text-secondary);
  bottom: 16px;
  right: 18px;
  z-index: 20;
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-sm);
  transition: all 0.16s ease;

  &:hover {
    color: var(--text-primary);
    transform: translateY(-1px);
  }
}

.oauth-loading {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--loadding-background);
  backdrop-filter: blur(6px);
  z-index: 40;
}

.loading-show {
  transition: all 200ms ease 200ms;
  opacity: 1;
}

.loading-hide {
  pointer-events: none;
  transition: var(--loading-hide-transition);
  opacity: 0;
}
</style>
