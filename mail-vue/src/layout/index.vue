<template>
  <div class="layout" :class="{ 'is-dark': uiStore.dark }" :style="workspaceThemeVars">
    <!-- Living Multi-Theme Aurora Backdrop (or Custom Wallpaper) behind entire workspace -->
    <AuroraBackdrop
      v-if="!settingStore.settings.background"
      :theme-id="uiStore.auroraTheme"
      :dark="uiStore.dark"
      calmer
      :paused="isSolidBackdrop || tabHidden"
    />
    <div v-else class="workspace-custom-bg" :style="customBgStyle" aria-hidden="true">
      <div class="workspace-custom-scrim"></div>
    </div>

    <header class="layout-header">
      <Header />
    </header>
    <div class="layout-body">
      <Main />
    </div>
  </div>
  <writer ref="writerRef" />
</template>

<script setup>
import Header from '@/layout/header/index.vue'
import Main from '@/layout/main/index.vue'
import AuroraBackdrop from '@/components/aurora-backdrop/index.vue'
import { computed, ref, onMounted, onBeforeUnmount } from 'vue'
import { useUiStore } from '@/store/ui.js'
import { useSettingStore } from '@/store/setting.js'
import { cvtR2Url } from '@/utils/convert.js'
import writer from '@/layout/write/index.vue'

const uiStore = useUiStore()
const settingStore = useSettingStore()
const writerRef = ref({})
const tabHidden = ref(typeof document !== 'undefined' && document.visibilityState === 'hidden')

const isSolidBackdrop = computed(() => {
  const rawVal = Number(settingStore.settings.loginOpacity)
  const alpha = Number.isFinite(rawVal) ? Math.min(1, Math.max(0.3, rawVal)) : 0.88
  return alpha >= 0.995
})

function onVisibilityChange() {
  tabHidden.value = document.visibilityState === 'hidden'
}

const customBgStyle = computed(() => {
  if (!settingStore.settings.background) return {}
  return {
    backgroundImage: `url(${cvtR2Url(settingStore.settings.background)})`,
    backgroundRepeat: 'no-repeat',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  }
})

const workspaceThemeVars = computed(() => {
  const rawVal = Number(settingStore.settings.loginOpacity)
  const alpha = Number.isFinite(rawVal) ? Math.min(1, Math.max(0.3, rawVal)) : 0.88

  const isSolid = alpha >= 0.995
  const blurPx = Math.round(14 + (1 - alpha) * 32)
  // Keep cards readable with stronger frosted glass even at low slider values,
  // while outer panes/rail become noticeably more translucent to showcase Aurora!
  const cardAlpha = isSolid ? 0.98 : +(0.54 + alpha * 0.44).toFixed(3)
  const primaryAlpha = isSolid ? 0.96 : +(0.24 + alpha * 0.68).toFixed(3)
  const subtleAlpha = isSolid ? 0.92 : +(0.18 + alpha * 0.62).toFixed(3)
  const headerAlpha = isSolid ? 0.94 : +(0.34 + alpha * 0.56).toFixed(3)

  if (uiStore.dark) {
    return {
      '--app-canvas': 'transparent',
      '--ws-blur': `${blurPx}px`,
      '--surface-primary': `rgba(22, 31, 52, ${primaryAlpha})`,
      '--surface-elevated': `rgba(28, 39, 64, ${cardAlpha})`,
      '--surface-subtle': `rgba(19, 27, 46, ${subtleAlpha})`,
      '--surface-muted': 'rgba(38, 52, 82, 0.72)',
      '--surface-hover': 'rgba(148, 163, 184, 0.11)',
      '--surface-popover': 'rgba(24, 34, 58, 0.97)',
      '--header-glass': `rgba(20, 29, 50, ${headerAlpha})`,
      '--email-hover-background': 'rgba(148, 163, 184, 0.09)',
      '--border-subtle': 'rgba(148, 163, 184, 0.18)',
      '--border-strong': 'rgba(148, 163, 184, 0.30)',
      '--card-shadow': 'inset 0 1px 0 rgba(255, 255, 255, 0.09), 0 8px 24px -8px rgba(0, 0, 0, 0.48)',
    }
  }

  return {
    '--app-canvas': 'transparent',
    '--ws-blur': `${blurPx}px`,
    '--surface-primary': `rgba(255, 255, 255, ${primaryAlpha})`,
    '--surface-elevated': `rgba(255, 255, 255, ${cardAlpha})`,
    '--surface-subtle': `rgba(248, 251, 255, ${subtleAlpha})`,
    '--surface-muted': 'rgba(226, 232, 240, 0.65)',
    '--surface-hover': 'rgba(37, 99, 235, 0.06)',
    '--surface-popover': 'rgba(255, 255, 255, 0.97)',
    '--header-glass': `rgba(255, 255, 255, ${headerAlpha})`,
    '--email-hover-background': 'rgba(37, 99, 235, 0.055)',
    '--border-subtle': 'rgba(15, 23, 42, 0.09)',
    '--border-strong': 'rgba(15, 23, 42, 0.16)',
    '--card-shadow': '0 4px 16px -6px rgba(37, 99, 235, 0.10), 0 1px 2px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.85)',
  }
})

onMounted(() => {
  uiStore.writerRef = writerRef
  document.addEventListener('visibilitychange', onVisibilityChange)
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibilityChange)
})
</script>

<style lang="scss" scoped>
.layout {
  height: 100%;
  position: fixed;
  width: 100%;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}

.workspace-custom-bg {
  position: fixed;
  inset: 0;
  z-index: 0;
  pointer-events: none;
}

.workspace-custom-scrim {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(15, 23, 42, 0.06), rgba(15, 23, 42, 0.28));

  .layout.is-dark & {
    background: radial-gradient(circle at center, rgba(10, 15, 28, 0.28), rgba(10, 15, 28, 0.56));
  }
}

.layout-header {
  position: relative;
  flex-shrink: 0;
  background: transparent;
  z-index: 60;
}

.layout-body {
  position: relative;
  z-index: 1;
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: transparent;
}
</style>
