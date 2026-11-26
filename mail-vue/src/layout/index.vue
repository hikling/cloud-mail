<template>
  <div class="layout" :class="{ 'is-dark': uiStore.dark }" :style="workspaceThemeVars">
    <!-- Living Aurora Backdrop (or Custom Wallpaper) behind entire workspace -->
    <div v-if="!settingStore.settings.background" class="workspace-ambient" aria-hidden="true">
      <div class="ws-orb ws-orb-1"></div>
      <div class="ws-orb ws-orb-2"></div>
      <div class="ws-orb ws-orb-3"></div>
      <div class="ws-orb ws-orb-4"></div>
      <div class="ws-beam"></div>
      <div class="ws-grid"></div>
    </div>
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
import { computed, ref, onMounted } from 'vue'
import { useUiStore } from '@/store/ui.js'
import { useSettingStore } from '@/store/setting.js'
import { cvtR2Url } from '@/utils/convert.js'
import writer from '@/layout/write/index.vue'

const uiStore = useUiStore()
const settingStore = useSettingStore()
const writerRef = ref({})

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
  const alpha = Number.isFinite(rawVal) ? Math.min(1, Math.max(0, rawVal)) : 0.88

  const isSolid = alpha >= 0.995
  const cardAlpha = isSolid ? 0.98 : +(alpha * 0.88).toFixed(3)
  const primaryAlpha = isSolid ? 0.96 : +(alpha * 0.78).toFixed(3)
  const subtleAlpha = isSolid ? 0.92 : +(alpha * 0.62).toFixed(3)
  const headerAlpha = isSolid ? 0.94 : +(alpha * 0.76).toFixed(3)

  if (uiStore.dark) {
    return {
      '--app-canvas': 'transparent',
      '--surface-primary': `rgba(11, 17, 32, ${primaryAlpha})`,
      '--surface-elevated': `rgba(15, 23, 42, ${cardAlpha})`,
      '--surface-subtle': `rgba(13, 20, 38, ${subtleAlpha})`,
      '--surface-hover': 'rgba(96, 165, 250, 0.08)',
      '--header-glass': `rgba(10, 16, 30, ${headerAlpha})`,
      '--email-hover-background': 'rgba(96, 165, 250, 0.075)',
      '--border-subtle': 'rgba(255, 255, 255, 0.095)',
      '--card-shadow': 'inset 0 1px 0 rgba(255, 255, 255, 0.075), 0 6px 20px -6px rgba(0, 0, 0, 0.45)',
    }
  }

  return {
    '--app-canvas': 'transparent',
    '--surface-primary': `rgba(255, 255, 255, ${primaryAlpha})`,
    '--surface-elevated': `rgba(255, 255, 255, ${cardAlpha})`,
    '--surface-subtle': `rgba(248, 250, 255, ${subtleAlpha})`,
    '--surface-hover': 'rgba(37, 99, 235, 0.055)',
    '--header-glass': `rgba(255, 255, 255, ${headerAlpha})`,
    '--email-hover-background': 'rgba(37, 99, 235, 0.055)',
    '--border-subtle': 'rgba(15, 23, 42, 0.085)',
    '--card-shadow': '0 2px 12px -4px rgba(37, 99, 235, 0.08), 0 1px 2px rgba(15, 23, 42, 0.04), inset 0 1px 0 rgba(255, 255, 255, 0.75)',
  }
})

onMounted(() => {
  uiStore.writerRef = writerRef
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
  background: linear-gradient(145deg, #eaf0ff 0%, #f4f7ff 46%, #e7f3ff 100%);
  transition: background 0.3s ease;

  &.is-dark {
    background: radial-gradient(circle at 20% 20%, #0d1630 0%, #070b16 55%, #050811 100%);
  }
}

/* Living Aurora Backdrop */
.workspace-ambient {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.ws-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(92px);
  will-change: transform;
}

.ws-orb-1 {
  width: 580px;
  height: 580px;
  top: -180px;
  left: -120px;
  background: radial-gradient(circle, rgba(37, 99, 235, 0.34) 0%, rgba(37, 99, 235, 0) 70%);
  animation: wsFloatA 22s ease-in-out infinite;
}

.ws-orb-2 {
  width: 540px;
  height: 540px;
  bottom: -180px;
  right: -90px;
  background: radial-gradient(circle, rgba(6, 182, 212, 0.3) 0%, rgba(6, 182, 212, 0) 70%);
  animation: wsFloatB 26s ease-in-out infinite;
}

.ws-orb-3 {
  width: 460px;
  height: 460px;
  top: 14%;
  right: 14%;
  background: radial-gradient(circle, rgba(99, 102, 241, 0.24) 0%, rgba(99, 102, 241, 0) 72%);
  animation: wsFloatC 24s ease-in-out infinite;
}

.ws-orb-4 {
  width: 400px;
  height: 400px;
  bottom: 4%;
  left: 20%;
  background: radial-gradient(circle, rgba(168, 85, 247, 0.16) 0%, rgba(168, 85, 247, 0) 72%);
  animation: wsFloatB 28s ease-in-out infinite reverse;
}

.ws-beam {
  position: absolute;
  inset: -40%;
  background: linear-gradient(
    115deg,
    transparent 38%,
    rgba(255, 255, 255, 0.36) 48%,
    rgba(56, 189, 248, 0.14) 52%,
    transparent 62%
  );
  transform: translateX(-16%) rotate(-6deg);
  animation: wsBeamSweep 18s ease-in-out infinite alternate;
  opacity: 0.65;
}

.ws-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, rgba(37, 99, 235, 0.05) 1px, transparent 1px),
    linear-gradient(to bottom, rgba(37, 99, 235, 0.05) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 84% 78% at 50% 48%, black 24%, transparent 96%);
}

.layout.is-dark {
  .ws-orb-1 {
    background: radial-gradient(circle, rgba(37, 99, 235, 0.48) 0%, rgba(37, 99, 235, 0) 70%);
  }

  .ws-orb-2 {
    background: radial-gradient(circle, rgba(6, 182, 212, 0.34) 0%, rgba(6, 182, 212, 0) 70%);
  }

  .ws-orb-3 {
    background: radial-gradient(circle, rgba(124, 58, 237, 0.36) 0%, rgba(124, 58, 237, 0) 72%);
  }

  .ws-orb-4 {
    background: radial-gradient(circle, rgba(192, 132, 252, 0.2) 0%, rgba(192, 132, 252, 0) 72%);
  }

  .ws-beam {
    background: linear-gradient(
      115deg,
      transparent 38%,
      rgba(59, 130, 246, 0.12) 48%,
      rgba(34, 211, 238, 0.09) 52%,
      transparent 62%
    );
    opacity: 0.9;
  }

  .ws-grid {
    background-image:
      linear-gradient(to right, rgba(148, 163, 184, 0.075) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(148, 163, 184, 0.075) 1px, transparent 1px);
  }
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
    background: radial-gradient(circle at center, rgba(5, 8, 17, 0.28), rgba(5, 8, 17, 0.56));
  }
}

@keyframes wsFloatA {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(40px, 28px, 0) scale(1.06); }
}

@keyframes wsFloatB {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(-34px, -24px, 0) scale(1.05); }
}

@keyframes wsFloatC {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(-22px, 30px, 0) scale(0.95); }
}

@keyframes wsBeamSweep {
  0% { transform: translateX(-16%) rotate(-6deg); }
  100% { transform: translateX(14%) rotate(-6deg); }
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

@media (prefers-reduced-motion: reduce) {
  .ws-orb,
  .ws-beam {
    animation: none !important;
  }
}
</style>
