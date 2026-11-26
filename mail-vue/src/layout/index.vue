<template>
  <el-container class="layout">
    <el-aside
        class="aside"
        :class="uiStore.asideShow ? 'aside-show' : 'el-aside-hide'">
      <Aside />
    </el-aside>
    <div
        :class="(uiStore.asideShow && isMobile)? 'overlay-show':'overlay-hide'"
        @click="uiStore.asideShow = false"
    ></div>
    <el-container class="main-container">
      <el-main>
        <el-header>
            <Header />
        </el-header>
        <Main />
      </el-main>
    </el-container>
  </el-container>
  <writer ref="writerRef" />
</template>

<script setup>
import Aside from '@/layout/aside/index.vue'
import Header from '@/layout/header/index.vue'
import Main from '@/layout/main/index.vue'
import { ref, onMounted, onBeforeUnmount } from 'vue'
import {useUiStore} from "@/store/ui.js";
import writer from '@/layout/write/index.vue'

const uiStore = useUiStore();
const writerRef = ref({})
const isMobile = ref(window.innerWidth < 1025)
const handleResize = () => {
  isMobile.value = window.innerWidth < 1025
  uiStore.asideShow = window.innerWidth > 1024;
}

onMounted(() => {
  uiStore.writerRef = writerRef

  window.addEventListener('resize', handleResize)
  handleResize()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>

<style lang="scss" scoped>
.el-aside-hide {
  position: fixed;
  left: 0;
  height: 100%;
  z-index: 100;
  transform: translateX(-100%);
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
}

.aside-show {
  transform: translateX(0);
  transition: transform 0.2s cubic-bezier(0.22, 1, 0.36, 1);
  z-index: 101;
  @media (max-width: 1024px) {
    position: fixed;
    top: 0;
    left: 0;
    z-index: 101;
    height: 100%;
    box-shadow: var(--aside-right-border);
  }
}

.el-aside {
  width: auto;
  overflow: visible;
}

.layout {
  height: 100%;
  position: fixed;
  width: 100%;
  top: 0;
  left: 0;
  overflow: hidden;
  background: var(--app-canvas);
}

.main-container {
  min-height: 100%;
  height: 100%;
  background: var(--surface-primary);
  overflow: hidden;
}

.el-main {
  padding: 0;
  height: 100%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.el-header {
  height: 58px;
  flex-shrink: 0;
  background: var(--surface-primary);
  border-bottom: 1px solid var(--border-subtle);
  padding: 0;
  @media (max-width: 767px) {
    height: 54px;
  }
}

.overlay-show {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.45);
  backdrop-filter: blur(3px);
  z-index: 99;
  transition: opacity 0.2s ease;
}

.overlay-hide {
  display: none;
  pointer-events: none;
  opacity: 0;
}
</style>
