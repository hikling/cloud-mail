<script setup>
import {useId} from 'vue'
import {useI18n} from 'vue-i18n'
import {useUiStore} from '@/store/ui.js'

const {t} = useI18n()
const uiStore = useUiStore()
const groupName = useId()
const themeOptions = [
  {label: 'lightTheme', dark: false},
  {label: 'darkTheme', dark: true},
]

function changeDark(nextIsDark) {
  if (nextIsDark === uiStore.dark) return

  const root = document.documentElement
  root.classList.toggle('dark', nextIsDark)
  document.getElementById('theme-color-meta')?.setAttribute(
    'content',
    nextIsDark ? '#0B0D12' : '#F4F5F8'
  )
  uiStore.dark = nextIsDark
}
</script>

<template>
  <div class="theme-selector" role="radiogroup" :aria-label="t('themeStyle')">
    <label
      v-for="item in themeOptions"
      :key="item.label"
      class="theme-card"
      :class="[
        item.dark ? 'theme-card--dark' : 'theme-card--light',
        { 'is-active': uiStore.dark === item.dark }
      ]"
    >
      <input
        class="theme-card__radio"
        type="radio"
        :name="groupName"
        :value="item.dark"
        :checked="uiStore.dark === item.dark"
        @change="changeDark(item.dark)"
      />
      <div class="theme-card__preview" aria-hidden="true">
        <div class="preview-topbar">
          <div class="preview-topbar-left">
            <span class="preview-logo"></span>
            <span class="preview-pill"></span>
          </div>
          <span class="preview-search"></span>
          <span class="preview-avatar"></span>
        </div>
        <div class="preview-body">
          <div class="preview-surface">
            <div class="preview-row">
              <span class="preview-badge"></span>
              <span class="preview-line wide"></span>
              <span class="preview-meta"></span>
            </div>
            <div class="preview-row">
              <span class="preview-badge muted"></span>
              <span class="preview-line"></span>
              <span class="preview-meta"></span>
            </div>
            <div class="preview-row">
              <span class="preview-badge muted"></span>
              <span class="preview-line short"></span>
              <span class="preview-meta"></span>
            </div>
          </div>
        </div>
      </div>
      <div class="theme-card__footer">
        <span class="theme-card__label">{{ t(item.label) }}</span>
        <span class="theme-card__indicator">
          <span class="theme-card__dot"></span>
        </span>
      </div>
    </label>
  </div>
</template>

<style scoped lang="scss">
.theme-selector {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 16px;
  width: 100%;

  @media (max-width: 480px) {
    gap: 10px;
  }
}

.theme-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-subtle);
  cursor: pointer;
  user-select: none;
  transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease;

  &:hover {
    border-color: var(--border-strong);
    background: var(--surface-elevated);
  }

  &.is-active {
    border-color: var(--brand-primary);
    background: var(--surface-elevated);
    box-shadow: 0 0 0 3px var(--brand-primary-soft), var(--shadow-xs);
  }

  &__radio {
    position: absolute;
    opacity: 0;
    pointer-events: none;
  }

  &__preview {
    height: 112px;
    border-radius: 9px;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    border: 1px solid transparent;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2px;
  }

  &__label {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--text-primary);
  }

  &__indicator {
    width: 18px;
    height: 18px;
    border-radius: 999px;
    border: 1.5px solid var(--border-strong);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: border-color 160ms ease, background-color 160ms ease;
  }

  &__dot {
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: #ffffff;
    opacity: 0;
    transform: scale(0.5);
    transition: opacity 160ms ease, transform 160ms ease;
  }

  &.is-active &__indicator {
    border-color: var(--brand-primary);
    background: var(--brand-primary);
  }

  &.is-active &__dot {
    opacity: 1;
    transform: scale(1);
  }
}

.theme-card--light .theme-card__preview {
  background: #F4F5F8;
  border-color: #E2E5EE;

  .preview-topbar {
    background: #FFFFFF;
    border-bottom: 1px solid #EAEDF4;
  }

  .preview-logo {
    background: #2563EB;
  }

  .preview-pill {
    background: #EEF2FF;
  }

  .preview-search {
    background: #F4F5F8;
    border: 1px solid #E2E5EE;
  }

  .preview-avatar {
    background: #2563EB;
  }

  .preview-surface {
    background: #FFFFFF;
    border: 1px solid #EAEDF4;
  }

  .preview-badge {
    background: #2563EB;

    &.muted {
      background: #CBD5E1;
    }
  }

  .preview-line {
    background: #E2E8F0;
  }

  .preview-meta {
    background: #EDF0F6;
  }
}

.theme-card--dark .theme-card__preview {
  background: #0B0D12;
  border-color: #202534;

  .preview-topbar {
    background: #12151E;
    border-bottom: 1px solid #1E2433;
  }

  .preview-logo {
    background: #4F86FF;
  }

  .preview-pill {
    background: rgba(79, 134, 255, 0.22);
  }

  .preview-search {
    background: #171B26;
    border: 1px solid #242A3B;
  }

  .preview-avatar {
    background: #4F86FF;
  }

  .preview-surface {
    background: #151923;
    border: 1px solid #222838;
  }

  .preview-badge {
    background: #4F86FF;

    &.muted {
      background: #333C52;
    }
  }

  .preview-line {
    background: #242B3D;
  }

  .preview-meta {
    background: #1D2333;
  }
}

.preview-topbar {
  height: 24px;
  padding: 0 9px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-shrink: 0;
}

.preview-topbar-left {
  display: flex;
  align-items: center;
  gap: 5px;
}

.preview-logo {
  width: 10px;
  height: 10px;
  border-radius: 3px;
}

.preview-pill {
  width: 24px;
  height: 8px;
  border-radius: 999px;
}

.preview-search {
  height: 10px;
  flex: 1;
  max-width: 72px;
  border-radius: 999px;
}

.preview-avatar {
  width: 10px;
  height: 10px;
  border-radius: 999px;
  flex-shrink: 0;
}

.preview-body {
  flex: 1;
  padding: 9px;
  display: flex;
}

.preview-surface {
  flex: 1;
  border-radius: 7px;
  padding: 9px 10px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.preview-row {
  display: flex;
  align-items: center;
  gap: 7px;
}

.preview-badge {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  flex-shrink: 0;
}

.preview-line {
  height: 6px;
  border-radius: 999px;
  width: 58%;

  &.wide {
    width: 72%;
  }

  &.short {
    width: 44%;
  }
}

.preview-meta {
  margin-left: auto;
  width: 18px;
  height: 5px;
  border-radius: 999px;
}
</style>
