<template>
  <div class="aurora-backdrop" :class="{ 'is-calm': calmer, 'is-paused': paused }" :style="backdropVars" aria-hidden="true">
    <div class="aurora-canvas"></div>
    <div class="aurora-orb orb-1"></div>
    <div class="aurora-orb orb-2"></div>
    <div class="aurora-orb orb-3"></div>
    <div class="aurora-orb orb-4"></div>
    <div class="aurora-beam"></div>
    <div class="aurora-grid"></div>
    <div v-if="interactive" class="aurora-spotlight"></div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { getAuroraTheme } from '@/utils/aurora-themes.js'

const props = defineProps({
  themeId: {
    type: String,
    default: 'arctic',
  },
  dark: {
    type: Boolean,
    default: false,
  },
  interactive: {
    type: Boolean,
    default: false,
  },
  calmer: {
    type: Boolean,
    default: false,
  },
  paused: {
    type: Boolean,
    default: false,
  },
})

const backdropVars = computed(() => {
  const theme = getAuroraTheme(props.themeId)
  const palette = props.dark ? theme.dark : theme.light
  return {
    '--au-canvas': palette.canvas,
    '--au-orb-1': palette.orb1,
    '--au-orb-2': palette.orb2,
    '--au-orb-3': palette.orb3,
    '--au-orb-4': palette.orb4,
    '--au-grid': palette.grid,
    '--au-beam': palette.beam,
    '--au-spot-a': palette.spotA,
    '--au-spot-b': palette.spotB,
  }
})
</script>

<style scoped lang="scss">
.aurora-backdrop {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.aurora-canvas {
  position: absolute;
  inset: 0;
  background: var(--au-canvas);
  transition: background 0.45s ease;
}

.aurora-orb {
  position: absolute;
  border-radius: 50%;
  filter: blur(88px);
  will-change: transform;
  transition: background 0.55s ease;
}

.orb-1 {
  width: 580px;
  height: 580px;
  top: -180px;
  left: -120px;
  background: var(--au-orb-1);
  animation: auFloatA 19s ease-in-out infinite;
}

.orb-2 {
  width: 540px;
  height: 540px;
  bottom: -180px;
  right: -80px;
  background: var(--au-orb-2);
  animation: auFloatB 23s ease-in-out infinite;
}

.orb-3 {
  width: 470px;
  height: 470px;
  top: 12%;
  right: 15%;
  background: var(--au-orb-3);
  animation: auFloatC 21s ease-in-out infinite;
}

.orb-4 {
  width: 400px;
  height: 400px;
  bottom: 4%;
  left: 20%;
  background: var(--au-orb-4);
  animation: auFloatB 26s ease-in-out infinite reverse;
}

.aurora-beam {
  position: absolute;
  inset: -40%;
  background: var(--au-beam);
  transform: translateX(-16%) rotate(-6deg);
  animation: auBeamSweep 16s ease-in-out infinite alternate;
  opacity: 0.72;
}

.aurora-grid {
  position: absolute;
  inset: 0;
  background-image:
    linear-gradient(to right, var(--au-grid) 1px, transparent 1px),
    linear-gradient(to bottom, var(--au-grid) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 82% 76% at 50% 48%, black 26%, transparent 96%);
}

.aurora-spotlight {
  position: absolute;
  inset: 0;
  opacity: var(--spot-opacity, 0);
  background: radial-gradient(
    580px circle at var(--mx, 50%) var(--my, 40%),
    var(--au-spot-a),
    var(--au-spot-b) 36%,
    transparent 72%
  );
  transition: opacity 0.35s ease;
}

.aurora-backdrop.is-calm {
  .orb-1 { animation-duration: 24s; }
  .orb-2 { animation-duration: 28s; }
  .orb-3 { animation-duration: 26s; }
  .orb-4 { animation-duration: 30s; }
  .aurora-beam { opacity: 0.58; animation-duration: 20s; }
}

@keyframes auFloatA {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(42px, 30px, 0) scale(1.06); }
}

@keyframes auFloatB {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(-36px, -26px, 0) scale(1.05); }
}

@keyframes auFloatC {
  0%, 100% { transform: translate3d(0, 0, 0) scale(1); }
  50% { transform: translate3d(-24px, 32px, 0) scale(0.95); }
}

@keyframes auBeamSweep {
  0% { transform: translateX(-16%) rotate(-6deg); }
  100% { transform: translateX(14%) rotate(-6deg); }
}

.aurora-backdrop.is-paused {
  .aurora-orb,
  .aurora-beam {
    animation-play-state: paused;
  }
}

@media (prefers-reduced-motion: reduce) {
  .aurora-orb,
  .aurora-beam {
    animation: none !important;
  }
}
</style>
