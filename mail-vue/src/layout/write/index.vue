<template>
  <Transition name="compose-modal">
    <div class="send" v-show="show">
      <div class="write-box">
      <div class="title">
        <div class="title-left">
          <span class="title-badge">
            <Icon icon="lucide:square-pen" width="16" height="16"/>
          </span>
          <span class="sender">{{ $t('sender') }}</span>
          <div class="sender-chip">
            <span class="sender-name">{{ form.name }}</span>
            <span class="send-email">&lt;{{ form.sendEmail }}&gt;</span>
          </div>
        </div>
        <button type="button" class="close-btn" @click="close" aria-label="Close">
          <Icon icon="lucide:x" width="17" height="17"/>
        </button>
      </div>

      <div class="container">
        <div class="address-fields">
          <el-input-tag @add-tag="addTagChange" tag-type="primary" @input="value => updateSuggest('receive', value)" size="large" v-model="form.receiveEmail">
            <template #prefix>
              <div class="item-title">{{ $t('recipient') }}</div>
              <el-select
                ref="mySelect"
                class="write-select"
                popper-class="write-select"
                :show-arrow="false"
                :no-match-text="' '"
                :no-data-text="' '"
                @visible-change="status => suggestStatusChange('receive', status)"
                @change="value => suggestChange('receive', value)"
              >
                <el-option
                  v-for="item in selectRecipientList"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </template>
            <template #suffix>
              <div class="address-actions">
                <button type="button" class="address-toggle" v-if="form.manyType !== 'divide' && !showCc" @click.stop="openCc">CC</button>
                <button type="button" class="address-toggle" v-if="form.manyType !== 'divide' && !showBcc" @click.stop="openBcc">BCC</button>
                <button type="button" class="contact-icon-btn" @click.stop="openContacts('receive')" :title="$t('recentContacts')">
                  <Icon icon="lucide:user-plus" width="16" height="16" />
                </button>
              </div>
            </template>
          </el-input-tag>

          <el-input-tag v-if="form.manyType !== 'divide' && showCc" ref="ccInputRef" tag-type="primary" size="large" v-model="form.ccEmail" @input="value => updateSuggest('cc', value)" @add-tag="addCcTag">
            <template #prefix>
              <div class="item-title">{{ $t('cc') }}</div>
              <el-select
                ref="ccSelectRef"
                class="write-select"
                popper-class="write-select"
                :show-arrow="false"
                :no-match-text="' '"
                :no-data-text="' '"
                @visible-change="status => suggestStatusChange('cc', status)"
                @change="value => suggestChange('cc', value)"
              >
                <el-option
                  v-for="item in ccSuggestList"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </template>
            <template #suffix>
              <div class="address-actions">
                <button type="button" class="contact-icon-btn" @click.stop="openContacts('cc')" :title="$t('recentContacts')">
                  <Icon icon="lucide:user-plus" width="16" height="16" />
                </button>
              </div>
            </template>
          </el-input-tag>

          <el-input-tag v-if="form.manyType !== 'divide' && showBcc" ref="bccInputRef" tag-type="primary" size="large" v-model="form.bccEmail" @input="value => updateSuggest('bcc', value)" @add-tag="addBccTag">
            <template #prefix>
              <div class="item-title">{{ $t('bcc') }}</div>
              <el-select
                ref="bccSelectRef"
                class="write-select"
                popper-class="write-select"
                :show-arrow="false"
                :no-match-text="' '"
                :no-data-text="' '"
                @visible-change="status => suggestStatusChange('bcc', status)"
                @change="value => suggestChange('bcc', value)"
              >
                <el-option
                  v-for="item in bccSuggestList"
                  :key="item"
                  :label="item"
                  :value="item"
                />
              </el-select>
            </template>
            <template #suffix>
              <div class="address-actions">
                <button type="button" class="contact-icon-btn" @click.stop="openContacts('bcc')" :title="$t('recentContacts')">
                  <Icon icon="lucide:user-plus" width="16" height="16" />
                </button>
              </div>
            </template>
          </el-input-tag>
        </div>

        <div class="subject-field">
          <el-input v-model="form.subject" :placeholder="t('subject')" size="large" @focus="hideEmptyCcBcc" />
        </div>

        <div class="editor-shell">
          <tinyEditor :def-value="defValue" ref="editor" @change="change" @focus="focusChange" />
        </div>

        <div class="button-item">
          <div class="footer-left-tools">
            <button type="button" class="tool-btn" @click="chooseFile" :title="$t('attachments')">
              <Icon icon="lucide:paperclip" width="17" height="17"/>
            </button>
            <button type="button" class="tool-btn danger" @click="clearContent" :title="$t('clear')">
              <Icon icon="lucide:eraser" width="17" height="17"/>
            </button>
          </div>

          <div class="att-list">
            <div class="att-item" v-for="(item,index) in form.attachments" :key="index">
              <Icon v-bind="getIconByName(item.filename)"/>
              <span class="att-filename">{{ item.filename }}</span>
              <span class="att-size">{{ formatBytes(item.size) }}</span>
              <button type="button" class="att-del-btn" @click="delAtt(index)">
                <Icon icon="lucide:x" width="14" height="14"/>
              </button>
            </div>
          </div>

          <div class="send-action-wrap">
            <el-dropdown split-button type="primary" trigger="click" @click="sendEmail" @command="selectSendMode">
              {{ sendButtonLabel }}
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="together">
                    {{ togetherSendLabel }}
                  </el-dropdown-item>
                  <el-dropdown-item command="divide">
                    {{ separateSendLabel }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
      </div>
    </div>

    <el-dialog top="10vh" v-model="showContacts" @closed="clearSelectContact" :title="t('recentContacts')">
      <el-table class="contacts-table" ref="contactsTabRef" row-key="email" :data="contacts" style="height: 445px" @row-click="toggleContactRow">
        <el-table-column type="selection" width="38" />
        <el-table-column property="email" :label="t('emailAccount')">
          <template #default="props">
            <div class="email-row">{{ props.row.email }}</div>
          </template>
        </el-table-column>
        <el-table-column width="50" label="">
          <template #default>
            <div style="display: flex; color: var(--text-muted)">
              <Icon icon="lucide:users" width="16" height="16" />
            </div>
          </template>
        </el-table-column>
      </el-table>
      <div class="contacts-bottom">
        <el-button type="default" @click="deleteContact">{{t('clear')}}</el-button>
        <el-button type="primary" @click="chooseContact">{{t('selectContacts')}}</el-button>
      </div>
    </el-dialog>
    </div>
  </Transition>
</template>

<script setup>
import tinyEditor from '@/components/tiny-editor/index.vue'
import {h, nextTick, onMounted, onUnmounted, reactive, ref, toRaw, computed} from "vue";
import {Icon} from "@iconify/vue";
import {useUserStore} from "@/store/user.js";
import {emailSend} from "@/request/email.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useAccountStore} from "@/store/account.js";
import {useEmailStore} from "@/store/email.js";
import {fileToBase64, formatBytes} from "@/utils/file-utils.js";
import {getIconByName} from "@/utils/icon-utils.js";
import sendPercent from "@/components/send-percent/index.vue"
import {toOssDomain} from "@/utils/convert.js";
import {formatDetailDate} from "@/utils/day.js";
import {useSettingStore} from "@/store/setting.js";
import {userDraftStore} from "@/store/draft.js";
import {useWriterStore} from "@/store/writer.js";
import db from "@/db/db.js";
import dayjs from "dayjs";
import {useI18n} from "vue-i18n";
import router from "@/router/index.js";
import {ElMessageBox} from "element-plus";

defineExpose({
  open,
  openReply,
  openForward,
  openDraft
})

const {t} = useI18n()
const writerStore = useWriterStore();
const draftStore = userDraftStore()
const settingStore = useSettingStore()
const emailStore = useEmailStore();
const accountStore = useAccountStore()
const editor = ref({})
const userStore = useUserStore();
const show = ref(false);
const percent = ref(0)
let percentMessage = null
let sending = false
const defValue = ref('')
const contactsTabRef = ref({})
const showContacts = ref(false)
const contactTarget = ref('receive')
const showCc = ref(false)
const showBcc = ref(false)
const ccInputRef = ref()
const bccInputRef = ref()
const mySelect = ref()
const ccSelectRef = ref()
const bccSelectRef = ref()
const suggestOpen = { receive: false, cc: false, bcc: false }
const backReply = reactive({
  receiveEmail: [],
  subject: '',
  content: '',
  sendType: ''
})
const form = reactive({
  sendEmail: '',
  receiveEmail: [],
  ccEmail: [],
  bccEmail: [],
  accountId: -1,
  name: '',
  subject: '',
  content: '',
  sendType: '',
  manyType: 'together',
  text: '',
  emailId: 0,
  attachments: [],
  draftId: null,
})

const selectRecipientList = ref([])
const ccSuggestList = ref([])
const bccSuggestList = ref([])
const suggestListMap = { receive: selectRecipientList, cc: ccSuggestList, bcc: bccSuggestList }
const suggestSelectMap = { receive: mySelect, cc: ccSelectRef, bcc: bccSelectRef }
const suggestFieldMap = { receive: 'receiveEmail', cc: 'ccEmail', bcc: 'bccEmail' }

const contacts = computed(() => writerStore.sendRecipientRecord.map(item => ({email: item})))
const togetherSendLabel = computed(() => {
  if (form.sendType === 'reply') return t('reply')
  if (form.sendType === 'forward') return t('forward')
  return t('send')
})
const separateSendLabel = computed(() => {
  if (form.sendType === 'reply') return t('separateReply')
  if (form.sendType === 'forward') return t('separateForward')
  return t('separateSend')
})
const sendButtonLabel = computed(() => {
  if (form.manyType === 'divide') return separateSendLabel.value
  return togetherSendLabel.value
})

function clearCcBcc() {
  form.ccEmail = []
  form.bccEmail = []
  showCc.value = false
  showBcc.value = false
}

function selectSendMode(mode) {
  form.manyType = mode
  if (mode === 'divide') {
    clearCcBcc()
  }
}

function targetAddressKey() {
  if (contactTarget.value === 'cc') return 'ccEmail'
  if (contactTarget.value === 'bcc') return 'bccEmail'
  return 'receiveEmail'
}

function openContacts(target = 'receive') {
  contactTarget.value = target
  showContacts.value = true
  nextTick(() => {
    form[targetAddressKey()].forEach(item => {
      if (writerStore.sendRecipientRecord.includes(item)) {
        contactsTabRef.value.toggleRowSelection({email: item});
      }
    })
  })
}

function deleteContact() {
  ElMessageBox.confirm(t('confirmDeletionOfContacts'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    const contactList = contactsTabRef.value.getSelectionRows().map(item => item.email);
    const key = targetAddressKey()
    form[key] = form[key].filter(item => !contactList.includes(item));
    writerStore.sendRecipientRecord = writerStore.sendRecipientRecord.filter(item => !contactList.includes(item));
  })
}

function chooseContact() {
  const contactList = contactsTabRef.value.getSelectionRows().map(item => item.email);
  const key = targetAddressKey()
  contactList.forEach(item => {
    if (!form[key].includes(item)) {
      form[key].push(item);
    }
  })

  form[key] = form[key].filter(item => {
    return contactList.includes(item) || !writerStore.sendRecipientRecord.includes(item);
  });

  showContacts.value = false
}

function clearSelectContact() {
  contactsTabRef.value.clearSelection();
}

function toggleContactRow(row, column) {
  if (column?.type === 'selection') return
  contactsTabRef.value.toggleRowSelection(row)
}

function toggleSuggest(target) {
  suggestSelectMap[target].value?.toggleMenu()
}

function suggestStatusChange(target, status) {
  suggestOpen[target] = status
}

function suggestChange(target, value) {
  form[suggestFieldMap[target]].push(value)
}

function updateSuggest(target, value) {
  const field = suggestFieldMap[target]
  const list = writerStore.sendRecipientRecord.filter(item => value && !form[field].includes(item) && item.startsWith(value)).slice(0, 10)
  suggestListMap[target].value = list

  if (!suggestOpen[target] && list.length > 0) {
    toggleSuggest(target)
  }

  if (suggestOpen[target] && list.length === 0) {
    toggleSuggest(target)
  }
}

function closeOpenSuggest() {
  for (const target of ['receive', 'cc', 'bcc']) {
    if (suggestOpen[target]) toggleSuggest(target)
  }
}

function addAddressTag(list, val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));

  list.splice(list.length - 1, 1)

  let has = false
  emails.forEach(email => {
    if (isEmail(email) && !list.includes(email)) {
      list.push(email)
      has = true
    }
  })
  return has
}

function addTagChange(val) {
  if (addAddressTag(form.receiveEmail, val) && suggestOpen.receive) toggleSuggest('receive')
}

function addCcTag(val) {
  if (addAddressTag(form.ccEmail, val) && suggestOpen.cc) toggleSuggest('cc')
}

function addBccTag(val) {
  if (addAddressTag(form.bccEmail, val) && suggestOpen.bcc) toggleSuggest('bcc')
}

function openCc() {
  showCc.value = true
  nextTick(() => ccInputRef.value?.focus?.())
}

function openBcc() {
  showBcc.value = true
  nextTick(() => bccInputRef.value?.focus?.())
}

function hideEmptyCcBcc() {
  if (showCc.value && form.ccEmail.length === 0) {
    showCc.value = false
  }
  if (showBcc.value && form.bccEmail.length === 0) {
    showBcc.value = false
  }
}

function clearContent() {
  hideEmptyCcBcc()
  ElMessageBox.confirm(t('clearContentConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    resetForm()
  })
}

function delAtt(index) {
  form.attachments.splice(index, 1);
}

function chooseFile() {
  hideEmptyCcBcc()
  const doc = document.createElement("input")
  doc.setAttribute("type", "file")
  doc.multiple = true;
  doc.click()
  doc.onchange = async (e) => {
    const fileList = e.target.files;
    for (const file of fileList) {
      const size = file.size
      const filename = file.name
      const contentType = file.type
      const content = await fileToBase64(file)
      form.attachments.push({content, filename, size, contentType})
    }
  }
}

async function sendEmail() {
  hideEmptyCcBcc()

  if (form.receiveEmail.length === 0) {
    ElMessage({
      message: t('emptyRecipientMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (!form.subject) {
    ElMessage({
      message: t('emptySubjectMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  form.content = editor.value.getContent();

  if (!form.content) {
    ElMessage({
      message: t('emptyContentMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  if (sending) {
    ElMessage({
      message: t('sendingErrorMsg'),
      type: 'error',
      plain: true,
    })
    return
  }

  percentMessage = ElMessage({
    message: () => h(sendPercent, {value: percent.value, desc: t('sending')}),
    dangerouslyUseHTMLString: true,
    plain: true,
    duration: 0,
    customClass: 'message-bottom'
  })

  sending = true
  show.value = false

  emailSend(form, (e) => {
    percent.value = Math.round((e.loaded * 98) / e.total)
  }).then(result => {
    const emailList = Array.isArray(result) ? result : result.emails
    const email = emailList[0]
    emailList.forEach(item => {
      emailStore.sendScroll?.addItem(item)
    })

    userStore.refreshUserInfo();
    addRecipientRecord();

    if (result.failedRecipients?.length) {
      form.receiveEmail = result.failedRecipients
      show.value = true
      ElNotification({
        title: t('partialSendMsg', {count: emailList.length, failed: result.failedRecipients.length}),
        type: 'warning',
        message: result.error,
        position: 'bottom-right'
      })
      return
    }

    ElNotification({
      title: t('sendSuccessMsg'),
      type: "success",
      message: h('span', {style: 'color: var(--brand-primary)'}, email.subject),
      position: 'bottom-right'
    })

    if (form.draftId) {
      form.subject = ''
      form.content = ''
      form.receiveEmail = []
      draftStore.setDraft = {...toRaw(form)}
    }

    show.value = false
    resetForm();
  }).catch((e) => {
    ElNotification({
      title: t('sendFailMsg'),
      type: e.code === 403 ? 'warning' : 'error',
      message: h('span', {style: 'color: var(--el-color-danger)'}, e.message),
      position: 'bottom-right'
    })
    if (e.code === 401) {
      localStorage.removeItem('token');
      router.replace('/login');
    }
    show.value = true
    addRecipientRecord();
  }).finally(() => {
    percentMessage.close()
    percent.value = 0
    sending = false
  })
}

function addRecipientRecord() {
  const seen = new Set()
  const addresses = []
  for (const email of [...form.receiveEmail, ...form.ccEmail, ...form.bccEmail]) {
    const key = String(email).trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    addresses.push(email)
  }

  writerStore.sendRecipientRecord = writerStore.sendRecipientRecord.filter(
      email => !seen.has(String(email).trim().toLowerCase())
  );

  writerStore.sendRecipientRecord.unshift(...addresses);
  writerStore.sendRecipientRecord = writerStore.sendRecipientRecord.slice(0, 500);
}

function resetForm() {
  form.receiveEmail = []
  form.ccEmail = []
  form.bccEmail = []
  showCc.value = false
  showBcc.value = false
  form.subject = ''
  form.content = ''
  form.manyType = 'together'
  form.attachments = []
  form.sendType = ''
  form.emailId = 0
  form.draftId = null
  backReply.content = ''
  backReply.subject = ''
  backReply.receiveEmail = []
  backReply.sendType = ''
  editor.value.clearEditor()
}

function change(content, text) {
  form.content = content;
  form.text = text
}

function focusChange() {
  closeOpenSuggest()
  hideEmptyCcBcc()
}

function openForward(email) {
  resetForm();
  email.subject = email.subject || ''
  form.subject = email.subject
  form.sendType = 'forward'
  defValue.value = ''

  setTimeout(() => {
    defValue.value = `
      ${formatImage(email.content) || `<pre style="font-family: inherit;word-break: break-word;white-space: pre-wrap;margin: 0">${email.text}</pre>`}
    `
    open()

    nextTick(() => {
      backReply.content = editor.value.getContent()
      backReply.subject = form.subject
      backReply.receiveEmail = form.receiveEmail
      backReply.sendType = form.sendType
    })
  });
}

function openReply(email) {
  resetForm();
  email.subject = email.subject || ''
  form.receiveEmail.push(email.sendEmail)
  form.subject = (
      email.subject.startsWith('Re:') ||
      email.subject.startsWith('Re：') ||
      email.subject.startsWith('回复：') ||
      email.subject.startsWith('回复:')) ? email.subject : 'Re: ' + email.subject
  form.sendType = 'reply'
  form.emailId = email.emailId
  defValue.value = ''

  setTimeout(() => {
    defValue.value = `
    <div></div>
    <div>
    <br>
        ${formatDetailDate(email.createTime)} ${email.name} &lt${email.sendEmail}&gt ${t('wrote')}:
    </div>
    <blockquote class="mceNonEditable" style="margin: 0 0 0 0.8ex;border-left: 1px solid rgb(204,204,204);padding-left: 1ex;">
      <articl>
          ${formatImage(email.content) || `<pre style="font-family: inherit;word-break: break-word;white-space: pre-wrap;margin: 0">${email.text}</pre>`}
      </article>
    </blockquote>`
    open()

    nextTick(() => {
      backReply.content = editor.value.getContent()
      backReply.subject = form.subject
      backReply.receiveEmail = form.receiveEmail
      backReply.sendType = form.sendType
    })
  })
}

function formatImage(content) {
  content = content || '';
  const domain = settingStore.settings.r2Domain;
  return content.replace(/{{domain}}/g, toOssDomain(domain) + '/');
}

function open() {
  if (!accountStore.currentAccount.email) {
    form.sendEmail = userStore.user.email;
    form.accountId = userStore.user.account.accountId;
    form.name = userStore.user.name;
  } else {
    form.sendEmail = accountStore.currentAccount.email;
    form.accountId = accountStore.currentAccount.accountId;
    form.name = accountStore.currentAccount.name;
  }
  show.value = true;
  editor.value.focus()
}

function openDraft(draft) {
  Object.assign(form, {...draft, manyType: draft.manyType || 'together'})
  form.ccEmail = draft.ccEmail || []
  form.bccEmail = draft.bccEmail || []
  if (form.manyType === 'divide') {
    clearCcBcc()
  }
  showCc.value = form.ccEmail.length > 0
  showBcc.value = form.bccEmail.length > 0
  defValue.value = ''
  setTimeout(() => defValue.value = form.content)
  show.value = true;
  editor.value.focus()
}

const handleKeyDown = (event) => {
  if (event.key === 'Escape' && show.value) {
    close()
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});

function close() {
  closeOpenSuggest();

  if (!form.content) {
    form.content = editor.value.getContent();
  }

  if (form.draftId) {
    draftStore.setDraft = {...toRaw(form)}
    show.value = false
    resetForm()
    return;
  }

  if (!(form.content || form.subject || form.receiveEmail.length > 0 || form.ccEmail.length > 0 || form.bccEmail.length > 0)) {
    show.value = false
    resetForm()
    return;
  }

  if (backReply.sendType === 'reply' || backReply.sendType === 'forward') {
    let subjectFlag = form.subject === backReply.subject
    let contentFlag = editor.value.getContent() === backReply.content
    let receiveFlag = form.receiveEmail.length === 1 && form.receiveEmail[0] === backReply.receiveEmail[0]
    if (backReply.sendType === 'forward' && form.receiveEmail.length === 0) {
      receiveFlag = true
    }
    if (subjectFlag && contentFlag && receiveFlag) {
      resetForm();
      close()
      return;
    }
  }

  ElMessageBox.confirm(t('saveDraftConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning',
    distinguishCancelAndClose: true
  }).then(async () => {
    const formData = {...toRaw(form)};
    delete formData.draftId
    delete formData.attachments
    formData.createTime = dayjs().utc().format('YYYY-MM-DD HH:mm:ss');
    const draftId = await db.value.draft.add({...formData})
    db.value.att.add({draftId, attachments: toRaw(form.attachments)})
    draftStore.refreshList++
    show.value = false
    await nextTick(() => {
      resetForm()
    })
  }).catch((action) => {
    if (action === 'cancel') {
      show.value = false
      resetForm()
    }
  })
}
</script>

<style>
.write-select .el-select-dropdown__list {
  padding: 4px !important;
}
.write-select .el-select-dropdown__item {
  padding: 0 10px;
}
.write-select .el-select-dropdown {
  min-width: 0 !important;
}
</style>

<style scoped lang="scss">
.send {
  position: fixed;
  inset: 0;
  z-index: 250;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(4px);
}

.compose-modal-enter-active,
.compose-modal-leave-active {
  transition: opacity 0.2s cubic-bezier(0.22, 1, 0.36, 1);

  .write-box {
    transition: transform 0.22s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.2s ease;
  }
}

.compose-modal-enter-from,
.compose-modal-leave-to {
  opacity: 0;

  .write-box {
    opacity: 0;
    transform: translateY(14px) scale(0.985);
  }
}

.write-box {
  background: var(--surface-elevated);
  width: min(1200px, calc(100% - 64px));
  box-shadow: var(--shadow-lg);
  border: 1px solid var(--border-subtle);
  border-radius: 16px;
  display: grid;
  grid-template-rows: auto 1fr;
  overflow: hidden;

  @media (max-width: 1024px) {
    width: 100%;
    height: 100%;
    border-radius: 0;
    border: 0;
  }

  @media (min-width: 1025px) {
    height: min(780px, calc(100vh - 56px));
  }
}

.title {
  height: 52px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--surface-subtle);
  border-bottom: 1px solid var(--border-subtle);

  .title-left {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 0;
  }

  .title-badge {
    width: 28px;
    height: 28px;
    border-radius: 8px;
    background: var(--brand-primary-soft);
    color: var(--brand-primary);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;
  }

  .sender {
    font-size: 13px;
    color: var(--text-muted);
    flex-shrink: 0;
  }

  .sender-chip {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 3px 10px;
    border-radius: 999px;
    background: var(--surface-primary);
    border: 1px solid var(--border-subtle);
    min-width: 0;
  }

  .sender-name {
    font-size: 13px;
    font-weight: 600;
    color: var(--text-primary);
    flex-shrink: 0;
  }

  .send-email {
    font-size: 12.5px;
    color: var(--text-muted);
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
  }

  .close-btn {
    width: 30px;
    height: 30px;
    border-radius: 8px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    cursor: pointer;
    flex-shrink: 0;
    transition: background-color 0.14s ease, color 0.14s ease, transform 0.12s ease;

    &:hover {
      background: var(--surface-muted);
      color: var(--text-primary);
    }

    &:active {
      transform: scale(0.92);
    }
  }
}

.container {
  height: 100%;
  min-height: 0;
  display: grid;
  grid-template-rows: auto auto 1fr auto;
  padding: 0 16px 14px;

  .address-fields {
    display: grid;
  }

  .subject-field {
    border-bottom: 1px solid var(--border-subtle);
    margin-bottom: 6px;
  }

  :deep(.el-input-tag),
  :deep(.el-input__wrapper) {
    box-shadow: none !important;
    border-radius: 0 !important;
    background: transparent !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
  }

  :deep(.el-input-tag) {
    border-bottom: 1px solid var(--border-subtle);
  }

  :deep(.el-input-tag__prefix) {
    padding-left: 0;
    margin-right: 8px;
  }

  .item-title {
    font-size: 13px;
    font-weight: 500;
    color: var(--text-muted);
    min-width: 44px;
    text-align: left;
  }

  .address-actions {
    display: flex;
    align-items: center;
    gap: 6px;
  }

  .address-toggle {
    height: 24px;
    padding: 0 8px;
    border-radius: 6px;
    background: var(--surface-subtle);
    border: 1px solid var(--border-subtle);
    color: var(--text-secondary);
    font-size: 11.5px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.14s ease;

    &:hover {
      border-color: var(--border-strong);
      color: var(--text-primary);
    }
  }

  .contact-icon-btn {
    width: 28px;
    height: 28px;
    border-radius: 7px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-secondary);
    cursor: pointer;

    &:hover {
      background: var(--surface-hover);
      color: var(--brand-primary);
    }
  }

  .editor-shell {
    min-height: 0;
    overflow: hidden;
  }

  .button-item {
    display: grid;
    grid-template-columns: auto 1fr auto;
    align-items: center;
    gap: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--border-subtle);

    .footer-left-tools {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .tool-btn {
      width: 34px;
      height: 34px;
      border-radius: 8px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      background: var(--surface-subtle);
      border: 1px solid var(--border-subtle);
      color: var(--text-secondary);
      cursor: pointer;
      transition: background-color 0.14s ease, color 0.14s ease, border-color 0.14s ease, transform 0.12s ease;

      &:hover {
        border-color: var(--border-strong);
        color: var(--text-primary);
      }

      &:active {
        transform: scale(0.93);
      }

      &.danger:hover {
        border-color: rgba(239, 68, 68, 0.3);
        color: var(--el-color-danger);
      }
    }

    .att-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      max-height: 76px;
      overflow-y: auto;

      .att-item {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        max-width: 240px;
        height: 32px;
        font-size: 12.5px;
        padding: 0 8px;
        background: var(--surface-subtle);
        border: 1px solid var(--border-subtle);
        border-radius: 8px;

        .att-filename {
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          color: var(--text-primary);
        }

        .att-size {
          color: var(--text-muted);
          font-size: 11.5px;
          flex-shrink: 0;
        }

        .att-del-btn {
          width: 20px;
          height: 20px;
          border-radius: 5px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted);
          cursor: pointer;
          flex-shrink: 0;

          &:hover {
            background: var(--surface-muted);
            color: var(--el-color-danger);
          }
        }
      }
    }
  }
}

.email-row {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

:deep(.el-dialog) {
  width: 420px !important;
  @media (max-width: 460px) {
    width: calc(100% - 32px) !important;
  }
}

.contacts-bottom {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 14px;
}

.contacts-table :deep(.el-table__row) {
  cursor: pointer;
}

.write-select {
  position: absolute;
  width: 300px;
  left: 60px;
  z-index: 0;
  opacity: 0;
  pointer-events: none;
}
</style>
