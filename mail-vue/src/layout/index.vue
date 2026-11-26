<template>
  <div class="layout">
    <header class="layout-header">
      <Header />
    </header>
    <div class="layout-body">
      <Main />
    </div>
  </div>
  <writer ref="writerRef" />
</template>

<script setup>
import Header from '@/layout/header/index.vue'
import Main from '@/layout/main/index.vue'
import { ref, onMounted } from 'vue'
import { useUiStore } from '@/store/ui.js'
import writer from '@/layout/write/index.vue'

const uiStore = useUiStore()
const writerRef = ref({})

onMounted(() => {
  uiStore.writerRef = writerRef
})
</script>

<style lang="scss" scoped>
.layout {
  height: 100%;
  position: fixed;
  width: 100%;
  inset: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--app-canvas);
}

.layout-header {
  flex-shrink: 0;
  background: var(--surface-primary);
  z-index: 60;
}

.layout-body {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--app-canvas);
}
</style>
