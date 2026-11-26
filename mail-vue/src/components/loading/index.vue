<template>
  <div class="spinner-wrap" :style="{ width: `${size}px`, height: `${size}px` }" role="status" aria-label="Loading">
    <svg class="circular" viewBox="0 0 24 24">
      <circle class="track" cx="12" cy="12" r="9.5" fill="none" stroke-width="2.2" />
      <circle class="arc" cx="12" cy="12" r="9.5" fill="none" stroke-width="2.2" stroke-linecap="round" />
    </svg>
  </div>
</template>

<script>
export default {
  props: {
    size: {
      type: Number,
      default: 28
    }
  }
}
</script>

<style scoped>
.spinner-wrap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.circular {
  width: 100%;
  height: 100%;
  animation: loading-rotate 1.1s linear infinite;
}

.track {
  stroke: var(--border-subtle);
}

.arc {
  stroke: var(--brand-primary);
  stroke-dasharray: 42 60;
  stroke-dashoffset: 12;
}

@keyframes loading-rotate {
  to {
    transform: rotate(360deg);
  }
}
</style>
