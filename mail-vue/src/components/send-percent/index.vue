<template>
  <div class="percent">
    <loading :size="16" />
    <div class="percent-text">
      <span class="percent-val">{{ value }}%</span>
      <span class="percent-desc">{{ desc }}</span>
    </div>
  </div>
</template>

<script setup>
import loading from "@/components/loading/index.vue";

defineProps({
  value: [Number, String],
  desc: [String]
})
</script>

<style scoped lang="scss">
.percent {
  display: flex;
  align-items: center;
  gap: 10px;
}

.percent-text {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.percent-val {
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  color: var(--brand-primary);
}
</style>
