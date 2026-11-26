<template>
  <div
    ref="loginPageRef"
    class="login-page"
    :class="{ 'is-dark': uiStore.dark }"
    :style="pointerCssVars"
    @pointermove="handlePointerMove"
    @pointerleave="handlePointerLeave"
  >
    <div class="oauth-loading" :class="oauthLoading ? 'loading-show' : 'loading-hide'">
      <loading/>
    </div>

    <!-- Cinematic Aurora Backdrop -->
    <div class="ambient-bg" aria-hidden="true">
      <div class="ambient-orb orb-1"></div>
      <div class="ambient-orb orb-2"></div>
      <div class="ambient-orb orb-3"></div>
      <div class="ambient-orb orb-4"></div>
      <div class="ambient-beam"></div>
      <div class="ambient-grid"></div>
      <div class="cursor-spotlight"></div>
    </div>

    <!-- Top Floating Controls -->
    <div class="top-controls">
      <button type="button" class="control-pill" @click="toggleLang" :title="settingStore.lang === 'zh' ? 'English' : '中文'">
        <Icon icon="lucide:globe" width="15" height="15"/>
        <span>{{ settingStore.lang === 'zh' ? 'EN' : '中文' }}</span>
      </button>
      <button type="button" class="control-pill icon-only theme-pill" @click="toggleTheme" :aria-label="uiStore.dark ? $t('lightTheme') : $t('darkTheme')">
        <Icon :icon="uiStore.dark ? 'lucide:sun' : 'lucide:moon'" width="16" height="16"/>
      </button>
    </div>

    <div class="login-shell">
      <!-- Flagship Showcase Column -->
      <div class="hero-pane">
        <div class="hero-inner">
          <h1 class="hero-headline">
            <template v-if="settingStore.lang === 'zh'">
              轻盈、极速的<br/><span class="gradient-flow">个人云端邮箱</span>
            </template>
            <template v-else>
              Next-gen, effortless<br/><span class="gradient-flow">Personal Webmail</span>
            </template>
          </h1>

          <p class="hero-sub">
            <template v-if="settingStore.lang === 'zh'">
              构建于 Cloudflare 全球边缘网络，集多域名收发、无人收件、实时推送与 AI 验证码提取于一体。
            </template>
            <template v-else>
              Built on Cloudflare Workers &amp; D1. Multi-domain routing, catch-all inbox, real-time sync, and instant AI code extraction.
            </template>
          </p>

          <div class="feature-pills">
            <span class="feature-pill">
              <Icon icon="lucide:zap" width="13" height="13"/>
              <span>{{ settingStore.lang === 'zh' ? '毫秒实时推送' : 'Instant Sync' }}</span>
            </span>
            <span class="feature-pill">
              <Icon icon="lucide:sparkles" width="13" height="13"/>
              <span>{{ settingStore.lang === 'zh' ? 'AI 验证码识别' : 'AI Code Extract' }}</span>
            </span>
            <span class="feature-pill">
              <Icon icon="lucide:at-sign" width="13" height="13"/>
              <span>{{ settingStore.lang === 'zh' ? '全域无人收件' : 'Catch-All Routing' }}</span>
            </span>
          </div>

          <!-- Interactive 3D Glass Console Preview -->
          <div class="showcase-stage">
            <div class="showcase-glow" aria-hidden="true"></div>
            <div class="preview-card" :style="previewTiltStyle">
              <div class="preview-card-bar">
                <div class="preview-dots">
                  <i class="dot-red"></i>
                  <i class="dot-amber"></i>
                  <i class="dot-green"></i>
                </div>
                <span class="preview-domain">{{ previewAddress }}</span>
                <span class="preview-live">
                  <i></i>LIVE
                </span>
              </div>

              <div class="preview-row is-unread">
                <div class="preview-avatar blue">G</div>
                <div class="preview-meta">
                  <div class="preview-top">
                    <span class="preview-sender">GitHub Security</span>
                    <span class="preview-time">{{ settingStore.lang === 'zh' ? '刚刚' : 'Just now' }}</span>
                  </div>
                  <div class="preview-subject">
                    <button
                      type="button"
                      class="preview-code"
                      :class="{ copied: previewCopied }"
                      @click="copyPreviewCode"
                    >
                      <Icon :icon="previewCopied ? 'lucide:check' : 'lucide:key-round'" width="11" height="11"/>
                      <span>849201</span>
                    </button>
                    <span class="preview-subject-text">Verification code for sign in</span>
                  </div>
                </div>
              </div>

              <div class="preview-row">
                <div class="preview-avatar amber">C</div>
                <div class="preview-meta">
                  <div class="preview-top">
                    <span class="preview-sender">Cloudflare</span>
                    <span class="preview-time">2m</span>
                  </div>
                  <div class="preview-subject">
                    <span class="preview-subject-text">Email Routing active for your custom domain</span>
                  </div>
                </div>
              </div>

              <div class="preview-row">
                <div class="preview-avatar violet">L</div>
                <div class="preview-meta">
                  <div class="preview-top">
                    <span class="preview-sender">Linear</span>
                    <span class="preview-time">15m</span>
                  </div>
                  <div class="preview-subject">
                    <span class="preview-subject-text">Workspace digest · All systems operational</span>
                  </div>
                </div>
              </div>
            </div>

            <!-- Floating Satellite Depth Card -->
            <div class="floating-toast" aria-hidden="true">
              <span class="toast-icon">
                <Icon icon="lucide:sparkles" width="13" height="13"/>
              </span>
              <span class="toast-label">{{ settingStore.lang === 'zh' ? 'AI 已提取验证码' : 'AI Code Ready' }}</span>
              <span class="toast-code">849201</span>
            </div>
          </div>
        </div>
      </div>

      <!-- Luminous Prism Auth Card Column -->
      <div class="auth-pane">
        <div class="auth-card-frame">
          <div class="auth-card">
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
                  :class="['prism-input', !hideLoginDomain ? 'email-input' : '']"
                  v-model="form.email"
                  type="text"
                  size="large"
                  :placeholder="$t('emailAccount')"
                  autocomplete="off"
                  @keyup.enter="submit"
                >
                  <template #prefix>
                    <Icon icon="lucide:mail" width="16" height="16" class="input-icon"/>
                  </template>
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
                  class="prism-input"
                  v-model="form.password"
                  size="large"
                  :placeholder="$t('password')"
                  type="password"
                  show-password
                  autocomplete="off"
                  @keyup.enter="submit"
                >
                  <template #prefix>
                    <Icon icon="lucide:lock" width="16" height="16" class="input-icon"/>
                  </template>
                </el-input>
              </div>

              <div id="login-turnstile">
                <div v-if="show === 'login' && verifyShow" class="auth-turnstile">
                  <div ref="loginTurnstileContainer" :key="turnstileContainerKey"></div>
                  <span class="turnstile-error" v-if="botJsError">{{ $t('verifyModuleFailed', {action: $t('loginBtn')}) }}</span>
                </div>
              </div>

              <el-button class="submit-btn" size="large" type="primary" @click="submit" :loading="loginLoading">
                <span class="submit-btn-inner">
                  <span>{{ $t('loginBtn') }}</span>
                  <Icon v-if="!loginLoading" icon="lucide:arrow-right" width="16" height="16" class="submit-arrow"/>
                </span>
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
                  :class="['prism-input', !hideLoginDomain ? 'email-input' : '']"
                  v-model="registerForm.email"
                  type="text"
                  size="large"
                  :placeholder="$t('emailAccount')"
                  autocomplete="off"
                  @keyup.enter="submitRegister"
                >
                  <template #prefix>
                    <Icon icon="lucide:mail" width="16" height="16" class="input-icon"/>
                  </template>
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
                  class="prism-input"
                  v-model="registerForm.password"
                  size="large"
                  :placeholder="$t('password')"
                  type="password"
                  show-password
                  autocomplete="off"
                  @keyup.enter="submitRegister"
                >
                  <template #prefix>
                    <Icon icon="lucide:lock" width="16" height="16" class="input-icon"/>
                  </template>
                </el-input>
              </div>

              <div class="field-group">
                <el-input
                  class="prism-input"
                  v-model="registerForm.confirmPassword"
                  size="large"
                  :placeholder="$t('confirmPwd')"
                  type="password"
                  show-password
                  autocomplete="off"
                  @keyup.enter="submitRegister"
                >
                  <template #prefix>
                    <Icon icon="lucide:shield-check" width="16" height="16" class="input-icon"/>
                  </template>
                </el-input>
              </div>

              <el-button class="submit-btn" size="large" type="primary" @click="submitRegister" :loading="registerLoading">
                <span class="submit-btn-inner">
                  <span>{{ $t('initAdminBtn') }}</span>
                  <Icon v-if="!registerLoading" icon="lucide:arrow-right" width="16" height="16" class="submit-arrow"/>
                </span>
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

            <div class="card-foot">
              <Icon icon="lucide:shield-check" width="13.5" height="13.5" class="card-foot-icon"/>
              <span>{{ settingStore.lang === 'zh' ? 'Cloudflare 边缘安全加密 · 私人邮箱门户' : 'Cloudflare Edge Secured · Private Mail Portal' }}</span>
            </div>
          </div>
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

    <a v-show="settingStore.settings.projectLink" class="github-link" href="https://github.com/hikling/cloud-mail" target="_blank" rel="noopener noreferrer" aria-label="GitHub">
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

const loginPageRef = ref(null)
const pointer = reactive({ x: 50, y: 40, tiltX: 0, tiltY: 0, active: false })
const previewCopied = ref(false)
let previewCopyTimer = null

const previewAddress = computed(() => {
  const first = settingStore.domainList?.[0]
  if (!first) return 'inbox@cloudmail'
  return `inbox${first.startsWith('@') ? first : '@' + first}`
})

const pointerCssVars = computed(() => ({
  '--mx': `${pointer.x}%`,
  '--my': `${pointer.y}%`,
  '--spot-opacity': pointer.active ? '1' : '0',
}))

const previewTiltStyle = computed(() => ({
  transform: `perspective(1200px) rotateX(${pointer.tiltX}deg) rotateY(${pointer.tiltY}deg)`,
}))

function handlePointerMove(e) {
  const el = loginPageRef.value
  if (!el) return
  const rect = el.getBoundingClientRect()
  if (!rect.width || !rect.height) return
  const rx = (e.clientX - rect.left) / rect.width
  const ry = (e.clientY - rect.top) / rect.height
  pointer.x = Math.round(rx * 1000) / 10
  pointer.y = Math.round(ry * 1000) / 10
  pointer.tiltY = Number(((rx - 0.5) * 6).toFixed(2))
  pointer.tiltX = Number(((0.5 - ry) * 5).toFixed(2))
  pointer.active = true
}

function handlePointerLeave() {
  pointer.tiltX = 0
  pointer.tiltY = 0
  pointer.active = false
}

async function copyPreviewCode() {
  try {
    await navigator.clipboard?.writeText('849201')
  } catch {}
  previewCopied.value = true
  clearTimeout(previewCopyTimer)
  previewCopyTimer = setTimeout(() => {
    previewCopied.value = false
  }, 1600)
}

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
onBeforeUnmount(() => {
  clearTurnstile()
  clearTimeout(previewCopyTimer)
})

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
  background: linear-gradient(145deg, #eaf0ff 0%, #f4f7ff 46%, #e7f3ff 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.3s ease;

  &.is-dark {
    background: radial-gradient(circle at 20% 20%, #0d1630 0%, #070b16 55%, #050811 100%);
  }
}

/* Living Aurora Backdrop */
.ambient-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.ambient-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(88px);
  will-change: transform;
}

.orb-1 {
  width: 560px;
  height: 560px;
  top: -180px;
  left: -120px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.36) 0%, rgba(37, 99, 235, 0) 70%);
  animation: orbFloatA 18s ease-in-out infinite;
}

.orb-2 {
  width: 520px;
  height: 520px;
  bottom: -180px;
  right: -80px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.32) 0%, rgba(6, 182, 212, 0) 70%);
  animation: orbFloatB 22s ease-in-out infinite;
}

.orb-3 {
  width: 460px;
  height: 460px;
  top: 12%;
  right: 16%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.26) 0%, rgba(99, 102, 241, 0) 72%);
  animation: orbFloatC 20s ease-in-out infinite;
}

.orb-4 {
  width: 380px;
  height: 380px;
  bottom: 4%;
  left: 22%;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.18) 0%, rgba(168, 85, 247, 0) 72%);
  animation: orbFloatB 25s ease-in-out infinite reverse;
}

.ambient-beam {
  position: absolute;
  inset: -40%;
  background: linear-gradient(
    115deg,
    transparent 38%,
    rgba(255, 255, 255, 0.42) 48%,
    rgba(56, 189, 248, 0.16) 52%,
    transparent 62%
  );
  transform: translateX(-18%) rotate(-6deg);
  animation: beamSweep 14s ease-in-out infinite alternate;
  opacity: 0.7;
}

.ambient-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(37, 99, 235, 0.055) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(37, 99, 235, 0.055) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 78% 72% at 50% 48%, black 26%, transparent 96%);
}

.cursor-spotlight {
  position: absolute;
  inset: 0;
  opacity: var(--spot-opacity, 0);
  background: radial-gradient(
    560px circle at var(--mx, 50%) var(--my, 40%),
    rgba(59, 130, 246, 0.14),
    rgba(6, 182, 212, 0.06) 35%,
    transparent 70%
  );
  transition: opacity 0.35s ease;
}

@keyframes orbFloatA {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(42px, 32px, 0) scale(1.07); }
}

@keyframes orbFloatB {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(-38px, -28px, 0) scale(1.06); }
}

@keyframes orbFloatC {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(-24px, 34px, 0) scale(0.95); }
}

@keyframes beamSweep {
  0% { transform: translateX(-16%) rotate(-6deg); }
  100% { transform: translateX(14%) rotate(-6deg); }
}

@keyframes gradientFlow {
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
}

@keyframes cardFloat {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-6px); }
}

@keyframes stageEntrance {
  from {
    opacity: 0;
    transform: translateY(14px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.custom-bg-layer {
  position: fixed;
  inset: 0;
  z-index: 0;
}

.custom-bg-scrim {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(15, 23, 42, 0.1), rgba(15, 23, 42, 0.38));
}

/* Top Floating Controls */
.top-controls {
  position: fixed;
  top: 20px;
  right: 22px;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 8px;
}

.control-pill {
  height: 36px;
  padding: 0 13px;
  border-radius: 999px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 12.5px;
  font-weight: 600;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.72);
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.78);
  box-shadow: 0 4px 16px -4px rgba(15, 23, 42, 0.1), inset 0 1px 0 rgba(255, 255, 255, 0.8);
  cursor: pointer;
  transition: transform 0.16s ease, color 0.16s ease, border-color 0.16s ease, box-shadow 0.16s ease;

  :global(.dark) & {
    background: rgba(15, 23, 42, 0.68);
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.08);
  }

  &.icon-only {
    width: 36px;
    padding: 0;
  }

  &:hover {
    color: var(--text-primary);
    border-color: rgba(37, 99, 235, 0.35);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.95);
  }

  &.theme-pill:hover svg {
    transform: rotate(-16deg) scale(1.06);
  }

  svg {
    transition: transform 0.22s ease;
  }
}

/* Main Two-Column Stage */
.login-shell {
  position: relative;
  z-index: 10;
  width: min(1140px, calc(100% - 48px));
  display: grid;
  grid-template-columns: 1.12fr 440px;
  gap: 64px;
  align-items: center;
  padding: 44px 0;

  &.single-column {
    grid-template-columns: 1fr;
    justify-items: center;
  }

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 24px;
    width: min(440px, calc(100% - 32px));
    padding: 64px 0 40px;
  }
}

/* Left Hero Showcase */
.hero-pane {
  animation: stageEntrance 0.55s cubic-bezier(0.22, 1, 0.36, 1) both;

  @media (max-width: 980px) {
    display: none;
  }
}

.hero-inner {
  max-width: 540px;
}

.hero-headline {
  font-size: clamp(38px, 4vw, 50px);
  line-height: 1.13;
  font-weight: 800;
  letter-spacing: -0.035em;
  color: var(--text-primary);
  margin: 0 0 16px;

  .gradient-flow {
    background: linear-gradient(120deg, #2563eb 0%, #0ea5e9 34%, #6366f1 68%, #2563eb 100%);
    background-size: 220% auto;
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    animation: gradientFlow 7s ease infinite;

    :global(.dark) & {
      background: linear-gradient(120deg, #60a5fa 0%, #22d3ee 36%, #a78bfa 70%, #60a5fa 100%);
      background-size: 220% auto;
      -webkit-background-clip: text;
      background-clip: text;
    }
  }
}

.hero-sub {
  font-size: 15px;
  line-height: 1.68;
  color: var(--text-secondary);
  margin: 0 0 22px;
  max-width: 470px;
}

.feature-pills {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 30px;
}

.feature-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 30px;
  padding: 0 12px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary);
  background: rgba(255, 255, 255, 0.64);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.8);
  box-shadow: 0 2px 10px -4px rgba(15, 23, 42, 0.08);

  svg {
    color: var(--brand-primary);
  }

  :global(.dark) & {
    background: rgba(15, 23, 42, 0.56);
    border-color: rgba(255, 255, 255, 0.1);
    color: #cbd5e1;
  }
}

/* Interactive 3D Showcase Stage */
.showcase-stage {
  position: relative;
  padding-bottom: 22px;
}

.showcase-glow {
  position: absolute;
  inset: 14px 20px 6px;
  border-radius: 24px;
  background: linear-gradient(135deg, rgba(37, 99, 235, 0.24), rgba(6, 182, 212, 0.18), rgba(139, 92, 246, 0.2));
  filter: blur(32px);
  z-index: 0;
  opacity: 0.85;
  pointer-events: none;

  :global(.dark) & {
    opacity: 0.65;
  }
}

.preview-card {
  position: relative;
  z-index: 1;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(22px) saturate(180%);
  -webkit-backdrop-filter: blur(22px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 18px;
  box-shadow:
    0 20px 44px -16px rgba(15, 23, 42, 0.16),
    0 0 0 1px rgba(37, 99, 235, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.95);
  overflow: hidden;
  transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1);
  will-change: transform;

  :global(.dark) & {
    background: rgba(13, 19, 34, 0.78);
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow:
      0 24px 52px -16px rgba(0, 0, 0, 0.65),
      0 0 0 1px rgba(96, 165, 250, 0.14),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }
}

.preview-card-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 11px 16px;
  background: rgba(248, 250, 252, 0.68);
  border-bottom: 1px solid rgba(15, 23, 42, 0.06);

  :global(.dark) & {
    background: rgba(255, 255, 255, 0.03);
    border-bottom-color: rgba(255, 255, 255, 0.07);
  }
}

.preview-dots {
  display: flex;
  gap: 6px;

  i {
    width: 9px;
    height: 9px;
    border-radius: 50%;
    opacity: 0.85;
  }

  .dot-red { background: #fb7185; }
  .dot-amber { background: #fbbf24; }
  .dot-green { background: #34d399; }
}

.preview-domain {
  font-size: 11.5px;
  color: var(--text-secondary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  padding: 2px 10px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.045);

  :global(.dark) & {
    background: rgba(255, 255, 255, 0.06);
  }
}

.preview-live {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #059669;

  :global(.dark) & {
    color: #34d399;
  }

  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #10b981;
  }
}

.preview-row {
  position: relative;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 13px 16px;
  border-bottom: 1px solid rgba(15, 23, 42, 0.055);
  transition: background-color 0.16s ease;

  :global(.dark) & {
    border-bottom-color: rgba(255, 255, 255, 0.06);
  }

  &:last-child {
    border-bottom: none;
  }

  &.is-unread {
    background: linear-gradient(90deg, rgba(37, 99, 235, 0.07) 0%, rgba(6, 182, 212, 0.02) 100%);

    &::before {
      content: "";
      position: absolute;
      left: 0;
      top: 10px;
      bottom: 10px;
      width: 3px;
      border-radius: 0 99px 99px 0;
      background: linear-gradient(180deg, #3b82f6, #06b6d4);
    }

    :global(.dark) & {
      background: linear-gradient(90deg, rgba(59, 130, 246, 0.16) 0%, rgba(6, 182, 212, 0.04) 100%);
    }

    .preview-sender,
    .preview-subject-text {
      font-weight: 600;
      color: var(--text-primary);
    }
  }
}

.preview-avatar {
  width: 36px;
  height: 36px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13.5px;
  font-weight: 700;
  flex-shrink: 0;

  &.blue {
    background: linear-gradient(135deg, #2563eb, #3b82f6);
    color: #ffffff;
    box-shadow: 0 4px 12px -2px rgba(37, 99, 235, 0.4);
  }

  &.amber {
    background: rgba(245, 158, 11, 0.14);
    color: #d97706;

    :global(.dark) & {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
    }
  }

  &.violet {
    background: rgba(139, 92, 246, 0.14);
    color: #7c3aed;

    :global(.dark) & {
      background: rgba(139, 92, 246, 0.22);
      color: #c4b5fd;
    }
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
  margin-bottom: 3px;
}

.preview-sender {
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-secondary);
}

.preview-time {
  font-size: 11.5px;
  color: var(--text-muted);
  font-variant-numeric: tabular-nums;
}

.preview-subject {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  font-size: 12.5px;
  color: var(--text-secondary);
}

.preview-subject-text {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preview-code {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 2px 8px;
  border-radius: 6px;
  background: rgba(37, 99, 235, 0.12);
  border: 1px solid rgba(37, 99, 235, 0.22);
  color: var(--brand-primary);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11.5px;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.12s ease, background-color 0.16s ease, color 0.16s ease, border-color 0.16s ease;

  &:hover {
    background: rgba(37, 99, 235, 0.2);
  }

  &:active {
    transform: scale(0.94);
  }

  &.copied {
    background: rgba(16, 185, 129, 0.15);
    border-color: rgba(16, 185, 129, 0.35);
    color: #059669;

    :global(.dark) & {
      color: #34d399;
    }
  }
}

/* Floating Satellite Chip */
.floating-toast {
  position: absolute;
  right: 14px;
  bottom: 0;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 8px 13px;
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(18px) saturate(180%);
  -webkit-backdrop-filter: blur(18px) saturate(180%);
  border: 1px solid rgba(255, 255, 255, 0.95);
  box-shadow:
    0 12px 28px -8px rgba(37, 99, 235, 0.26),
    0 0 0 1px rgba(37, 99, 235, 0.12);
  animation: cardFloat 4.6s ease-in-out infinite;
  pointer-events: none;

  :global(.dark) & {
    background: rgba(15, 23, 42, 0.9);
    border-color: rgba(96, 165, 250, 0.28);
    box-shadow: 0 14px 32px -8px rgba(0, 0, 0, 0.72), 0 0 0 1px rgba(56, 189, 248, 0.18);
  }

  .toast-icon {
    width: 22px;
    height: 22px;
    border-radius: 7px;
    background: linear-gradient(135deg, #2563eb, #06b6d4);
    color: #ffffff;
    display: inline-flex;
    align-items: center;
    justify-content: center;
  }

  .toast-label {
    font-size: 12px;
    font-weight: 600;
    color: var(--text-primary);
  }

  .toast-code {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12px;
    font-weight: 700;
    color: var(--brand-primary);
    padding: 1px 6px;
    border-radius: 5px;
    background: var(--brand-primary-soft);
  }
}

/* Luminous Prism Auth Card */
.auth-pane {
  width: 100%;
  max-width: 440px;
  animation: stageEntrance 0.6s cubic-bezier(0.22, 1, 0.36, 1) 0.08s both;
}

.auth-card-frame {
  position: relative;
  padding: 1.5px;
  border-radius: 24px;
  background: linear-gradient(
    135deg,
    rgba(59, 130, 246, 0.5) 0%,
    rgba(6, 182, 212, 0.34) 35%,
    rgba(255, 255, 255, 0.85) 65%,
    rgba(99, 102, 241, 0.48) 100%
  );
  box-shadow:
    0 28px 60px -18px rgba(37, 99, 235, 0.24),
    0 12px 26px -10px rgba(15, 23, 42, 0.12);

  :global(.dark) & {
    background: linear-gradient(
      135deg,
      rgba(96, 165, 250, 0.5) 0%,
      rgba(34, 211, 238, 0.28) 38%,
      rgba(255, 255, 255, 0.1) 66%,
      rgba(139, 92, 246, 0.5) 100%
    );
    box-shadow:
      0 32px 68px -18px rgba(0, 0, 0, 0.78),
      0 0 42px -12px rgba(37, 99, 235, 0.32);
  }

  &::before {
    content: "";
    position: absolute;
    inset: -10px;
    border-radius: 32px;
    background: linear-gradient(135deg, rgba(37, 99, 235, 0.22), rgba(6, 182, 212, 0.14), rgba(99, 102, 241, 0.2));
    filter: blur(28px);
    z-index: -1;
    opacity: 0.72;
    pointer-events: none;
  }

  &.has-wallpaper::before {
    opacity: 0.35;
  }

  @media (max-width: 480px) {
    border-radius: 20px;
  }
}

.auth-card {
  width: 100%;
  background: rgba(255, 255, 255, 0.86);
  backdrop-filter: blur(26px) saturate(185%);
  -webkit-backdrop-filter: blur(26px) saturate(185%);
  border-radius: 22.5px;
  padding: 36px 32px 26px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.92);

  :global(.dark) & {
    background: rgba(12, 18, 32, 0.84);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  &.glass-card {
    background: v-bind(loginOpacity);
    backdrop-filter: blur(24px) saturate(170%);
    -webkit-backdrop-filter: blur(24px) saturate(170%);
  }

  @media (max-width: 480px) {
    padding: 28px 22px 22px;
    border-radius: 18.5px;
  }
}

.card-brand {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-bottom: 26px;
}

.card-logo-box {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: linear-gradient(145deg, rgba(37, 99, 235, 0.12) 0%, rgba(6, 182, 212, 0.14) 100%);
  border: 1px solid rgba(37, 99, 235, 0.18);
  box-shadow: 0 8px 18px -6px rgba(37, 99, 235, 0.25), inset 0 1px 0 rgba(255, 255, 255, 0.7);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  :global(.dark) & {
    background: linear-gradient(145deg, rgba(59, 130, 246, 0.22) 0%, rgba(6, 182, 212, 0.18) 100%);
    border-color: rgba(96, 165, 250, 0.26);
    box-shadow: 0 8px 20px -6px rgba(37, 99, 235, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.12);
  }
}

.card-logo {
  width: 28px;
  height: 28px;
  object-fit: contain;
}

.card-brand-text {
  min-width: 0;
}

.form-title {
  font-size: 21px;
  font-weight: 800;
  letter-spacing: -0.025em;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.form-desc {
  font-size: 13px;
  color: var(--text-secondary);
  margin-top: 3px;
}

.mode-tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 12px;
  background: rgba(15, 23, 42, 0.05);
  margin-bottom: 22px;

  :global(.dark) & {
    background: rgba(255, 255, 255, 0.06);
  }
}

.mode-tab {
  height: 36px;
  border-radius: 9px;
  font-size: 13.5px;
  font-weight: 600;
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

.input-icon {
  color: var(--text-muted);
  transition: color 0.16s ease;
}

.prism-input :deep(.el-input__wrapper) {
  height: 46px;
  padding: 0 14px;
  border-radius: 12px !important;
  background: rgba(248, 250, 252, 0.85) !important;
  box-shadow: 0 0 0 1px rgba(15, 23, 42, 0.09) inset !important;
  transition: box-shadow 0.18s ease, background-color 0.18s ease !important;

  :global(.dark) & {
    background: rgba(15, 23, 42, 0.72) !important;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.1) inset !important;
  }

  &:hover {
    box-shadow: 0 0 0 1px rgba(37, 99, 235, 0.34) inset !important;
  }

  &.is-focus {
    background: var(--surface-elevated) !important;
    box-shadow:
      0 0 0 1.5px var(--brand-primary) inset,
      0 0 0 4px rgba(37, 99, 235, 0.14) !important;

    .input-icon {
      color: var(--brand-primary);
    }
  }
}

.email-input :deep(.el-input__wrapper) {
  border-radius: 12px 0 0 12px !important;
}

:deep(.el-input-group__append) {
  padding: 0 12px !important;
  border-radius: 0 12px 12px 0 !important;
  background: rgba(241, 245, 249, 0.9) !important;
  box-shadow: 0 1px 0 0 rgba(15, 23, 42, 0.09) inset, 0 -1px 0 0 rgba(15, 23, 42, 0.09) inset, -1px 0 0 0 rgba(15, 23, 42, 0.09) inset !important;
  cursor: pointer;

  :global(.dark) & {
    background: rgba(30, 41, 59, 0.75) !important;
    box-shadow: 0 1px 0 0 rgba(255, 255, 255, 0.1) inset, 0 -1px 0 0 rgba(255, 255, 255, 0.1) inset, -1px 0 0 0 rgba(255, 255, 255, 0.1) inset !important;
  }
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
  font-weight: 600;
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

/* Shimmering Gradient Flagship CTA */
.submit-btn {
  position: relative;
  overflow: hidden;
  width: 100%;
  height: 46px;
  border-radius: 12px !important;
  border: none !important;
  font-size: 15px;
  font-weight: 650;
  letter-spacing: 0.01em;
  margin-top: 4px;
  background: linear-gradient(135deg, #2563eb 0%, #3b82f6 52%, #0ea5e9 100%) !important;
  box-shadow:
    0 10px 24px -6px rgba(37, 99, 235, 0.52),
    inset 0 1px 0 rgba(255, 255, 255, 0.26) !important;
  transition: transform 0.16s ease, box-shadow 0.2s ease, filter 0.18s ease !important;

  &::after {
    content: "";
    position: absolute;
    top: 0;
    left: -120%;
    width: 75%;
    height: 100%;
    background: linear-gradient(110deg, transparent, rgba(255, 255, 255, 0.34), transparent);
    transition: left 0.55s cubic-bezier(0.22, 1, 0.36, 1);
    pointer-events: none;
  }

  &:hover {
    transform: translateY(-1px);
    filter: brightness(1.04);
    box-shadow:
      0 14px 30px -6px rgba(37, 99, 235, 0.62),
      inset 0 1px 0 rgba(255, 255, 255, 0.32) !important;

    &::after {
      left: 140%;
    }

    .submit-arrow {
      transform: translateX(3px);
    }
  }

  &:active {
    transform: scale(0.985) !important;
  }
}

.submit-btn-inner {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.submit-arrow {
  transition: transform 0.18s ease;
}

.oauth-divider {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 20px 0 14px;
  color: var(--text-muted);
  font-size: 11.5px;
  font-weight: 600;
  letter-spacing: 0.04em;

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
  height: 40px;
  padding: 0 12px;
  border-radius: 10px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-primary);
  background: rgba(248, 250, 252, 0.8);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: background-color 0.16s ease, border-color 0.16s ease, transform 0.14s ease, box-shadow 0.16s ease;

  :global(.dark) & {
    background: rgba(255, 255, 255, 0.04);
    border-color: rgba(255, 255, 255, 0.1);
  }

  &:hover {
    background: var(--surface-elevated);
    border-color: rgba(37, 99, 235, 0.35);
    transform: translateY(-1px);
    box-shadow: var(--shadow-xs);
  }

  &:active {
    transform: scale(0.97);
  }
}

.switch-row {
  margin-top: 18px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;

  span {
    color: var(--brand-primary);
    font-weight: 600;
    margin-left: 4px;
  }

  &:hover span {
    text-decoration: underline;
  }
}

.card-foot {
  margin-top: 22px;
  padding-top: 14px;
  border-top: 1px solid rgba(15, 23, 42, 0.06);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--text-muted);

  :global(.dark) & {
    border-top-color: rgba(255, 255, 255, 0.07);
  }

  .card-foot-icon {
    color: #10b981;
    flex-shrink: 0;
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
  width: 38px;
  height: 38px;
  display: flex;
  justify-content: center;
  align-items: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.74);
  backdrop-filter: blur(14px) saturate(180%);
  -webkit-backdrop-filter: blur(14px) saturate(180%);
  color: var(--text-secondary);
  bottom: 18px;
  right: 20px;
  z-index: 20;
  border: 1px solid rgba(255, 255, 255, 0.85);
  box-shadow: 0 6px 18px -6px rgba(15, 23, 42, 0.16);
  transition: transform 0.16s ease, color 0.16s ease, border-color 0.16s ease;

  :global(.dark) & {
    background: rgba(15, 23, 42, 0.72);
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow: 0 8px 20px -6px rgba(0, 0, 0, 0.55);
  }

  &:hover {
    color: var(--text-primary);
    border-color: rgba(37, 99, 235, 0.35);
    transform: translateY(-2px);
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

@media (prefers-reduced-motion: reduce) {
  .ambient-orb,
  .ambient-beam,
  .gradient-flow,
  .floating-toast,
  .hero-pane,
  .auth-pane {
    animation: none !important;
  }

  .preview-card {
    transform: none !important;
  }
}

/* Deep Space Obsidian Aurora — Dark Mode Overrides */
.login-page.is-dark {
  .orb-1 {
    background: radial-gradient(circle, rgba(37, 99, 235, 0.5) 0%, rgba(37, 99, 235, 0) 70%);
  }

  .orb-2 {
    background: radial-gradient(circle, rgba(6, 182, 212, 0.36) 0%, rgba(6, 182, 212, 0) 70%);
  }

  .orb-3 {
    background: radial-gradient(circle, rgba(124, 58, 237, 0.38) 0%, rgba(124, 58, 237, 0) 72%);
  }

  .orb-4 {
    background: radial-gradient(circle, rgba(192, 132, 252, 0.22) 0%, rgba(192, 132, 252, 0) 72%);
  }

  .ambient-beam {
    background: linear-gradient(
      115deg,
      transparent 38%,
      rgba(59, 130, 246, 0.14) 48%,
      rgba(34, 211, 238, 0.11) 52%,
      transparent 62%
    );
    opacity: 0.92;
  }

  .ambient-grid {
    background-image:
      linear-gradient(to right, rgba(148, 163, 184, 0.085) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(148, 163, 184, 0.085) 1px, transparent 1px);
  }

  .cursor-spotlight {
    background: radial-gradient(
      620px circle at var(--mx, 50%) var(--my, 40%),
      rgba(59, 130, 246, 0.24),
      rgba(6, 182, 212, 0.1) 36%,
      transparent 72%
    );
  }

  .control-pill {
    background: rgba(15, 23, 42, 0.72);
    border-color: rgba(255, 255, 255, 0.13);
    color: #cbd5e1;
    box-shadow: 0 4px 16px -4px rgba(0, 0, 0, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.08);

    &:hover {
      color: #f8fafc;
      border-color: rgba(96, 165, 250, 0.45);
    }
  }

  .preview-live {
    color: #34d399;
  }

  .hero-headline .gradient-flow {
    background: linear-gradient(120deg, #60a5fa 0%, #22d3ee 36%, #a78bfa 70%, #60a5fa 100%);
    background-size: 220% auto;
    -webkit-background-clip: text;
    background-clip: text;
  }

  .feature-pill {
    background: rgba(15, 23, 42, 0.64);
    border-color: rgba(255, 255, 255, 0.11);
    color: #cbd5e1;
    box-shadow: 0 4px 14px -6px rgba(0, 0, 0, 0.55);

    svg {
      color: #60a5fa;
    }
  }

  .showcase-glow {
    opacity: 0.7;
  }

  .preview-card {
    background: rgba(13, 19, 34, 0.82);
    border-color: rgba(255, 255, 255, 0.12);
    box-shadow:
      0 26px 54px -16px rgba(0, 0, 0, 0.72),
      0 0 0 1px rgba(96, 165, 250, 0.16),
      inset 0 1px 0 rgba(255, 255, 255, 0.1);
  }

  .preview-card-bar {
    background: rgba(255, 255, 255, 0.035);
    border-bottom-color: rgba(255, 255, 255, 0.07);
  }

  .preview-domain {
    background: rgba(255, 255, 255, 0.07);
    color: #cbd5e1;
  }

  .preview-row {
    border-bottom-color: rgba(255, 255, 255, 0.06);

    &.is-unread {
      background: linear-gradient(90deg, rgba(59, 130, 246, 0.18) 0%, rgba(6, 182, 212, 0.04) 100%);
    }
  }

  .preview-avatar {
    &.amber {
      background: rgba(245, 158, 11, 0.2);
      color: #fbbf24;
    }

    &.violet {
      background: rgba(139, 92, 246, 0.22);
      color: #c4b5fd;
    }
  }

  .preview-code {
    background: rgba(59, 130, 246, 0.18);
    border-color: rgba(96, 165, 250, 0.3);
    color: #93c5fd;

    &.copied {
      background: rgba(16, 185, 129, 0.2);
      border-color: rgba(52, 211, 153, 0.4);
      color: #34d399;
    }
  }

  .floating-toast {
    background: rgba(15, 23, 42, 0.92);
    border-color: rgba(96, 165, 250, 0.3);
    box-shadow: 0 16px 34px -8px rgba(0, 0, 0, 0.78), 0 0 0 1px rgba(56, 189, 248, 0.18);
  }

  .auth-card-frame {
    background: linear-gradient(
      135deg,
      rgba(96, 165, 250, 0.55) 0%,
      rgba(34, 211, 238, 0.32) 38%,
      rgba(255, 255, 255, 0.1) 66%,
      rgba(139, 92, 246, 0.55) 100%
    );
    box-shadow:
      0 32px 68px -18px rgba(0, 0, 0, 0.8),
      0 0 46px -10px rgba(37, 99, 235, 0.36);
  }

  .auth-card {
    background: rgba(11, 17, 32, 0.88);
    box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.1);

    &.glass-card {
      background: v-bind(loginOpacity);
    }
  }

  .card-logo-box {
    background: linear-gradient(145deg, rgba(59, 130, 246, 0.24) 0%, rgba(6, 182, 212, 0.18) 100%);
    border-color: rgba(96, 165, 250, 0.28);
    box-shadow: 0 8px 20px -6px rgba(37, 99, 235, 0.48), inset 0 1px 0 rgba(255, 255, 255, 0.14);
  }

  .mode-tabs {
    background: rgba(255, 255, 255, 0.06);
  }

  .prism-input :deep(.el-input__wrapper) {
    background: rgba(15, 23, 42, 0.78) !important;
    box-shadow: 0 0 0 1px rgba(255, 255, 255, 0.11) inset !important;

    &:hover {
      box-shadow: 0 0 0 1px rgba(96, 165, 250, 0.4) inset !important;
    }

    &.is-focus {
      background: rgba(15, 23, 42, 0.96) !important;
      box-shadow:
        0 0 0 1.5px #3b82f6 inset,
        0 0 0 4px rgba(59, 130, 246, 0.2) !important;
    }
  }

  :deep(.el-input-group__append) {
    background: rgba(30, 41, 59, 0.8) !important;
    box-shadow:
      0 1px 0 0 rgba(255, 255, 255, 0.11) inset,
      0 -1px 0 0 rgba(255, 255, 255, 0.11) inset,
      -1px 0 0 0 rgba(255, 255, 255, 0.11) inset !important;
  }

  .oauth-btn {
    background: rgba(255, 255, 255, 0.05);
    border-color: rgba(255, 255, 255, 0.12);
    color: #e2e8f0;

    &:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(96, 165, 250, 0.42);
    }
  }

  .card-foot {
    border-top-color: rgba(255, 255, 255, 0.08);
  }

  .github-link {
    background: rgba(15, 23, 42, 0.76);
    border-color: rgba(255, 255, 255, 0.13);
    color: #cbd5e1;
    box-shadow: 0 8px 20px -6px rgba(0, 0, 0, 0.6);

    &:hover {
      color: #ffffff;
      border-color: rgba(96, 165, 250, 0.45);
    }
  }
}
</style>
