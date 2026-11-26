<template>
  <div v-for="item in rows" :key="item" class="skeleton-wrap">
    <div :class="'skeleton-row ' + type">
      <div class="row-leading">
        <el-checkbox disabled />
        <span class="pc-star" v-if="showStar">
          <Icon style="color: var(--border-subtle)" icon="lucide:star" width="15" height="15"/>
        </span>
      </div>

      <el-skeleton animated class="avatar-sk">
        <template #template>
          <el-skeleton-item variant="circle" style="width: 30px; height: 30px; border-radius: 9px" />
        </template>
      </el-skeleton>

      <div class="title">
        <div class="email-sender">
          <el-skeleton animated style="width: 120px">
            <template #template>
              <el-skeleton-item variant="text" style="width: 100%; height: 14px" />
            </template>
          </el-skeleton>
        </div>
        <div class="email-body-sk">
          <el-skeleton animated>
            <template #template>
              <el-skeleton-item variant="text" class="text-skeleton-one"/>
              <el-skeleton-item v-if="showUserInfo" variant="text" class="text-skeleton-two"/>
            </template>
          </el-skeleton>
        </div>
      </div>

      <div class="email-right-skeleton">
        <el-skeleton animated>
          <template #template>
            <el-skeleton-item variant="text" style="width: 52px; height: 12px;"/>
          </template>
        </el-skeleton>
      </div>
    </div>
  </div>
</template>

<script setup>
import {Icon} from "@iconify/vue";

defineProps({
  rows: {
    type: Number,
    default: 1
  },
  showStar: {
    type: Boolean,
    default: true
  },
  accountShow: {
    type: Boolean,
    default: false
  },
  showStatus: {
    type: Boolean,
    default: false
  },
  showUserInfo: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: ''
  }
})
</script>

<style scoped lang="scss">
.skeleton-wrap {
  background: var(--surface-primary);
}

.skeleton-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  height: 56px;
  border-bottom: 1px solid var(--border-subtle);

  @media (max-width: 1366px) {
    height: 86px;
    padding: 12px 14px;
    align-items: flex-start;
  }

  &.all-email {
    height: 74px;
    @media (max-width: 1366px) {
      height: 128px;
    }
  }
}

.row-leading {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-shrink: 0;
}

.pc-star {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 26px;
  @media (max-width: 1366px) {
    display: none;
  }
}

.avatar-sk {
  width: 30px;
  flex-shrink: 0;
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
    gap: 6px;
  }
}

.email-body-sk {
  min-width: 0;
  .text-skeleton-one {
    width: 72%;
    height: 14px;
  }
  .text-skeleton-two {
    width: 45%;
    height: 12px;
    margin-top: 6px;
  }
}

.email-right-skeleton {
  width: 52px;
  flex-shrink: 0;
  @media (max-width: 1366px) {
    display: none;
  }
}
</style>
