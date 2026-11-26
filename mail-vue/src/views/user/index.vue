<template>
  <div class="user-box">
    <div class="header-actions">
      <div class="toolbar-left">
        <button type="button" class="action-pill primary" @click="openAdd" :title="$t('addUser')">
          <Icon icon="lucide:plus" width="15" height="15" />
          <span class="btn-label">{{ $t('add') }}</span>
        </button>

        <div class="search-group">
          <el-input
            v-model="params.email"
            class="search-input"
            size="small"
            :placeholder="$t('searchByEmail')"
            @keyup.enter="search"
          />
          <el-select
            v-model="params.status"
            size="small"
            placeholder="Select"
            class="status-select"
            :style="`width: ${locale === 'en' ? 96 : 84}px`"
          >
            <el-option :key="-1" :label="$t('all')" :value="-1"/>
            <el-option :key="0" :label="$t('active')" :value="0"/>
            <el-option :key="1" :label="$t('banned')" :value="1"/>
            <el-option :key="-2" :label="$t('deleted')" :value="-2"/>
          </el-select>
          <button type="button" class="action-pill" @click="search" :title="$t('search')">
            <Icon icon="lucide:search" width="15" height="15" />
          </button>
        </div>
      </div>

      <div class="toolbar-right">
        <button type="button" class="action-pill" @click="changeTimeSort" :title="$t('order')">
          <Icon :icon="params.timeSort === 1 ? 'material-symbols-light:timer-arrow-down-outline' : 'material-symbols-light:timer-arrow-up-outline'" width="20" height="20"/>
        </button>
        <button type="button" class="action-pill" @click="refresh" aria-label="Refresh">
          <Icon icon="lucide:refresh-cw" width="14" height="14" :class="{ spinning: tableLoading }" />
        </button>
        <button type="button" class="action-pill danger" @click="delUser" :title="$t('delete')">
          <Icon icon="lucide:trash-2" width="15" height="15" />
        </button>
      </div>
    </div>

    <el-scrollbar ref="scrollbarRef" class="scrollbar">
      <div class="page-inner">
        <div class="loading" :class="tableLoading ? 'loading-show' : 'loading-hide'"
             :style="first ? 'background: transparent' : ''">
          <loading/>
        </div>

        <div class="table-card">
          <el-table
            @filter-change="tableFilter"
            :empty-text="first ? '' : null"
            :data="users"
            :preserve-expanded-content="preserveExpanded"
            style="width: 100%;"
            ref="tableRef"
            @cell-contextmenu="handleContextmenu"
            :cell-class-name="cellClassName"
          >
            <el-table-column :width="expandWidth" type="selection" :selectable="row => row.type !== 0" />
            <el-table-column show-overflow-tooltip :tooltip-formatter="tableRowFormatter" :label="$t('tabEmailAddress')"
                             :min-width="emailWidth">
              <template #default="props">
                <div class="email-cell">
                  <div class="email-row">{{ props.row.email }}</div>
                  <template v-if="oauthPlatform(props.row)">
                    <el-avatar v-if="oauthPlatform(props.row).iconType === 'image'"
                               :src="oauthPlatform(props.row).icon"
                               :size="16"
                               class="oauth-platform-icon"/>
                    <Icon v-else
                          :icon="oauthPlatform(props.row).icon"
                          width="16"
                          height="16"
                          class="oauth-platform-icon"/>
                  </template>
                </div>
              </template>
            </el-table-column>
            <el-table-column :formatter="formatterReceive" label-class-name="receive" column-key="receive"
                             :filtered-value="filteredValue" :filters="filters" :width="receiveWidth"
                             :label="$t('tabReceived')"
                             prop="receiveEmailCount"/>
            <el-table-column :formatter="formatterSend" label-class-name="send" column-key="send"
                             :filtered-value="filteredValue" :filters="filters" v-if="sendNumShow" :label="$t('tabSent')"
                             prop="sendEmailCount"/>
            <el-table-column :formatter="formatterAccount" label-class-name="account" column-key="account"
                             :filtered-value="filteredValue" :filters="filters" v-if="accountNumShow"
                             :label="$t('tabMailboxes')"
                             prop="accountCount"/>
            <el-table-column v-if="createTimeShow" :label="$t('tabRegisteredAt')" min-width="150" prop="createTime">
              <template #default="props">
                {{ tzDayjs(props.row.createTime).format('YYYY-MM-DD HH:mm') }}
              </template>
            </el-table-column>
            <el-table-column v-if="statusShow" min-width="80px" :label="$t('tabStatus')" prop="status">
              <template #default="props">
                <el-tag disable-transitions v-if="props.row.isDel === 1" type="info">{{ $t('deleted') }}</el-tag>
                <el-tag disable-transitions v-else-if="props.row.status === 0" type="success">{{ $t('active') }}</el-tag>
                <el-tag disable-transitions v-else-if="props.row.status === 1" type="danger">{{ $t('banned') }}</el-tag>
              </template>
            </el-table-column>
            <el-table-column v-if="typeShow" :label="$t('tabRole')" min-width="130" prop="type">
              <template #default="props">
                <div class="type">
                  <el-tag size="small" effect="plain">{{ toRoleName(props.row.type) }}</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column :label="$t('tabSetting')" :width="settingWidth">
              <template #default="props">
                <el-button size="small" v-if="(props.row.type === 0 && userStore.user.type !== 0)" disabled>{{ $t('action') }}</el-button>
                <el-dropdown v-else trigger="click">
                  <el-button size="small">{{ $t('action') }}</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="openSetPwd(props.row)">{{ $t('chgPwd') }}</el-dropdown-item>
                      <el-dropdown-item @click="openSetType(props.row)">{{ $t('perm') }}</el-dropdown-item>
                      <template v-if="props.row.type !== 0">
                        <el-dropdown-item v-if="props.row.isDel !== 1" @click="setStatus(props.row)">
                          {{ setStatusName(props.row) }}
                        </el-dropdown-item>
                        <el-dropdown-item v-else @click="restore(props.row)">{{ $t('restore') }}</el-dropdown-item>
                      </template>
                      <el-dropdown-item @click="openAccountList(props.row.userId)">{{ $t('account') }}</el-dropdown-item>
                      <el-dropdown-item @click="openDetails(props.row)">{{ $t('details') }}</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <div class="pagination" v-if="total > 10">
          <el-pagination
            :size="pageSize"
            :current-page="params.num"
            :page-size="params.size"
            :pager-count="pagerCount"
            :page-sizes="[10, 15, 20, 25, 30, 50]"
            background
            :layout="layout"
            :total="total"
            @size-change="sizeChange"
            @current-change="numChange"
          />
          <el-pagination
            v-if="phonePageShow"
            :size="pageSize"
            :current-page="params.num"
            :page-size="params.size"
            :pager-count="pagerCount"
            :page-sizes="[10, 15, 20, 25, 30, 50]"
            background
            layout="sizes, total"
            :total="total"
            @size-change="sizeChange"
            @current-change="numChange"
          />
        </div>
      </div>
    </el-scrollbar>

    <el-dialog class="dialog" v-model="setPwdShow" :title="$t('changePassword')" @closed="resetUserForm">
      <div class="dialog-box">
        <el-input v-model="userForm.password" size="large" type="password" :placeholder="$t('newPassword')" autocomplete="off" @keyup.enter="updatePwd" />
        <el-button class="btn" size="large" type="primary" :loading="settingLoading" @click="updatePwd">
          {{ $t('save') }}
        </el-button>
      </div>
    </el-dialog>

    <el-dialog class="dialog" v-model="setTypeShow" :title="$t('changePerm')" @closed="resetUserForm">
      <div class="dialog-box">
        <el-input disabled size="large" :model-value="$t('admin')" v-if="userForm.type === 0"/>
        <el-select v-else size="large" v-model="userForm.type" placeholder="Select">
          <el-option v-for="item in roleList" :label="item.name" :value="item.roleId" :key="item.roleId"/>
        </el-select>
        <el-button :disabled="userForm.type === 0" size="large" class="btn" :loading="settingLoading" type="primary" @click="setType">
          {{ $t('save') }}
        </el-button>
      </div>
    </el-dialog>

    <el-dialog v-model="showAdd" :title="$t('addUser')" @closed="resetAddForm">
      <div class="container">
        <el-input v-model="addForm.email" size="large" type="text" :placeholder="$t('emailAccount')" autocomplete="off" @keyup.enter="submit">
          <template #append>
            <div class="domain-trigger" @click.stop="openSelect">
              <div inert>
                <el-select
                  ref="mySelect"
                  v-model="addForm.suffix"
                  :placeholder="$t('select')"
                  class="select"
                >
                  <el-option v-for="item in domainList" :key="item" :label="item" :value="item" />
                </el-select>
              </div>
              <div class="domain-label">
                <span>{{ addForm.suffix }}</span>
                <Icon class="setting-icon" icon="lucide:chevron-down" width="14" height="14"/>
              </div>
            </div>
          </template>
        </el-input>
        <el-input type="password" size="large" v-model="addForm.password" :placeholder="$t('password')" @keyup.enter="submit"/>
        <el-select size="large" v-model="addForm.type" :placeholder="$t('perm')">
          <el-option v-for="item in roleList" :label="item.name" :value="item.roleId" :key="item.roleId"/>
        </el-select>
        <el-button class="btn" size="large" type="primary" @click="submit" :loading="addLoading">
          {{ $t('add') }}
        </el-button>
      </div>
    </el-dialog>

    <el-dialog class="account-dialog" v-model="accountShow" :title="t('userAccount')" @closed="resetAccountList">
      <el-table :data="accountList" style="height: 460px" v-loading="accountLoading" element-loading-background="transparent" :empty-text="accountLoading ? '' : null">
        <el-table-column property="email" :label="t('emailAccount')">
          <template #default="props">
            <div class="email-row">{{ props.row.email }}</div>
          </template>
        </el-table-column>
        <el-table-column property="address" :label="t('tabStatus')" :width="locale === 'en' ? 85 : 75">
          <template #default="props">
            <el-tag type="success" disable-transitions v-if="props.row.isDel === 0">{{$t('active')}}</el-tag>
            <el-tag type="info" disable-transitions v-if="props.row.isDel === 1">{{$t('deleted')}}</el-tag>
          </template>
        </el-table-column>
        <el-table-column :label="t('action')" :width="locale === 'en' ? 85 : 75">
          <template #default="props">
            <el-dropdown trigger="click">
              <el-button size="small">{{t('action')}}</el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="deleteAccount(props.row)">{{ $t('delete') }}</el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
      </el-table>
      <div class="account-pagination">
        <el-pagination
          :disabled="accountLoading"
          background
          layout="prev, pager, next"
          :pager-count="3"
          :total="accountParams.total"
          @current-change="accountCurChange"
        />
      </div>
    </el-dialog>

    <el-dialog class="account-dialog" v-model="detailsShow" :title="t('userDetails')">
      <div class="details">
        <div v-if="userDetails.platform || userDetails.username" class="oauth-details">
          <el-avatar :src="userDetails.avatar" :size="32" class="oauth-avatar"/>
          <span>{{ $t('username') }}：<b>{{ userDetails.username }}</b></span>
          <span v-if="userDetails.trustLevel != null">
            {{ $t('trustLevel') }}：<el-tag type="success" size="small">{{ userDetails.trustLevel }}</el-tag>
          </span>
        </div>
        <div class="detail-grid">
          <div class="detail-item" v-if="!sendNumShow">
            <span class="details-item-title">{{ $t('tabSent') }}</span>
            <span>{{ userDetails.sendEmailCount }}</span>
          </div>
          <div class="detail-item" v-if="!accountNumShow">
            <span class="details-item-title">{{ $t('tabMailboxes') }}</span>
            <span>{{ userDetails.accountCount }}</span>
          </div>
          <div class="detail-item" v-if="!createTimeShow">
            <span class="details-item-title">{{ $t('tabRegisteredAt') }}</span>
            <span>{{ tzDayjs(userDetails.createTime).format('YYYY-MM-DD HH:mm') }}</span>
          </div>
          <div class="detail-item" v-if="!typeShow">
            <span class="details-item-title">{{ $t('perm') }}</span>
            <span>{{ toRoleName(userDetails.type) }}</span>
          </div>
          <div class="detail-item" v-if="!statusShow">
            <span class="details-item-title">{{ $t('tabStatus') }}</span>
            <span>
              <el-tag disable-transitions size="small" v-if="userDetails.isDel === 1" type="info">{{ $t('deleted') }}</el-tag>
              <el-tag disable-transitions size="small" v-else-if="userDetails.status === 0" type="success">{{ $t('active') }}</el-tag>
              <el-tag disable-transitions size="small" v-else-if="userDetails.status === 1" type="danger">{{ $t('banned') }}</el-tag>
            </span>
          </div>
          <div class="detail-item">
            <span class="details-item-title">{{ $t('registrationIp') }}</span>
            <span>{{ userDetails.createIp || $t('unknown') }}</span>
          </div>
          <div class="detail-item">
            <span class="details-item-title">{{ $t('recentIP') }}</span>
            <span>{{ userDetails.activeIp || $t('unknown') }}</span>
          </div>
          <div class="detail-item">
            <span class="details-item-title">{{ $t('recentActivity') }}</span>
            <span>{{ userDetails.activeTime ? tzDayjs(userDetails.activeTime).format('YYYY-MM-DD') : $t('unknown') }}</span>
          </div>
          <div class="detail-item">
            <span class="details-item-title">{{ $t('loginDevice') }}</span>
            <span>{{ userDetails.device || $t('unknown') }}</span>
          </div>
          <div class="detail-item">
            <span class="details-item-title">{{ $t('loginSystem') }}</span>
            <span>{{ userDetails.os || $t('unknown') }}</span>
          </div>
          <div class="detail-item">
            <span class="details-item-title">{{ $t('browserLogin') }}</span>
            <span>{{ userDetails.browser || $t('unknown') }}</span>
          </div>
          <div class="detail-item full">
            <span class="details-item-title">{{ $t('sendEmail') }}</span>
            <div class="detail-send-row">
              <span>{{ formatSendCount(userDetails) }}</span>
              <el-tag size="small" v-if="userDetails.sendAction?.hasPerm">{{ formatSendType(userDetails) }}</el-tag>
              <el-button
                size="small"
                v-if="userDetails.sendAction?.hasPerm && userDetails.sendAction?.sendCount"
                @click="resetSendCount(userDetails)"
                type="primary"
              >{{ $t('reset') }}</el-button>
            </div>
          </div>
        </div>
      </div>
    </el-dialog>

    <el-dropdown
      :show-timeout="0"
      :hide-timeout="0"
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
          <el-dropdown-item @click="openSetPwd(rightClickUser)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="lucide:key-round" width="15" height="15" />
                <span>{{t('changePassword')}}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item @click="openSetType(rightClickUser)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="lucide:shield" width="15" height="15" />
                <span>{{ t('setRole') }}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="rightClickUser.type !== 0">
            <template #default>
              <div class="right-dropdown-item" v-if="rightClickUser.isDel !== 1" @click="setStatus(rightClickUser)">
                <Icon :icon="rightClickUser.status ? 'lucide:refresh-cw' : 'lucide:ban'" width="15" height="15" />
                <span>{{ setRightStatusName(rightClickUser) }}</span>
              </div>
              <div class="right-dropdown-item" v-else @click="restore(rightClickUser)">
                <Icon icon="lucide:refresh-cw" width="15" height="15" />
                <span>{{ t('restoreUser') }}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item @click="openAccountList(rightClickUser.userId)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="lucide:mail" width="15" height="15" />
                <span>{{ t('userEmail') }}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item @click="openDetails(rightClickUser)">
            <template #default>
              <div class="right-dropdown-item">
                <Icon icon="lucide:info" width="15" height="15" />
                <span>{{ t('userDetails') }}</span>
              </div>
            </template>
          </el-dropdown-item>
          <el-dropdown-item v-if="rightClickUser.type !== 0" @click="delOneUser(rightClickUser)">
            <template #default>
              <div class="right-dropdown-item danger">
                <Icon icon="lucide:trash-2" width="15" height="15" />
                <span>{{ t('adminDeleteUser') }}</span>
              </div>
            </template>
          </el-dropdown-item>
        </el-dropdown-menu>
      </template>
    </el-dropdown>
  </div>
</template>

<script setup>
import {defineOptions, h, onBeforeUnmount, onMounted, reactive, ref, watch} from 'vue'
import {
  userList,
  userDelete,
  userSetPwd,
  userSetStatus,
  userSetType,
  userAdd,
  userRestSendCount,
  userRestore,
  userDeleteAccount,
  userAllAccount
} from '@/request/user.js'
import {roleSelectUse} from "@/request/role.js";
import {Icon} from "@iconify/vue";
import loading from "@/components/loading/index.vue";
import {tzDayjs} from "@/utils/day.js";
import {useSettingStore} from "@/store/setting.js";
import {isEmail} from "@/utils/verify-utils.js";
import {useRoleStore} from "@/store/role.js";
import {useUserStore} from "@/store/user.js";
import {useI18n} from 'vue-i18n';

defineOptions({
  name: 'user'
})

const {t, locale} = useI18n();
const roleStore = useRoleStore()
const userStore = useUserStore()
const settingStore = useSettingStore()
const oauthPlatformMap = {
  google: { key: 'google', label: 'Google', icon: 'devicon:google', iconType: 'iconify' },
  github: { key: 'github', label: 'GitHub', icon: 'codicon:github-inverted', iconType: 'iconify' },
  linuxdo: { key: 'linuxdo', label: 'LinuxDo', icon: '/image/linuxdo.webp', iconType: 'image' },
}
function oauthPlatform(row) {
  if (row?.platform && oauthPlatformMap[row.platform]) {
    return oauthPlatformMap[row.platform]
  }
  if (row?.username) return oauthPlatformMap.linuxdo
  return null
}
const filteredValue = ['normal', 'del']
const filters = [{text: t('active'), value: 'normal'}, {text: t('deleted'), value: 'del'}]
const preserveExpanded = ref(false)
const emailWidth = ref(230)
const expandWidth = ref(40)
const settingWidth = ref(null)
const sendNumShow = ref(true)
const accountNumShow = ref(true)
const createTimeShow = ref(true)
const statusShow = ref(true)
const typeShow = ref(true)
const receiveWidth = ref(null)
const phonePageShow = ref(false)
const detailsShow = ref(false);
const layout = ref('prev, pager, next,  sizes, total')
const pageSize = ref('')
const users = ref([])
const tableRef = ref({})
const userDetails = ref({})
const total = ref(0)
const first = ref(true)
const scrollbarRef = ref(null)
const accountLoading = ref(false)
const dropdownRef = ref(null);
const dropdownShow = ref(false);
const rightClickUser = ref({});
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
const domainList = settingStore.domainList

const addForm = reactive({
  email: '',
  suffix: settingStore.domainList[0],
  password: '',
  type: null,
})

const params = reactive({
  email: '',
  num: 1,
  size: 15,
  timeSort: 0,
  status: -1
})
let chooseUser = {}
const userForm = reactive({
  password: null,
  type: -1,
  userId: 0,
})

const showAdd = ref(false)
const accountShow = ref(false)
const addLoading = ref(false);
const setTypeShow = ref(false)
const setPwdShow = ref(false)
const pagerCount = ref(10)
const settingLoading = ref(false)
const tableLoading = ref(true)
const roleList = reactive([])
const mySelect = ref({})
const accountList = reactive([])
const accountParams = reactive({
  size: 10,
  num: 0,
  total: 0,
  userId: 0,
})

roleSelectUse().then(list => {
  roleList.length = 0
  roleList.push(...list)
})

const paramsStar = localStorage.getItem('user-params')
if (paramsStar) {
  const localParams = JSON.parse(paramsStar)
  params.num = localParams.num
  params.size = localParams.size
  params.timeSort = localParams.timeSort
  params.status = localParams.status
}

watch(() => params, () => {
  localStorage.setItem('user-params', JSON.stringify(params))
}, {
  deep: true
})

watch(() => roleStore.refresh, () => {
  roleSelectUse().then(list => {
    roleList.length = 0
    roleList.push(...list)
  })
})

watch(() => userStore.refreshList, () => {
  getUserList(false)
})

getUserList()

const filterItem = reactive({
  send: ['normal', 'del'],
  account: ['normal', 'del'],
  receive: ['normal', 'del']
})

const handleWheel = () => {
  if (dropdownShow.value) {
    dropdownRef.value?.handleClose();
  }
}

onMounted(() => {
  window.addEventListener('resize', adjustWidth)
  window.addEventListener('wheel', handleWheel)
  adjustWidth()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', adjustWidth)
  window.removeEventListener('wheel', handleWheel)
})

function visibleChange(e) {
  dropdownShow.value = e;
  if (!e) {
    rightClickUser.value.checkedClass = '';
  }
}

function cellClassName({ row }) {
  return row.checkedClass;
}

const handleContextmenu = (row, column, cell, event) => {
  if (row.type === 0 && userStore.user.type !== 0) {
    return
  }

  rightClickUser.value.checkedClass = '';

  const { clientX, clientY } = event
  position.value = DOMRect.fromRect({
    x: clientX,
    y: clientY,
  })
  event.preventDefault()
  dropdownRef.value?.handleOpen()

  row.checkedClass = 'checked-row';
  rightClickUser.value = row;
}

function deleteAccount(account) {
  ElMessageBox.confirm(t('delConfirm', {msg: account.email}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userDeleteAccount(account.accountId).then(() => {
      getAccountList()
      ElMessage({
        message: t('delSuccessMsg'),
        type: "success",
        plain: true
      })
    })
  });
}
function accountCurChange(e) {
  accountParams.num = e
  getAccountList()
}

function resetAccountList() {
  accountList.length = 0
  accountParams.num = 0
  accountParams.size = 10
  accountParams.total = 0
}

function openAccountList(userId) {
  accountParams.userId = userId
  getAccountList(true)
  accountShow.value = true
}

function openDetails(user) {
  userDetails.value = user;
  detailsShow.value = true;
}

function getAccountList(loading = false) {
  accountLoading.value = loading
  userAllAccount(accountParams.userId,accountParams.num, accountParams.size).then(({list,total}) => {
    accountList.length = 0
    accountList.push(...list)
    accountParams.total = total
    accountLoading.value = false
  })
}

function tableFilter(e) {
  if (e.send) filterItem.send = e.send
  if (e.account) filterItem.account = e.account
  if (e.receive) filterItem.receive = e.receive
}

function formatterSend(e) {
  if (filterItem.send.length === 2) return e.sendEmailCount + e.delSendEmailCount
  if (filterItem.send.includes('normal')) return e.sendEmailCount
  if (filterItem.send.includes('del')) return e.delSendEmailCount
  return 0
}

function formatterAccount(e) {
  if (filterItem.account.length === 2) return e.accountCount + e.delAccountCount
  if (filterItem.account.includes('normal')) return e.accountCount
  if (filterItem.account.includes('del')) return e.delAccountCount
  return 0
}

function formatterReceive(e) {
  if (filterItem.receive.length === 2) return e.receiveEmailCount + e.delReceiveEmailCount
  if (filterItem.receive.includes('normal')) return e.receiveEmailCount
  if (filterItem.receive.includes('del')) return e.delReceiveEmailCount
  return 0
}

function setStatusName(user) {
  if (user.isDel === 1) return t('restore')
  if (user.status === 0) return t('btnBan')
  if (user.status === 1) return t('enable')
}

function setRightStatusName(user) {
  if (user.isDel === 1) return t('adminDeleteUser')
  if (user.status === 0) return t('banUser')
  if (user.status === 1) return t('enableUser')
}

const tableRowFormatter = (data) => data.row.email

const openSelect = () => {
  mySelect.value.toggleMenu()
}

function resetAddForm() {
  addForm.email = ''
  addForm.password = ''
}

function openAdd() {
  showAdd.value = true
}

function submit() {
  if (addLoading.value) return

  if (!addForm.email) {
    ElMessage({ message: t('emptyEmailMsg'), type: "error", plain: true })
    return
  }

  if (!isEmail(addForm.email + addForm.suffix)) {
    ElMessage({ message: t('notEmailMsg'), type: "error", plain: true })
    return
  }

  if (!addForm.password) {
    ElMessage({ message: t('emptyPwdMsg'), type: "error", plain: true })
    return
  }

  if (addForm.password.length < 6) {
    ElMessage({ message: t('pwdLengthMsg'), type: "error", plain: true })
    return
  }

  if (!addForm.type) {
    ElMessage({ message: t('emptyRole'), type: "error", plain: true })
    return
  }

  addLoading.value = true
  const form = {...addForm}
  form.email = form.email + form.suffix
  userAdd(form).then(() => {
    addLoading.value = false
    showAdd.value = false
    ElMessage({ message: t('addSuccessMsg'), type: "success", plain: true })
    getUserList(false)
  }).finally(() => {
    addLoading.value = false
  })
}

function formatSendType(user) {
  if (user.sendAction?.sendType === 'day') return t('daily')
  if (user.sendAction?.sendType === 'count') return t('total')
  if (user.sendAction?.sendType === 'ban') return t('sendBanned')
  if (user.sendAction?.sendType === 'internal') return t('sendInternal')
}

function formatSendCount(user) {
  if (!user.sendAction?.hasPerm) return t('unauthorized')
  if (!user.sendAction?.sendCount) return t('unlimited')
  return user.sendCount + '/' + user.sendAction.sendCount
}

function toRoleName(type) {
  if (type === 0) return t('admin')
  const index = roleList.findIndex(role => role.roleId === type)
  if (index > -1) return roleList[index].name
  return ""
}

function resetSendCount(user) {
  ElMessageBox.confirm(t('reSendConfirm', {msg: user.email}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userRestSendCount(user.userId).then(() => {
      ElMessage({ message: t('reSuccessMsg'), type: "success", plain: true })
      user.sendCount = 0
    })
  });
}

function delUser() {
  const rows = tableRef.value.getSelectionRows();
  const userIds = rows.map(row => row.userId);
  if (userIds.length === 0) return;
  ElMessageBox.confirm(t('delUsersConfirm'), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userDelete(userIds).then(() => {
      ElMessage({ message: t('delSuccessMsg'), type: "success", plain: true })
      getUserList(false)
    })
  });
}

function delOneUser(user) {
  ElMessageBox.confirm(t('delConfirm', {msg: user.email}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    userDelete([user.userId]).then(() => {
      ElMessage({ message: t('delSuccessMsg'), type: "success", plain: true })
      getUserList(false)
    })
  });
}

function restore(user) {
  const type = ref(0)
  ElMessageBox.confirm(null, {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    message: () => h('div', [
      h('div', {class: 'mb-2'}, t('restoreConfirm', {msg: user.email}))
    ]),
    type: 'warning'
  }).then(() => {
    userRestore(user.userId, type.value).then(() => {
      user.isDel = 0
      ElMessage({ message: t('restoreSuccessMsg'), type: "success", plain: true })
    })
  });
}

function setStatus(user) {
  httpSetStatus(user);
}

function httpSetStatus(user) {
  let status = user.status ? 0 : 1
  userSetStatus({status: status, userId: user.userId}).then(() => {
    user.status = status
    ElMessage({ message: t('saveSuccessMsg'), type: "success", plain: true })
  })
}

function setType() {
  if (settingLoading.value) return
  settingLoading.value = true
  userSetType({type: userForm.type, userId: userForm.userId}).then(() => {
    chooseUser.type = userForm.type
    setTypeShow.value = false
    ElMessage({ message: t('saveSuccessMsg'), type: "success", plain: true })
  }).finally(() => {
    settingLoading.value = false
  })
}

function resetUserForm() {
  userForm.password = null
  userForm.userId = 0
}

function search() {
  params.num = 1
  getUserList()
}

function updatePwd() {
  if (settingLoading.value) return
  if (!userForm.password) {
    ElMessage({ message: t('emptyPwdMsg'), type: 'error', plain: true })
    return
  }
  if (userForm.password.length < 6) {
    ElMessage({ message: t('pwdLengthMsg'), type: 'error', plain: true })
    return
  }

  settingLoading.value = true
  userSetPwd({password: userForm.password, userId: userForm.userId}).then(() => {
    setPwdShow.value = false
    ElMessage({ message: t('saveSuccessMsg'), type: "success", plain: true })
  }).finally(() => {
    settingLoading.value = false
  })
}

function openSetType(user) {
  chooseUser = user
  userForm.userId = user.userId
  userForm.type = user.type
  setTypeShow.value = true
}

function openSetPwd(user) {
  userForm.userId = user.userId
  setPwdShow.value = true
}

function refresh() {
  params.email = ''
  params.num = 1
  params.status = -1
  params.timeSort = 0
  getUserList();
  roleSelectUse().then(list => {
    roleList.length = 0
    roleList.push(...list)
  })
}

function changeTimeSort() {
  params.num = 1
  params.timeSort = params.timeSort ? 0 : 1
  getUserList()
}

function numChange(num) {
  params.num = num
  getUserList(false)
}

function sizeChange(size) {
  params.size = size
  getUserList(false)
}

function getUserList(loading = true) {
  tableLoading.value = loading
  const newParams = {...params}
  if (newParams.status === -2) {
    delete newParams.status
    newParams.isDel = 1
  }
  userList(newParams).then(data => {
    users.value = data.list.map(item => ({...item, checkedClass: ''}))
    total.value = data.total
    scrollbarRef.value?.setScrollTop(0);
  }).finally(() => {
    tableLoading.value = false
    setTimeout(() => {
      first.value = false
    }, 200)
  })
}

function adjustWidth() {
  const width = window.innerWidth
  statusShow.value = width > 1090
  createTimeShow.value = width > 1367
  accountNumShow.value = width > 650
  sendNumShow.value = width > 685
  typeShow.value = width > 767
  emailWidth.value = width > 480 ? 230 : null
  settingWidth.value = width < 480 ? (locale.value === 'en' ? 85 : 75) : null
  expandWidth.value = width < 480 ? 30 : 38
  pagerCount.value = width < 768 ? 7 : 11
  receiveWidth.value = width < 480 ? 90 : null
  layout.value = width < 768 ? 'pager' : 'prev, pager, next,sizes, total'
  phonePageShow.value = width < 768
  pageSize.value = width < 380 ? 'small' : ''
}
</script>

<style>
.el-message-box__container {
  align-items: start !important;
}
.el-message-box__message {
  word-break: break-all;
}
.el-table-filter__content {
  min-width: 0;
}
</style>

<style lang="scss" scoped>
:deep(.el-table .checked-row) {
  background: var(--surface-active);
}

.user-box {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--app-canvas);
}

.header-actions {
  min-height: 46px;
  padding: 6px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
  background: var(--surface-primary);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.toolbar-left,
.toolbar-right,
.search-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.search-input {
  width: min(210px, calc(100vw - 170px));
}

.action-pill {
  height: 30px;
  padding: 0 9px;
  border-radius: 7px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  font-size: 12.5px;
  font-weight: 500;
  color: var(--text-secondary);
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  cursor: pointer;
  transition: all 0.14s ease;

  &:hover {
    color: var(--text-primary);
    border-color: var(--border-strong);
  }

  &.primary {
    color: #FFFFFF;
    background: var(--brand-primary);
    border-color: transparent;

    &:hover {
      background: var(--brand-primary-hover);
    }
  }

  &.danger:hover {
    color: var(--el-color-danger);
    border-color: rgba(239, 68, 68, 0.35);
    background: rgba(239, 68, 68, 0.08);
  }

  @media (max-width: 560px) {
    .btn-label {
      display: none;
    }
  }
}

.spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.scrollbar {
  flex: 1;
  min-height: 0;
  width: 100%;
  position: relative;
}

.page-inner {
  padding: 16px 20px 28px;
  position: relative;

  @media (max-width: 767px) {
    padding: 12px;
  }
}

.table-card {
  background: var(--surface-primary);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  overflow: hidden;
  box-shadow: var(--shadow-xs);
}

.email-cell {
  display: flex;
  gap: 6px;
  align-items: center;
}

.email-row {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.type {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pagination {
  margin-top: 16px;
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 10px;
}

:deep(.el-dialog) {
  width: 400px !important;
  @media (max-width: 440px) {
    width: calc(100% - 32px) !important;
  }
}

:deep(.account-dialog) {
  width: 520px !important;
  @media (max-width: 540px) {
    width: calc(100% - 32px) !important;
  }
}

.container,
.dialog .dialog-box {
  display: grid;
  grid-template-columns: 1fr;
  gap: 14px;
}

.btn {
  width: 100%;
}

.details {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.oauth-details {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
}

.detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
}

.detail-item {
  padding: 10px 12px;
  border-radius: 10px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-size: 13px;

  &.full {
    grid-column: 1 / -1;
  }

  .details-item-title {
    font-size: 11.5px;
    font-weight: 600;
    color: var(--text-muted);
  }
}

.detail-send-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

:deep(.oauth-avatar),
:deep(.oauth-platform-icon) {
  flex-shrink: 0;
}

.account-pagination {
  margin-top: 12px;
  display: flex;
  justify-content: flex-end;
  width: 100%;
}

.select {
  position: absolute;
  right: 0;
  width: 100px;
  opacity: 0;
  pointer-events: none;
}

.domain-trigger {
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.domain-label {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  font-size: 13.5px;
  font-weight: 500;
  color: var(--text-primary);
}

.setting-icon {
  color: var(--text-muted);
}

:deep(.el-input-group__append) {
  padding: 0 10px !important;
  background: var(--surface-subtle) !important;
}

.loading {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: var(--loadding-background);
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

.right-dropdown-item {
  display: flex;
  align-items: center;
  gap: 9px;

  &.danger {
    color: var(--el-color-danger);
  }
}

:deep(.cell) {
  white-space: normal;
  overflow: visible;
  text-overflow: clip;
}
:deep(.receive .cell),
:deep(.send .cell),
:deep(.account .cell) {
  white-space: nowrap;
}
:deep(.el-table) {
  @media (pointer: coarse) {
    user-select: none;
  }
}
:deep(.el-table th.el-table__cell>.cell.highlight) {
  color: var(--brand-primary);
}
:deep(.el-table__inner-wrapper:before) {
  display: none;
}
</style>
