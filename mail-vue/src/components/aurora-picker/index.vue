<template>
  <div class="aurora-picker" role="radiogroup" :aria-label="$t('auroraThemeTitle')">
    <button
      v-for="theme in AURORA_THEMES"
      :key="theme.id"
      type="button"
      role="radio"
      :aria-checked="uiStore.auroraTheme === theme.id"
      class="aurora-chip"
      :class="{ active: uiStore.auroraTheme === theme.id }"
      @click="selectTheme(theme.id)"
    >
      <span class="aurora-swatch" :style="{ background: theme.swatch }">
        <Icon v-if="uiStore.auroraTheme === theme.id" icon="lucide:check" width="12" height="12" class="swatch-check" />
      </span>
      <span class="aurora-name">{{ $t(theme.labelKey) }}</span>
    </button>
  </div>
</template>

<script setup>
import { Icon } from '@iconify/vue'
import { useUiStore } from '@/store/ui.js'
import { AURORA_THEMES } from '@/utils/aurora-themes.js'

const uiStore = useUiStore()

function selectTheme(id) {
  uiStore.auroraTheme = id
}
</script>

<style scoped lang="scss">
.aurora-picker {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;

  @media (max-width: 520px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

.aurora-chip {
  height: 36px;
  padding: 0 10px 0 7px;
  border-radius: 10px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-primary);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  min-width: 0;
  transition: border-color 140ms ease, background-color 140ms ease, color 140ms ease, transform 120ms ease, box-shadow 140ms ease;

  &:hover {
    border-color: var(--border-strong);
    color: var(--text-primary);
    transform: translateY(-1px);
  }

  &:active {
    transform: scale(0.97);
  }

  &.active {
    border-color: var(--brand-primary);
    background: var(--brand-primary-soft);
    color: var(--text-primary);
    font-weight: 600;
    box-shadow: 0 0 0 1px rgba(59, 130, 246, 0.25);
  }
}

.aurora-swatch {
  width: 22px;
  height: 22px;
  border-radius: 7px;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.35), 0 2px 6px rgba(15, 23, 42, 0.16);
}

.swatch-check {
  color: #ffffff;
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.35));
}

.aurora-name {
  font-size: 12.5px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
