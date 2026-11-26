<template>
  <div class="box-404">
    <div class="error-card">
      <div class="error-badge">
        <Icon icon="lucide:mail" width="22" height="22" />
      </div>
      <div class="error-code">404</div>
      <p class="error-desc">{{ $t('error404') }}</p>
      <el-button type="primary" class="home-btn" @click="router.replace({ name: 'layout' })">
        <Icon icon="lucide:arrow-left" width="15" height="15" class="btn-icon" />
        <span>{{ $t('home') }}</span>
      </el-button>
    </div>
  </div>
</template>

<script lang="js" setup>
import { Icon } from '@iconify/vue'
import router from "@/router/index.js";
</script>

<style scoped lang="scss">
.box-404 {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  padding: 24px;
  background: var(--app-canvas);
}

.error-card {
  width: min(400px, 100%);
  padding: 40px 32px;
  border-radius: 18px;
  background: var(--surface-elevated);
  border: 1px solid var(--border-subtle);
  box-shadow: var(--shadow-md);
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.error-badge {
  width: 48px;
  height: 48px;
  border-radius: 14px;
  background: var(--brand-primary-soft);
  color: var(--brand-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16px;
}

.error-code {
  font-size: 48px;
  font-weight: 800;
  line-height: 1;
  letter-spacing: -0.04em;
  color: var(--text-primary);
  margin-bottom: 10px;
}

.error-desc {
  margin: 0 0 24px;
  font-size: 14px;
  line-height: 1.6;
  color: var(--text-secondary);
}

.home-btn {
  height: 38px;
  padding: 0 18px;

  .btn-icon {
    margin-right: 6px;
  }
}
</style>
