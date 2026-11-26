<template>
  <div class="email-container">
    <div class="header-actions">
      <div class="header-left-wrap">
        <el-checkbox
          v-model="checkAll"
          :indeterminate="isIndeterminate"
          :disabled="!emailList.length || loading"
          @change="handleCheckAllChange"
        />
        <div class="header-left" :style="'padding-left:' + actionLeft">
          <button type="button" class="toolbar-btn" @click="refresh" aria-label="Refresh">
            <Icon icon="lucide:refresh-cw" width="15" height="15" :class="{ spinning: loading }" />
          </button>
          <slot name="first"></slot>
          <template v-if="getSelectedMailsIds().length > 0">
            <span class="selected-pill">{{ getSelectedMailsIds().length }}</span>
            <button
              v-if="hasPerm(deletePerm)"
              type="button"
              class="toolbar-btn danger"
              @click="handleDelete"
              :title="$t('delete')"
            >
              <Icon icon="lucide:trash-2" width="15" height="15" />
            </button>
            <button
              v-if="showUnread"
              v-perm="'email:delete'"
              type="button"
              class="toolbar-btn"
              @click="handleRead"
              :title="$t('markAsRead')"
            >
              <Icon icon="lucide:mail-open" width="15" height="15" />
            </button>
          </template>
        </div>
      </div>

      <div class="header-right">
        <span class="email-count" v-if="total">{{ $t('emailCount', {total: total}) }}</span>
        <button
          v-if="showAccountIcon"
          type="button"
          class="toolbar-btn account-toggle-btn"
          :class="{ active: uiStore.accountShow }"
          @click="changeAccountShow"
          :aria-label="$t('account')"
        >
          <Icon icon="lucide:panel-left" width="16" height="16" />
        </button>
      </div>
    </div>

    <div ref="scroll" class="scroll">
      <UseVirtualList
        ref="scrollbarRef"
        @scroll="onScroll"
        :list="list"
        :options="{ itemHeight: itemHeight, overscan: 15 }"
        class="virtual"
        style="height: 100%"
        v-if="!loading && emailList.length > 0"
        :key="keyCount"
      >
        <template #default="{ data: item }">
          <div
            :class="[
              'email-row',
              props.type,
              { 'right-checked': item.rightChecked, 'is-unread': item.unread === EmailUnreadEnum.UNREAD && showUnread }
            ]"
            :data-checked="item.checked"
            @click="jumpDetails(item)"
            v-if="!item.expand"
            :key="item.emailId"
            @contextmenu="handleContextmenu($event, item)"
          >
            <div class="row-leading" @click.stop>
              <el-checkbox
                :class="props.type === 'all-email' ? 'all-email-checkbox' : 'checkbox'"
                v-model="item.checked"
                :disabled="!item.checked && isSelectMax"
              />
              <button
                v-if="showStar"
                type="button"
                class="star-btn pc-star"
                :class="{ starred: item.isStar }"
                @click.stop="starChange(item)"
                :aria-label="t('star')"
              >
                <Icon :icon="item.isStar ? 'lucide:star-filled' : 'lucide:star'" width="15" height="15" />
              </button>
            </div>

            <div class="sender-avatar" :style="avatarStyle(item.name || item.sendEmail || item.toEmail)">
              {{ avatarInitial(item) }}
            </div>

            <div class="title" :class="accountShow ? 'title-column' : 'title-column'">
              <div class="email-sender">
                <div class="email-status" v-if="showStatus">
                  <el-tooltip v-if="item.statusIcon" effect="dark" :content="item.statusIcon.content">
                    <span class="status-icon-wrap">
                      <Icon :icon="item.statusIcon.icon" :style="`color: ${item.statusIcon.color}`" width="16" height="16"/>
                    </span>
                  </el-tooltip>
                  <div class="del-status" v-if="item.isDel && item.status !== 6">
                    <el-tooltip effect="dark" :content="item.isDelContent">
                      <Icon class="icon" icon="mdi:email-remove" width="16" height="16"/>
                    </el-tooltip>
                  </div>
                </div>

                <span class="name">
                  <span class="name-inner">
                    <span class="unread-dot" v-if="item.unread === EmailUnreadEnum.UNREAD && showUnread" />
                    <slot name="name" :email="item"><span v-html="item.nameHtml"></span></slot>
                  </span>
                  <button
                    v-if="showStar && item.isStar"
                    type="button"
                    class="mobile-star-badge"
                    @click.stop="starChange(item)"
                  >
                    <Icon icon="lucide:star-filled" width="14" height="14" />
                  </button>
                </span>
                <span class="phone-time">{{ item.formatCreateTime }}</span>
              </div>

              <div class="email-body-col">
                <div class="email-text">
                  <span class="email-subject">
                    <span
                      v-if="item.code"
                      class="code-tag"
                      :class="{ 'is-copied': copiedCodeId === item.emailId }"
                      @click.stop="copyCode(item.code, item.emailId)"
                      :title="t('copyCode')"
                    >
                      <Icon :icon="copiedCodeId === item.emailId ? 'lucide:check' : 'lucide:key-round'" width="11" height="11" />
                      <span>{{ item.code }}</span>
                    </span>
                    <span class="subject-text">
                      <slot name="subject" :email="item">
                        <span v-html="item.subjectHtml"></span>
                      </slot>
                    </span>
                  </span>
                  <span class="email-content" v-html="item.listHtml"></span>
                </div>

                <div class="user-info" v-if="showUserInfo">
                  <div class="meta-chip">
                    <Icon icon="lucide:mail" width="12" height="12"/>
                    <span v-html="item.accountEmailHtml"></span>
                  </div>
                </div>
                <div class="user-info" v-else-if="showRecipientChip">
                  <div class="meta-chip meta-chip--recipient">
                    <Icon icon="lucide:at-sign" width="12" height="12"/>
                    <span v-html="item.accountEmailHtml"></span>
                  </div>
                </div>
              </div>
            </div>

            <div class="email-right">
              <span class="email-time">{{ item.formatCreateTime }}</span>
              <div class="row-quick-actions" @click.stop>
                <button
                  v-if="showUnread && props.emailRead && item.unread === EmailUnreadEnum.UNREAD"
                  type="button"
                  class="quick-action-btn"
                  @click="emailRead(item.emailId)"
                  :title="$t('markAsRead')"
                  :aria-label="$t('markAsRead')"
                >
                  <Icon icon="lucide:mail-open" width="14" height="14" />
                </button>
                <button
                  v-if="hasPerm(deletePerm) && props.type !== 'draft'"
                  type="button"
                  class="quick-action-btn danger"
                  @click="rightDelete(item.emailId)"
                  :title="$t('delete')"
                  :aria-label="$t('delete')"
                >
                  <Icon icon="lucide:trash-2" width="14" height="14" />
                </button>
              </div>
            </div>
          </div>

          <skeletonBlock
            v-else-if="item.expand === 'loading'"
            :rows="1"
            :showStar="showStar"
            :accountShow="accountShow"
            :showStatus="showStatus"
            :showUserInfo="showUserInfo"
            :type="type"
          />
          <div class="noLoading" v-else-if="item.expand === 'noMoreData'">
            <span>{{ $t('noMoreData') }}</span>
          </div>
        </template>
      </UseVirtualList>

      <skeletonBlock
        v-if="firstLoad && showFirstLoading"
        :rows="16"
        :showStar="showStar"
        :accountShow="accountShow"
        :showStatus="showStatus"
        :showUserInfo="showUserInfo"
        :type="type"
      />
      <skeletonBlock
        v-if="loading"
        :rows="skeletonRows"
        :showStar="showStar"
        :accountShow="accountShow"
        :showStatus="showStatus"
        :showUserInfo="showUserInfo"
        :type="type"
      />
      <div class="empty" v-if="noLoading && emailList.length === 0 && !loading">
        <el-empty :image-size="isMobile ? 100 : 120" :description="$t('noMessagesFound')"/>
      </div>
    </div>

    <el-dropdown
      ref="dropdownRef"
      @visible-change="visibleChange"
      :virtual-ref="triggerRef"
      :show-arrow="false"
      :popper-options="{
        modifiers: [{ name: 'offset', options: { offset: [0, 0] } }],
      }"
      virtual-triggering
      trigger="contextmenu"
      placement="bottom-start"
    >
      <template #dropdown>
        <el-dropdown-menu>
          <el-dropdown-item v-if="rightClickEmail.code" @click="copyCode(rightClickEmail.code)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="lucide:copy" width="16" height="16" />
                <span>{{t('copyCode')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="['email'].includes(props.type)" @click="emailRead(rightClickEmail.emailId)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="lucide:mail-open" width="16" height="16" />
                <span>{{t('markAsRead')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="['email','star'].includes(props.type)" @click="openReply(rightClickEmail)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="lucide:reply" width="16" height="16" />
                <span>{{t('reply')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="['email','send', 'star'].includes(props.type)" @click="openForward(rightClickEmail)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="lucide:forward" width="16" height="16" />
                <span>{{t('forward')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="['email','send', 'star'].includes(props.type)" @click="starChange(rightClickEmail)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="lucide:star" width="16" height="16"/>
                <span>{{t('star')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="props.type === 'all-email'" @click="handleSearch('account', rightClickEmail.toEmail)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="lucide:search" width="15" height="15" />
                <span>{{t('searchEmail')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="props.type === 'all-email'" @click="handleSearch('name', rightClickEmail.name)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="lucide:search" width="15" height="15" />
                <span>{{t('searchSender')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="hasPerm(deletePerm)" @click="rightDelete(rightClickEmail.emailId)">
            <template #default>
              <div class="right-dropdown-item danger">
                <Icon icon="lucide:trash-2" width="15" height="15" />
                <span>{{t('delete')}}</span>
              </div>
            </template>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import {Icon} from "@iconify/vue";
import skeletonBlock from "@/components/email-scroll/skeleton/index.vue"
import {computed, onActivated, reactive, ref, watch, nextTick, onMounted, onUnmounted } from "vue";
import {useEmailStore} from "@/store/email.js";
import {useUiStore} from "@/store/ui.js";
import {useSettingStore} from "@/store/setting.js";
import {sleep} from "@/utils/time-utils.js"
import {fromNow} from "@/utils/day.js";
import {useI18n} from "vue-i18n";
import {EmailUnreadEnum} from "@/enums/email-enum.js";
import {hasPerm} from "@/perm/perm.js";
import { UseVirtualList } from '@vueuse/components'
import { useScroll } from '@vueuse/core'

const props = defineProps({
  getEmailList: Function,
  emailDelete: Function,
  emailRead: Function,
  starAdd: Function,
  starCancel: Function,
  cancelSuccess: Function,
  starSuccess: Function,
  actionLeft: {
    type: String,
    default: '0'
  },
  timeSort: {
    type: Number,
    default: 0,
  },
  showStatus: {
    type: Boolean,
    default: false
  },
  showAccountIcon: {
    type: Boolean,
    default: true,
  },
  showUserInfo: {
    type: Boolean,
    default: false
  },
  showRecipientChip: {
    type: Boolean,
    default: false
  },
  deletePerm: {
    type: String,
    default: 'email:delete'
  },
  showStar: {
    type: Boolean,
    default: true
  },
  allowStar: {
    type: Boolean,
    default: true
  },
  type: {
    type: String,
    default: 'email'
  },
  showFirstLoading: {
    type: Boolean,
    default: true
  },
  showUnread: {
    type: Boolean,
    default: false
  },
  highlightText: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['jump', 'refresh-before', 'refresh-success', 'delete-draft', 'right-search'])

const {t} = useI18n()
const settingStore = useSettingStore()
const uiStore = useUiStore();
const emailStore = useEmailStore();
const loading = ref(false);
const followLoading = ref(false);
const noLoading = ref(false);
const emailList = reactive([])
const expandList = reactive([])
const total = ref(0);
const checkAll = ref(false);
const isIndeterminate = ref(false);
const scroll = ref(null)
const firstLoad = ref(true)
let scrollTop = 0
const latestEmail = ref(null)
const scrollbarRef = ref(null)
const isMacOS = /Mac/.test(navigator.platform) && navigator.maxTouchPoints <= 1
let latestReqSeq = 0
let paginationInFlight = false
let isMobile = ref(innerWidth < 1367)
let skeletonRows = 0
const timePaddingRight = ref('');
const keyCount = ref(0);
const dropdownRef = ref(null);
const dropdownCloseLock = ref(false);
let dropdownCloseTimer = null;
const dropdownShow = ref(false);
const rightClickEmail = ref({});
const MAX_SELECT_COUNT = 95;
const checkedEmailCount = computed(() => {
  let count = 0;
  for (const item of emailList) {
    if (item.checked) count++;
  }
  return count;
});
const isSelectMax = computed(() => checkedEmailCount.value >= MAX_SELECT_COUNT);
const copiedCodeId = ref(null);
let copiedCodeTimer = null;
let timer = null
const position = ref(
    DOMRect.fromRect({
      x: 0,
      y: 0,
    })
)

const triggerRef = ref({
  getBoundingClientRect() {
    return position.value;
  }
})

const queryParam = reactive({
  size: 30
});

defineExpose({
  refreshList,
  deleteEmail,
  addItem,
  handleList,
  emailList,
  firstLoad,
  latestEmail,
  noLoading,
  total
})

const AVATAR_TONES_LIGHT = [
  { bg: 'rgba(37, 99, 235, 0.13)', fg: '#2563EB' },
  { bg: 'rgba(14, 165, 233, 0.14)', fg: '#0284C7' },
  { bg: 'rgba(16, 185, 129, 0.13)', fg: '#059669' },
  { bg: 'rgba(139, 92, 246, 0.13)', fg: '#7C3AED' },
  { bg: 'rgba(245, 158, 11, 0.15)', fg: '#D97706' },
  { bg: 'rgba(236, 72, 153, 0.13)', fg: '#DB2777' },
];

const AVATAR_TONES_DARK = [
  { bg: 'rgba(59, 130, 246, 0.24)', fg: '#93C5FD' },
  { bg: 'rgba(14, 165, 233, 0.24)', fg: '#7DD3FC' },
  { bg: 'rgba(16, 185, 129, 0.24)', fg: '#6EE7B7' },
  { bg: 'rgba(139, 92, 246, 0.25)', fg: '#D8B4FE' },
  { bg: 'rgba(245, 158, 11, 0.24)', fg: '#FCD34D' },
  { bg: 'rgba(236, 72, 153, 0.24)', fg: '#F9A8D4' },
];

function avatarStyle(seed) {
  const str = String(seed || 'M')
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 31 + str.charCodeAt(i)) >>> 0
  }
  const tones = uiStore.dark ? AVATAR_TONES_DARK : AVATAR_TONES_LIGHT
  const tone = tones[hash % tones.length]
  return { backgroundColor: tone.bg, color: tone.fg }
}

function avatarInitial(item) {
  const source = item.name || item.sendEmail || item.toEmail || item.receiveEmail?.[0] || 'M'
  return String(source).trim()[0]?.toUpperCase() || 'M'
}

const handleResize = () => {
  isMobile.value = innerWidth < 1367
}

const handleWheel = () => {
  if (dropdownShow.value) {
    dropdownRef.value?.handleClose();
  }
}

onActivated(() => {
  requestAnimationFrame(() => {
    const index = scrollTop / itemHeight.value
    scrollbarRef.value?.scrollTo(index);
  })
})

onMounted(() => {
  window.addEventListener('resize', handleResize)
  window.addEventListener('wheel', handleWheel)
  timer = setInterval(() => {
    emailList.forEach(email => {
      email.formatCreateTime = fromNow(email.createTime);
    })
  }, 1000 * 60);
})

onUnmounted(() => {
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('wheel', handleWheel)
  clearInterval(timer)
  clearTimeout(copiedCodeTimer)
  clearTimeout(dropdownCloseTimer)
})

getEmailList()

function onScroll(e) {
  scrollTop = e.target.scrollTop;
}

const { arrivedState } = useScroll(scrollbarRef, {
  offset: { bottom: isMobile.value ? 2200 : 1500 }
})

const list = computed(() => {
  return [...emailList, ...expandList]
})

const itemHeight = computed(() => {
  if (props.type === 'all-email' || props.type === 'noone') {
    return isMobile.value ? 134 : 82;
  } else {
    return isMobile.value ? 92 : 64;
  }
})

watch(emailList, () => {
  updateHasScrollbar();
})

watch(scrollbarRef, () => {
  updateHasScrollbar();
})

watch(itemHeight, () => {
  keyCount.value ++
})

watch(followLoading, (isFollowLoading) => {
  if (isFollowLoading) {
    expandList.push({
      emailId: 0,
      expand: 'loading'
    })
  } else {
    const index = expandList.findIndex(item => item.expand === 'loading')
    if (index > -1) expandList.splice(index, 1);
  }
});

watch(noLoading, (isNoLoading) => {
  if (isNoLoading) {
    expandList.push({
      emailId: 0,
      expand: 'noMoreData'
    })
  } else {
    const index = expandList.findIndex(item => item.expand === 'noMoreData')
    if (index > -1) expandList.splice(index, 1);
  }
})

watch(() => arrivedState.bottom, (isBottom) => {
  if (isBottom && !loading.value) {
    loadData();
  }
});

watch(
    [checkedEmailCount, () => emailList.length],
    () => {
      updateCheckStatus();
    }
);

watch(() => emailStore.deleteIds, () => {
  if (emailStore.deleteIds) {
    deleteEmail(emailStore.deleteIds)
  }
})

watch(() => emailStore.cancelStarEmailId, () => {
  emailList.forEach(email => {
    if (email.emailId === emailStore.cancelStarEmailId) {
      email.isStar = 0
    }
  })
})

watch(() => emailStore.addStarEmailId, () => {
  emailList.forEach(email => {
    if (email.emailId === emailStore.addStarEmailId) {
      email.isStar = 1
    }
  })
})

async function openReply(email) {
  let fullEmail = emailStore.detailMap[email.emailId]
  if (!fullEmail) {
    fullEmail = await emailStore.loadDetail(email.emailId, props.type === 'all-email').catch(() => null)
  }
  if (!fullEmail) return
  uiStore.writerRef.openReply(fullEmail)
}

async function openForward(email) {
  let fullEmail = emailStore.detailMap[email.emailId]
  if (!fullEmail) {
    fullEmail = await emailStore.loadDetail(email.emailId, props.type === 'all-email').catch(() => null)
  }
  if (!fullEmail) return
  uiStore.writerRef.openForward(fullEmail)
}

function visibleChange(e) {
  dropdownShow.value = e;
  dropdownCloseLock.value = true;
  clearTimeout(dropdownCloseTimer);
  dropdownCloseTimer = setTimeout(() => {
    dropdownCloseLock.value = false;
  },1500)

  if (!e && rightClickEmail.value.rightChecked) {
    rightClickEmail.value.rightChecked = false
  }
}

const handleContextmenu = (event, email) => {
  if (props.type === 'draft') {
    return
  }

  if (rightClickEmail.value.rightChecked) {
    rightClickEmail.value.rightChecked = false
  }

  const { clientX, clientY } = event
  position.value = DOMRect.fromRect({
    x: clientX,
    y: clientY,
  })
  event.preventDefault();
  dropdownRef.value?.handleOpen();

  rightClickEmail.value = email;
  rightClickEmail.value.rightChecked = true
}

function updateHasScrollbar() {
  nextTick(() => {
    if (isMacOS) {
      timePaddingRight.value = '16px'
      return
    }
    const doc = scrollbarRef.value?.wrapRef || document.querySelector('.virtual');
    if (doc) {
      if (doc.scrollHeight > doc.clientHeight) {
        timePaddingRight.value = '10px';
      } else {
        timePaddingRight.value = '16px'
      }
    }
  })
}

function getSkeletonRows() {
  if (emailList.length > 20) return skeletonRows = 20
  if (emailList.length === 0) return skeletonRows = 1
  skeletonRows = emailList.length
}

const accountShow = computed(() => {
  return uiStore.accountShow && settingStore.settings.manyEmail === 0
})

function starChange(email) {
  if (!email.isStar) {
    if (!props.allowStar) return;
    email.isStar = 1;
    props.starAdd(email.emailId).then(() => {
      email.isStar = 1;
      props.starSuccess(email)
    }).catch(e => {
      console.error(e)
      email.isStar = 0
    })
  } else {
    email.isStar = 0;
    props.starCancel(email.emailId).then(() => {
      email.isStar = 0;
      props.cancelSuccess?.(email)
    }).catch(e => {
      console.error(e)
      email.isStar = 1;
    })
  }
}

function changeAccountShow() {
  uiStore.accountShow = !uiStore.accountShow;
}

const handleRead = () => {
  const emailIds = getSelectedMailsIds();
  props.emailRead(emailIds);
  localRead(emailIds);
}

function emailRead(emailId) {
  props.emailRead([emailId])
  localRead([emailId]);
}

function localRead(emailIds) {
  emailIds.forEach(emailId => {
    const index = emailList.findIndex(email => email.emailId === emailId);
    if (index > -1) {
      emailList[index].unread = EmailUnreadEnum.READ;
      emailList[index].checked = false;
    }
  })
}

function rightDelete(emailId) {
  if (props.type === 'all-email' || props.type === 'noone') {
    ElMessageBox.confirm(t('delOneEmailConfirm'), {
      confirmButtonText: t('confirm'),
      cancelButtonText: t('cancel'),
      type: 'warning'
    }).then(() => {
      props.emailDelete([emailId]).then(() => {
        ElMessage({
          message: t('delSuccessMsg'),
          type: 'success',
          plain: true
        })
        emailStore.deleteIds = [emailId];
      })
    })
    return;
  }
  props.emailDelete([emailId]).then(() => {
    ElMessage({
      message: t('delSuccessMsg'),
      type: 'success',
      plain: true
    })
    emailStore.deleteIds = [emailId];
  })
}

function handleSearch(type, value) {
  emit('right-search', type, value);
}

async function copyCode(code, emailId = null) {
  try {
    await navigator.clipboard.writeText(code);
    if (emailId !== null) {
      copiedCodeId.value = emailId;
      clearTimeout(copiedCodeTimer);
      copiedCodeTimer = setTimeout(() => {
        if (copiedCodeId.value === emailId) copiedCodeId.value = null;
      }, 1500);
    }
    ElMessage({
      message: t('copySuccessMsg'),
      type: 'success',
      plain: true
    })
  } catch (err) {
    console.error(`${t('copyFailMsg')}:`, err);
    ElMessage({
      message: t('copyFailMsg'),
      type: 'error',
      plain: true
    })
  }
}

function handleDelete() {
  ElMessageBox.confirm(t('delEmailsConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    if (props.type === 'draft') {
      const draftIds = getSelectedDraftsIds();
      emit('delete-draft', draftIds);
      return;
    }
    const emailIds = getSelectedMailsIds();
    props.emailDelete(emailIds).then(() => {
      ElMessage({
        message: t('delSuccessMsg'),
        type: 'success',
        plain: true
      })
      emailStore.deleteIds = emailIds;
    })
  })
}

function deleteEmail(emailIds) {
  emailIds.forEach(emailId => {
    emailList.forEach((item, index) => {
      if (emailId === item.emailId) {
        emailList.splice(index, 1);
      }
    })
  })
  if (emailList.length < queryParam.size && !noLoading.value) {
    getEmailList()
  }
}

function addItem(email) {
  const existIndex = emailList.findIndex(item => item.emailId === email.emailId)
  if (existIndex > -1) {
    return false;
  }

  email.formatCreateTime = fromNow(email.createTime);

  if (props.timeSort) {
    if (noLoading.value) {
      handleList([email]);
      emailList.push(email);
    }

    if (email.emailId > latestEmail.value?.emailId) {
      latestEmail.value = email
    }

    total.value++
    return true;
  }

  const index = emailList.findIndex(item => item.emailId < email.emailId)

  if (index !== -1) {
    handleList([email]);
    emailList.splice(index, 0, email);
  } else {
    if (noLoading.value) {
      handleList([email]);
      emailList.push(email);
    }
  }

  if (email.emailId > latestEmail.value?.emailId) {
    latestEmail.value = email
  }

  total.value++
  return true;
}

function handleCheckAllChange(val) {
  if (val) {
    let count = 0;
    emailList.forEach(item => {
      if (count < MAX_SELECT_COUNT) {
        item.checked = true;
        count++;
      } else {
        item.checked = false;
      }
    });
  } else {
    emailList.forEach(item => item.checked = false);
  }
  isIndeterminate.value = false;
}

function getSelectedMailsIds() {
  return emailList.filter(item => item.checked).map(item => item.emailId);
}

function getSelectedDraftsIds() {
  return emailList.filter(item => item.checked).map(item => item.draftId);
}

function updateCheckStatus() {
  const checkedCount = checkedEmailCount.value;
  const atMax = checkedCount >= MAX_SELECT_COUNT;
  checkAll.value = emailList.length > 0 && (checkedCount === emailList.length || atMax);
  isIndeterminate.value = checkedCount > 0 && !checkAll.value;
}

function toggleRowChecked(email) {
  if (!email.checked && isSelectMax.value) {
    return
  }
  email.checked = !email.checked
}

function jumpDetails(email) {
  if (dropdownShow.value) {
    dropdownRef.value.handleClose();
    return;
  }

  if (!dropdownCloseLock.value) {
    const sel = window.getSelection();
    if (sel.toString().trim()) {
      return
    }
  }

  if (checkedEmailCount.value > 0) {
    toggleRowChecked(email)
    return
  }

  emit('jump', email)
}

function getEmailList(refresh = false) {
  let emailId = emailList.length > 0 ? emailList.at(-1).emailId : 0;

  if (!refresh) {
    if (loading.value || noLoading.value || paginationInFlight) {
      return Promise.resolve(false)
    }
    paginationInFlight = true
  } else {
    getSkeletonRows()
    emailId = 0
    loading.value = true
    scrollTop = 0
    paginationInFlight = false
  }
  const reqSeq = ++latestReqSeq

  if (emailList.length === 0) {
    loading.value = true
  } else {
    followLoading.value = !refresh;
  }
  let start = Date.now();

  return props.getEmailList(emailId, queryParam.size).then(async data => {
    if (reqSeq !== latestReqSeq) return false;
    let end = Date.now();
    let duration = end - start;
    if (duration < 300 && !emailId) {
      await sleep(300 - duration)
    }
    if (reqSeq !== latestReqSeq) return false;
    firstLoad.value = false

    let list = data.list.map(item => ({
      ...item,
      checked: false
    }));

    if (refresh) {
      emailList.length = 0
    }

    latestEmail.value = data.latestEmail
    handleList(list);
    emailList.push(...list);
    if (refresh) scrollbarRef.value?.setScrollTop?.(0);

    noLoading.value = data.list.length < queryParam.size;
    followLoading.value = data.list.length >= queryParam.size;

    total.value = data.total;
    return true;
  }).finally(() => {
    if (reqSeq === latestReqSeq) {
      loading.value = false
      paginationInFlight = false
    }
  })
}

function handleList(list) {
  list.forEach(email => {
    email.formatCreateTime = fromNow(email.createTime);
    email.test = t('received')
    const statusIconMap = {
      0: { icon: 'ic:round-mark-email-read', color: '#10B981', content: t('received') },
      1: { icon: 'bi:send-arrow-up-fill',  color: '#10B981', content: t('sent') },
      2: { icon: 'bi:send-check-fill',     color: '#10B981', content: t('delivered') },
      3: { icon: 'bi:send-x-fill',         color: '#EF4444', content: t('bounced') },
      8: { icon: 'bi:send-x-fill',         color: '#EF4444', content: t('bounced') },
      4: { icon: 'bi:send-exclamation-fill', color: '#F59E0B', content: t('complained') },
      5: { icon: 'bi:send-arrow-up-fill',  color: '#F59E0B', content: t('delayed') },
      6: { icon: 'mdi:email-lock', color: '#94A3B8', content: t('saving') },
      7: { icon: 'ic:round-mark-email-read', color: '#F59E0B', content: t('noRecipient') },
    };

    if (email.isDel) {
      email.isDelContent = t('selectDeleted');
    }
    email.statusIcon = statusIconMap[email.status];
    applyHighlight(email);
  })
}

function applyHighlight(email) {
  email.nameHtml = renderHighlight(email.name);
  email.subjectHtml = renderHighlight(email.subject);
  email.listHtml = renderHighlight(email.listText || email.text);
  email.userEmailHtml = renderHighlight(email.userEmail);
  email.accountEmailHtml = renderHighlight(email.type === 0 ? email.toEmail : email.sendEmail);
}

watch(() => props.highlightText, () => {
  emailList.forEach(applyHighlight);
})

function refresh() {
  emit('refresh-before')
  scrollbarRef.value?.setScrollTop?.(0)
  checkAll.value = false;
  isIndeterminate.value = false;
  getEmailList(true).then(ok => {
    if (ok) emit('refresh-success')
  }).catch(() => {})
}

function refreshList() {
  checkAll.value = false;
  isIndeterminate.value = false;
  getEmailList(true);
}

function loadData() {
  getEmailList()
}

function escapeHtml(value) {
  return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
}

function renderHighlight(value) {
  const text = value == null ? '' : String(value)
  if (!text) return '\u200B'
  const keyword = props.highlightText?.trim()
  if (!keyword) return escapeHtml(text)
  const pattern = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  let html = ''
  let lastIndex = 0
  for (const match of text.matchAll(pattern)) {
    const index = match.index ?? 0
    html += escapeHtml(text.slice(lastIndex, index))
    html += `<mark class="search-hit">${escapeHtml(match[0])}</mark>`
    lastIndex = index + match[0].length
  }
  html += escapeHtml(text.slice(lastIndex))
  return html
}
</script>

<style lang="scss" scoped>
:deep(.search-hit) {
  background-color: var(--search-hit-background);
  color: inherit;
  padding: 0 2px;
  border-radius: 3px;
}

.email-container {
  display: grid;
  grid-template-rows: auto 1fr;
  padding: 0;
  font-size: 13.5px;
  color: var(--text-primary);
  overflow: hidden;
  height: 100%;
  background: var(--surface-primary);
  backdrop-filter: blur(var(--ws-blur, 20px)) saturate(165%);
  -webkit-backdrop-filter: blur(var(--ws-blur, 20px)) saturate(165%);
}

.header-actions {
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 14px 0 16px;
  border-bottom: 1px solid var(--border-subtle);
  background: transparent;
}

.header-left-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 6px;
}

.toolbar-btn {
  width: 30px;
  height: 30px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  cursor: pointer;
  transition: background-color 0.14s ease, color 0.14s ease, transform 0.12s ease;

  &:hover {
    background: var(--surface-hover);
    color: var(--text-primary);
  }

  &:active {
    transform: scale(0.92);
  }

  &.danger:hover {
    background: rgba(239, 68, 68, 0.10);
    color: var(--el-color-danger);
  }

  &.active {
    background: var(--brand-primary-soft);
    color: var(--brand-primary);
  }
}

.spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.selected-pill {
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
  font-size: 12px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  display: inline-flex;
  align-items: center;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;

  .email-count {
    font-size: 12px;
    font-weight: 500;
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
    white-space: nowrap;
  }
}

.scroll {
  height: 100%;
  overflow: hidden;

  .virtual {
    will-change: scroll-position;
  }

  .empty {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    width: 100%;
  }

  .noLoading {
    height: 56px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 12px;
    color: var(--text-muted);
  }
}

:deep(.email-row) {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 0 0 16px;
  border-bottom: 1px solid var(--border-subtle);
  cursor: pointer;
  position: relative;
  transition: background-color 0.14s ease;
  height: 64px;

  @media (max-width: 1366px) {
    height: 92px;
    padding: 12px 14px;
    align-items: flex-start;
  }

  @media (pointer: coarse) {
    user-select: none;
  }

  &.all-email,
  &.noone {
    height: 82px;
    @media (max-width: 1366px) {
      height: 134px;
    }
  }

  .row-leading {
    display: flex;
    align-items: center;
    gap: 10px;
    flex-shrink: 0;

    @media (max-width: 1366px) {
      padding-top: 4px;
    }
  }

  .star-btn {
    width: 26px;
    height: 26px;
    border-radius: 6px;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: var(--text-muted);
    cursor: pointer;
    transition: background-color 0.14s ease, color 0.14s ease, transform 0.14s cubic-bezier(0.34, 1.56, 0.64, 1);

    &:hover {
      background: var(--surface-muted);
      color: #F59E0B;
    }

    &:active {
      transform: scale(0.86);
    }

    &.starred {
      color: #F59E0B;
    }

    @media (max-width: 1366px) {
      display: none;
    }
  }

  .sender-avatar {
    width: 32px;
    height: 32px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 13px;
    font-weight: 700;
    flex-shrink: 0;

    @media (max-width: 1366px) {
      margin-top: 2px;
    }
  }

  .title {
    flex: 1;
    min-width: 0;
    display: grid;
    grid-template-columns: 210px 1fr;
    align-items: center;
    gap: 14px;

    @media (max-width: 1366px) {
      grid-template-columns: 1fr;
      gap: 4px;
    }

    .email-sender {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      color: var(--text-secondary);

      .email-status {
        display: flex;
        align-items: center;
        gap: 4px;
        flex-shrink: 0;

        .status-icon-wrap {
          display: inline-flex;
          align-items: center;
        }
      }

      .name {
        flex: 1;
        min-width: 0;
        display: flex;
        align-items: center;
        gap: 6px;

        .name-inner {
          display: flex;
          align-items: center;
          gap: 7px;
          min-width: 0;
          overflow: hidden;
          white-space: nowrap;
          text-overflow: ellipsis;
          font-size: 13.5px;
        }

        .mobile-star-badge {
          color: #F59E0B;
          display: inline-flex;
          align-items: center;
          flex-shrink: 0;
          cursor: pointer;

          @media (min-width: 1367px) {
            display: none;
          }
        }
      }

      .phone-time {
        font-weight: 400;
        font-size: 11.5px;
        font-variant-numeric: tabular-nums;
        color: var(--text-muted);
        flex-shrink: 0;

        @media (min-width: 1367px) {
          display: none;
        }
      }
    }

    .email-body-col {
      min-width: 0;
      display: flex;
      flex-direction: column;
      gap: 4px;
    }

    .email-text {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;

      @media (max-width: 1366px) {
        flex-direction: column;
        align-items: flex-start;
        gap: 2px;
      }

      .email-subject {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        min-width: 0;
        max-width: 55%;
        flex-shrink: 0;
        color: var(--text-primary);

        @media (max-width: 1366px) {
          max-width: 100%;
          width: 100%;
        }
      }

      .code-tag {
        flex: 0 0 auto;
        height: 22px;
        padding: 0 8px;
        border-radius: 6px;
        display: inline-flex;
        align-items: center;
        gap: 4px;
        background: var(--brand-primary-soft);
        color: var(--brand-primary);
        font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
        font-size: 12px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 0.16s ease, color 0.16s ease, transform 0.12s ease;

        &:hover {
          background: rgba(37, 99, 235, 0.18);
        }

        &:active {
          transform: scale(0.94);
        }

        &.is-copied {
          background: rgba(16, 185, 129, 0.14);
          color: #059669;

          :global(.dark) & {
            background: rgba(16, 185, 129, 0.2);
            color: #34d399;
          }
        }
      }

      .subject-text {
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        min-width: 0;
        font-size: 13.5px;
      }

      .email-content {
        flex: 1;
        min-width: 0;
        overflow: hidden;
        white-space: nowrap;
        text-overflow: ellipsis;
        font-size: 13px;
        color: var(--text-muted);

        @media (max-width: 1366px) {
          width: 100%;
        }
      }
    }

    .user-info {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      min-width: 0;

      .meta-chip {
        display: inline-flex;
        align-items: center;
        gap: 5px;
        max-width: 240px;
        padding: 1px 7px;
        border-radius: 5px;
        background: var(--surface-subtle);
        border: 1px solid var(--border-subtle);
        font-size: 11.5px;
        color: var(--text-secondary);
        white-space: nowrap;
        overflow: hidden;

        span {
          overflow: hidden;
          text-overflow: ellipsis;
        }

        &--recipient {
          max-width: 280px;
          background: rgba(245, 158, 11, 0.12);
          border-color: rgba(245, 158, 11, 0.28);
          color: #b45309;

          :global(.dark) & {
            color: #fbbf24;
            background: rgba(245, 158, 11, 0.16);
            border-color: rgba(245, 158, 11, 0.34);
          }
        }
      }
    }
  }

  .email-right {
    position: relative;
    display: inline-flex;
    align-items: center;
    justify-content: flex-end;
    min-width: 72px;
    padding-right: v-bind(timePaddingRight);
    text-align: right;
    font-size: 12px;
    font-variant-numeric: tabular-nums;
    color: var(--text-muted);
    white-space: nowrap;
    flex-shrink: 0;

    @media (max-width: 1366px) {
      display: none;
    }
  }

  .row-quick-actions {
    display: none;
  }

  @media (hover: hover) and (min-width: 1367px) {
    .email-time {
      transition: opacity 0.14s ease;
    }

    .row-quick-actions {
      position: absolute;
      right: v-bind(timePaddingRight);
      top: 50%;
      transform: translate(4px, -50%);
      display: inline-flex;
      align-items: center;
      gap: 4px;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.14s ease, transform 0.16s cubic-bezier(0.22, 1, 0.36, 1);
    }

    .quick-action-btn {
      width: 28px;
      height: 28px;
      border-radius: 7px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: var(--text-secondary);
      background: var(--surface-primary);
      border: 1px solid var(--border-subtle);
      box-shadow: var(--shadow-xs);
      cursor: pointer;
      transition: background-color 0.14s ease, color 0.14s ease, border-color 0.14s ease, transform 0.12s ease;

      &:hover {
        border-color: var(--border-strong);
        color: var(--text-primary);
        background: var(--surface-elevated);
      }

      &:active {
        transform: scale(0.92);
      }

      &.danger:hover {
        border-color: rgba(239, 68, 68, 0.32);
        background: rgba(239, 68, 68, 0.08);
        color: var(--el-color-danger);
      }
    }

    &:hover .email-right:has(.quick-action-btn) {
      .email-time {
        opacity: 0;
      }

      .row-quick-actions {
        opacity: 1;
        pointer-events: auto;
        transform: translate(0, -50%);
      }
    }
  }

  &::before {
    content: "";
    position: absolute;
    left: 0;
    top: 8px;
    bottom: 8px;
    width: 2.5px;
    border-radius: 0 2px 2px 0;
    background: var(--brand-primary);
    opacity: 0;
    transition: opacity 0.15s ease;
    pointer-events: none;
  }

  &.is-unread {
    .email-sender {
      color: var(--text-primary);
      font-weight: 600;
    }
    .email-subject {
      font-weight: 600;
    }
    .email-right {
      color: var(--brand-primary);
      font-weight: 600;
    }
  }

  &:hover {
    background-color: var(--email-hover-background);

    &::before {
      opacity: 0.45;
    }
  }

  &.right-checked,
  &.right-checked:hover {
    background-color: var(--email-right-click-background);
  }

  &[data-checked="true"],
  &[data-checked="true"]:hover {
    background-color: var(--surface-active);
    box-shadow: inset 3px 0 0 var(--brand-primary);

    &::before {
      opacity: 0;
    }
  }
}

.email-time {
  display: inline-block;
}

:deep(.el-scrollbar__view) {
  height: 100%;
}

.del-status {
  color: var(--text-muted);
  display: inline-flex;
  align-items: center;
}

.right-dropdown-item {
  display: flex;
  align-items: center;
  gap: 9px;

  &.danger {
    color: var(--el-color-danger);
  }
}

.unread-dot {
  height: 7px;
  width: 7px;
  background: var(--brand-primary);
  border-radius: 50%;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px var(--brand-primary-soft);
}
</style>
