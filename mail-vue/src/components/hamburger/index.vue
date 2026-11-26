<template>
  <button type="button" class="hamburger-btn" @click="toggleClick" aria-label="Toggle sidebar">
    <Icon :icon="isActive ? 'lucide:panel-left' : 'lucide:menu'" width="18" height="18" />
  </button>
</template>

<script setup>
import {Icon} from "@iconify/vue";

defineProps({
  isActive: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['toggleClick'])
const toggleClick = () => {
  emit('toggleClick');
}
</script>

<style scoped lang="scss">
.hamburger-btn {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;

  &:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }
}
</style>
