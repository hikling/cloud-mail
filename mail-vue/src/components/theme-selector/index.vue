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
        <div class="preview-sidebar">
          <span class="preview-logo"></span>
          <span class="preview-nav is-active"></span>
          <span class="preview-nav"></span>
          <span class="preview-nav short"></span>
        </div>
        <div class="preview-stage">
          <div class="preview-topbar">
            <span class="preview-search"></span>
            <span class="preview-avatar"></span>
          </div>
          <div class="preview-surface">
            <div class="preview-row">
              <span class="preview-badge"></span>
              <span class="preview-line wide"></span>
            </div>
            <div class="preview-row">
              <span class="preview-badge muted"></span>
              <span class="preview-line"></span>
            </div>
            <div class="preview-row">
              <span class="preview-badge muted"></span>
              <span class="preview-line short"></span>
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
  grid-template-columns: repeat(2, minmax(0, 176px));
  gap: 14px;

  @media (max-width: 520px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }
}

.theme-card {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 10px;
  border-radius: 12px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-subtle);
  cursor: pointer;
  user-select: none;
  transition: border-color 160ms ease, background-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;

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
    height: 92px;
    border-radius: 8px;
    overflow: hidden;
    display: grid;
    grid-template-columns: 36px 1fr;
    border: 1px solid transparent;
  }

  &__footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 2px 2px;
  }

  &__label {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-primary);
  }

  &__indicator {
    width: 16px;
    height: 16px;
    border-radius: 999px;
    border: 1.5px solid var(--border-strong);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    transition: border-color 160ms ease, background-color 160ms ease;
  }

  &__dot {
    width: 6px;
    height: 6px;
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

  .preview-sidebar {
    background: #FFFFFF;
    border-right: 1px solid #EAEDF4;
  }

  .preview-logo {
    background: #2563EB;
  }

  .preview-nav {
    background: #E2E8F0;

    &.is-active {
      background: rgba(37, 99, 235, 0.22);
    }
  }

  .preview-search {
    background: #FFFFFF;
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
}

.theme-card--dark .theme-card__preview {
  background: #0B0D12;
  border-color: #202534;

  .preview-sidebar {
    background: #12151E;
    border-right: 1px solid #1E2433;
  }

  .preview-logo {
    background: #4F86FF;
  }

  .preview-nav {
    background: #262D3F;

    &.is-active {
      background: rgba(79, 134, 255, 0.28);
    }
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
}

.preview-sidebar {
  padding: 8px 6px;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.preview-logo {
  width: 12px;
  height: 12px;
  border-radius: 4px;
  margin-bottom: 3px;
}

.preview-nav {
  height: 5px;
  border-radius: 999px;
  width: 100%;

  &.short {
    width: 70%;
  }
}

.preview-stage {
  padding: 7px 8px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
}

.preview-search {
  height: 9px;
  flex: 1;
  border-radius: 999px;
}

.preview-avatar {
  width: 9px;
  height: 9px;
  border-radius: 999px;
  flex-shrink: 0;
}

.preview-surface {
  flex: 1;
  border-radius: 6px;
  padding: 6px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.preview-row {
  display: flex;
  align-items: center;
  gap: 5px;
}

.preview-badge {
  width: 6px;
  height: 6px;
  border-radius: 999px;
  flex-shrink: 0;
}

.preview-line {
  height: 5px;
  border-radius: 999px;
  width: 72%;

  &.wide {
    width: 88%;
  }

  &.short {
    width: 52%;
  }
}
</style>
