<template>
  <div class="reg-key">
    <div class="header-actions">
      <div class="actions-left">
        <button class="toolbar-btn primary" type="button" :title="$t('addRegKey')" @click="openAdd">
          <Icon icon="lucide:plus" width="15" height="15" />
          <span>{{ $t('add') }}</span>
        </button>
        <div class="search-wrap">
          <Icon class="search-icon" icon="lucide:search" width="14" height="14" />
          <el-input
            v-model="params.code"
            class="search-input"
            :placeholder="$t('searchRegKeyDesc')"
            @keyup.enter="search"
          />
          <button v-if="params.code" class="search-clear" type="button" @click="params.code = ''; search()">
            <Icon icon="lucide:x" width="13" height="13" />
          </button>
        </div>
        <button class="icon-btn" type="button" :title="$t('search')" @click="search">
          <Icon icon="lucide:search" width="16" height="16" />
        </button>
      </div>
      <div class="actions-right">
        <button class="icon-btn" type="button" :title="$t('clear')" @click="clearNotUse">
          <Icon icon="lucide:eraser" width="16" height="16" />
        </button>
        <button class="icon-btn" type="button" @click="refresh">
          <Icon icon="lucide:refresh-cw" width="15" height="15" />
        </button>
      </div>
    </div>

    <el-scrollbar class="scrollbar">
      <div class="loading" :class="regKeyLoading ? 'loading-show' : 'loading-hide'" :style="regKeyFirst ? 'background: transparent' : ''">
        <loading />
      </div>
      <div class="code-box">
        <div
          class="code-item"
          v-for="item in regKeyData"
          :key="item.regKeyId || item.code"
          :class="{ 'is-depleted': !item.count || !item.expireTime }"
        >
          <div class="code-header">
            <button type="button" class="code-pill" @click="copyCode(item.code)" :title="$t('copy')">
              <span class="code-text">{{ item.code }}</span>
              <Icon class="copy-icon" icon="lucide:copy" width="13" height="13" />
            </button>
            <el-dropdown class="setting" trigger="click">
              <button type="button" class="more-btn">
                <Icon icon="lucide:more-horizontal" width="16" height="16" />
              </button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="copyCode(item.code)">{{ $t('copy') }}</el-dropdown-item>
                  <el-dropdown-item @click="openHistory(item)">{{ $t('history') }}</el-dropdown-item>
                  <el-dropdown-item @click="deleteRegKey(item)">{{ $t('delete') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>

          <div class="code-meta">
            <div class="meta-row">
              <span class="meta-label">{{ $t('remainingUses') }}</span>
              <span v-if="item.count" class="meta-value count">{{ item.count }}</span>
              <el-tag v-else size="small" type="danger" effect="light">{{ $t('exhausted') }}</el-tag>
            </div>
            <div class="meta-row">
              <span class="meta-label">{{ $t('roleDesc') }}</span>
              <el-tag size="small" effect="light">{{ item.roleName }}</el-tag>
            </div>
            <div class="meta-row">
              <span class="meta-label">{{ $t('validUntil') }}</span>
              <span v-if="item.expireTime" class="meta-value">{{ formatExpireTime(item.expireTime) }}</span>
              <el-tag v-else size="small" type="danger" effect="light">{{ $t('expired') }}</el-tag>
            </div>
          </div>
        </div>
      </div>
      <div class="empty" v-if="regKeyData.length === 0">
        <el-empty v-if="!regKeyFirst" :image-size="isMobile ? 110 : null" :description="$t('noCodeFound')" />
      </div>
    </el-scrollbar>

    <el-dialog v-model="showAdd" :title="$t('addRegKey')" width="400">
      <div class="container">
        <el-input v-model="addForm.code" :placeholder="$t('regKey')" @keyup.enter="submit">
          <template #suffix>
            <Icon @click.stop="genCode" class="gen-code" icon="lucide:refresh-cw" width="15" height="15" />
          </template>
        </el-input>
        <el-select v-model="addForm.roleId" :placeholder="$t('roleDesc')">
          <el-option v-for="item in roleList" :label="item.name" :value="item.roleId" :key="item.roleId" />
        </el-select>
        <el-date-picker
          v-model="addForm.expireTime"
          type="date"
          style="width: 100%"
          :placeholder="$t('validUntil')"
        />
        <el-input-number v-model="addForm.count" :min="1" :max="99999" style="width: 100%" @keyup.enter="submit" />
        <el-button class="btn" type="primary" @click="submit" :loading="addLoading">
          {{ $t('add') }}
        </el-button>
      </div>
    </el-dialog>

    <el-dialog class="history-list" v-model="showRegKeyHistory" :title="$t('useHistory')">
      <div class="loading" :class="historyLoading ? 'loading-show' : 'loading-hide'">
        <loading />
      </div>
      <el-table v-if="!historyLoading" :data="historyList" :fit="true" style="height: 100%">
        <el-table-column :min-width="emailColumnWidth" property="email" :label="$t('user')" :show-overflow-tooltip="true" />
        <el-table-column
          :width="createTimeColumnWidth"
          :formatter="formatUserCreateTime"
          property="createTime"
          :label="$t('date')"
          fixed="right"
          :show-overflow-tooltip="true"
        />
      </el-table>
    </el-dialog>
  </div>
</template>

<script setup>
import {defineOptions, nextTick, reactive, ref, watch} from "vue"
import {Icon} from "@iconify/vue";
import loading from "@/components/loading/index.vue";
import {useSettingStore} from "@/store/setting.js";
import {roleSelectUse} from "@/request/role.js";
import {useRoleStore} from "@/store/role.js";
import {regKeyAdd, regKeyList, regKeyClearNotUse, regKeyDelete, regKeyHistory} from "@/request/reg-key.js";
import {getTextWidth} from "@/utils/text.js";
import dayjs from "dayjs";
import {tzDayjs} from "@/utils/day.js";
import {useI18n} from "vue-i18n";

defineOptions({
  name: 'reg-key'
})

const roleStore = useRoleStore();
const settingStore = useSettingStore();
const params = reactive({
  code: '',
})

const {t} = useI18n()
const roleList = reactive([])
const addLoading = ref(false)
const showAdd = ref(false)
const regKeyLoading = ref(true)
const regKeyFirst = ref(true)
const showRegKeyHistory = ref(false)
const historyList = reactive([])
const emailColumnWidth = ref(0)
const createTimeColumnWidth = ref(0)
const historyLoading = ref(false)
const isMobile = window.innerWidth < 1025

const addForm = reactive({
  code: '',
  count: 1,
  roleId: null,
  expireTime: null
})

const regKeyData = reactive([])

getList(true)

roleSelectUse().then(list => {
  roleList.length = 0
  roleList.push(...list)
})

watch(() => roleStore.refresh, () => {
  roleSelectUse().then(list => {
    roleList.length = 0
    roleList.push(...list)
  })
})

function openHistory(regKey) {

  historyList.length = 0
  historyLoading.value = true
  regKeyHistory(regKey.regKeyId).then(list => {

    historyList.push(...list)
    if (list.length > 0) {

      const email = list.reduce((a, b) =>
          compareByLengthAndUpperCase(a, b, 'email')
      ).email;

      emailColumnWidth.value = getTextWidth(email) + 30
      emailColumnWidth.value = emailColumnWidth.value < 300 ? emailColumnWidth.value : 300
      const createTime = list.reduce((a, b) =>
          compareByLengthAndUpperCase(a, b, 'createTime')
      ).createTime;
      createTimeColumnWidth.value = getTextWidth(createTime)
    }

  }).finally(() => {
    historyLoading.value = false
  })

  showRegKeyHistory.value = true
}

const compareByLengthAndUpperCase = (a, b, key) => {
  const getUpperCaseCount = (str) => (str.match(/[A-Z]/g) || []).length;
  if (a[key].length === b[key].length) {
    return getUpperCaseCount(a[key]) > getUpperCaseCount(b[key]) ? a : b;
  }
  return a[key].length > b[key].length ? a : b;
};

function formatUserCreateTime(regKey) {
  const createTime = tzDayjs(regKey.createTime);
  const currentYear = dayjs().year();
  const expireYear = createTime.year();

  if (settingStore.lang === 'en') {

    if (expireYear === currentYear) {
      return createTime.format('MMM D, HH:mm');
    } else {
      return createTime.format('MMM D, YYYY HH:mm');
    }

  } else {

    if (expireYear === currentYear) {
      return createTime.format('M月D日 HH:mm');
    } else {
      return createTime.format('YYYY年M月D日 HH:mm');
    }

  }

}

function toExpireUtc(expireTime) {
  return dayjs(expireTime).add(1, 'day').startOf('day').utc().format('YYYY-MM-DD HH:mm:ss')
}

function formatExpireTime(expireTime) {
  const expireDate = tzDayjs(expireTime).subtract(1, 'second');
  const currentYear = dayjs().year();
  const expireYear = expireDate.year();

  if (settingStore.lang === 'en') {

    return expireYear === currentYear
        ? expireDate.format('MMM D')
        : expireDate.format('MMM D, YYYY');

  } else {

    return expireYear === currentYear
        ? expireDate.format('M月D日')
        : expireDate.format('YYYY年M月D日');

  }
}

function refresh() {
  params.code = null
  getList(true)
}

function search() {
  getList(true)
}

function getList(showLoading = false) {
  if (showLoading) {
    regKeyLoading.value = true
  }
  regKeyList(params).then(list => {
    regKeyData.length = 0
    regKeyData.push(...list)
    regKeyLoading.value = false
    setTimeout(() => {
      regKeyFirst.value = false
    },200)
  })
}

async function copyCode(code) {
  try {
    await navigator.clipboard.writeText(code);
    ElMessage({
      message: t('copySuccessMsg'),
      type: 'success',
      plain: true,
    })
  } catch (err) {
    console.error('复制失败:', err);
    ElMessage({
      message: '复制失败',
      type: 'error',
      plain: true,
    })
  }
}

function genCode() {
  addForm.code = generateRandomCode()
}

function generateRandomCode(length = 8) {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

function clearNotUse() {
  ElMessageBox.confirm(t('clearRegKey'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    regKeyClearNotUse().then(() => {
      ElMessage({
        message: t('clearSuccess'),
        type: 'success',
        plain: true,
      })
      getList()
    })
  });
}

function submit() {

  if (addLoading.value) return

  if (!addForm.code) {
    ElMessage({
      message: t('emptyRegKeyMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (!addForm.roleId) {
    ElMessage({
      message: t('emptyRole'),
      type: "error",
      plain: true
    })
    return
  }

  if (!addForm.expireTime) {
    ElMessage({
      message: t('emptyTimeMsg'),
      type: "error",
      plain: true
    })
    return
  }

  if (!addForm.count) {
    ElMessage({
      message: t('emptyCountMsg'),
      type: "error",
      plain: true
    })
    return
  }

  addLoading.value = true
  regKeyAdd({...addForm, expireTime: toExpireUtc(addForm.expireTime)}).then(() => {
    showAdd.value = false
    resetForm()
    ElMessage({
      message: t('addSuccessMsg'),
      type: "success",
      plain: true
    })
    getList()
  }).finally(() => {
    addLoading.value = false
  })
}

function deleteRegKey(regKey) {
  ElMessageBox.confirm(t('delConfirm', {msg: regKey.code}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    regKeyDelete([regKey.regKeyId]).then(() => {
      getList()
      ElMessage({
        message: t('delSuccessMsg'),
        type: "success",
        plain: true
      })
    })
  });
}

function resetForm() {
  addForm.code = ''
}

function openAdd() {
  genCode()
  showAdd.value = true
}

</script>

<style scoped lang="scss">
.reg-key {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--app-canvas);
}

.header-actions {
  min-height: 48px;
  padding: 6px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  background: var(--surface-elevated);
  border-bottom: 1px solid var(--border-subtle);

  @media (max-width: 767px) {
    padding: 6px 12px;
  }
}

.actions-left,
.actions-right {
  display: flex;
  align-items: center;
  gap: 8px;
}

.actions-left {
  flex: 1;
  min-width: 0;
}

.toolbar-btn {
  height: 30px;
  padding: 0 12px;
  border-radius: 8px;
  border: 1px solid transparent;
  background: var(--brand-primary);
  color: #ffffff;
  font-size: 13px;
  font-weight: 500;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
  white-space: nowrap;
  transition: background-color 150ms ease, transform 120ms ease;

  &:hover {
    background: var(--brand-primary-hover);
  }
}

.icon-btn {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  border: 1px solid var(--border-subtle);
  background: var(--surface-subtle);
  color: var(--text-secondary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease, border-color 150ms ease;

  &:hover {
    background: var(--surface-hover);
    border-color: var(--border-strong);
    color: var(--text-primary);
  }
}

.search-wrap {
  position: relative;
  display: flex;
  align-items: center;
  width: min(240px, calc(100vw - 200px));

  @media (max-width: 640px) {
    flex: 1;
    width: auto;
    min-width: 120px;
  }

  .search-icon {
    position: absolute;
    left: 10px;
    color: var(--text-muted);
    pointer-events: none;
    z-index: 2;
  }

  .search-clear {
    position: absolute;
    right: 6px;
    width: 20px;
    height: 20px;
    border: none;
    border-radius: 50%;
    background: transparent;
    color: var(--text-muted);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    z-index: 2;

    &:hover {
      background: var(--surface-hover);
      color: var(--text-primary);
    }
  }
}

.search-input {
  width: 100%;

  :deep(.el-input__wrapper) {
    height: 30px;
    padding-left: 30px;
    padding-right: 26px;
    border-radius: 8px;
    background: var(--surface-subtle);
  }
}

.scrollbar {
  flex: 1;
  min-height: 0;
  position: relative;
  background: var(--app-canvas);

  .code-box {
    padding: 18px 20px 28px;
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
    gap: 14px;

    @media (max-width: 767px) {
      padding: 14px 12px 24px;
      grid-template-columns: 1fr;
    }

    .code-item {
      background: var(--surface-elevated);
      border-radius: 14px;
      border: 1px solid var(--border-subtle);
      box-shadow: var(--shadow-xs);
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;

      &:hover {
        border-color: var(--border-strong);
        box-shadow: var(--shadow-sm);
      }

      &.is-depleted {
        opacity: 0.85;
      }
    }
  }
}

.code-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.code-pill {
  flex: 1;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 10px;
  border-radius: 9px;
  border: 1px dashed var(--border-strong);
  background: var(--surface-subtle);
  color: var(--text-primary);
  cursor: pointer;
  text-align: left;
  transition: border-color 150ms ease, background-color 150ms ease;

  &:hover {
    border-color: var(--brand-primary);
    background: var(--brand-primary-soft);

    .copy-icon {
      color: var(--brand-primary);
    }
  }

  .code-text {
    font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
    font-size: 14px;
    font-weight: 700;
    letter-spacing: 0.02em;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    flex: 1;
  }

  .copy-icon {
    flex-shrink: 0;
    color: var(--text-muted);
  }
}

.more-btn {
  width: 28px;
  height: 28px;
  border-radius: 8px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 150ms ease, color 150ms ease;

  &:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }
}

.code-meta {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 2px;
}

.meta-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;

  .meta-label {
    color: var(--text-secondary);
  }

  .meta-value {
    color: var(--text-primary);
    font-weight: 500;

    &.count {
      font-variant-numeric: tabular-nums;
      font-weight: 600;
    }
  }
}

.empty {
  display: flex;
  justify-content: center;
  align-items: center;
  height: 100%;
  min-height: 280px;
}

:deep(.history-list.el-dialog) {
  min-height: 300px;
  width: 500px !important;
  @media (max-width: 540px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

.history-list .loading {
  position: absolute;
  top: 10px;
  z-index: 0;
  background: transparent;
}

:deep(.history-list .el-dialog__header) {
  padding-bottom: 5px;
}

:deep(.el-scrollbar__view) {
  min-height: 100%;
}

.loading {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  display: flex;
  justify-content: center;
  align-items: center;
  background: var(--loadding-background);
  z-index: 2;
}

.loading-show {
  transition: all 200ms ease 200ms;
  opacity: 1;
}

.loading-hide {
  pointer-events: none;
  transition: var(--loading-hide-transition);
  opacity: 0;
}

.container {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;

  .btn {
    height: 38px;
  }
}

:deep(.el-dialog) {
  width: 400px !important;
  @media (max-width: 440px) {
    width: calc(100% - 40px) !important;
    margin-right: 20px !important;
    margin-left: 20px !important;
  }
}

.gen-code {
  color: var(--text-muted);
  cursor: pointer;
  transition: color 150ms ease;

  &:hover {
    color: var(--brand-primary);
  }
}

:deep(.el-table__inner-wrapper:before) {
  background: var(--border-subtle);
}
</style>
