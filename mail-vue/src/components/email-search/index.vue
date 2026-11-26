<template>
  <div ref="searchRef" class="email-search">
    <button type="button" class="search-placeholder" @click="openSearch">
      <Icon icon="lucide:search" width="15" height="15" class="search-icon"/>
      <span class="search-placeholder-text" :class="{ 'has-search-text': savedSearchSummary }" :title="savedSearchSummary">
        {{ savedSearchSummary || t('searchMail') }}
      </span>
      <span v-if="savedSearchSummary" class="search-active-dot"></span>
      <kbd v-else class="search-kbd">/</kbd>
    </button>

    <button
      type="button"
      class="mobile-search-button"
      :class="{ 'has-filter': !!savedSearchSummary }"
      :aria-label="t('searchMail')"
      :aria-expanded="visible"
      @click="openSearch"
    >
      <Icon icon="lucide:search" width="18" height="18"/>
    </button>

    <Transition name="search-panel-fade" @after-enter="focusInputOnDesktop">
      <div v-if="visible" class="search-panel-shell" @click.stop>
        <div class="search-panel">
          <div class="search-input">
            <Icon icon="lucide:search" width="16" height="16" class="panel-search-icon" />
            <el-input
              ref="inputRef"
              v-model="searchText"
              autocomplete="off"
              :placeholder="searchPlaceholder"
              @keyup.enter="handleSearch"
            />
          </div>
          <div class="search-content">
            <div class="search-content-title">{{ t('searchType') }}</div>
            <el-radio-group v-model="searchType" class="search-options" :aria-label="t('searchType')">
              <el-radio-button
                v-for="option in searchOptions"
                :key="option.type"
                :value="option.type"
              >
                {{ option.label }}
              </el-radio-button>
            </el-radio-group>
            <div class="search-date-range">
              <div class="search-date-field">
                <div class="search-date-label">{{ t('searchDateFrom') }}</div>
                <el-date-picker
                  v-model="startDate"
                  type="date"
                  :editable="false"
                  value-format="YYYY-MM-DD"
                  :placeholder="t('searchStartDate')"
                />
              </div>
              <div class="search-date-field">
                <div class="search-date-label">{{ t('searchDateTo') }}</div>
                <el-date-picker
                  v-model="endDate"
                  type="date"
                  :editable="false"
                  value-format="YYYY-MM-DD"
                  :placeholder="t('searchEndDate')"
                  :disabled-date="disableEndDate"
                />
              </div>
            </div>
          </div>
          <div class="search-actions">
            <el-button @click="handleReset">{{ t('reset') }}</el-button>
            <el-button type="primary" @click="handleSearch">{{ t('search') }}</el-button>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup>
import {computed, onBeforeUnmount, onMounted, ref, watch} from 'vue'
import {Icon} from '@iconify/vue'
import {useI18n} from 'vue-i18n'

const {t} = useI18n()
const emit = defineEmits(['search', 'reset'])
const props = defineProps({
  store: {
    type: Object,
    required: true,
  },
  searchOptions: {
    type: Array,
    required: true,
  },
})

const searchRef = ref(null)
const inputRef = ref(null)
const searchText = ref('')
const searchType = ref('subject')
const startDate = ref('')
const endDate = ref('')
const visible = ref(false)
const selectedSearchOption = computed(() =>
  props.searchOptions.find(option => option.type === searchType.value)
)
const savedSearchSummary = computed(() => {
  const params = props.store.searchParams
  const parts = []
  const text = params.text?.trim()
  const fieldKeys = {
    subject: 'searchSummarySubject',
    content: 'searchSummaryContent',
    sender: 'searchSummarySender',
    senderAddress: 'searchSummarySenderAddress',
    recipientAddress: 'searchSummaryRecipientAddress',
  }

  if (text) {
    parts.push(`${t(fieldKeys[params.type] || fieldKeys.subject)}:${text}`)
  }
  if (params.startDate && params.endDate) {
    parts.push(`${formatSummaryDate(params.startDate)} ${t('searchSummaryRange')} ${formatSummaryDate(params.endDate)}`)
  } else if (params.startDate) {
    parts.push(`${t('searchSummaryAfter')}:${formatSummaryDate(params.startDate)}`)
  } else if (params.endDate) {
    parts.push(`${t('searchSummaryBefore')}:${formatSummaryDate(params.endDate)}`)
  }
  return parts.join('\u00a0\u00a0')
})
const searchPlaceholder = computed(() =>
  t('searchMailBy', {field: selectedSearchOption.value?.label || t('subject')})
)

watch(
  () => props.searchOptions,
  options => {
    if (!options.some(option => option.type === searchType.value)) {
      searchType.value = options[0]?.type || 'subject'
    }
  },
  {immediate: true}
)

watch(startDate, value => {
  if (value && endDate.value && endDate.value < value) {
    endDate.value = ''
  }
})

function openSearch() {
  if (visible.value) {
    closeSearch()
    return
  }

  restoreSavedSearch()
  visible.value = true
}

function focusInput() {
  inputRef.value?.focus()
}

function focusInputOnDesktop() {
  if (!window.matchMedia('(max-width: 1024px)').matches) {
    focusInput()
  }
}

function disableEndDate(date) {
  if (!startDate.value) return false

  const start = new Date(`${startDate.value}T00:00:00`)
  return date < start
}

function closeSearch() {
  visible.value = false
  restoreSavedSearch()
}

function restoreSavedSearch() {
  const params = props.store.searchParams
  searchText.value = params.text || ''
  searchType.value = props.searchOptions.some(option => option.type === params.type)
    ? params.type
    : props.searchOptions[0]?.type || 'subject'
  startDate.value = toLocalSearchDate(params.startDate)
  endDate.value = toLocalSearchDate(params.endDate)
}

function toLocalSearchDate(dateValue) {
  if (!dateValue) return ''

  const date = new Date(`${dateValue.replace(' ', 'T')}Z`)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function formatSummaryDate(dateValue) {
  return toLocalSearchDate(dateValue)
}

function isEditableTarget(target) {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}

function handleDocumentKeydown(event) {
  if (event.key === 'Escape' && visible.value) {
    closeSearch()
    return
  }
  if (event.key === '/' && !visible.value && !event.ctrlKey && !event.metaKey && !event.altKey && !isEditableTarget(event.target)) {
    if (document.querySelector('.el-overlay:not([style*="display: none"])')) return
    event.preventDefault()
    openSearch()
  }
}

function handleDocumentClick(event) {
  const target = event.target
  const isDatePickerPopup = target?.closest?.(
    '.el-picker__popper, .el-picker-panel'
  )

  if (
    !visible.value
    || searchRef.value?.contains(target)
    || isDatePickerPopup
  ) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  closeSearch()
}

function formatSearchDate(dateValue, endOfDay = false) {
  if (!dateValue) return ''

  const [year, month, day] = dateValue.split('-').map(Number)
  const localDate = new Date(
    year,
    month - 1,
    day,
    endOfDay ? 23 : 0,
    endOfDay ? 59 : 0,
    endOfDay ? 59 : 0,
  )

  return localDate.toISOString().slice(0, 19).replace('T', ' ')
}

function handleSearch() {
  props.store.setSearchParams({
    text: searchText.value.trim(),
    type: searchType.value,
    startDate: formatSearchDate(startDate.value),
    endDate: formatSearchDate(endDate.value, true),
  })
  emit('search', searchText.value.trim(), searchType.value)
  closeSearch()
}

function handleReset() {
  searchText.value = ''
  searchType.value = 'subject'
  startDate.value = ''
  endDate.value = ''
  props.store.setSearchParams({
    text: '',
    type: 'subject',
    startDate: '',
    endDate: '',
  })
  emit('reset')
  closeSearch()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick, true)
  document.addEventListener('keydown', handleDocumentKeydown, true)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick, true)
  document.removeEventListener('keydown', handleDocumentKeydown, true)
})
</script>

<style lang="scss" scoped>
.email-search {
  position: relative;
  width: 100%;
  max-width: 460px;
  z-index: 30;
}

.search-placeholder {
  width: 100%;
  height: 36px;
  padding: 0 12px;
  border-radius: 10px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  color: var(--text-muted);
  text-align: left;
  white-space: nowrap;
  cursor: pointer;
  transition: border-color 0.15s ease, background-color 0.15s ease;

  &:hover {
    background: var(--surface-hover);
    border-color: var(--border-strong);
  }
}

.search-icon {
  flex-shrink: 0;
}

.search-placeholder-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  font-size: 13.5px;
}

.search-placeholder-text.has-search-text {
  color: var(--text-primary);
  font-weight: 500;
}

.search-active-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--brand-primary);
  flex-shrink: 0;
}

.search-kbd {
  height: 20px;
  min-width: 20px;
  padding: 0 5px;
  border-radius: 5px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-elevated);
  color: var(--text-muted);
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 11px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.mobile-search-button {
  display: none;
}

@media (max-width: 767px) {
  .email-search {
    position: static;
    width: auto;
  }

  .search-placeholder {
    display: none;
  }

  .mobile-search-button {
    width: 34px;
    height: 34px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
    cursor: pointer;

    &.has-filter {
      color: var(--brand-primary);
      background: var(--brand-primary-soft);
      border-color: transparent;
    }
  }

  .email-search .search-panel-shell {
    top: calc(100% + 6px);
    left: 50%;
    width: min(450px, calc(100vw - 24px));
    transform: translateX(-50%);
  }
}

.search-panel-shell {
  position: absolute;
  top: -4px;
  left: 0;
  z-index: 1001;
  width: min(480px, calc(100vw - 32px));
}

.search-panel {
  width: 100%;
  background: var(--surface-elevated);
  border-radius: 14px;
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
}

.search-panel-fade-enter-active,
.search-panel-fade-leave-active {
  transition: opacity 0.16s ease, transform 0.16s ease;
}

.search-panel-fade-enter-from,
.search-panel-fade-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}

.search-input {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--border-subtle);
  background: var(--surface-subtle);
}

.panel-search-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.search-input :deep(.el-input__wrapper),
.search-input :deep(.el-input__wrapper.is-focus),
.search-input :deep(.el-input__wrapper:hover) {
  box-shadow: none !important;
  background: transparent !important;
  padding: 0 4px;
}

.search-content {
  padding: 16px 16px 0;
}

.search-content-title {
  font-size: 12px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  color: var(--text-muted);
  text-align: left;
}

.search-options {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-start;
  gap: 8px;
  margin-top: 8px;
}

.search-options :deep(.el-radio-button .el-radio-button__inner) {
  border-radius: 7px !important;
  border: 1px solid var(--border-subtle) !important;
  box-shadow: none !important;
  font-size: 12.5px;
  padding: 7px 12px;
}

.search-options :deep(.el-radio-button.is-active .el-radio-button__inner) {
  border-color: var(--brand-primary) !important;
}

.search-date-range {
  display: flex;
  gap: 10px;
  margin-top: 16px;
}

.search-date-field {
  flex: 1;
  min-width: 0;
}

.search-date-label {
  margin-bottom: 6px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text-muted);
  text-align: left;
}

.search-date-field :deep(.el-date-editor) {
  width: 100%;
}

.search-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 16px;
}
</style>
