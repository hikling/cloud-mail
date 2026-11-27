<template>
  <div class="settings-container">
    <div class="loading" :class="firstLoading ? 'loading-show' : 'loading-hide'">
      <loading/>
    </div>
    <el-scrollbar class="scroll" v-if="!firstLoading">
      <div class="scroll-body">
        <!-- Calm Minimal Header + Segmented Tabs -->
        <header class="sys-header">
          <div class="sys-header-left">
            <h1 class="workspace-title">{{ $t('SystemSettings') }}</h1>
            <el-tooltip :content="versionTooltip" placement="bottom" :show-after="300">
              <el-badge is-dot :hidden="!hasUpdate">
                <button type="button" class="version-text-btn" @click="jump(versionLink)">
                  {{ currentVersion }}
                </button>
              </el-badge>
            </el-tooltip>
          </div>
          <div class="tab-switcher" role="tablist">
            <button
              v-for="tab in workspaceTabs"
              :key="tab.id"
              type="button"
              role="tab"
              :aria-selected="activeTab === tab.id"
              class="tab-btn"
              :class="{ active: activeTab === tab.id }"
              @click="activeTab = tab.id"
            >
              <span>{{ $t(tab.labelKey) }}</span>
            </button>
          </div>
        </header>

        <!-- Paired Equal-Height 2-Column Grids with Smooth Tab Transition -->
        <Transition name="sys-tab-fade" mode="out-in">
          <!-- Tab 1: Basic & Appearance -->
          <div v-if="activeTab === 'general'" key="general" class="settings-grid">
            <section class="setting-group">
              <h2 class="group-heading">{{ $t('sysSectionGeneral') }}</h2>
              <div class="group-card">
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('websiteTitle') }}</div>
                  </div>
                  <div class="row-control email-title">
                    <span class="value-ellipsis">{{ setting.title }}</span>
                    <button type="button" class="action-btn" @click="editTitleShow = true">
                      {{ $t('change') }}
                    </button>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('multipleEmail') }}</div>
                    <div class="row-desc">{{ $t('multipleEmailDesc') }}</div>
                  </div>
                  <div class="row-control">
                    <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                               v-model="setting.manyEmail"/>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('loginDomain') }}</div>
                  </div>
                  <div class="row-control">
                    <el-switch @change="change" :before-change="beforeChange" :active-value="1" :inactive-value="0"
                               v-model="setting.loginDomain"/>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('syncDelete') }}</div>
                    <div class="row-desc">{{ $t('syncDeleteDesc') }}</div>
                  </div>
                  <div class="row-control">
                    <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                               v-model="setting.syncDelete"/>
                  </div>
                </div>
              </div>
            </section>

            <section class="setting-group">
              <h2 class="group-heading">{{ $t('sysSectionWorkspace') }}</h2>
              <div class="group-card">
                <div class="setting-row setting-row--stack setting-row--fixed">
                  <div class="row-info">
                    <div class="row-label">{{ $t('auroraThemeTitle') }}</div>
                    <div class="row-desc">{{ $t('auroraThemeDesc') }}</div>
                  </div>
                  <AuroraPicker />
                </div>
                <div class="setting-row setting-row--stack setting-row--fixed">
                  <div class="bg-row-head">
                    <div class="row-info">
                      <div class="row-label-inline">
                        <span class="row-label">{{ $t('workspaceOpacity') }}</span>
                        <span class="opacity-readout">{{ Math.round((loginOpacity ?? 0.85) * 100) }}%</span>
                      </div>
                      <div class="row-desc">{{ $t('workspaceOpacityDesc') }}</div>
                    </div>
                    <div class="opacity-presets">
                      <button
                        v-for="preset in opacityPresets"
                        :key="preset.value"
                        type="button"
                        class="preset-chip"
                        :class="{ active: Math.abs((loginOpacity ?? 0.85) - preset.value) < 0.015 }"
                        @click="applyOpacityPreset(preset.value)"
                      >
                        {{ $t(preset.labelKey) }}
                      </button>
                    </div>
                  </div>
                  <div class="opacity-slider-wrap">
                    <el-slider
                      v-model="loginOpacity"
                      :min="0.3"
                      :max="1"
                      :step="0.01"
                      :show-tooltip="false"
                      @input="onOpacityInput"
                      @change="opacityChange"
                    />
                  </div>
                </div>
                <div class="setting-row setting-row--grow">
                  <div class="row-info">
                    <div class="row-label">{{ $t('workspaceBackground') }}</div>
                    <div class="row-desc">{{ $t('workspaceBackgroundDesc') }}</div>
                  </div>
                  <div class="row-control btn-group">
                    <el-image
                        v-if="setting.background"
                        class="background-thumb"
                        :src="cvtR2Url(setting.background)"
                        :preview-src-list="[cvtR2Url(setting.background)]"
                        show-progress
                        fit="cover"
                    />
                    <button type="button" class="action-btn" @click="openSetBackground">
                      {{ $t('sysConfigure') }}
                    </button>
                    <button v-if="setting.background" type="button" class="action-btn action-btn--danger" @click="delBackground">
                      {{ $t('delete') }}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Tab 2: Mail & Push (Row 1: 4 vs 4 equal height, Row 2: 3 vs 2 equal height) -->
          <div v-else-if="activeTab === 'mail'" key="mail" class="settings-grid">
            <section class="setting-group">
              <h2 class="group-heading">{{ $t('sysSectionMailCore') }}</h2>
              <div class="group-card">
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('receiveEmail') }}</div>
                  </div>
                  <div class="row-control">
                    <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                               v-model="setting.receive"/>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('sendEmail') }}</div>
                  </div>
                  <div class="row-control">
                    <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                               v-model="setting.send"/>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('autoRefresh') }}</div>
                    <div class="row-desc">{{ $t('autoRefreshDesc') }}</div>
                  </div>
                  <div class="row-control">
                    <el-switch @change="change" :before-change="beforeChange" :active-value="2" :inactive-value="1"
                               v-model="setting.autoRefresh"/>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('noRecipientTitle') }}</div>
                    <div class="row-desc">{{ $t('noRecipientDesc') }}</div>
                  </div>
                  <div class="row-control">
                    <el-switch @change="change" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                               v-model="setting.noRecipient"/>
                  </div>
                </div>
              </div>
            </section>

            <section class="setting-group">
              <h2 class="group-heading">{{ $t('emailPush') }}</h2>
              <div class="group-card">
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('tgBot') }}</div>
                    <div class="row-desc">{{ $t('tgBotDesc') }}</div>
                  </div>
                  <div class="row-control inline-controls">
                    <span class="status-dot-label" :class="{ 'is-on': setting.tgBotStatus === 0 }">
                      <i></i>{{ setting.tgBotStatus === 0 ? $t('enabled') : $t('disabled') }}
                    </span>
                    <button type="button" class="action-btn" @click="openTgSetting">
                      {{ $t('sysConfigure') }}
                    </button>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('otherEmail') }}</div>
                    <div class="row-desc">{{ $t('otherEmailDesc') }}</div>
                  </div>
                  <div class="row-control inline-controls">
                    <span class="status-dot-label" :class="{ 'is-on': setting.forwardStatus === 0 }">
                      <i></i>{{ setting.forwardStatus === 0 ? $t('enabled') : $t('disabled') }}
                    </span>
                    <button type="button" class="action-btn" @click="openThirdEmailSetting">
                      {{ $t('sysConfigure') }}
                    </button>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('webhook') }}</div>
                    <div class="row-desc">{{ $t('webhookDesc') }}</div>
                  </div>
                  <div class="row-control inline-controls">
                    <span class="status-dot-label" :class="{ 'is-on': setting.webhookStatus === 0 }">
                      <i></i>{{ setting.webhookStatus === 0 ? $t('enabled') : $t('disabled') }}
                    </span>
                    <button type="button" class="action-btn" @click="openWebhookSetting">
                      {{ $t('sysConfigure') }}
                    </button>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('forwardingRules') }}</div>
                    <div class="row-desc">{{ $t('forwardingRulesDesc') }}</div>
                  </div>
                  <div class="row-control inline-controls">
                    <span class="muted-val">
                      {{ setting.ruleType === 0 ? $t('forwardAll') : $t('rules') }}
                    </span>
                    <button type="button" class="action-btn" @click="openForwardRules">
                      {{ $t('sysConfigure') }}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section class="setting-group">
              <h2 class="group-heading">{{ $t('sysSectionMailFilter') }}</h2>
              <div class="group-card">
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ setting.hasCfEmail ? $t('cloudflareEmailSending') : $t('resendToken') }}</div>
                  </div>
                  <div class="row-control" v-if="setting.hasCfEmail">
                    <span class="status-dot-label is-on"><i></i>{{ $t('enabled') }}</span>
                  </div>
                  <div class="row-control btn-group" v-else>
                    <button type="button" class="action-btn" @click="openResendList">
                      {{ $t('resendTokenList') }}
                    </button>
                    <button type="button" class="action-btn action-btn--primary" @click="openResendForm">
                      {{ $t('add') }}
                    </button>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('blackList') }}</div>
                    <div class="row-desc">{{ $t('blackListDesc') }}</div>
                  </div>
                  <div class="row-control">
                    <button type="button" class="action-btn" @click="openBlackListForm">
                      {{ $t('sysConfigure') }}
                    </button>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('autoClean') }}</div>
                    <div class="row-desc">{{ $t('autoCleanDesc') }}</div>
                  </div>
                  <div class="row-control inline-controls">
                    <span class="status-dot-label" :class="{ 'is-on': setting.autoCleanDays > 0 }">
                      <i></i>{{ setting.autoCleanDays > 0 ? $t('autoCleanRetain', { days: setting.autoCleanDays }) : $t('disabled') }}
                    </span>
                    <button type="button" class="action-btn" @click="openAutoClean">
                      {{ $t('sysConfigure') }}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section class="setting-group">
              <div class="group-heading group-heading--split">
                <h2>Workers AI</h2>
                <span class="ai-status-pill" :class="{ 'is-ready': setting.hasAi }">
                  {{ setting.hasAi ? $t('aiBindingReady') : $t('aiBindingFallback') }}
                </span>
              </div>
              <div class="group-card">
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('codeRecognition') }}</div>
                    <div class="row-desc">{{ $t('codeRecognitionDesc') }}</div>
                  </div>
                  <div class="row-control">
                    <el-switch @change="changeField('aiCode', $event)" :before-change="beforeChange" :active-value="0" :inactive-value="1"
                               v-model="setting.aiCode"/>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('codeRecognitionRules') }}</div>
                    <div class="row-desc">{{ $t('codeRecognitionRulesDesc') }}</div>
                  </div>
                  <div class="row-control">
                    <button type="button" class="action-btn" @click="openAiCodeFilter">
                      {{ $t('sysConfigure') }}
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <!-- Tab 3: Security & Storage -->
          <div v-else-if="activeTab === 'security'" key="security" class="settings-grid">
            <section class="setting-group">
              <h2 class="group-heading">{{ $t('oauthLogin') }}</h2>
              <div class="group-card">
                <div class="setting-row" v-for="p in oauthPlatforms" :key="p.key">
                  <div class="row-info oauth-row-left">
                    <el-avatar v-if="p.iconType === 'image'" :src="p.icon" :size="20" class="oauth-icon-sm"/>
                    <Icon v-else :icon="p.icon" width="18" height="18" class="oauth-icon-sm"/>
                    <span class="row-label">{{ p.label }}</span>
                  </div>
                  <div class="row-control inline-controls">
                    <span class="status-dot-label" :class="{ 'is-on': setting[p.key + 'Switch'] === 0 }">
                      <i></i>{{ setting[p.key + 'Switch'] === 0 ? $t('enabled') : $t('disabled') }}
                    </span>
                    <button type="button" class="action-btn" @click="openOauthSetting(p)">
                      {{ $t('sysConfigure') }}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section class="setting-group">
              <h2 class="group-heading">{{ $t('oss') }}</h2>
              <div class="group-card">
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('storageType') }}</div>
                  </div>
                  <div class="row-control">
                    <span class="driver-badge">{{ setting.storageType || 'D1' }}</span>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('s3Configuration') }}</div>
                    <div class="row-desc" v-if="setting.bucket || setting.endpoint">
                      {{ [setting.bucket, setting.endpoint].filter(Boolean).join(' · ') }}
                    </div>
                  </div>
                  <div class="row-control">
                    <button type="button" class="action-btn" @click="addS3Show = true">
                      {{ $t('sysConfigure') }}
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section class="setting-group setting-group--full">
              <h2 class="group-heading">{{ $t('about') }}</h2>
              <div class="group-card">
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('version') }}</div>
                  </div>
                  <div class="row-control">
                    <el-tooltip :content="versionTooltip" placement="top" :show-after="300">
                      <el-badge is-dot :hidden="!hasUpdate">
                        <button type="button" class="action-btn" @click="jump(versionLink)">
                          {{ currentVersion }}
                        </button>
                      </el-badge>
                    </el-tooltip>
                  </div>
                </div>
                <div class="setting-row">
                  <div class="row-info">
                    <div class="row-label">{{ $t('sysSectionLinks') }}</div>
                  </div>
                  <div class="row-control link-row">
                    <button type="button" class="action-btn" @click="jump(GITHUB_URL)">GitHub</button>
                    <button type="button" class="action-btn" @click="jump(GITHUB_DOCS_URL)">{{ t('document') }}</button>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </Transition>
      </div>

      <!-- Dialogs -->
      <el-dialog v-model="editTitleShow" :title="$t('changeTitle')" width="360" append-to-body align-center @closed="editTitle = setting.title">
        <form @submit.prevent>
          <el-input type="text" :placeholder="$t('websiteTitle')" v-model="editTitle" @keyup.enter="saveTitle"/>
          <el-button type="primary" :loading="settingLoading" @click="saveTitle">{{ $t('save') }}</el-button>
        </form>
      </el-dialog>
      <el-dialog v-model="resendTokenFormShow" :title="$t('resendToken')" width="360" append-to-body align-center @closed="cleanResendTokenForm">
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
      <el-dialog v-model="oauthSettingShow" :title="$t('oauthSetting') + ' - ' + oauthForm.label" width="360" append-to-body align-center
                 @closed="oauthForm.clientId = ''; oauthForm.clientSecret = ''; oauthForm.switch = 1">
        <div class="dialog-content">
          <el-input type="text" :placeholder="$t('clientId')" v-model="oauthForm.clientId"/>
          <el-input type="text" style="margin-top: 14px" :placeholder="setting[oauthForm.key + 'ClientSecret'] || $t('clientSecret')" v-model="oauthForm.clientSecret"/>
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
          append-to-body
          align-center
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
          append-to-body
          align-center
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
          append-to-body
          align-center
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
          append-to-body
          align-center
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
          <el-input :placeholder="setting.webhookSecret || $t('webhookSecret')" v-model="webhookSecret" @keyup.enter="webhookSave"></el-input>
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
          append-to-body
          align-center
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
      <el-dialog class="resend-table" v-model="showResendList" :title="$t('resendTokenList')" append-to-body align-center>
        <el-table :data="resendList">
          <el-table-column :min-width="emailColumnWidth" property="key" :label="$t('domain')"
                           :show-overflow-tooltip="true"/>
          <el-table-column :width="tokenColumnWidth" property="value" label="Token" fixed="right"
                           :show-overflow-tooltip="true"/>
        </el-table>
      </el-dialog>
      <el-dialog v-model="addS3Show" :title="t('s3Configuration')" width="360" append-to-body align-center @closed="resetAddS3Form">
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
      <el-dialog v-model="blackFormShow" class="forward-dialog" append-to-body align-center @closed="resetBlackList">
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
      <el-dialog v-model="autoCleanShow" :title="t('autoClean')" class="forward-dialog" append-to-body align-center @closed="resetAutoClean">
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
      <el-dialog v-model="aiCodeFilterShow" class="forward-dialog" append-to-body align-center @closed="resetAiCodeFilter">
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
import {computed, defineOptions, nextTick, onBeforeUnmount, reactive, ref} from "vue";
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
import AuroraPicker from "@/components/aurora-picker/index.vue";

defineOptions({
  name: 'sys-setting'
})

const activeTab = ref('general')
const workspaceTabs = [
  { id: 'general', labelKey: 'sysTabBasic' },
  { id: 'mail', labelKey: 'sysTabMailPush' },
  { id: 'security', labelKey: 'sysTabSecurity' },
]

const GITHUB_REPO = 'hikling/cloud-mail'
const GITHUB_URL = `https://github.com/${GITHUB_REPO}`
const GITHUB_DOCS_URL = `${GITHUB_URL}#readme`

const buildGitTag = typeof __APP_GIT_TAG__ === 'string' ? __APP_GIT_TAG__ : ''
const buildGitSha = typeof __APP_GIT_SHA__ === 'string' ? __APP_GIT_SHA__ : ''

const currentVersion = ref(buildGitTag || (buildGitSha ? `main@${buildGitSha}` : 'main'))
const latestVersion = ref('')
const versionLink = ref(buildGitTag ? `${GITHUB_URL}/releases` : `${GITHUB_URL}/commits/main`)
const hasUpdate = ref(false)
const versionTooltip = computed(() =>
  hasUpdate.value && latestVersion.value
    ? t('versionUpdateAvailable', { version: latestVersion.value })
    : t('versionSyncedGitHub')
)
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
const tgSettingShow = ref(false)
const thirdEmailShow = ref(false)
const webhookShow = ref(false)
const forwardRulesShow = ref(false)
const showResendList = ref(false)
const settingStore = useSettingStore();
const uiStore = useUiStore();
const {settings: setting} = storeToRefs(settingStore);
const editTitle = ref('')
const settingLoading = ref(false)
const clearS3Loading = ref(false)
const loginOpacity = ref(0.85)
const opacityPresets = [
  { labelKey: 'opacityPresetGlass', value: 0.65 },
  { labelKey: 'opacityPresetBalanced', value: 0.85 },
  { labelKey: 'opacityPresetSolid', value: 1.0 },
]
const autoCleanDays = ref(0)
const autoCleanExclude = ref([])
const backgroundUrl = ref('')
let backgroundFile = null
let backgroundObjectUrl = ''
const showSetBackground = ref(false)
let backup = '{}'
const addS3Show = ref(false)
const resendTokenForm = reactive({
  domain: '',
  token: '',
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

function getSettings() {
  settingReady.value = false
  settingQuery().then(settingData => {
    setting.value = settingData
    settingStore.domainList = settingData.domainList;
    resendTokenForm.domain = setting.value.domainList[0]
    loginOpacity.value = setting.value.loginOpacity
    firstLoading.value = false
    backgroundUrl.value = setting.value.background?.startsWith('http') ? setting.value.background : ''
    editTitle.value = setting.value.title
    resetAddS3Form()
    resetBlackList()
    resetAiCodeFilter()
    backupSetting()
    nextTick(() => {
      settingReady.value = true
    })
  })
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

const UPDATE_CACHE_KEY = 'cloudmail_update_cache'
const UPDATE_CACHE_TTL_MS = 30 * 60 * 1000

function readUpdateCache() {
  try {
    const raw = sessionStorage.getItem(UPDATE_CACHE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || Date.now() - Number(parsed.ts) > UPDATE_CACHE_TTL_MS) return null
    return parsed
  } catch {
    return null
  }
}

function writeUpdateCache(payload) {
  try {
    sessionStorage.setItem(UPDATE_CACHE_KEY, JSON.stringify({ ...payload, ts: Date.now() }))
  } catch {}
}

async function getUpdate() {
  const cached = readUpdateCache()
  if (cached) {
    latestVersion.value = cached.latestVersion || ''
    versionLink.value = cached.versionLink || versionLink.value
    hasUpdate.value = Boolean(cached.hasUpdate)
    if (!buildGitTag && !buildGitSha && cached.currentVersion) {
      currentVersion.value = cached.currentVersion
    }
    return
  }
  try {
    const releaseRes = await axios.get(`https://api.github.com/repos/${GITHUB_REPO}/releases/latest`, {
      timeout: 6000,
      validateStatus: (status) => status === 200 || status === 404
    })
    if (releaseRes.status === 200 && releaseRes.data) {
      const remoteTag = (releaseRes.data.tag_name || releaseRes.data.name || '').trim()
      if (remoteTag) {
        latestVersion.value = remoteTag
        versionLink.value = releaseRes.data.html_url || `${GITHUB_URL}/releases`
        if (buildGitTag) {
          hasUpdate.value = remoteTag !== buildGitTag
          writeUpdateCache({ latestVersion: latestVersion.value, versionLink: versionLink.value, hasUpdate: hasUpdate.value })
          return
        }
      }
    }

    const commitRes = await axios.get(`https://api.github.com/repos/${GITHUB_REPO}/commits/main`, {
      timeout: 6000
    })
    const remoteSha = String(commitRes.data?.sha || '').slice(0, 7)
    if (remoteSha) {
      const remoteLabel = `main@${remoteSha}`
      if (!latestVersion.value) {
        latestVersion.value = remoteLabel
        versionLink.value = commitRes.data?.html_url || `${GITHUB_URL}/commits/main`
      }
      if (!buildGitTag && !buildGitSha) {
        currentVersion.value = remoteLabel
        hasUpdate.value = false
      } else if (buildGitSha) {
        hasUpdate.value = remoteSha !== buildGitSha
        if (hasUpdate.value) {
          latestVersion.value = remoteLabel
          versionLink.value = `${GITHUB_URL}/commits/main`
        }
      }
      writeUpdateCache({
        latestVersion: latestVersion.value,
        versionLink: versionLink.value,
        hasUpdate: hasUpdate.value,
        currentVersion: currentVersion.value
      })
    }
  } catch {
    // Ignore transient GitHub API errors or rate limits
  }
}

const compareByLengthAndUpperCase = (a, b, key) => {
  const getUpperCaseCount = (str) => (str.match(/[A-Z]/g) || []).length;
  if (a[key].length === b[key].length) {
    return getUpperCaseCount(a[key]) > getUpperCaseCount(b[key]) ? a : b;
  }
  return a[key].length > b[key].length ? a : b;
};

function revokeBackgroundUrl() {
  if (backgroundObjectUrl) {
    URL.revokeObjectURL(backgroundObjectUrl)
    backgroundObjectUrl = ''
  }
}

function closedSetBackground() {
  revokeBackgroundUrl()
  backgroundImage.value = ''
  backgroundFile = null
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

function openResendList() {
  showResendList.value = true
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
  webhookSecret.value = ''
  webhookShow.value = true
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
    webhookRetry: retry
  }
  if (webhookSecret.value.trim()) {
    form.webhookSecret = webhookSecret.value.trim()
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

function onOpacityInput(val) {
  setting.value.loginOpacity = val
}

function applyOpacityPreset(val) {
  backupSetting()
  loginOpacity.value = val
  setting.value.loginOpacity = val
  doOpacityChange(true)
}

function doOpacityChange(skipBackup = false) {
  if (!settingReady.value) return
  if (!skipBackup) backupSetting()
  setting.value.loginOpacity = loginOpacity.value
  editSetting({ loginOpacity: loginOpacity.value }, false)
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
  aiCodeFilter.value = setting.value.aiCodeFilter ? setting.value.aiCodeFilter.split(',').filter(Boolean) : []
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
  oauthForm.clientSecret = ''
  oauthForm.switch = setting.value[p.key + 'Switch'] ?? 1
  oauthSettingShow.value = true
}

function saveOauth() {
  const form = {}
  form[oauthForm.key + 'ClientId'] = oauthForm.clientId
  if (oauthForm.clientSecret) {
    form[oauthForm.key + 'ClientSecret'] = oauthForm.clientSecret
  }
  form[oauthForm.key + 'Switch'] = oauthForm.switch
  editSetting(form)
}

async function saveBackground() {

  if (settingLoading.value) return

  let image = ''
  settingLoading.value = true
  try {
    if (localUpShow.value) {
      if (!backgroundFile) return
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

    const key = await setBackground(image)
    setting.value.background = key
    showSetBackground.value = false
    ElMessage({
      message: t('saveSuccessMsg'),
      type: "success",
      plain: true
    })
    revokeBackgroundUrl()
    backgroundFile = null
    localUpShow.value = false
    backgroundImage.value = ''
  } catch {
  } finally {
    settingLoading.value = false
  }

}

function openSetBackground() {
  showSetBackground.value = true
}

function openCut() {
  const doc = document.createElement('input')
  doc.setAttribute('type', 'file')
  doc.setAttribute('accept', 'image/*')
  doc.onchange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    revokeBackgroundUrl()
    backgroundFile = file
    backgroundObjectUrl = URL.createObjectURL(file)
    backgroundImage.value = backgroundObjectUrl
    localUpShow.value = true
  }
  doc.click()
}

onBeforeUnmount(revokeBackgroundUrl)

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
  delete settingForm.s3AccessKey
  delete settingForm.s3SecretKey
  delete settingForm.tgBotToken
  delete settingForm.webhookSecret
  delete settingForm.linuxdoClientSecret
  delete settingForm.githubClientSecret
  delete settingForm.googleClientSecret
  backup = JSON.stringify(settingForm)
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
  delete settingForm.s3AccessKey
  delete settingForm.s3SecretKey
  delete settingForm.tgBotToken
  delete settingForm.resendTokens
  delete settingForm.webhookSecret
  delete settingForm.linuxdoClientSecret
  delete settingForm.githubClientSecret
  delete settingForm.googleClientSecret
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
  doc.rel = 'noopener noreferrer'
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
    } else {
      backupSetting()
    }
    editTitleShow.value = false
    resendTokenFormShow.value = false
    tgSettingShow.value = false
    thirdEmailShow.value = false
    webhookShow.value = false
    forwardRulesShow.value = false
    addS3Show.value = false
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
    max-width: 1120px;
    margin: 0 auto;
    padding: 32px 32px 60px;
    display: flex;
    flex-direction: column;
    gap: 28px;

    @media (max-width: 860px) {
      padding: 18px 14px 36px;
      gap: 20px;
    }
  }
}

.sys-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--border-subtle);
}

.sys-header-left {
  display: inline-flex;
  align-items: baseline;
  gap: 10px;
}

.version-text-btn {
  padding: 2px 7px;
  border-radius: 6px;
  border: none;
  background: var(--surface-subtle);
  color: var(--text-muted);
  font-size: 12px;
  font-weight: 500;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: color 140ms ease, background-color 140ms ease;

  &:hover {
    color: var(--text-primary);
    background: var(--surface-hover);
  }
}

.workspace-title {
  margin: 0;
  font-size: 22px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--text-primary);
}

.tab-switcher {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  padding: 3px;
  border-radius: 10px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  max-width: 100%;

  @media (max-width: 540px) {
    width: 100%;
    display: grid;
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.tab-btn {
  height: 32px;
  padding: 0 16px;
  border-radius: 7px;
  border: none;
  background: transparent;
  color: var(--text-secondary);
  font-size: 13.5px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 140ms ease, color 140ms ease, box-shadow 140ms ease;

  @media (max-width: 540px) {
    padding: 0 8px;
    font-size: 12.5px;
  }

  &:hover {
    color: var(--text-primary);
  }

  &.active {
    background: var(--surface-elevated);
    color: var(--text-primary);
    font-weight: 600;
    box-shadow: var(--shadow-xs);
  }
}

.settings-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 24px;
  align-items: stretch;
  width: 100%;
  min-width: 0;

  @media (max-width: 900px) {
    grid-template-columns: minmax(0, 1fr);
    gap: 20px;
  }
}

.setting-group {
  display: flex;
  flex-direction: column;
  gap: 9px;
  min-width: 0;
  height: 100%;

  &--full {
    grid-column: 1 / -1;
  }
}

.group-heading {
  margin: 0;
  padding-left: 4px;
  font-size: 12.5px;
  font-weight: 600;
  letter-spacing: 0.02em;
  color: var(--text-secondary);

  &--split {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    flex-wrap: wrap;

    h2 {
      margin: 0;
      font-size: inherit;
      font-weight: inherit;
      letter-spacing: inherit;
      color: inherit;
    }
  }
}

.ai-status-pill {
  display: inline-flex;
  align-items: center;
  padding: 2px 9px;
  border-radius: 999px;
  font-size: 11.5px;
  font-weight: 600;
  line-height: 1.5;
  color: var(--text-muted);
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);

  &.is-ready {
    color: var(--el-color-success);
    background: var(--el-color-success-light-9);
    border-color: var(--el-color-success-light-7);
  }
}

.group-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  background-color: var(--surface-elevated);
  backdrop-filter: blur(var(--ws-blur, 20px)) saturate(175%);
  -webkit-backdrop-filter: blur(var(--ws-blur, 20px)) saturate(175%);
  border-radius: 14px;
  border: 1px solid var(--border-subtle);
  box-shadow: var(--card-shadow);
  overflow: hidden;
  min-width: 0;
  transition: border-color 180ms ease, box-shadow 180ms ease;

  &:hover {
    border-color: var(--border-strong);
  }
}

.background-thumb {
  width: 44px;
  height: 28px;
  border-radius: 6px;
  border: 1px solid var(--border-subtle);
  overflow: hidden;
  flex-shrink: 0;
}

.row-label-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.opacity-readout {
  padding: 1px 7px;
  border-radius: 6px;
  font-size: 11.5px;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
}

.opacity-presets {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
}

.preset-chip {
  height: 26px;
  padding: 0 9px;
  border-radius: 7px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-primary);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, transform 100ms ease;

  &:hover {
    color: var(--text-primary);
    border-color: var(--border-strong);
  }

  &:active {
    transform: scale(0.95);
  }

  &.active {
    background: var(--brand-primary-soft);
    border-color: rgba(37, 99, 235, 0.34);
    color: var(--brand-primary);
    font-weight: 600;
  }
}

.opacity-slider-wrap {
  width: 100%;
  padding: 2px 4px 0;

  :deep(.el-slider__runway) {
    margin: 10px 0;
    height: 5px;
    border-radius: 99px;
    background: var(--border-subtle);
  }

  :deep(.el-slider__bar) {
    height: 5px;
    border-radius: 99px;
    background: linear-gradient(90deg, #2563eb, #0ea5e9);
  }

  :deep(.el-slider__button) {
    width: 16px;
    height: 16px;
    border: 2px solid var(--brand-primary);
    box-shadow: 0 2px 8px rgba(37, 99, 235, 0.28);
  }
}

.sys-tab-fade-enter-active,
.sys-tab-fade-leave-active {
  transition: opacity 160ms ease, transform 180ms cubic-bezier(0.22, 1, 0.36, 1);
}

.sys-tab-fade-enter-from {
  opacity: 0;
  transform: translateY(5px);
}

.sys-tab-fade-leave-to {
  opacity: 0;
  transform: translateY(-3px);
}

.action-btn {
  height: 30px;
  padding: 0 11px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-primary);
  color: var(--text-primary);
  font-size: 12.5px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  white-space: nowrap;
  cursor: pointer;
  flex-shrink: 0;
  box-shadow: 0 1px 1px rgba(15, 23, 42, 0.03);
  transition: background-color 140ms ease, border-color 140ms ease, color 140ms ease, transform 100ms ease, box-shadow 140ms ease;

  &:hover {
    background: var(--surface-hover);
    border-color: var(--border-strong);
    box-shadow: var(--shadow-xs);
  }

  &:active {
    transform: scale(0.96);
  }

  &:focus-visible {
    box-shadow: var(--brand-primary-ring);
  }

  &--primary {
    background: var(--brand-primary);
    border-color: var(--brand-primary);
    color: #ffffff;

    &:hover {
      background: var(--brand-primary-hover);
      border-color: var(--brand-primary-hover);
    }
  }

  &--danger:hover {
    background: rgba(239, 68, 68, 0.08);
    border-color: rgba(239, 68, 68, 0.32);
    color: #ef4444;
  }
}

.status-dot-label {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 12.5px;
  color: var(--text-muted);
  white-space: nowrap;

  i {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--text-muted);
    opacity: 0.55;
    transition: background-color 180ms ease, box-shadow 180ms ease;
  }

  &.is-on {
    color: var(--text-secondary);

    i {
      background: #10b981;
      opacity: 1;
      box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.16);
    }
  }
}

.muted-val {
  font-size: 12.5px;
  color: var(--text-muted);
  white-space: nowrap;
}

.driver-badge {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12px;
  font-weight: 600;
  padding: 3px 9px;
  border-radius: 6px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  color: var(--text-primary);
}

.oauth-row-left {
  display: flex;
  align-items: center;
  gap: 10px;
}

.oauth-icon-sm {
  flex-shrink: 0;
}

.link-row {
  flex-wrap: wrap;
}

.background-empty {
  width: 100%;
  flex: 1;
  min-height: 152px;
  border-radius: 10px;
  border: 1px dashed var(--border-strong);
  background: var(--surface-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  cursor: pointer;
  font-size: 13px;
  color: var(--text-muted);
  transition: border-color 160ms ease, color 160ms ease, background-color 160ms ease, transform 120ms ease;

  &:hover {
    border-color: var(--brand-primary);
    background: var(--brand-primary-soft);
    color: var(--brand-primary);
  }

  &:active {
    transform: scale(0.99);
  }
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

.panel-rows {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.setting-row {
  flex: 1 0 auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  padding: 15px 20px;
  border-bottom: 1px solid var(--border-subtle);
  transition: background-color 140ms ease;

  &:hover {
    background: var(--row-hover-tint);
  }

  &:last-child {
    border-bottom: none;
  }

  &--fixed {
    flex: 0 0 auto;
  }

  &--stack {
    flex-direction: column;
    align-items: stretch;
    gap: 12px;
  }

  &--grow {
    flex: 1 1 auto;
  }

  @media (max-width: 600px) {
    flex-direction: column;
    align-items: flex-start;
    gap: 10px;
    padding: 14px 16px;
  }
}

.bg-row-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.background-banner {
  width: 100%;
  flex: 1;
  min-height: 152px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  overflow: hidden;
  display: block;
}

.oauth-list {
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.oauth-tile {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 14px 16px;
  border-radius: 12px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  transition: border-color 150ms ease;

  &:hover {
    border-color: var(--border-strong);
  }
}

.oauth-tile-left {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.oauth-logo-box {
  width: 40px;
  height: 40px;
  border-radius: 10px;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.oauth-tile-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 4px;
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
  gap: 8px;
  flex-shrink: 0;
  min-width: 0;

  @media (max-width: 600px) {
    width: 100%;
    justify-content: flex-start;
  }
}

.inline-controls,
.btn-group {
  display: flex;
  align-items: center;
  gap: 8px;
}

.opt-pill {
  height: 30px;
  min-width: 32px;
  padding: 0 8px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-subtle);
  color: var(--text-secondary);
  font-size: 12.5px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  cursor: pointer;
  flex-shrink: 0;
  transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;

  &--text {
    padding: 0 11px;
  }

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
  padding: 3px 9px;
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

.warning {
  color: var(--text-muted);
  cursor: pointer;
  transition: color 150ms ease;

  &:hover {
    color: var(--text-secondary);
  }
}

.oauth-icon {
  width: 22px !important;
  height: 22px !important;
  min-width: 22px;
  flex-shrink: 0;
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

.email-title {
  max-width: 280px;

  .value-ellipsis {
    color: var(--text-primary);
    font-size: 14px;
    font-weight: 500;
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
    min-width: 0;
  }
}

.community {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
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
