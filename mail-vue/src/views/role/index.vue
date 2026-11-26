<template>
  <div class="perm-box">
    <div class="header-actions">
      <button type="button" class="action-pill primary" @click="openAddRole">
        <Icon icon="lucide:plus" width="15" height="15" />
        <span>{{ $t('add') }}</span>
      </button>
      <button type="button" class="action-pill" @click="refresh" aria-label="Refresh">
        <Icon icon="lucide:refresh-cw" width="14" height="14" :class="{ spinning: tableLoading }" />
      </button>
    </div>

    <el-scrollbar class="perm-scrollbar">
      <div class="page-inner">
        <div class="loading" :class="tableLoading ? 'loading-show' : 'loading-hide'"
             :style="first ? 'background: transparent' : ''">
          <loading/>
        </div>
        <div class="table-card">
          <el-table :data="roles" style="width: 100%;" :empty-text="''">
            <el-table-column width="12"/>
            <el-table-column :label="$t('role')" prop="name" :min-width="roleWidth">
              <template #default="props">
                <div class="role-name">
                  <span class="role-title">{{ props.row.name }}</span>
                  <el-tag v-if="props.row.isDefault" size="small" type="success" effect="light">{{ $t('default') }}</el-tag>
                </div>
              </template>
            </el-table-column>
            <el-table-column :label="$t('order')" :width="sortWidth" prop="sort"/>
            <el-table-column v-if="desShow" :label="$t('description')" min-width="200" prop="description">
              <template #default="props">
                <div class="description">
                  <span>{{ props.row.description }}</span>
                </div>
              </template>
            </el-table-column>
            <el-table-column :label="$t('tabSetting')" :width="settingWidth">
              <template #default="props">
                <el-dropdown trigger="click">
                  <el-button size="small">{{ $t('action') }}</el-button>
                  <template #dropdown>
                    <el-dropdown-menu>
                      <el-dropdown-item @click="openRoleSet(props.row)">{{ $t('change') }}</el-dropdown-item>
                      <el-dropdown-item @click="setDef(props.row)">{{ $t('default') }}</el-dropdown-item>
                      <el-dropdown-item @click="delRole(props.row)">{{ $t('delete') }}</el-dropdown-item>
                    </el-dropdown-menu>
                  </template>
                </el-dropdown>
              </template>
            </el-table-column>
          </el-table>
        </div>
      </div>
    </el-scrollbar>

    <el-dialog top="5vh" class="dialog" v-model="roleFormShow" @closed="resetForm">
      <template #header>
        <div class="dialog-header-row">
          <span class="dialog-title-text">{{ dialogType.title }}</span>
          <el-popover width="340" :title="t('featDesc')" placement="bottom">
            <template #reference>
              <span class="info-trigger">
                <Icon icon="lucide:info" width="16" height="16"/>
              </span>
            </template>
            <div style="font-weight: 600; margin-bottom: 4px;">{{ t('emailInterception') }}</div>
            <div style="color: var(--text-secondary); font-size: 13px;">{{ t('emailInterceptionDesc') }}</div>
            <div style="font-weight: 600; margin-top: 12px; margin-bottom: 4px;">{{ t('availableDomains') }}</div>
            <div style="color: var(--text-secondary); font-size: 13px;">{{ t('availableDomainsDesc') }}</div>
          </el-popover>
        </div>
      </template>

      <div class="dialog-box">
        <el-input v-model="form.name" type="text" :maxlength="12" :placeholder="$t('roleName')" autocomplete="off" @keyup.enter="roleFormClick"/>
        <el-input v-model="form.description" type="text" :maxlength="30" :placeholder="$t('description')" autocomplete="off" @keyup.enter="roleFormClick"/>
        <el-input-tag tag-type="warning" v-model="form.banEmail" @add-tag="banEmailAddTag" type="text" :placeholder="$t('emailInterception')" autocomplete="off"/>
        <el-select
          v-model="form.availDomain"
          multiple
          filterable
          allow-create
          default-first-option
          :reserve-keyword="false"
          tag-type="success"
          :placeholder="$t('availableDomains')"
          @change="availDomainChange"
        >
          <el-option v-for="item in domainOptions" :key="item.value" :label="item.label" :value="item.value" />
        </el-select>
        <div>
          <el-input-number :placeholder="$t('order')" :min="0" :max="9999" v-model.number="form.sort" controls-position="right" autocomplete="off"/>
        </div>

        <div class="tree-section">
          <div class="tree-toolbar">
            <el-radio-group v-model="expand" size="small" @change="expandChange">
              <el-radio-button :label="$t('expand')" :value="true"/>
              <el-radio-button :label="$t('collapse')" :value="false"/>
            </el-radio-group>
          </div>
          <el-tree
            :expand-on-click-node="false"
            :check-on-click-node="false"
            ref="tree"
            :data="treeList"
            show-checkbox
            node-key="permId"
            :default-expand-all="expand"
            :props="{ label: 'name' }"
          >
            <template #default="{ node, data }">
              <div class="tree-node-row">
                <span>{{ node.label }}</span>
                <span class="send-num" v-if="data.permKey === 'email:send'" @click.stop>
                  <el-input-number v-if="form.sendType === 'day' || form.sendType === 'count'" v-model="form.sendCount" controls-position="right" :min="0" :max="99999" size="small" :placeholder="$t('total')" />
                  <el-select v-model="form.sendType" placeholder="Select" size="small" :style="`width: ${ locale === 'zh' ? 72 : 90 }px; margin-left: 6px;`">
                    <el-option :label="$t('total')" value="count"/>
                    <el-option :label="$t('daily')" value="day"/>
                    <el-option :label="$t('internal')" value="internal"/>
                    <el-option :label="$t('btnBan')" value="ban"/>
                  </el-select>
                </span>
                <span class="send-num" v-if="data.permKey === 'account:add'" @click.stop>
                  <el-input-number v-model="form.accountCount" controls-position="right" :min="0" :max="99999" size="small" :placeholder="$t('total')" />
                </span>
              </div>
            </template>
          </el-tree>
        </div>

        <el-button class="btn" size="large" type="primary" :loading="permLoading" @click="roleFormClick">
          {{ $t('save') }}
        </el-button>
      </div>
    </el-dialog>
  </div>
</template>

<script setup>
import {Icon} from "@iconify/vue";
import {defineOptions, nextTick, onBeforeUnmount, onMounted, reactive, ref} from "vue";
import {roleAdd, roleDelete, rolePermTree, roleRoleList, roleSet, roleSetDef} from "@/request/role.js";
import loading from '@/components/loading/index.vue';
import {useRoleStore} from "@/store/role.js";
import {useUserStore} from "@/store/user.js";
import {useSettingStore} from "@/store/setting.js";
import {isEmail, isDomain} from "@/utils/verify-utils.js";
import {useI18n} from "vue-i18n";

defineOptions({
  name: 'role'
})

const {domainList} = useSettingStore();
const {t, locale} = useI18n();
const userStore = useUserStore();
const roleStore = useRoleStore();
const roleFormShow = ref(false)
const treeList = reactive([])
const roles = ref([])
const tree = ref({})
const permLoading = ref(false)
const tableLoading = ref(false)
const desShow = ref(true)
const settingWidth = ref(null)
const sortWidth = ref(null)
const roleWidth = ref(200)
const first = ref(true)

const dialogType = reactive({
  title: '',
  type: ''
})

const form = reactive({
  name: null,
  description: null,
  banEmail: [],
  sendType: 'count',
  sendCount: 0,
  accountCount: 0,
  sort: 0,
  isDefault: 0,
  availDomain: []
})

let domainOptions = []
const expand = ref(false)
let chooseRole = {}

refresh()

rolePermTree().then(tree => {
  treeList.push(...tree)
})

domainOptions = domainList.map(domain => {
  const cleanDomain = domain.replace(/^@/, '');
  return {label: cleanDomain, value: cleanDomain};
});

function availDomainChange() {
  const index = form.availDomain.findIndex(domain => {
    return !domainOptions.map(option => option.value).includes(domain)
  })
  if (index > -1) {
    form.availDomain.splice(index, 1)
  }
}

function banEmailAddTag(val) {
  const emails = Array.from(new Set(
      val.split(/[,，]/).map(item => item.trim()).filter(item => item)
  ));
  form.banEmail.splice(form.banEmail.length - 1, 1)
  emails.forEach(email => {
    if ((isEmail(email) || isDomain(email) || email === '*') && !form.banEmail.includes(email)) {
      form.banEmail.push(email)
    }
  })
}

function roleFormClick() {
  if (permLoading.value) return
  if (dialogType.type === 'add') {
    addRole()
  } else {
    setRole()
  }
}

function setDef(role) {
  roleSetDef(role.roleId).then(() => {
    ElMessage({ message: t('saveSuccessMsg'), type: "success", plain: true })
    getRoleList()
  })
}

function delRole(role) {
  ElMessageBox.confirm(t('delConfirm', {msg: role.name}), {
    confirmButtonText: t('confirm'),
    cancelButtonText: t('cancel'),
    type: 'warning'
  }).then(() => {
    roleDelete(role.roleId).then(() => {
      ElMessage({ message: t('delSuccessMsg'), type: "success", plain: true })
      getRoleList()
      userStore.refreshUserList()
      roleStore.refreshSelect()
    })
  });
}

function expandChange(e) {
  const nodes = tree.value?.store.nodesMap;
  for (const key in nodes) {
    nodes[key].expanded = !!e;
  }
}

function setRole() {
  if (!form.name) {
    ElMessage({ message: t('emptyRoleNameMsg'), type: "error", plain: true })
    return
  }

  const params = {...form, roleId: chooseRole.roleId}
  const checkedId = tree.value.getCheckedKeys()
  const halfId = tree.value.getHalfCheckedKeys()
  params.permIds = [...checkedId, ...halfId]

  permLoading.value = true
  roleSet(params).then(() => {
    ElMessage({ message: t('saveSuccessMsg'), type: "success", plain: true })
    const names = roles.value.map(role => role.name)
    if (!names.includes(params.name)) {
      roleStore.refreshSelect()
    }
    roleFormShow.value = false
    getRoleList()
  }).finally(() => {
    permLoading.value = false
  })
}

function resetForm() {
  form.name = null
  form.description = null
  form.sort = 0
  form.sendType = 'count'
  form.sendCount = 0
  form.accountCount = 0
  form.banEmail = []
  form.availDomain = []
  tree.value.setCheckedKeys([])
}

function openRoleSet(role) {
  chooseRole = role
  dialogType.title = t('changeRoleTitle')
  dialogType.type = 'set'
  roleFormShow.value = true
  form.sort = role.sort
  form.name = role.name
  form.description = role.description
  form.sendType = role.sendType
  form.sendCount = role.sendCount
  form.accountCount = role.accountCount
  form.banEmail = role.banEmail
  form.availDomain = role.availDomain
  nextTick(() => {
    tree.value.setCheckedKeys(role.permIds)
  })
}

function openAddRole() {
  dialogType.title = t('addRoleTitle')
  dialogType.type = 'add'
  roleFormShow.value = true
}

function addRole() {
  const params = {...form}
  const checkedId = tree.value.getCheckedKeys()
  const halfId = tree.value.getHalfCheckedKeys()
  params.permIds = [...checkedId, ...halfId]

  permLoading.value = true
  roleAdd(params).then(() => {
    ElMessage({ message: t('addSuccessMsg'), type: "success", plain: true })
    roleFormShow.value = false
    getRoleList()
    roleStore.refreshSelect()
  }).finally(() => {
    permLoading.value = false
  })
}

function refresh() {
  tableLoading.value = true
  roles.value = []
  getRoleList()
}

function getRoleList() {
  roleRoleList().then(list => {
    roles.value = list
  }).finally(() => {
    tableLoading.value = false
    setTimeout(() => {
      first.value = false
    }, 200)
  })
}

function adjustWidth() {
  desShow.value = window.innerWidth > 767
  settingWidth.value = window.innerWidth < 480 ? (locale.value === 'en' ? 85 : 75) : null
  sortWidth.value = window.innerWidth < 480 ? 75 : null
  roleWidth.value = window.innerWidth < 480 ? 180 : 200
}

onMounted(() => {
  window.addEventListener('resize', adjustWidth)
  adjustWidth()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', adjustWidth)
})
</script>

<style scoped lang="scss">
.perm-box {
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  width: 100%;
  background: var(--app-canvas);
}

.header-actions {
  height: 46px;
  padding: 0 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--surface-primary);
  border-bottom: 1px solid var(--border-subtle);
  flex-shrink: 0;
}

.action-pill {
  height: 30px;
  padding: 0 10px;
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
}

.spinning {
  animation: spin 0.9s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.perm-scrollbar {
  flex: 1;
  min-height: 0;
}

.page-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px 24px 36px;
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

.role-name {
  display: flex;
  align-items: center;
  gap: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  .role-title {
    font-weight: 500;
  }
}

.description {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--text-secondary);
}

.dialog-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.dialog-title-text {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
}

.info-trigger {
  display: inline-flex;
  color: var(--text-muted);
  cursor: pointer;

  &:hover {
    color: var(--brand-primary);
  }
}

.dialog-box {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tree-section {
  padding: 12px;
  border-radius: 10px;
  background: var(--surface-subtle);
  border: 1px solid var(--border-subtle);
}

.tree-toolbar {
  margin-bottom: 10px;
}

.tree-node-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 6px;
}

.send-num {
  display: inline-flex;
  align-items: center;
  margin-left: 6px;

  .el-input-number {
    width: 90px;
  }
}

.loading {
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
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

:deep(.el-dialog) {
  margin-bottom: 20px !important;
  width: 480px !important;
  @media (max-width: 520px) {
    width: calc(100% - 32px) !important;
  }
}

:deep(.el-tree) {
  background: transparent;
}

:deep(.el-table__inner-wrapper:before) {
  display: none;
}

.btn {
  width: 100%;
  margin-top: 4px;
}
</style>
