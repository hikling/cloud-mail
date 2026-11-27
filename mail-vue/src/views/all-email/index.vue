<template>
  <div class="email-list-box">
    <emailScroll
      ref="sysEmailScroll"
      :get-emailList="getEmailList"
      :email-delete="allEmailDelete"
      :star-add="starAdd"
      :star-cancel="starCancel"
      :show-star="false"
      show-user-info
      show-status
      :actionLeft="'0px'"
      :show-account-icon="false"
      :time-sort="params.timeSort"
      @jump="jumpContent"
      @refresh-success="onRefreshSuccess"
      @right-search="rightSearch"
      :highlight-text="allEmailStore.searchParams.text"
      :type="'all-email'"
    >
      <template #first>
        <button type="button" class="batch-clean-btn" @click="openBathDelete" :title="$t('clearEmail')">
          <Icon icon="fluent:broom-sparkle-16-regular" width="17" height="17" />
        </button>
      </template>
    </emailScroll>

    <el-dialog v-model="showBathDelete" :title="$t('clearEmail')" width="380" append-to-body align-center @closed="closedClear">
      <div class="clear-email">
        <el-input v-model="clearParams.sendName" :placeholder="$t('sender')" @keyup.enter="batchDelete"/>
        <el-input v-model="clearParams.subject" :placeholder="$t('subject')" @keyup.enter="batchDelete"/>
        <el-input v-model="clearParams.sendEmail" :placeholder="$t('sendEmailAddress')" @keyup.enter="batchDelete"/>
        <el-input v-model="clearParams.toEmail" :placeholder="$t('toEmail')" @keyup.enter="batchDelete"/>
        <el-date-picker
          popper-class="my-date-picker"
          v-model="clearTime"
          type="daterange"
          :teleported="false"
          unlink-panels
          :range-separator="t('to')"
          size="default"
        />
        <div class="clear-button">
          <el-select v-model="clearParams.type" style="width: 140px; flex-shrink: 0;">
            <el-option key="eq" :label="t('equal')" value="eq"/>
            <el-option key="left" :label="t('leading')" value="left"/>
            <el-option key="include" :label="t('include')" value="include"/>
          </el-select>
          <el-button :loading="clearLoading" type="primary" @click="batchDelete">{{ t('clear') }}</el-button>
        </div>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {starAdd, starCancel} from "@/request/star.js";
import emailScroll from "@/components/email-scroll/index.vue"
import { defineOptions, reactive, ref, watch, onMounted, onActivated, onDeactivated, onBeforeUnmount } from "vue";
import { useAllEmailStore } from "@/store/all-email.js";
import { useEmailStore } from "@/store/email.js";
import {
  allEmailList,
  allEmailDelete,
  allEmailBatchDelete,
  allEmailLatest
} from "@/request/all-email.js";
import { Icon } from "@iconify/vue";
import router from "@/router/index.js";
import { useI18n } from 'vue-i18n';
import { toUtc } from "@/utils/day.js";
import { sleep } from "@/utils/time-utils.js";
import { useSettingStore } from "@/store/setting.js";
import { allEmailWs, isAutoRefreshEnabled } from "@/websocket/client.js";

defineOptions({
  name: 'all-email'
})

const { t } = useI18n();
const emailStore = useEmailStore();
const allEmailStore = useAllEmailStore();
const settingStore = useSettingStore();
const clearTime = ref('')
const sysEmailScroll = ref({})
const showBathDelete = ref(false)
const clearLoading = ref(false)
const viewActive = ref(true)
let pullTimer = null
let unsubAllEmail = null

onMounted(() => {
  viewActive.value = true;
  unsubAllEmail = allEmailWs.subscribe({
    isEnabled: () => viewActive.value && isAutoRefreshEnabled(settingStore.settings.autoRefresh),
    onMessage: () => schedulePullLatest(),
    onReconnect: () => schedulePullLatest(),
  });
})

onActivated(() => {
  viewActive.value = true;
  allEmailWs.sync();
})

onDeactivated(() => {
  viewActive.value = false;
  if (pullTimer) {
    window.clearTimeout(pullTimer);
    pullTimer = null;
  }
  allEmailWs.sync();
})

onBeforeUnmount(() => {
  viewActive.value = false;
  if (pullTimer) {
    window.clearTimeout(pullTimer)
    pullTimer = null
  }
  unsubAllEmail?.()
})

watch(() => settingStore.settings.autoRefresh, () => {
  allEmailWs.sync()
})

function onRefreshSuccess() {
  allEmailWs.retryNow()
}

const params = reactive({
  timeSort: 0,
})

const clearParams = reactive({
  subject: '',
  sendEmail: '',
  sendName: '',
  startTime: '',
  toEmail: '',
  endTime: '',
  type: 'eq',
})

function resetClearParams() {
  clearParams.subject = ''
  clearParams.sendEmail = ''
  clearParams.sendName = ''
  clearParams.startTime = ''
  clearParams.toEmail = ''
  clearParams.endTime = ''
}

function closedClear() {
  resetClearParams()
  clearParams.type = 'eq'
  clearParams.endTime = ''
  clearTime.value = null
}

watch(
  () => allEmailStore.searchParams,
  () => {
    sysEmailScroll.value.refreshList?.()
  },
  {deep: true}
)

function openBathDelete() {
  showBathDelete.value = true
}

function batchDelete() {
  if (clearLoading.value) return

  const payload = {
    ...clearParams,
    startTime: clearTime.value ? toUtc(clearTime.value[0]).format("YYYY-MM-DD HH:mm:ss") : '',
    endTime: clearTime.value ? toUtc(clearTime.value[1]).add(1, 'day').format("YYYY-MM-DD HH:mm:ss") : '',
  }

  if (!payload.sendEmail && !payload.sendName && !payload.subject && !payload.toEmail && !clearTime.value) {
    showBathDelete.value = false
    return
  }

  ElMessageBox.confirm(
      t('delAllConfirm'),
      {
        confirmButtonText: t('confirm'),
        cancelButtonText: t('cancel'),
        type: 'warning',
      }
  ).then(() => {
    clearLoading.value = true

    allEmailBatchDelete(payload).then(() => {
      ElMessage({
        message: t('clearSuccess'),
        type: "success",
        plain: true
      })
      resetClearParams()
      clearTime.value = null
      showBathDelete.value = false
      sysEmailScroll.value.refreshList();
    }).finally(() => {
      clearLoading.value = false
    })
  }).catch(() => {})
}

function rightSearch(type, value) {
  const typeMap = {name: 'sender', user: 'user', account: 'account'}
  allEmailStore.setSearchParams({
    text: value || '',
    type: typeMap[type] || 'subject',
    startDate: '',
    endDate: '',
  })
}

function jumpContent(email) {
  emailStore.setContentEmail(emailStore.toContentEmail(email), {
    delType: 'physics',
    showStar: false,
    showReply: false,
    showUnread: false,
  })
  router.push({name: 'content', params: {mailbox: 'all-mail'}})
}

function getEmailList(emailId, size) {
  const search = allEmailStore.searchParams
  return emailStore.fetchList(full => allEmailList({
    emailId,
    size,
    full,
    timeSort: params.timeSort,
    type: search.status || 'all',
    text: search.text,
    searchType: search.type,
    startDate: search.startDate,
    endDate: search.endDate,
  }))
}

function schedulePullLatest() {
  if (pullTimer) {
    window.clearTimeout(pullTimer)
  }
  pullTimer = window.setTimeout(() => {
    pullTimer = null
    void pullLatest()
  }, 150)
}

async function pullLatest() {
  const latestId = sysEmailScroll.value.latestEmail?.emailId
  if (!latestId && latestId !== 0) return
  if (sysEmailScroll.value.firstLoad) return

  const search = allEmailStore.searchParams
  if (search.text || search.startDate || search.endDate || (search.status && search.status !== 'all' && search.status !== 'receive')) {
    return
  }

  try {
    const curTimeSort = params.timeSort
    const curStatus = search.status
    const list = await allEmailLatest(latestId)
    if (list.length === 0) return
    if (params.timeSort !== curTimeSort || allEmailStore.searchParams.status !== curStatus) return

    for (let email of list) {
      if (!viewActive.value || params.timeSort !== curTimeSort || allEmailStore.searchParams.status !== curStatus) break
      sysEmailScroll.value.addItem(email)
      await sleep(50)
    }
  } catch (e) {
    if (e.code === 401 || e.code === 403) {
      settingStore.settings.autoRefresh = 1;
      allEmailWs.sync();
    }
    console.error(e)
  }
}
</script>

<style>
@media (max-width: 767px) {
  .el-date-range-picker .el-picker-panel__body {
    min-width: auto;
  }
  .my-date-picker::after {
    content: "";
    position: absolute;
    left: 0;
    right: 0;
    height: 20px;
    background: transparent;
  }
  .el-date-range-picker__content {
    width: 100%;
  }
  .el-date-range-picker {
    width: 300px;
  }
  .el-tooltip .el-picker_popper {
    padding-bottom: 200px;
  }
  .el-date-range-picker__content.is-left {
    border-right: 0;
  }
}
</style>

<style scoped lang="scss">
.email-list-box {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

.batch-clean-btn {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease;

  &:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }
}

.clear-email {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.clear-button {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;

  .el-button {
    flex: 1;
  }
}

:deep(.el-date-editor.el-input__wrapper) {
  width: 100%;
}
</style>
