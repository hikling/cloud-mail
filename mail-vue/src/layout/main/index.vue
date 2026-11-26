<template>
  <div :class="accountShow && hasPerm('account:query') ? 'main-box-show' : 'main-box-hide'">
    <div :class="accountShow && hasPerm('account:query') ? 'block-show' : 'block-hide'" @click="uiStore.accountShow = false"></div>
    <account :class="accountShow && hasPerm('account:query') ? 'show' : 'hide'" />
    <router-view class="main-view" v-slot="{ Component,route }">
      <keep-alive :include="['email','all-email','send','sys-setting','star','user','role','analysis','reg-key','draft']">
        <component :is="Component" :key="route.name"/>
      </keep-alive>
    </router-view>
  </div>
</template>

<script setup>
import account from '@/layout/account/index.vue'
import {useUiStore} from "@/store/ui.js";
import {useSettingStore} from "@/store/setting.js";
import {computed, onBeforeUnmount, onMounted, watch} from "vue";
import { useRoute } from 'vue-router'
import { hasPerm } from "@/perm/perm.js"

const settingStore = useSettingStore()
const uiStore = useUiStore();
const route = useRoute()
let innerWidth = window.innerWidth
let elNotification = null

const accountShow = computed(() => {
  return uiStore.accountShow && settingStore.settings.manyEmail === 0
})

watch(() => uiStore.changeNotice, () => {
  const settings = settingStore.settings
  showNotice({
    notice: settings.notice,
    noticeWidth: settings.noticeWidth,
    noticeTitle: settings.noticeTitle,
    noticeContent: settings.noticeContent,
    noticeType: settings.noticeType,
    noticeDuration: settings.noticeDuration,
    noticePosition: settings.noticePosition,
    noticeOffset: settings.noticeOffset
  })
})

watch(() => uiStore.changePreview, () => {
  showNotice(uiStore.previewData)
})

function showNotice(data) {
  if (data.notice === 1) {
    return;
  }

  if (elNotification) {
    elNotification.close()
  }

  let style = document.getElementById('custom-notice-style');
  if (!style) {
    style = document.createElement('style');
    style.id = 'custom-notice-style';
    document.head.appendChild(style);
  }
  style.textContent = `
  .custom-notice.el-notification {
    --el-notification-width: min(${data.noticeWidth}px,calc(100% - 30px)) !important;
  }
  `;

  elNotification = ElNotification({
    title: data.noticeTitle,
    message: `<div style="width: 100%;height: 100%;">${data.noticeContent}</div>`,
    type: data.noticeType === 'none' ? '' : data.noticeType,
    duration: data.noticeDuration,
    position: data.noticePosition,
    offset: data.noticeOffset,
    dangerouslyUseHTMLString: true,
    customClass: 'custom-notice'
  })
}

onMounted(() => {
  window.addEventListener('resize', handleResize)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})

const handleResize = () => {
  if (['content','email','send'].includes(route.meta.name)) {
    if (innerWidth !== window.innerWidth) {
      innerWidth = window.innerWidth;
      uiStore.accountShow = window.innerWidth >= 767;
    }
  }
}
</script>

<style lang="scss" scoped>
.block-show {
  position: fixed;
  @media (max-width: 767px) {
    position: fixed;
    top: 92px;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(15, 23, 42, 0.45);
    backdrop-filter: blur(3px);
    z-index: 95;
    transition: opacity 200ms;
  }
}

.block-hide {
  display: none;
  pointer-events: none;
}

.show {
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  @media (max-width: 767px) {
    position: fixed;
    top: 92px;
    left: 0;
    height: calc(100% - 92px);
    z-index: 100;
    width: 272px;
    box-shadow: var(--shadow-lg);
  }
}

.hide {
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.15s ease;
  position: fixed;
  transform: translateX(-100%);
  opacity: 0;
  pointer-events: none;
  @media (max-width: 1024px) {
    width: 272px;
    z-index: 100;
  }
}

.main-box-show {
  display: grid;
  grid-template-columns: 272px 1fr;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  @media (max-width: 767px) {
    grid-template-columns: 1fr;
  }
}

.main-box-hide {
  display: grid;
  grid-template-columns: 1fr;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.main-view {
  background: var(--surface-primary);
  min-width: 0;
  min-height: 0;
  overflow: hidden;
}
</style>
