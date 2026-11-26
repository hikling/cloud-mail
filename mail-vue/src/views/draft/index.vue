<template>
  <emailScroll ref="scroll"
               :allow-star="false"
               :getEmailList="getEmailList"
               :emailDelete="emailDelete"
               :star-add="starAdd"
               :star-cancel="starCancel"
               @jump="jumpContent"
               actionLeft="6px"
               :show-account-icon="false"
               :show-first-loading="false"
               :showStar="false"
               @delete-draft="deleteDraft"
               :type="'draft'"
  >
    <template #name="props">
      <span class="send-email">{{ props.email.receiveEmail?.join(',') || '(' + $t('noRecipient') + ')' }}</span>
    </template>
    <template #subject="props">
      {{ props.email.subject || '(' + $t('noSubject') + ')' }}
    </template>
  </emailScroll>
</template>

<script setup>
import emailScroll from "@/components/email-scroll/index.vue"
import { emailDelete } from "@/request/email.js";
import { starAdd, starCancel } from "@/request/star.js";
import { defineOptions, ref, watch, toRaw } from "vue";
import { useUiStore } from "@/store/ui.js";
import { userDraftStore } from "@/store/draft.js";
import db from "@/db/db.js";

defineOptions({
  name: 'draft'
});

const draftStore = userDraftStore();
const uiStore = useUiStore();
const scroll = ref({});

watch(() => draftStore.setDraft, async () => {
  if (!db.value || !draftStore.setDraft?.draftId) return;

  const { draftId, attachments, ...draftFields } = toRaw(draftStore.setDraft);
  const rawAttachments = toRaw(attachments) || [];

  const isEmpty = !draftFields.content
    && !draftFields.subject
    && !(draftFields.receiveEmail?.length > 0)
    && !(draftFields.ccEmail?.length > 0)
    && !(draftFields.bccEmail?.length > 0)
    && rawAttachments.length === 0;

  if (isEmpty) {
    await db.value.draft.delete(draftId);
    await db.value.att.delete(draftId);
    draftStore.refreshList++;
    return;
  }

  await db.value.draft.update(draftId, draftFields);
  await db.value.att.put({ draftId, attachments: rawAttachments });
  draftStore.refreshList++;
}, {
  deep: true
});

watch(() => draftStore.refreshList, async () => {
  const { list } = await getEmailList();
  if (!scroll.value?.emailList) return;
  scroll.value.emailList.length = 0;
  scroll.value.handleList(list);
  scroll.value.emailList.push(...list);
});

function getEmailList() {
  if (!db.value) {
    return Promise.resolve({ list: [] });
  }
  return db.value.draft.orderBy('createTime').reverse().toArray().then(list => ({ list }));
}

async function deleteDraft(draftIds) {
  if (!db.value || !draftIds?.length) return;
  await db.value.draft.bulkDelete(draftIds);
  await db.value.att.bulkDelete(draftIds);
  draftStore.refreshList++;
}

async function jumpContent(email) {
  if (!db.value) return;
  const att = await db.value.att.get(email.draftId);
  email.attachments = att?.attachments || [];
  uiStore.writerRef.openDraft(email);
}
</script>
<style>
.send-email {
  font-weight: normal;
}
</style>
