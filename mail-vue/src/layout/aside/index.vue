<template>
  <aside class="aside-rail">
    <div class="brand-header">
      <div class="brand-logo-wrap">
        <img class="logo" :src="logoUrl" alt="Logo" />
      </div>
      <div class="brand-title">{{ settingStore.settings.title }}</div>
    </div>

    <div class="compose-wrap" v-perm="'email:send'">
      <button class="compose-btn" type="button" @click="openCompose">
        <Icon icon="lucide:square-pen" width="17" height="17" />
        <span>{{ $t('compose') }}</span>
      </button>
    </div>

    <el-scrollbar class="nav-scroll">
      <nav class="nav-list" aria-label="Primary">
        <button
          type="button"
          class="nav-item"
          :class="{ active: isActive('email', 'inbox') }"
          @click="router.push({name: 'email'})"
        >
          <span class="nav-icon"><Icon icon="lucide:inbox" width="18" height="18" /></span>
          <span class="nav-label">{{ $t('inbox') }}</span>
        </button>

        <button
          v-perm="'email:send'"
          type="button"
          class="nav-item"
          :class="{ active: isActive('send', 'sent') }"
          @click="router.push({name: 'send'})"
        >
          <span class="nav-icon"><Icon icon="lucide:send" width="17" height="17" /></span>
          <span class="nav-label">{{ $t('sent') }}</span>
        </button>

        <button
          v-perm="'email:send'"
          type="button"
          class="nav-item"
          :class="{ active: route.meta.name === 'draft' }"
          @click="router.push({name: 'draft'})"
        >
          <span class="nav-icon"><Icon icon="lucide:file-text" width="17" height="17" /></span>
          <span class="nav-label">{{ $t('drafts') }}</span>
        </button>

        <button
          type="button"
          class="nav-item"
          :class="{ active: isActive('star', 'starred') }"
          @click="router.push({name: 'star'})"
        >
          <span class="nav-icon"><Icon icon="lucide:star" width="18" height="18" /></span>
          <span class="nav-label">{{ $t('starred') }}</span>
        </button>

        <button
          type="button"
          class="nav-item"
          :class="{ active: route.meta.name === 'setting' }"
          @click="router.push({name: 'setting'})"
        >
          <span class="nav-icon"><Icon icon="lucide:settings" width="18" height="18" /></span>
          <span class="nav-label">{{ $t('settings') }}</span>
        </button>

        <div class="section-divider" v-perm="['all-email:query','user:query','role:query','setting:query','analysis:query','reg-key:query']">
          <span>{{ $t('manage') }}</span>
        </div>

        <button
          v-perm="'analysis:query'"
          type="button"
          class="nav-item"
          :class="{ active: route.meta.name === 'analysis' }"
          @click="router.push({name: 'analysis'})"
        >
          <span class="nav-icon"><Icon icon="lucide:bar-chart-2" width="18" height="18" /></span>
          <span class="nav-label">{{ $t('analytics') }}</span>
        </button>

        <button
          v-perm="'user:query'"
          type="button"
          class="nav-item"
          :class="{ active: route.meta.name === 'user' }"
          @click="router.push({name: 'user'})"
        >
          <span class="nav-icon"><Icon icon="lucide:users" width="18" height="18" /></span>
          <span class="nav-label">{{ $t('allUsers') }}</span>
        </button>

        <button
          v-perm="'all-email:query'"
          type="button"
          class="nav-item"
          :class="{ active: isActive('all-email', 'all-mail') }"
          @click="router.push({name: 'all-email'})"
        >
          <span class="nav-icon"><Icon icon="lucide:mails" width="18" height="18" /></span>
          <span class="nav-label">{{ $t('allMail') }}</span>
        </button>

        <button
          v-perm="'role:query'"
          type="button"
          class="nav-item"
          :class="{ active: route.meta.name === 'role' }"
          @click="router.push({name: 'role'})"
        >
          <span class="nav-icon"><Icon icon="lucide:shield" width="18" height="18" /></span>
          <span class="nav-label">{{ $t('permissions') }}</span>
        </button>

        <button
          v-perm="'reg-key:query'"
          type="button"
          class="nav-item"
          :class="{ active: route.meta.name === 'reg-key' }"
          @click="router.push({name: 'reg-key'})"
        >
          <span class="nav-icon"><Icon icon="lucide:key-round" width="18" height="18" /></span>
          <span class="nav-label">{{ $t('inviteCode') }}</span>
        </button>

        <button
          v-perm="'setting:query'"
          type="button"
          class="nav-item"
          :class="{ active: route.meta.name === 'sys-setting' }"
          @click="router.push({name: 'sys-setting'})"
        >
          <span class="nav-icon"><Icon icon="lucide:sliders" width="18" height="18" /></span>
          <span class="nav-label">{{ $t('SystemSettings') }}</span>
        </button>
      </nav>
    </el-scrollbar>

    <div class="aside-footer">
      <button type="button" class="theme-toggle-btn" @click="toggleTheme">
        <Icon :icon="uiStore.dark ? 'lucide:sun' : 'lucide:moon'" width="16" height="16" />
        <span>{{ uiStore.dark ? $t('lightTheme') : $t('darkTheme') }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup>
import router from "@/router/index.js";
import { useRoute } from "vue-router";
import {Icon} from "@iconify/vue";
import {useSettingStore} from "@/store/setting.js";
import {useUiStore} from "@/store/ui.js";

const settingStore = useSettingStore();
const uiStore = useUiStore();
const route = useRoute();
const logoUrl = `${import.meta.env.BASE_URL}mail.png`

function isActive(routeName, mailbox) {
  if (route.meta.name === routeName) return true
  return route.meta.name === 'content' && route.params.mailbox === mailbox
}

function openCompose() {
  uiStore.writerRef.open()
}

function toggleTheme() {
  const nextIsDark = !uiStore.dark
  document.documentElement.classList.toggle('dark', nextIsDark)
  document.getElementById('theme-color-meta')?.setAttribute('content', nextIsDark ? '#0B0D12' : '#F4F5F8')
  uiStore.dark = nextIsDark
}
</script>

<style lang="scss" scoped>
.aside-rail {
  width: 244px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--aside-bg);
  border-right: 1px solid var(--border-subtle);
  user-select: none;
}

.brand-header {
  height: 58px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 11px;
  flex-shrink: 0;
}

.brand-logo-wrap {
  width: 32px;
  height: 32px;
  border-radius: 9px;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-xs);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo {
  width: 20px;
  height: 20px;
  object-fit: contain;
}

.brand-title {
  font-size: 16px;
  font-weight: 700;
  letter-spacing: -0.025em;
  color: var(--text-primary);
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.compose-wrap {
  padding: 4px 12px 12px;
  flex-shrink: 0;

  @media (max-width: 767px) {
    display: none;
  }
}

.compose-btn {
  width: 100%;
  height: 40px;
  padding: 0 14px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: var(--brand-primary);
  color: #FFFFFF;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 2px 8px -2px rgba(37, 99, 235, 0.45), inset 0 1px 0 rgba(255, 255, 255, 0.2);
  transition: transform 0.14s ease, background-color 0.16s ease, box-shadow 0.16s ease;

  &:hover {
    background: var(--brand-primary-hover);
    box-shadow: 0 4px 12px -2px rgba(37, 99, 235, 0.5), inset 0 1px 0 rgba(255, 255, 255, 0.22);
    transform: translateY(-0.5px);
  }

  &:active {
    transform: translateY(0.5px) scale(0.99);
  }
}

.nav-scroll {
  flex: 1;
  min-height: 0;
}

.nav-list {
  padding: 2px 10px 14px;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.nav-item {
  position: relative;
  width: 100%;
  height: 37px;
  padding: 0 11px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 11px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease, box-shadow 0.14s ease;
  text-align: left;

  .nav-icon {
    width: 20px;
    height: 20px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
    color: var(--text-muted);
    transition: color 0.14s ease;
  }

  .nav-label {
    overflow: hidden;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  @media (hover: hover) {
    &:hover:not(.active) {
      background: var(--aside-item-hover);
      color: var(--text-primary);

      .nav-icon {
        color: var(--text-secondary);
      }
    }
  }

  &.active {
    background: var(--aside-item-active);
    color: var(--text-primary);
    font-weight: 600;
    box-shadow: var(--aside-item-active-shadow);

    .nav-icon {
      color: var(--brand-primary);
    }
  }
}

.section-divider {
  margin: 14px 10px 6px;
  display: flex;
  align-items: center;
  gap: 8px;

  span {
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.05em;
    text-transform: uppercase;
    color: var(--text-muted);
    white-space: nowrap;
  }

  &::after {
    content: "";
    flex: 1;
    height: 1px;
    background: var(--border-subtle);
  }
}

.aside-footer {
  padding: 10px 12px 12px;
  border-top: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.theme-toggle-btn {
  width: 100%;
  height: 34px;
  padding: 0 10px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  gap: 9px;
  font-size: 13px;
  font-weight: 500;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover {
    background: var(--aside-item-hover);
    color: var(--text-primary);
  }
}
</style>
