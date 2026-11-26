<template>
  <emailScroll ref="scroll"
               :cancel-success="cancelStar"
               :star-success="addStar"
               :getEmailList="getEmailList"
               :emailDelete="activeEmailDelete"
               :delete-perm="isNoone ? 'all-email:delete' : 'email:delete'"
               :star-add="starAdd"
               :star-cancel="starCancel"
               :email-read="emailRead"
               :show-unread="!isNoone"
               :show-star="!isNoone"
               :show-recipient-chip="isNoone"
               :type="isNoone ? 'noone' : 'email'"
               :highlight-text="emailStore.searchParams.text"
               actionLeft="4px"
               @jump="jumpContent"
               @refresh-success="onRefreshSuccess"
  />
</template>

<script setup>
import { useAccountStore } from "@/store/account.js";
import { useEmailStore } from "@/store/email.js";
import { useSettingStore } from "@/store/setting.js";
import emailScroll from "@/components/email-scroll/index.vue";
import { emailList, emailDelete, emailLatest, emailRead } from "@/request/email.js";
import { allEmailList, allEmailDelete, allEmailLatest } from "@/request/all-email.js";
import { starAdd, starCancel } from "@/request/star.js";
import { hasPerm } from "@/perm/perm.js";
import { computed, defineOptions, onActivated, onBeforeUnmount, onDeactivated, onMounted, ref, watch } from "vue";
import { sleep } from "@/utils/time-utils.js";
import router from "@/router/index.js";
import {
  allEmailWs,
  inboxWs,
  isAutoRefreshEnabled,
} from "@/websocket/client.js";

defineOptions({
  name: 'email'
});

const EMAIL_STATUS_NOONE = 7;

const emailStore = useEmailStore();
const accountStore = useAccountStore();
const settingStore = useSettingStore();
const scroll = ref({});
const existIds = new Set();
const viewActive = ref(true);
let pullTimer = null;
let unsubInbox = null;
let unsubAllEmail = null;

const canViewNoone = computed(() => hasPerm('all-email:query'));
const isNoone = computed(() => canViewNoone.value && emailStore.inboxTab === 'noone');

function activeEmailDelete(emailIds) {
  return isNoone.value ? allEmailDelete(emailIds) : emailDelete(emailIds);
}

onMounted(() => {
  emailStore.emailScroll = scroll;
  viewActive.value = true;
  unsubInbox = inboxWs.subscribe({
    isEnabled: () => isAutoRefreshEnabled(settingStore.settings.autoRefresh) && !isNoone.value,
    onMessage: onWsMessage,
    onReconnect: () => schedulePullLatest(),
  });
  if (canViewNoone.value) {
    unsubAllEmail = allEmailWs.subscribe({
      isEnabled: () => viewActive.value && isNoone.value && isAutoRefreshEnabled(settingStore.settings.autoRefresh),
      onMessage: onAllEmailWsMessage,
      onReconnect: () => {
        if (isNoone.value) schedulePullLatest();
      },
    });
  }
});

onActivated(() => {
  viewActive.value = true;
  inboxWs.sync();
  allEmailWs.sync();
});

onDeactivated(() => {
  viewActive.value = false;
  if (pullTimer) {
    window.clearTimeout(pullTimer);
    pullTimer = null;
  }
  allEmailWs.sync();
});

onBeforeUnmount(() => {
  viewActive.value = false;
  if (pullTimer) {
    window.clearTimeout(pullTimer);
    pullTimer = null;
  }
  unsubInbox?.();
  unsubAllEmail?.();
});

watch(
  [() => emailStore.inboxTab, () => accountStore.currentAccountId],
  () => {
    inboxWs.sync();
    allEmailWs.sync();
    scroll.value.refreshList?.();
  }
);

watch(
  () => emailStore.searchParams,
  () => {
    scroll.value.refreshList?.();
  },
  { deep: true }
);

watch(() => settingStore.settings.autoRefresh, () => {
  inboxWs.sync();
  allEmailWs.sync();
});

function onRefreshSuccess() {
  inboxWs.retryNow();
  if (isNoone.value) {
    allEmailWs.retryNow();
  }
}

function jumpContent(email) {
  emailStore.setContentEmail(emailStore.toContentEmail(email), isNoone.value ? {
    delType: 'physics',
    showUnread: false,
    showStar: false,
    showReply: false,
  } : {
    delType: 'logic',
    showUnread: true,
    showStar: true,
    showReply: true,
  });
  router.push({ name: 'content', params: { mailbox: 'inbox' } });
}

// 推送到达：非「全部收取」时忽略其它账号的信。
function onWsMessage(event) {
  if (isNoone.value) return;
  const allReceive = accountStore.currentAccount.allReceive;
  if (!allReceive && event?.accountId != null && Number(event.accountId) !== Number(accountStore.currentAccountId)) {
    return;
  }
  schedulePullLatest();
}

function onAllEmailWsMessage() {
  if (!isNoone.value) return;
  schedulePullLatest();
}

// 短时间多条推送合并成一次补拉。
function schedulePullLatest() {
  if (pullTimer) {
    window.clearTimeout(pullTimer);
  }
  pullTimer = window.setTimeout(() => {
    pullTimer = null;
    void pullLatest();
  }, 150);
}

// 按当前列表最新 id 拉取之后的新邮件并插入。
async function pullLatest() {
  const searchParams = emailStore.searchParams;
  if (searchParams.text || searchParams.startDate || searchParams.endDate) {
    return;
  }

  if (scroll.value.firstLoad) {
    return;
  }

  if (isNoone.value) {
    const latestId = scroll.value.latestEmail?.emailId;
    if (!latestId && latestId !== 0) return;

    try {
      const list = await allEmailLatest(latestId);
      if (!isNoone.value) return;
      const nooneList = (list || []).filter(item => item.status === EMAIL_STATUS_NOONE);
      if (nooneList.length > 0) {
        for (let email of nooneList) {
          if (!existIds.has(email.emailId)) {
            existIds.add(email.emailId);
            scroll.value.addItem(email);
            await sleep(50);
          }
        }
      }
    } catch (e) {
      if (e.code === 401 || e.code === 403) {
        settingStore.settings.autoRefresh = 1;
        allEmailWs.sync();
      }
      console.error(e);
    }
    return;
  }

  const latestId = scroll.value.latestEmail?.emailId;
  const accountId = accountStore.currentAccountId;
  const allReceive = scroll.value.latestEmail?.allReceive;

  if (accountId !== scroll.value.latestEmail?.reqAccountId) {
    return;
  }

  try {
    const list = await emailLatest(latestId, accountId, allReceive);

    if (isNoone.value || accountId !== accountStore.currentAccountId || allReceive !== accountStore.currentAccount.allReceive) {
      return;
    }

    if (list.length > 0) {
      for (let email of list) {
        email.reqAccountId = accountId;
        email.allReceive = allReceive;

        if (!existIds.has(email.emailId)) {
          existIds.add(email.emailId);
          scroll.value.addItem(email);
          await sleep(50);
        }
      }
    }
  } catch (e) {
    if (e.code === 401 || e.code === 403) {
      settingStore.settings.autoRefresh = 1;
      inboxWs.sync();
    }
    console.error(e);
  }
}

function addStar(email) {
  emailStore.starScroll?.addItem(email);
}

function cancelStar(email) {
  emailStore.starScroll?.deleteEmail([email.emailId]);
}

function getEmailList(emailId, size) {
  if (isNoone.value) {
    const search = emailStore.searchParams;
    return emailStore.fetchList(full => allEmailList({
      emailId,
      size,
      full,
      timeSort: 0,
      type: 'noone',
      text: search.text,
      searchType: search.type,
      startDate: search.startDate,
      endDate: search.endDate,
    }));
  }

  const accountId = accountStore.currentAccountId;
  const allReceive = accountStore.currentAccount.allReceive;
  return emailStore.fetchList(full =>
    emailList(accountId, allReceive, emailId, 0, size, 0, full, emailStore.searchParams)
  ).then(data => {
    data.latestEmail.reqAccountId = accountId;
    data.latestEmail.allReceive = allReceive;
    return data;
  });
}
</script>
<style>
.icon {
  cursor: pointer;
}
</style>
