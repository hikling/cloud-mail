<template>
  <div class="settings-container">
    <div class="loading" :class="firstLoading ? 'loading-show' : 'loading-hide'">
      <loading/>
    </div>
    <el-scrollbar class="scroll" v-if="!firstLoading">
      <div class="scroll-body">
        <div class="page-head">
          <div class="page-title">{{ $t('SystemSettings') }}</div>
        </div>

        <div class="card-grid">
          <!-- Basic Settings Card -->
          <div class="settings-card">
            <div class="card-head">
              <span class="card-icon card-icon--blue"><Icon icon="lucide:globe" width="16" height="16"/></span>
              <span class="card-title">{{ $t('websiteSetting') }}</span>
            </div>
            <div class="card-content">
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('websiteReg') }}</span></div>
                <div class="item-control">
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.register"/>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('loginDomain') }}</span></div>
                <div class="item-control">
                  <el-switch @change="change" :before-change="beforeChange" :active-value="1" :inactive-value="0"
                             v-model="setting.loginDomain"/>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('regKey') }}</span></div>
                <div class="item-control">
                  <el-select
                      @change="change"
                      :style="`width: ${ locale === 'en' ? 112 : 96 }px;`"
                      v-model="setting.regKey"
                      placeholder="Select"
                  >
                    <el-option
                        v-for="item in regKeyOptions"
                        :key="item.value"
                        :label="item.label"
                        :value="item.value"
                    />
                  </el-select>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('addAccount') }}</span></div>
                <div class="item-control">
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.addEmail"/>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label">
                  <span>{{ $t('multipleEmail') }}</span>
                  <el-tooltip effect="dark" :content="$t('multipleEmailDesc')">
                    <span class="tip-trigger"><Icon class="warning" icon="lucide:help-circle" width="15" height="15"/></span>
                  </el-tooltip>
                </div>
                <div class="item-control">
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.manyEmail"/>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label">
                  <span>{{ $t('syncDelete') }}</span>
                  <el-tooltip effect="dark" :content="$t('syncDeleteDesc')">
                    <span class="tip-trigger"><Icon class="warning" icon="lucide:help-circle" width="15" height="15"/></span>
                  </el-tooltip>
                </div>
                <div class="item-control">
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.syncDelete"/>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label">
                  <span>{{ $t('emailPrefix') }}</span>
                </div>
                <div class="item-control forward">
                  <button type="button" class="opt-pill" @click="openEmailPrefix">
                    <Icon icon="lucide:sliders" width="14" height="14"/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Personalization Settings Card -->
          <div class="settings-card">
            <div class="card-head">
              <span class="card-icon card-icon--violet"><Icon icon="lucide:palette" width="16" height="16"/></span>
              <span class="card-title">{{ $t('customization') }}</span>
            </div>
            <div class="card-content">
              <div class="setting-item">
                <div class="item-label title-item"><span>{{ $t('websiteTitle') }}</span></div>
                <div class="item-control email-title">
                  <span class="value-ellipsis">{{ setting.title }}</span>
                  <button type="button" class="opt-pill" @click="editTitleShow = true">
                    <Icon icon="lucide:square-pen" width="14" height="14"/>
                  </button>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label title-item"><span>{{ $t('loginBoxOpacity') }}</span></div>
                <div class="item-control">
                  <el-input-number size="small" v-model="loginOpacity" @change="opacityChange" :precision="2"
                                   :step="0.01" :max="1" :min="0"/>
                </div>
              </div>
              <div class="setting-item personalized">
                <div class="item-label"><span>{{ $t('loginBackground') }}</span></div>
                <div class="item-control bg-control">
                  <el-image
                      class="background"
                      :src="cvtR2Url(setting.background)"
                      :preview-src-list="[cvtR2Url(setting.background)]"
                      show-progress
                      fit="cover"
                  >
                    <template #error>
                      <div class="error-image">
                        <Icon icon="ph:image" width="22" height="22"/>
                      </div>
                    </template>
                  </el-image>
                  <div class="background-btn">
                    <button type="button" class="opt-pill" @click="openSetBackground">
                      <Icon icon="lucide:square-pen" width="14" height="14"/>
                    </button>
                    <button type="button" class="opt-pill opt-pill--danger" @click="delBackground">
                      <Icon icon="lucide:trash-2" width="14" height="14"/>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Email Sending Settings Card -->
          <div class="settings-card">
            <div class="card-head">
              <span class="card-icon card-icon--indigo"><Icon icon="lucide:mails" width="16" height="16"/></span>
              <span class="card-title">{{ $t('emailSetting') }}</span>
            </div>
            <div class="card-content">
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('receiveEmail') }}</span></div>
                <div class="item-control">
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.receive"/>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label">
                  <span>{{ $t('autoRefresh') }}</span>
                  <el-tooltip effect="dark" :content="$t('autoRefreshDesc')">
                    <span class="tip-trigger"><Icon class="warning" icon="lucide:help-circle" width="15" height="15"/></span>
                  </el-tooltip>
                </div>
                <div class="item-control">
                  <el-switch @change="change" :before-change="beforeChange" :active-value="2" :inactive-value="1"
                             v-model="setting.autoRefresh"/>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('sendEmail') }}</span></div>
                <div class="item-control">
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.send"/>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label">
                  <span>{{ $t('noRecipientTitle') }}</span>
                  <el-tooltip effect="dark" :content="$t('noRecipientDesc')">
                    <span class="tip-trigger"><Icon class="warning" icon="lucide:help-circle" width="15" height="15"/></span>
                  </el-tooltip>
                </div>
                <div class="item-control">
                  <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.noRecipient"/>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label"><span>{{ setting.hasCfEmail ? $t('cloudflareEmailSending') : $t('resendToken') }}</span></div>
                <div class="item-control" v-if="setting.hasCfEmail">
                  <span class="status-pill is-on">{{ $t('enabled') }}</span>
                </div>
                <div class="item-control btn-group" v-else>
                  <button type="button" class="opt-pill" @click="openResendList">
                    <Icon icon="lucide:list" width="14" height="14"/>
                  </button>
                  <button type="button" class="opt-pill opt-pill--primary" @click="openResendForm">
                    <Icon icon="lucide:plus" width="14" height="14"/>
                  </button>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('blackList') }}</span></div>
                <div class="item-control">
                  <button type="button" class="opt-pill" @click="openBlackListForm">
                    <Icon icon="lucide:sliders" width="14" height="14"/>
                  </button>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label">
                  <span>{{ $t('autoClean') }}</span>
                  <el-tooltip effect="dark" :content="$t('autoCleanDesc')">
                    <span class="tip-trigger"><Icon class="warning" icon="lucide:help-circle" width="15" height="15"/></span>
                  </el-tooltip>
                </div>
                <div class="item-control forward">
                  <span class="status-pill" :class="{ 'is-on': setting.autoCleanDays > 0 }">
                    {{ setting.autoCleanDays > 0 ? $t('autoCleanRetain', { days: setting.autoCleanDays }) : $t('disabled') }}
                  </span>
                  <button type="button" class="opt-pill" @click="openAutoClean">
                    <Icon icon="lucide:sliders" width="14" height="14"/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Email Push Card -->
          <div class="settings-card">
            <div class="card-head">
              <span class="card-icon card-icon--amber"><Icon icon="lucide:bell" width="16" height="16"/></span>
              <span class="card-title">{{ $t('emailPush') }}</span>
            </div>
            <div class="card-content">
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('tgBot') }}</span></div>
                <div class="item-control forward">
                  <span class="status-pill" :class="{ 'is-on': setting.tgBotStatus === 0 }">
                    {{ setting.tgBotStatus === 0 ? $t('enabled') : $t('disabled') }}
                  </span>
                  <button type="button" class="opt-pill" @click="openTgSetting">
                    <Icon icon="lucide:sliders" width="14" height="14"/>
                  </button>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('otherEmail') }}</span></div>
                <div class="item-control forward">
                  <span class="status-pill" :class="{ 'is-on': setting.forwardStatus === 0 }">
                    {{ setting.forwardStatus === 0 ? $t('enabled') : $t('disabled') }}
                  </span>
                  <button type="button" class="opt-pill" @click="openThirdEmailSetting">
                    <Icon icon="lucide:sliders" width="14" height="14"/>
                  </button>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('webhook') }}</span></div>
                <div class="item-control forward">
                  <span class="status-pill" :class="{ 'is-on': setting.webhookStatus === 0 }">
                    {{ setting.webhookStatus === 0 ? $t('enabled') : $t('disabled') }}
                  </span>
                  <button type="button" class="opt-pill" @click="openWebhookSetting">
                    <Icon icon="lucide:sliders" width="14" height="14"/>
                  </button>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('forwardingRules') }}</span></div>
                <div class="item-control forward">
                  <span class="status-pill is-neutral">
                    {{ setting.ruleType === 0 ? $t('forwardAll') : $t('rules') }}
                  </span>
                  <button type="button" class="opt-pill" @click="openForwardRules">
                    <Icon icon="lucide:sliders" width="14" height="14"/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Object Storage Card -->
          <div class="settings-card">
            <div class="card-head">
              <span class="card-icon card-icon--emerald"><Icon icon="lucide:database" width="16" height="16"/></span>
              <span class="card-title">{{ $t('oss') }}</span>
            </div>
            <div class="card-content">
              <div class="setting-item">
                <div class="item-label">
                  <span>{{ $t('s3Configuration') }}</span>
                </div>
                <div class="item-control r2domain">
                  <button type="button" class="opt-pill" @click="addS3Show = true">
                    <Icon icon="lucide:sliders" width="14" height="14"/>
                  </button>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label">
                  <span>{{ $t('storageType') }}</span>
                </div>
                <div class="item-control r2domain">
                  <div class="storage-type">
                    <el-tag size="small" effect="light">{{ setting.storageType }}</el-tag>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Turnstile Verification Card -->
          <div class="settings-card">
            <div class="card-head">
              <span class="card-icon card-icon--blue"><Icon icon="lucide:shield-check" width="16" height="16"/></span>
              <span class="card-title">{{ $t('turnstileSetting') }}</span>
            </div>
            <div class="card-content">
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('signUpVerification') }}</span></div>
                <div class="item-control inline-controls">
                  <button type="button" class="opt-pill" @click="openRegVerifyCount">
                    <Icon icon="lucide:sliders" width="14" height="14"/>
                  </button>
                  <el-select
                      @change="change"
                      :style="`width: ${ locale === 'en' ? 112 : 96 }px;`"
                      v-model="setting.registerVerify"
                      placeholder="Select"
                      class="bot-verify-select"
                  >
                    <el-option key="0" :value="0" :label="$t('enable')"/>
                    <el-option key="1" :value="1" :label="$t('disable')"/>
                    <el-option key="2" :value="2" :label="$t('rulesVerify')"/>
                  </el-select>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('loginVerification') }}</span></div>
                <div class="item-control inline-controls">
                  <button type="button" class="opt-pill" :aria-label="$t('rulesVerify')" @click="openLoginVerifyCount">
                    <Icon icon="lucide:sliders" width="14" height="14"/>
                  </button>
                  <el-select
                      :model-value="setting.loginVerify"
                      @change="changeField('loginVerify', $event)"
                      :style="`width: ${ locale === 'en' ? 112 : 96 }px;`"
                      class="bot-verify-select"
                  >
                    <el-option :value="0" :label="$t('enable')"/>
                    <el-option :value="1" :label="$t('disable')"/>
                    <el-option :value="2" :label="$t('rulesVerify')"/>
                  </el-select>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('addEmailVerification') }}</span></div>
                <div class="item-control inline-controls">
                  <button type="button" class="opt-pill" @click="openAddVerifyCount">
                    <Icon icon="lucide:sliders" width="14" height="14"/>
                  </button>
                  <el-select
                      @change="change"
                      :style="`width: ${ locale === 'en' ? 112 : 96 }px;`"
                      v-model="setting.addEmailVerify"
                      placeholder="Select"
                      class="bot-verify-select"
                  >
                    <el-option key="0" :value="0" :label="$t('enable')"/>
                    <el-option key="1" :value="1" :label="$t('disable')"/>
                    <el-option key="2" :value="2" :label="$t('rulesVerify')"/>
                  </el-select>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label"><span>Site key</span></div>
                <div class="item-control bot-verify">
                  <span class="mono-ellipsis">{{ maskSiteKey(setting.siteKey) }}</span>
                  <button type="button" class="opt-pill" @click="turnstileShow = true">
                    <Icon icon="lucide:square-pen" width="14" height="14"/>
                  </button>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label"><span>Secret key</span></div>
                <div class="item-control bot-verify">
                  <span class="mono-ellipsis">{{ setting.secretKey }}</span>
                  <button type="button" class="opt-pill" @click="turnstileShow = true">
                    <Icon icon="lucide:square-pen" width="14" height="14"/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Notice Card -->
          <div class="settings-card">
            <div class="card-head">
              <span class="card-icon card-icon--amber"><Icon icon="lucide:bell" width="16" height="16"/></span>
              <span class="card-title">{{ $t('noticeTitle') }}</span>
            </div>
            <div class="card-content">
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('noticePopup') }}</span></div>
                <div class="item-control forward">
                  <span class="status-pill" :class="{ 'is-on': setting.notice === 0 }">
                    {{ setting.notice === 0 ? $t('enabled') : $t('disabled') }}
                  </span>
                  <button type="button" class="opt-pill" @click="openNoticePopupSetting">
                    <Icon icon="lucide:sliders" width="14" height="14"/>
                  </button>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('popUp') }}</span></div>
                <div class="item-control forward">
                  <button type="button" class="opt-pill" @click="openNoticePopup">
                    <Icon icon="lucide:eye" width="14" height="14"/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- Workers AI Card -->
          <div class="settings-card">
            <div class="card-head">
              <span class="card-icon card-icon--violet"><Icon icon="lucide:bot" width="16" height="16"/></span>
              <span class="card-title">Workers AI</span>
            </div>
            <div class="card-content">
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('codeRecognition') }}</span></div>
                <div class="item-control">
                  <el-switch @change="changeField('aiCode', $event)" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                             v-model="setting.aiCode"/>
                </div>
              </div>
              <div class="setting-item">
                <div class="item-label"><span>{{ $t('codeRecognitionRules') }}</span></div>
                <div class="item-control forward">
                  <button type="button" class="opt-pill" @click="openAiCodeFilter">
                    <Icon icon="lucide:sliders" width="14" height="14"/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- OAuth Login Card -->
          <div class="settings-card">
            <div class="card-head">
              <span class="card-icon card-icon--indigo"><Icon icon="lucide:key-round" width="16" height="16"/></span>
              <span class="card-title">{{ $t('oauthLogin') }}</span>
            </div>
            <div class="card-content">
              <div class="setting-item" v-for="p in oauthPlatforms" :key="p.key">
                <div class="item-label">
                  <el-avatar v-if="p.iconType === 'image'" :src="p.icon" :size="20" class="oauth-icon"/>
                  <Icon v-else :icon="p.icon" width="20" height="20" class="oauth-icon"/>
                  <span>{{ p.label }}</span>
                </div>
                <div class="item-control forward">
                  <span class="status-pill" :class="{ 'is-on': setting[p.key + 'Switch'] === 0 }">
                    {{ setting[p.key + 'Switch'] === 0 ? $t('enabled') : $t('disabled') }}
                  </span>
                  <button type="button" class="opt-pill" @click="openOauthSetting(p)">
                    <Icon icon="lucide:sliders" width="14" height="14"/>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <!-- About Card -->
          <div class="settings-card about">
            <div class="card-head">
              <span class="card-icon card-icon--slate"><Icon icon="lucide:info" width="16" height="16"/></span>
              <span class="card-title">{{ $t('about') }}</span>
            </div>
            <div class="card-content">
              <div class="concerning-item">
                <span class="about-label">{{ $t('version') }}</span>
                <el-badge is-dot :hidden="!hasUpdate">
                  <el-button size="small" @click="jump('https://github.com/maillab/cloud-mail/releases')">
                    {{ currentVersion }}
                    <template #icon>
                      <Icon icon="qlementine-icons:version-control-16" style="font-size: 17px" color="#1890FF"/>
                    </template>
                  </el-button>
                </el-badge>
              </div>
              <div class="concerning-item">
                <span class="about-label">{{ $t('community') }}</span>
                <div class="community">
                  <el-button size="small" @click="jump('https://github.com/maillab/cloud-mail')">
                    Github
                    <template #icon>
                      <Icon icon="codicon:github-inverted" width="17" height="17"/>
                    </template>
                  </el-button>
                  <el-button size="small" @click="jump('https://t.me/cloud_mail_tg')">
                    Telegram
                    <template #icon>
                      <Icon icon="logos:telegram" width="17" height="17"/>
                    </template>
                  </el-button>
                </div>
              </div>
              <div class="concerning-item">
                <span class="about-label">{{ $t('support') }}</span>
                <el-button size="small" @click="jump('https://docs.skymail.ink/support.html')">
                  {{ t('supportDesc') }}
                  <template #icon>
                    <Icon color="#79D6B5" icon="simple-icons:buymeacoffee" width="16" height="16"/>
                  </template>
                </el-button>
              </div>
              <div class="concerning-item">
                <span class="about-label">{{ $t('help') }}</span>
                <el-button size="small" @click="jump('https://docs.skymail.ink')">
                  {{ t('document') }}
                  <template #icon>
                    <Icon color="#79D6B5" icon="fluent-color:document-32" width="16" height="16"/>
                  </template>
                </el-button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Dialogs -->
      <el-dialog v-model="editTitleShow" :title="$t('changeTitle')" width="360" @closed="editTitle = setting.title">
        <form @submit.prevent>
          <el-input type="text" :placeholder="$t('websiteTitle')" v-model="editTitle" @keyup.enter="saveTitle"/>
          <el-button type="primary" :loading="settingLoading" @click="saveTitle">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="resendTokenFormShow" :title="$t('resendToken')" width="360" @closed="cleanResendTokenForm">
        <form @submit.prevent>
          <el-select style="margin-bottom: 14px" v-model="resendTokenForm.domain" placeholder="Select">
            <el-option
                v-for="item in settingStore.domainList"
                :key="item"
                :label="item"
                :value="item"
            />
          </el-select>
          <el-input type="text" :placeholder="$t('addResendTokenDesc')" v-model="resendTokenForm.token" @keyup.enter="saveResendToken"/>
          <el-button type="primary" :loading="settingLoading" @click="saveResendToken">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="turnstileShow" :title="$t('addTurnstileSecret')" width="360"
                 @closed="turnstileForm.secretKey = '';turnstileForm.siteKey = ''">
        <form @submit.prevent>
          <el-input type="text" placeholder="Site key" v-model="turnstileForm.siteKey" @keyup.enter="saveTurnstileKey"/>
          <el-input type="text" style="margin-top: 14px" placeholder="Secret key" v-model="turnstileForm.secretKey" @keyup.enter="saveTurnstileKey"/>
          <el-button type="primary" :loading="settingLoading" @click="saveTurnstileKey">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="oauthSettingShow" :title="$t('oauthSetting') + ' - ' + oauthForm.label" width="360"
                 @closed="oauthForm.clientId = ''; oauthForm.clientSecret = ''; oauthForm.switch = 1">
        <div class="dialog-content">
          <el-input type="text" :placeholder="$t('clientId')" v-model="oauthForm.clientId"/>
          <el-input type="text" style="margin-top: 14px" :placeholder="$t('clientSecret')" v-model="oauthForm.clientSecret"/>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="oauthForm.switch" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <el-button type="primary" :loading="settingLoading" @click="saveOauth">{{ $t('save') }}</el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog
          v-model="showSetBackground"
          class="cut-dialog"
          @closed="closedSetBackground"
      >
        <template #header>
          <span class="dialog-header-with-tip">
            {{ $t('backgroundTitle') }}
            <el-tooltip>
              <template #content>
                <span>{{ $t('backgroundWarning') }}</span>
              </template>
              <Icon class="title-icon warning" icon="lucide:help-circle" width="16" height="16"/>
            </el-tooltip>
          </span>
        </template>
        <el-input :placeholder="$t('backgroundUrlDesc')" v-model="backgroundUrl" v-if="!localUpShow"
                  class="background-url" @keyup.enter="saveBackground"/>
        <el-image
            v-if="localUpShow"
            :preview-src-list="[backgroundImage]"
            show-progress
            class="cropper"
            fit="cover"
            :src="backgroundImage"
        ></el-image>
        <div class="cut-button">
          <el-button type="primary" link @click="openCut" v-if="!localUpShow">
            {{ $t('localUpload') }}
          </el-button>
          <el-button type="primary" link @click="localUpShow = false" v-if="localUpShow">
            {{ $t('imageLink') }}
          </el-button>
          <el-button type="primary" :loading="settingLoading" @click="saveBackground">{{ $t('save') }}</el-button>
        </div>
      </el-dialog>
      <el-dialog
          v-model="tgSettingShow"
          class="forward-dialog"
      >
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('tgBot') }}</span>
            <el-tooltip effect="dark" :content="$t('tgBotDesc')">
              <Icon class="warning" icon="lucide:help-circle" width="16" height="16"/>
            </el-tooltip>
          </div>
        </template>
        <div class="forward-set-body">
          <el-input :placeholder="setting.tgBotToken || $t('tgBotToken')" v-model="tgBotToken" @keyup.enter="tgBotSave"></el-input>
          <el-input-tag tag-type="warning" :placeholder="$t('toBotTokenDesc')" v-model="tgChatId"
                        @add-tag="addChatTag"></el-input-tag>
          <el-input tag-type="warning" :placeholder="$t('customDomainDesc')" v-model="customDomain" @keyup.enter="tgBotSave"></el-input>
          <div class="tg-msg-label">
            <span>{{t('from')}}</span>
            <el-select v-model="tgMsgFrom">
              <el-option
                  v-for="item in tgMsgFromOption"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>
          </div>
          <div class="tg-msg-label">
            <span>{{t('recipient')}}</span>
            <el-select v-model="tgMsgTo">
              <el-option
                  v-for="item in tgMsgToOption"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>
          </div>
          <div class="tg-msg-label">
            <span>{{t('emailText')}}</span>
            <el-select v-model="tgMsgText">
              <el-option
                  v-for="item in tgMsgTextOption"
                  :key="item.value"
                  :label="item.label"
                  :value="item.value"
              />
            </el-select>
          </div>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="tgBotStatus" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <el-button :loading="settingLoading" type="primary" @click="tgBotSave">
              {{ $t('save') }}
            </el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog
          v-model="thirdEmailShow"
          class="forward-dialog"
      >
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('otherEmail') }}</span>
            <el-tooltip effect="dark" :content="$t('otherEmailDesc')">
              <Icon class="warning" icon="lucide:help-circle" width="16" height="16"/>
            </el-tooltip>
          </div>
        </template>
        <div class="forward-set-body">
          <el-input-tag tag-type="warning" :placeholder="$t('otherEmailInputDesc')" v-model="forwardEmail"
                        @add-tag="emailAddTag"></el-input-tag>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="forwardStatus" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <el-button :loading="settingLoading" type="primary" @click="forwardEmailSave">
              {{ $t('save') }}
            </el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog
          v-model="webhookShow"
          class="forward-dialog"
          @closed="webhookFormatShow = false"
      >
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('webhook') }}</span>
            <el-tooltip effect="dark" :content="$t('webhookDesc')">
              <Icon class="warning" icon="lucide:help-circle" width="16" height="16"/>
            </el-tooltip>
          </div>
        </template>
        <div class="forward-set-body">
          <el-input :placeholder="$t('webhookUrl')" v-model="webhookUrl" @keyup.enter="webhookSave"></el-input>
          <el-input :placeholder="$t('webhookSecret')" v-model="webhookSecret" @keyup.enter="webhookSave"></el-input>
          <div class="tg-msg-label">
            <span>{{ t('webhookRetry') }}</span>
            <el-input-number v-model="webhookRetry" :min="0" :max="5" controls-position="right"/>
          </div>
          <div v-show="webhookFormatShow" class="webhook-format">
            <pre>Content-Type: application/json
Authorization: &lt;secret&gt;</pre>
            <pre>{{ webhookPayloadExample }}</pre>
          </div>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="webhookStatus" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <div class="webhook-footer-right">
              <div class="webhook-format-title" @click="webhookFormatShow = !webhookFormatShow">
                <span>{{ $t('webhookFormat') }}</span>
                <Icon class="webhook-format-icon" :class="{ open: webhookFormatShow }" icon="lucide:chevron-down" width="16" height="16"/>
              </div>
              <el-button :loading="settingLoading" type="primary" @click="webhookSave">
                {{ $t('save') }}
              </el-button>
            </div>
          </div>
        </template>
      </el-dialog>
      <el-dialog
          v-model="forwardRulesShow"
          class="forward-dialog"
      >
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('forwardingRules') }}</span>
            <el-tooltip effect="dark" :content="$t('forwardingRulesDesc')">
              <Icon class="warning" icon="lucide:help-circle" width="16" height="16"/>
            </el-tooltip>
          </div>
        </template>
        <div class="forward-set-body">
          <el-input-tag :placeholder="$t('ruleUsersInputDesc')" tag-type="warning" v-model="ruleEmail"
                        @add-tag="ruleEmailAddTag"/>
        </div>
        <template #footer>
          <div class="dialog-footer">
            <el-radio-group v-model="ruleType">
              <el-radio :value="0">{{ $t('forwardAll') }}</el-radio>
              <el-radio :value="1">{{ $t('rules') }}</el-radio>
            </el-radio-group>
            <el-button :loading="settingLoading" type="primary" @click="ruleEmailSave">
              {{ $t('save') }}
            </el-button>
          </div>
        </template>
      </el-dialog>
      <el-dialog class="resend-table" v-model="showResendList" :title="$t('resendTokenList')">
        <el-table :data="resendList">
          <el-table-column :min-width="emailColumnWidth" property="key" :label="$t('domain')"
                           :show-overflow-tooltip="true"/>
          <el-table-column :width="tokenColumnWidth" property="value" label="Token" fixed="right"
                           :show-overflow-tooltip="true"/>
        </el-table>
      </el-dialog>
      <el-dialog v-model="regVerifyCountShow" :title="$t('rulesVerifyTitle',{count: regVerifyCount})"
                 @closed="regVerifyCount = setting.regVerifyCount">
        <form @submit.prevent>
          <el-input-number type="text" v-model="regVerifyCount" :min="1" @keyup.enter="saveRegVerifyCount"/>
          <el-button type="primary" :loading="settingLoading" @click="saveRegVerifyCount">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="loginVerifyCountShow" :title="$t('rulesVerifyTitle',{count: loginVerifyCount})"
                 @closed="loginVerifyCount = setting.loginVerifyCount">
        <form @submit.prevent="saveLoginVerifyCount">
          <el-input-number v-model="loginVerifyCount" :min="1" :precision="0"/>
          <el-button native-type="submit" type="primary" :loading="settingLoading">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="addVerifyCountShow" :title="$t('rulesVerifyTitle',{count: addVerifyCount})"
                 @closed="addVerifyCount = setting.addVerifyCount">
        <form @submit.prevent>
          <el-input-number type="text" v-model="addVerifyCount" :min="1" @keyup.enter="saveAddVerifyCount"/>
          <el-button type="primary" :loading="settingLoading" @click="saveAddVerifyCount">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog top="5vh" v-model="noticePopupShow" :title="$t('noticePopup')" class="notice-popup"
                 @closed="resetNoticeForm">
        <form @submit.prevent>
          <el-input v-model="noticeForm.noticeTitle" :placeholder="t('titleDesc')" @keyup.enter="saveNoticePopup"/>
          <div class="notice-line-item">
            <el-select v-model="noticeForm.noticeType">
              <template #prefix>
                <span style="margin-right: 10px">{{ $t('icon') }}</span>
              </template>
              <el-option key="none" label="None" value="none"/>
              <el-option key="primary" label="Primary" value="primary"/>
              <el-option key="success" label="Success" value="success"/>
              <el-option key="warning" label="Warning" value="warning"/>
              <el-option key="info" label="Info" value="info"/>
            </el-select>
            <el-select v-model="noticeForm.noticePosition">
              <template #prefix>
                <span style="margin-right: 10px">{{ $t('position') }}</span>
              </template>
              <el-option key="top-left" :label="t('topLeft')" value="top-left"/>
              <el-option key="top-right" :label="t('topRight')" value="top-right"/>
              <el-option key="bottom-left" :label="t('bottomLeft')" value="bottom-left"/>
              <el-option key="bottom-right" :label="t('bottomRight')" value="bottom-right"/>
            </el-select>
            <el-input-number v-model="noticeForm.noticeWidth">
              <template #prefix>
                {{ $t('width') }}
              </template>
              <template #suffix>
                px
              </template>
            </el-input-number>
            <el-input-number v-model="noticeForm.noticeOffset">
              <template #prefix>
                {{ $t('offset') }}
              </template>
              <template #suffix>
                px
              </template>
            </el-input-number>
            <el-input-number v-model="noticeForm.noticeDuration">
              <template #prefix>
                {{ $t('duration') }}
              </template>
              <template #suffix>
                ms
              </template>
            </el-input-number>
          </div>
          <div class="notice-popup-item">
            <el-input
                v-model="noticeForm.noticeContent"
                :autosize="{ minRows: 15, maxRows: 25 }"
                type="textarea"
                :placeholder="t('noticeContentDesc')"
            />
          </div>
        </form>
        <template #footer>
          <div class="dialog-footer">
            <el-switch v-model="noticeForm.notice" :active-value="0" :inactive-value="1" :active-text="$t('enable')"
                       :inactive-text="$t('disable')"/>
            <div class="notice-footer-btns">
              <el-button @click="previewNoticePopup">
                {{ $t('preview') }}
              </el-button>
              <el-button :loading="settingLoading" type="primary" @click="saveNoticePopup">
                {{ $t('save') }}
              </el-button>
            </div>
          </div>
        </template>
      </el-dialog>
      <el-dialog v-model="addS3Show" :title="t('s3Configuration')" width="360" @closed="resetAddS3Form">
        <form @submit.prevent>
          <el-input class="dialog-input" type="text" placeholder="Bucket" v-model="s3.bucket" @keyup.enter="saveS3"/>
          <el-input class="dialog-input" type="text" placeholder="Endpoint" v-model="s3.endpoint" @keyup.enter="saveS3"/>
          <el-input class="dialog-input" type="text" placeholder="Region" v-model="s3.region" @keyup.enter="saveS3"/>
          <el-input class="dialog-input" type="text" :placeholder="setting.s3AccessKey || 'Access key'"
                    v-model="s3.s3AccessKey" @keyup.enter="saveS3"/>
          <el-input style="margin-bottom: 10px" type="text" :placeholder="setting.s3SecretKey || 'Secret key'" v-model="s3.s3SecretKey" @keyup.enter="saveS3"/>
          <div class="force-path-style">
            <div class="force-path-style-left">
              <span>ForcePathStyle</span>
              <el-tooltip effect="dark" :content="$t('forcePathStyleDesc')">
                <Icon class="warning" icon="lucide:help-circle" width="15" height="15"/>
              </el-tooltip>
            </div>
            <el-switch :before-change="beforeChange" :active-value="0" :inactive-value="1"
                       v-model="s3.forcePathStyle"/>
          </div>
          <div class="s3-button">
            <el-button :loading="clearS3Loading" @click="clearS3">{{ t('clear') }}</el-button>
            <el-button type="primary" :loading="settingLoading && !clearS3Loading" @click="saveS3">{{ t('save') }}</el-button>
          </div>
        </form>
      </el-dialog>
      <el-dialog v-model="emailPrefixShow" :title="t('emailPrefix')" @closed="resetEmailPrefix">
        <div class="email-prefix">
          <div>{{ t('atLeast') }}</div>
          <el-input-number v-model="minEmailPrefix" :min="1" :max="20" style="width: 150px" @keyup.enter="saveEmailPrefix">
            <template #suffix>
              <span>{{ t('character') }}</span>
            </template>
          </el-input-number>
        </div>
        <div class="prefix-filter">
          <div style="margin-bottom: 10px;">{{ t('mustNotContain') }}</div>
          <el-input-tag style="margin-bottom: 14px;" v-model="emailPrefixFilter"/>
        </div>
        <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveEmailPrefix">{{ $t('save') }}</el-button>
      </el-dialog>
      <el-dialog v-model="blackFormShow" class="forward-dialog" @closed="resetBlackList">
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('blackList') }}</span>
            <el-tooltip effect="dark" :content="$t('blackListDesc')">
              <Icon class="warning" icon="lucide:help-circle" width="16" height="16"/>
            </el-tooltip>
          </div>
        </template>
        <el-form>
          <el-form-item :label="t('blackFromDesc')" label-position="top">
            <el-input-tag v-model="blackListForm.blackFrom" @add-tag="banEmailAddTag"/>
          </el-form-item>
          <el-form-item :label="t('blackSubjectDesc')" label-position="top">
            <el-input-tag v-model="blackListForm.blackSubject"/>
          </el-form-item>
          <el-form-item :label="t('blackContentDesc')" label-position="top">
            <el-input-tag v-model="blackListForm.blackContent"/>
          </el-form-item>
        </el-form>
        <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveBlackList">{{ $t('save') }}</el-button>
      </el-dialog>
      <el-dialog v-model="autoCleanShow" :title="t('autoClean')" class="forward-dialog" @closed="resetAutoClean">
        <el-form>
          <el-form-item :label="t('autoCleanDays')" label-position="top">
            <el-input-number v-model="autoCleanDays" :min="0" :max="3650" style="width: 100%"/>
          </el-form-item>
          <el-form-item :label="t('autoCleanExclude')" label-position="top">
            <el-input-tag
                tag-type="warning"
                :placeholder="$t('autoCleanExcludeDesc')"
                v-model="autoCleanExclude"
                @add-tag="autoCleanExcludeAddTag"
            />
          </el-form-item>
        </el-form>
        <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveAutoClean">{{ $t('save') }}</el-button>
      </el-dialog>
      <el-dialog v-model="aiCodeFilterShow" class="forward-dialog" @closed="resetAiCodeFilter">
        <template #header>
          <div class="forward-head">
            <span class="forward-set-title">{{ $t('codeRecognitionRules') }}</span>
            <el-tooltip effect="dark" :content="$t('codeRecognitionRulesDesc')">
              <Icon class="warning" icon="lucide:help-circle" width="16" height="16"/>
            </el-tooltip>
          </div>
        </template>
        <el-form>
          <el-form-item :label="t('senderRules')" label-position="top">
            <el-input-tag v-model="aiCodeFilter" @add-tag="aiCodeFilterAddTag"/>
          </el-form-item>
        </el-form>
        <el-button type="primary" style="width: 100%;" :loading="settingLoading" @click="saveAiCodeFilter">{{ $t('save') }}</el-button>
      </el-dialog>
    </el-scrollbar>
  </div>
</template>

<script setup>
import {computed, defineOptions, nextTick, reactive, ref} from "vue";
import {deleteBackground, setBackground, setBlackList, settingQuery, settingSet} from "@/request/setting.js";
import {useSettingStore} from "@/store/setting.js";
import {useUiStore} from "@/store/ui.js";
import {useUserStore} from "@/store/user.js";
import {useAccountStore} from "@/store/account.js";
import {Icon} from "@iconify/vue";
import {cvtR2Url, toOssDomain} from "@/utils/convert.js";
import {storeToRefs} from "pinia";
import {debounce} from 'lodash-es'
import {isDomain, isEmail, isIpUrl} from "@/utils/verify-utils.js";
import loading from "@/components/loading/index.vue";
import {getTextWidth} from "@/utils/text.js";
import {fileToBase64} from "@/utils/file-utils.js"
import {useI18n} from 'vue-i18n';
import axios from "axios";

defineOptions({
  name: 'sys-setting'
})

const currentVersion = 'v3.6.0'
const hasUpdate = ref(false)
let getUpdateErrorCount = 1;
const {t, locale} = useI18n();
const firstLoading = ref(true)
const settingReady = ref(false)
const backgroundImage = ref('')
const localUpShow = ref(false)
const accountStore = useAccountStore();
const userStore = useUserStore();
const editTitleShow = ref(false)
const resendTokenFormShow = ref(false)
const blackFormShow = ref(false)
const autoCleanShow = ref(false)
const aiCodeFilterShow = ref(false)
const turnstileShow = ref(false)
const tgSettingShow = ref(false)
const noticePopupShow = ref(false)
const thirdEmailShow = ref(false)
const webhookShow = ref(false)
const forwardRulesShow = ref(false)
const emailPrefixShow = ref(false)
const showResendList = ref(false)
const settingStore = useSettingStore();
const uiStore = useUiStore();
const {settings: setting} = storeToRefs(settingStore);
const editTitle = ref('')
const settingLoading = ref(false)
const clearS3Loading = ref(false)
const loginOpacity = ref(0)
const minEmailPrefix = ref(0)
const emailPrefixFilter = ref([])
const autoCleanDays = ref(0)
const autoCleanExclude = ref([])
const backgroundUrl = ref('')
let backgroundFile = {}
const showSetBackground = ref(false)
let regVerifyCount = ref(1)
const loginVerifyCount = ref(1)
let addVerifyCount = ref(1)
let backup = '{}'
const addS3Show = ref(false)
const addVerifyCountShow = ref(false)
const regVerifyCountShow = ref(false)
const loginVerifyCountShow = ref(false)
const resendTokenForm = reactive({
  domain: '',
  token: '',
})
const turnstileForm = reactive({
  siteKey: '',
  secretKey: ''
})

const oauthPlatforms = [
  { key: 'google', label: 'Google', icon: 'devicon:google', iconType: 'iconify' },
  { key: 'github', label: 'GitHub', icon: 'codicon:github-inverted', iconType: 'iconify' },
  { key: 'linuxdo', label: 'LinuxDo', icon: '/image/linuxdo.webp', iconType: 'image' },
]
const oauthSettingShow = ref(false)
const oauthForm = reactive({
  key: '',
  label: '',
  clientId: '',
  clientSecret: '',
  switch: 1,
})

const s3 = reactive({
  bucket: '',
  endpoint: '',
  region: '',
  s3AccessKey: '',
  s3SecretKey: '',
  forcePathStyle: 1
})

const noticeForm = reactive({
  noticeTitle: '',
  noticeContent: '',
  noticeType: '',
  noticeDuration: '',
  noticePosition: '',
  noticeOffset: 0,
  notice: 0,
  noticeWidth: 0
})

const regKeyOptions = computed(() => [
  {label: t('enable'), value: 0},
  {label: t('disable'), value: 1},
  {label: t('optional'), value: 2},
])

const blackListForm = ref({
  blackSubject: [],
  blackContent: [],
  blackFrom: []
})
const aiCodeFilter = ref([])

const tgChatId = ref([])
const customDomain = ref('')
const tgBotStatus = ref(0)
const tgBotToken = ref('')
const forwardEmail = ref([])
const forwardStatus = ref(0)
const webhookUrl = ref('')
const webhookStatus = ref(1)
const webhookRetry = ref(0)
const webhookSecret = ref('')
const webhookFormatShow = ref(false)
const webhookPayloadExample = `{
  "emailId": 1,
  "sendEmail": "hello@example.com",
  "sendName": "hello",
  "toEmail": "admin@example.com",
  "toName": "admin",
  "subject": "Hello",
  "text": "Hello",
  "content": "<div>Hello</div>",
  "code": "123456",
  "createTime": "2099-12-30 23:59:59"
}`
const emailColumnWidth = ref(0)
const tokenColumnWidth = ref(0)
const ruleType = ref(0)
const ruleEmail = ref([])
const tgMsgFrom = ref('')
const tgMsgTo = ref('')
const tgMsgText = ref('')

const tgMsgFromOption = [{label: t('show'), value: 'show'}, {label: t('hide'), value: 'hide'}, {label: t('onlyName'), value:'only-name'}]
const tgMsgToOption = [{label: t('show'), value: 'show'}, {label: t('hide'), value: 'hide'}]
const tgMsgTextOption = [{label: t('show'), value: 'show'}, {label: t('hide'), value: 'hide'}]
const tgMsgLabelWidth = computed(() => locale.value === 'en' ? '120px' : '100px');

getSettings()
getUpdate()

function maskSiteKey(value) {
  return value ? `${String(value).slice(0, 6)}******` : ''
}

function getSettings() {
  settingReady.value = false
  settingQuery().then(settingData => {
    setting.value = settingData
    settingStore.domainList = settingData.domainList;
    resendTokenForm.domain = setting.value.domainList[0]
    loginOpacity.value = setting.value.loginOpacity
    minEmailPrefix.value = setting.value.minEmailPrefix
    firstLoading.value = false
    backgroundUrl.value = setting.value.background?.startsWith('http') ? setting.value.background : ''
    editTitle.value = setting.value.title
    addVerifyCount.value = setting.value.addVerifyCount
    regVerifyCount.value = setting.value.regVerifyCount
    loginVerifyCount.value = setting.value.loginVerifyCount
    resetNoticeForm()
    resetAddS3Form()
    resetEmailPrefix()
    resetBlackList()
    resetAiCodeFilter()
    nextTick(() => {
      settingReady.value = true
    })
  })
}


function openNoticePopup() {
  uiStore.showNotice()
}

function openAddVerifyCount() {
  if (settingLoading.value) return
  addVerifyCountShow.value = true
}

function openRegVerifyCount() {
  if (settingLoading.value) return
  regVerifyCountShow.value = true
}

function openLoginVerifyCount() {
  if (settingLoading.value) return
  loginVerifyCountShow.value = true
}

function resetAddS3Form() {
  s3.bucket = setting.value.bucket
  s3.endpoint = setting.value.endpoint
  s3.region = setting.value.region
  s3.s3AccessKey = ''
  s3.s3SecretKey = ''
  s3.forcePathStyle = setting.value.forcePathStyle
}

const resendList = computed(() => {

  let list = Object.keys(setting.value.resendTokens).map(key => {
    return {
      key: key,
      value: setting.value.resendTokens[key]
    };
  })

  if (list.length > 0) {

    const key = list.reduce((a, b) => compareByLengthAndUpperCase(a, b, 'key')).key;
    emailColumnWidth.value = getTextWidth(key) + 30;

    const value = list.reduce((a, b) => compareByLengthAndUpperCase(a, b, 'value')).value;
    tokenColumnWidth.value = getTextWidth(value) + 30;

  }

  return list;
});

function getUpdate() {
  if (getUpdateErrorCount > 5 || !getUpdateErrorCount) return
  axios.get('https://api.github.com/repos/maillab/cloud-mail/releases/latest').then(({data}) => {
    hasUpdate.value = data.name !== currentVersion
    getUpdateErrorCount = 0
  }).catch(e => {
    getUpdateErrorCount++
    setTimeout(() => {
      getUpdate()
    }, 2000)
    console.error('检查更新失败：', e)
  })
}

function saveAddVerifyCount() {
  if (!addVerifyCount.value) {
    addVerifyCount.value = 1
  }
  editSetting({addVerifyCount: addVerifyCount.value})
}

function saveRegVerifyCount() {
  if (!regVerifyCount.value) {
    regVerifyCount.value = 1
  }
  editSetting({regVerifyCount: regVerifyCount.value})
}

function saveLoginVerifyCount() {
  editSetting({loginVerifyCount: loginVerifyCount.value || 1})
}

const compareByLengthAndUpperCase = (a, b, key) => {
  const getUpperCaseCount = (str) => (str.match(/[A-Z]/g) || []).length;
  if (a[key].length === b[key].length) {
    return getUpperCaseCount(a[key]) > getUpperCaseCount(b[key]) ? a : b;
  }
  return a[key].length > b[key].length ? a : b;
};


function closedSetBackground() {
  backgroundImage.value = ''
  localUpShow.value = false
  backgroundUrl.value = setting.value.background?.startsWith('http') ? setting.value.background : ''
}

function openTgSetting() {
  tgBotStatus.value = setting.value.tgBotStatus
  tgBotToken.value = ''
  customDomain.value = setting.value.customDomain
  tgMsgFrom.value = setting.value.tgMsgFrom
  tgMsgText.value = setting.value.tgMsgText
  tgMsgTo.value = setting.value.tgMsgTo
  tgChatId.value = []
  if (setting.value.tgChatId) {
    const list = setting.value.tgChatId.split(',')
    tgChatId.value.push(...list)
  }
  tgSettingShow.value = true
}

function openNoticePopupSetting() {
  noticePopupShow.value = true
}

function openResendList() {
  showResendList.value = true
}

function resetNoticeForm() {
  noticeForm.notice = setting.value.notice
  noticeForm.noticeContent = setting.value.noticeContent
  noticeForm.noticeDuration = setting.value.noticeDuration
  noticeForm.noticeTitle = setting.value.noticeTitle
  noticeForm.noticePosition = setting.value.noticePosition
  noticeForm.noticeType = setting.value.noticeType
  noticeForm.noticeOffset = setting.value.noticeOffset
  noticeForm.noticeWidth = setting.value.noticeWidth
}

function saveNoticePopup() {
  noticeForm.noticeOffset = noticeForm.noticeOffset || 0
  noticeForm.noticeWidth = noticeForm.noticeWidth || 0
  noticeForm.noticeDuration = noticeForm.noticeDuration || 0
  editSetting({...noticeForm})
}

function previewNoticePopup() {
  uiStore.previewNotice({...noticeForm})
}

function openThirdEmailSetting() {
  forwardEmail.value = []
  forwardStatus.value = setting.value.forwardStatus
  if (setting.value.forwardEmail) {
    const list = setting.value.forwardEmail.split(',')
    forwardEmail.value.push(...list)
  }
  thirdEmailShow.value = true
}

function openWebhookSetting() {
  webhookStatus.value = setting.value.webhookStatus
  webhookUrl.value = setting.value.webhookUrl || ''
  webhookRetry.value = setting.value.webhookRetry ?? 0
  webhookSecret.value = setting.value.webhookSecret || ''
  webhookShow.value = true
}

function openEmailPrefix() {
  emailPrefixShow.value = true
}

function openAutoClean() {
  autoCleanDays.value = setting.value.autoCleanDays ?? 0
  autoCleanExclude.value = setting.value.autoCleanExclude
      ? setting.value.autoCleanExclude.split(',').filter(Boolean)
      : []
  autoCleanShow.value = true
}

function openForwardRules() {
  ruleType.value = setting.value.ruleType
  ruleEmail.value = []
  if (setting.value.ruleEmail) {
    const list = setting.value.ruleEmail.split(',')
    ruleEmail.value.push(...list)
  }
  forwardRulesShow.value = true
}

function emailAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  forwardEmail.value.splice(forwardEmail.value.length - 1, 1)

  emails.forEach(email => {
    if (isEmail(email) && !forwardEmail.value.includes(email)) {
      forwardEmail.value.push(email)
    }
  })
}

function ruleEmailAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  ruleEmail.value.splice(ruleEmail.value.length - 1, 1)

  emails.forEach(email => {
    if (isEmail(email) && !ruleEmail.value.includes(email)) {
      ruleEmail.value.push(email)
    }
  })
}

function addChatTag(val) {

  const chatIds = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  tgChatId.value.splice(tgChatId.value.length - 1, 1)

  chatIds.forEach(id => {
    if (!isNaN(Number(id))) {
      tgChatId.value.push(id)
    }
  })
}

function clearS3() {

  const form = {
    bucket: '',
    endpoint: '',
    region: '',
    s3AccessKey: '',
    s3SecretKey: '',
    forcePathStyle: 1
  }
  clearS3Loading.value = true
  editSetting(form)
}

function saveS3() {

  const form = {
    bucket: s3.bucket,
    endpoint: s3.endpoint,
    region: s3.region,
    forcePathStyle: s3.forcePathStyle
  }

  if (s3.s3AccessKey) form.s3AccessKey = s3.s3AccessKey
  if (s3.s3SecretKey) form.s3SecretKey = s3.s3SecretKey

  editSetting(form)
}

function tgBotSave() {
  const form = {
    customDomain: customDomain.value,
    tgBotStatus: tgBotStatus.value,
    tgChatId: tgChatId.value + '',
    tgMsgFrom: tgMsgFrom.value,
    tgMsgText: tgMsgText.value,
    tgMsgTo: tgMsgTo.value
  }
  if (tgBotToken.value) form.tgBotToken = tgBotToken.value
  editSetting(form)
}

function forwardEmailSave() {
  const form = {
    forwardStatus: forwardStatus.value,
    forwardEmail: forwardEmail.value + ''
  }
  editSetting(form)
}

function webhookSave() {
  let retry = Number(webhookRetry.value)
  if (isNaN(retry) || retry < 0) {
    retry = 0
  }
  const url = toOssDomain(webhookUrl.value.trim())
  if (isIpUrl(url)) {
    ElMessage({
      message: t('webhookIpNotSupported'),
      type: 'warning',
      plain: true
    })
    return
  }
  const form = {
    webhookStatus: webhookStatus.value,
    webhookUrl: url,
    webhookRetry: retry,
    webhookSecret: webhookSecret.value.trim()
  }
  editSetting(form)
}


function ruleEmailSave() {
  const form = {
    ruleEmail: ruleEmail.value + '',
    ruleType: ruleType.value
  }
  editSetting(form)
}

function doOpacityChange() {
  if (!settingReady.value) return
  const form = {}
  form.loginOpacity = loginOpacity.value
  editSetting(form, true)
}

function resetEmailPrefix() {
  minEmailPrefix.value = setting.value.minEmailPrefix
  emailPrefixFilter.value = setting.value.emailPrefixFilter
}

function resetBlackList() {
  blackListForm.value.blackFrom = setting.value.blackFrom ? setting.value.blackFrom.split(',') : []
  blackListForm.value.blackContent = setting.value.blackContent ? setting.value.blackContent.split(',') : []
  blackListForm.value.blackSubject = setting.value.blackSubject ? setting.value.blackSubject.split(',') : []
}

function resetAutoClean() {
  autoCleanDays.value = setting.value.autoCleanDays ?? 0
  autoCleanExclude.value = setting.value.autoCleanExclude
      ? setting.value.autoCleanExclude.split(',').filter(Boolean)
      : []
}

function resetAiCodeFilter() {
  aiCodeFilter.value = setting.value.aiCodeFilter ? setting.value.aiCodeFilter.split(',') : []
}

function saveEmailPrefix() {
  const form = {}
  form.minEmailPrefix = minEmailPrefix.value
  form.emailPrefixFilter = emailPrefixFilter.value
  editSetting(form, true)
}

function saveAutoClean() {
  editSetting({
    autoCleanDays: autoCleanDays.value,
    autoCleanExclude: autoCleanExclude.value.join(',')
  }, true)
}

function saveAiCodeFilter() {
  editSetting({aiCodeFilter: aiCodeFilter.value + ''})
}

const opacityChange = debounce(doOpacityChange, 1000, {
  leading: false,
  trailing: true
})

function saveBlackList() {

  let form = {
    blackContent: blackListForm.value.blackContent + '',
    blackSubject: blackListForm.value.blackSubject + '',
    blackFrom: blackListForm.value.blackFrom + ''
  }

  settingLoading.value = true

  setBlackList(form).then(() => {
    getSettings()
    ElMessage({
      message: t('setSuccess'),
      type: "success",
      plain: true
    })
    blackFormShow.value = false;
  }).finally(() => {
    settingLoading.value = false;
  })
}

function banEmailAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  blackListForm.value.blackFrom.splice(blackListForm.value.blackFrom.length - 1, 1)

  emails.forEach(email => {
    if ((isEmail(email) || isDomain(email)) && !blackListForm.value.blackFrom.includes(email)) {
      blackListForm.value.blackFrom.push(email)
    }
  })
}

function autoCleanExcludeAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  autoCleanExclude.value.splice(autoCleanExclude.value.length - 1, 1)

  emails.forEach(email => {
    if (isEmail(email) && !autoCleanExclude.value.includes(email)) {
      autoCleanExclude.value.push(email)
    }
  })
}

function aiCodeFilterAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  aiCodeFilter.value.splice(aiCodeFilter.value.length - 1, 1)

  emails.forEach(email => {
    if ((isEmail(email) || isDomain(email)) && !aiCodeFilter.value.includes(email)) {
      aiCodeFilter.value.push(email)
    }
  })
}


function delBackground() {
  ElMessageBox.confirm(t('delBackgroundConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    deleteBackground().then(() => {
      backgroundUrl.value = ''
      setting.value.background = null
      ElMessage({
        message: t('delSuccessMsg'),
        type: "success",
        plain: true
      })
    })
  })
}

function openOauthSetting(p) {
  oauthForm.key = p.key
  oauthForm.label = p.label
  oauthForm.clientId = setting.value[p.key + 'ClientId'] || ''
  oauthForm.clientSecret = setting.value[p.key + 'ClientSecret'] || ''
  oauthForm.switch = setting.value[p.key + 'Switch'] ?? 1
  oauthSettingShow.value = true
}

function saveOauth() {
  const form = {}
  form[oauthForm.key + 'ClientId'] = oauthForm.clientId
  form[oauthForm.key + 'ClientSecret'] = oauthForm.clientSecret
  form[oauthForm.key + 'Switch'] = oauthForm.switch
  editSetting(form)
}

function saveTurnstileKey() {
  const settingForm = {}
  settingForm.siteKey = turnstileForm.siteKey
  settingForm.secretKey = turnstileForm.secretKey
  editSetting(settingForm)
}

async function saveBackground() {

  if (settingLoading.value) return

  let image = ''

  if (localUpShow.value) {
    image = await fileToBase64(backgroundFile, true);
  } else {
    if (backgroundUrl.value && !backgroundUrl.value.startsWith('http')) {
      ElMessage({
        message: t('imageLinkErrorMsg'),
        type: "error",
        plain: true
      })
      return
    }
    image = backgroundUrl.value
  }
  settingLoading.value = true

  setBackground(image).then(key => {
    setting.value.background = key
    showSetBackground.value = false
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
    localUpShow.value = false
    backgroundImage.value = ''
  }).finally(() => {
    settingLoading.value = false
  })

}

function openSetBackground() {
  showSetBackground.value = true
}

function openCut() {
  const doc = document.createElement('input')
  doc.setAttribute('type', 'file')
  doc.setAttribute('accept', 'image/*')
  doc.click()
  doc.onchange = async (e) => {
    backgroundFile = e.target.files[0]
    backgroundImage.value = URL.createObjectURL(e.target.files[0])
    localUpShow.value = true
  }
}

function openResendForm() {
  resendTokenFormShow.value = true
}

function openBlackListForm() {
  blackFormShow.value = true
}

function openAiCodeFilter() {
  aiCodeFilterShow.value = true
}

function saveResendToken() {
  const settingForm = {
    resendTokens: {}
  }
  const domain = resendTokenForm.domain.slice(1)
  settingForm.resendTokens[domain] = resendTokenForm.token
  editSetting(settingForm)
}

function backupSetting() {
  const settingForm = {...setting.value}
  delete settingForm.resendTokens
  delete settingForm.siteKey
  delete settingForm.secretKey
  backup = JSON.stringify(setting.value)
}

function cleanResendTokenForm() {
  resendTokenForm.token = ''
}

function beforeChange() {
  if (!settingReady.value || settingLoading.value) return false
  backupSetting()
  return true
}

function change(e) {
  if (!settingReady.value) return
  const settingForm = {...setting.value}
  delete settingForm.siteKey
  delete settingForm.secretKey
  delete settingForm.s3AccessKey
  delete settingForm.s3SecretKey
  delete settingForm.tgBotToken
  delete settingForm.resendTokens
  editSetting(settingForm, false)
}

function changeField(key, value) {
  if (!settingReady.value || settingLoading.value) return
  setting.value[key] = value
  editSetting({[key]: value}, false)
}

function saveTitle() {
  editSetting({title: editTitle.value})
}

function jump(href) {
  const doc = document.createElement('a')
  doc.href = href
  doc.target = '_blank'
  doc.click()
}

function editSetting(settingForm, refreshStatus = true) {
  if (settingLoading.value) return
  settingLoading.value = true

  settingSet(settingForm).then(() => {
    settingLoading.value = false
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
    if (setting.value.manyEmail === 1) {
      accountStore.currentAccountId = userStore.user.account.accountId;
    }
    if (refreshStatus) {
      getSettings()
    }
    editTitleShow.value = false
    resendTokenFormShow.value = false
    turnstileShow.value = false
    tgSettingShow.value = false
    thirdEmailShow.value = false
    webhookShow.value = false
    forwardRulesShow.value = false
    addVerifyCountShow.value = false
    regVerifyCountShow.value = false
    loginVerifyCountShow.value = false
    noticePopupShow.value = false
    addS3Show.value = false
    emailPrefixShow.value = false
    aiCodeFilterShow.value = false
    autoCleanShow.value = false
    oauthSettingShow.value = false
  }).catch((e) => {
    loginOpacity.value = setting.value.loginOpacity
    setting.value = {...setting.value, ...JSON.parse(backup)}
  }).finally(() => {
    settingLoading.value = false
    clearS3Loading.value = false
  })
}
</script>

<style scoped lang="scss">
.settings-container {
  height: 100%;
  overflow: hidden;
  background: var(--app-canvas) !important;
  position: relative;

  .loading {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    z-index: 2;
    width: 100%;
    position: absolute;
    top: 0;
    left: 0;
    background: var(--loadding-background);
  }

  .loading-show {
    transition: all 200ms ease 200ms;
    opacity: 1;
  }

  .loading-hide {
    transition: var(--loading-hide-transition);
    pointer-events: none;
    opacity: 0;
  }
}

.scroll {
  width: 100%;
  height: 100%;

  :deep(.el-scrollbar__view) {
    min-height: 100%;
  }

  .scroll-body {
    max-width: 1160px;
    margin: 0 auto;
    padding: 22px 28px 40px;

    @media (max-width: 767px) {
      padding: 16px 14px 28px;
    }
  }
}

.page-head {
  padding: 2px 2px 16px;
}

.page-title {
  font-size: 20px;
  font-weight: 700;
  letter-spacing: -0.02em;
  color: var(--text-primary);
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  align-items: start;

  @media (max-width: 980px) {
    grid-template-columns: 1fr;
    gap: 14px;
  }
}

.settings-card {
  background-color: var(--surface-elevated);
  border-radius: 16px;
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-xs);
  overflow: hidden;
  transition: border-color 180ms ease, box-shadow 180ms ease;

  &:hover {
    border-color: var(--border-strong);
  }
}

.card-head {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 18px;
  border-bottom: 1px solid var(--border-subtle);
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

  &--indigo {
    background: rgba(79, 70, 229, 0.12);
    color: #4f46e5;
  }

  &--amber {
    background: rgba(245, 158, 11, 0.14);
    color: #d97706;
  }

  &--emerald {
    background: rgba(16, 185, 129, 0.13);
    color: #059669;
  }

  &--slate {
    background: var(--surface-subtle);
    color: var(--text-secondary);
  }
}

.card-title {
  font-size: 14.5px;
  font-weight: 600;
  color: var(--text-primary);
}

.card-content {
  padding: 6px 18px 14px;
  display: flex;
  flex-direction: column;
}

.setting-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 13.5px;

  &:last-child {
    border-bottom: none;
    padding-bottom: 4px;
  }

  .item-label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: var(--text-secondary);
    min-width: 0;

    span {
      line-height: 1.4;
    }
  }

  .item-control {
    display: flex;
    align-items: center;
    justify-content: flex-end;
    gap: 8px;
    min-width: 0;
  }
}

.inline-controls {
  gap: 8px;
}

.opt-pill {
  width: 30px;
  height: 28px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-subtle);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;

  &:hover {
    background: var(--surface-hover);
    border-color: var(--border-strong);
    color: var(--text-primary);
  }

  &--primary {
    background: var(--brand-primary-soft);
    border-color: transparent;
    color: var(--brand-primary);

    &:hover {
      background: var(--brand-primary);
      color: #ffffff;
    }
  }

  &--danger:hover {
    background: rgba(239, 68, 68, 0.12);
    border-color: rgba(239, 68, 68, 0.28);
    color: #ef4444;
  }
}

.status-pill {
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 999px;
  background: var(--surface-subtle);
  color: var(--text-muted);
  white-space: nowrap;

  &.is-on {
    background: rgba(16, 185, 129, 0.13);
    color: #10b981;
  }

  &.is-neutral {
    background: var(--brand-primary-soft);
    color: var(--brand-primary);
  }
}

.tip-trigger {
  display: inline-flex;
  align-items: center;
  color: var(--text-muted);
}

.warning {
  color: var(--text-muted);
  cursor: pointer;
  transition: color 150ms ease;

  &:hover {
    color: var(--text-secondary);
  }
}

.oauth-icon {
  width: 20px !important;
  height: 20px !important;
  min-width: 20px;
  flex-shrink: 0;
}

.background {
  width: 196px;
  height: 110px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  overflow: hidden;

  @media (max-width: 500px) {
    width: 150px;
    height: 84px;
  }
}

.bg-control {
  align-items: flex-start !important;
  gap: 8px;
}

.background-btn {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.personalized {
  align-items: flex-start;
}

.error-image {
  background: var(--surface-subtle);
  color: var(--text-muted);
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.bot-verify {
  max-width: 60%;

  .mono-ellipsis {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 12.5px;
    color: var(--text-primary);
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0;
  }
}

.email-title {
  max-width: 65%;

  .value-ellipsis {
    color: var(--text-primary);
    font-weight: 500;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0;
  }
}

.cropper {
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  height: 397px;
  width: 705px;

  @media (max-width: 767px) {
    width: calc(100vw - 60px);
    height: calc((100vw - 60px) * 9 / 16);
  }
}

.dialog-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.notice-footer-btns {
  display: flex;
  align-items: center;
  gap: 8px;
}

.webhook-footer-right {
  display: flex;
  align-items: center;
  gap: 12px;
}

.webhook-format-title {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  cursor: pointer;
  user-select: none;
  color: var(--brand-primary);
  font-size: 13px;
}

.webhook-format-icon {
  transition: transform 0.2s;

  &.open {
    transform: rotate(180deg);
  }
}

.notice-popup-item {
  margin-top: 14px;
}

.notice-line-item {
  margin-top: 14px;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 12px;

  > * {
    width: 100%;
  }

  @media (max-width: 840px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 580px) {
    grid-template-columns: 1fr;
  }
}

.background-url {
  width: min(calc(100vw - 70px), 500px);
}

.dialog-header-with-tip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 16px;
  font-weight: 600;
}

:deep(.el-dialog) {
  width: 400px !important;

  @media (max-width: 440px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

:deep(.resend-table.el-dialog) {
  min-height: 300px;
  width: 500px !important;

  @media (max-width: 540px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

:deep(.notice-popup.el-dialog) {
  min-height: 300px;
  width: 820px !important;

  @media (max-width: 860px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

:deep(.resend-table .el-dialog__header) {
  padding-bottom: 5px;
}

:deep(.el-table__inner-wrapper:before) {
  background: var(--border-subtle);
}

:deep(.cut-dialog.el-dialog) {
  width: fit-content !important;
  height: fit-content !important;
}

:deep(.forward-dialog.el-dialog) {
  width: 500px !important;

  @media (max-width: 540px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

.forward-dialog {
  .forward-head {
    display: flex;
    align-items: center;
    gap: 6px;

    .forward-set-title {
      font-size: 16px;
      font-weight: 600;
    }
  }
}

.cut-button {
  padding-top: 14px;
  width: 100%;
  display: flex;
  justify-content: space-between;

  .el-button {
    width: fit-content;
  }
}

.forward-set-body {
  display: flex;
  flex-direction: column;

  .el-switch {
    align-self: end;
  }

  > *:nth-child(-n+2) {
    margin-bottom: 14px;
  }

  .tg-msg-label {
    margin-top: 10px;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .el-select {
      width: v-bind(tgMsgLabelWidth);
    }

    .el-input-number {
      width: 120px;
    }
  }

  .webhook-format pre {
    margin: 8px 0 0;
    padding: 10px;
    font-size: 12px;
    line-height: 1.5;
    overflow-x: auto;
    border-radius: 8px;
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
  }
}

.email-prefix {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 14px;
}

.prefix-filter {
  display: flex;
  flex-direction: column;
}

.s3-button {
  display: grid;
  grid-template-columns: 88px 1fr;
  gap: 12px;
  margin-top: 14px;

  .el-button {
    margin: 0;
  }
}

.dialog-input {
  margin-bottom: 14px;
}

.force-path-style {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;

  .force-path-style-left {
    display: flex;
    align-items: center;
    gap: 6px;
  }
}

.about .card-content {
  padding: 8px 18px 14px;
}

.concerning-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--border-subtle);
  font-size: 13.5px;

  &:last-child {
    border-bottom: none;
    padding-bottom: 4px;
  }

  .about-label {
    color: var(--text-secondary);
    white-space: nowrap;
  }

  .community {
    display: flex;
    gap: 8px;
    flex-wrap: wrap;
    justify-content: flex-end;
  }

  :deep(.el-button) {
    height: 30px;
    padding: 0 10px;
    border-radius: 8px;
    font-weight: 500;
  }
}

form .el-button {
  margin-top: 12px;
  width: 100%;
}

.el-switch {
  height: 26px;
}

:deep(.el-select__wrapper) {
  min-height: 28px;
}
</style>

<style>
.el-popper.is-dark {
}
</style>
