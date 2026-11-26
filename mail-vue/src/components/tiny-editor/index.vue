<template>
  <div class="editor-box" :class="showLoading ? 'editor-box-loading' : ''">
    <loading class="loading" v-show="showLoading"/>
    <textarea v-show="!showLoading" style="outline: none" :id="editorId" ref="editorRef"></textarea>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch, nextTick, shallowRef, computed } from 'vue';
import loading from "@/components/loading/index.vue";
import { useI18n } from 'vue-i18n';
import { useUiStore } from '@/store/ui.js';
import { useSettingStore } from '@/store/setting.js';

defineExpose({
  clearEditor,
  focus,
  getContent
});

const props = defineProps({
  defValue: {
    type: String,
    default: ''
  },
  editorId: {
    type: String,
    default: () => `editor-${Date.now()}`
  }
});

const { locale } = useI18n();
const emit = defineEmits(['change', 'focus']);
const editor = shallowRef(null);
const isInitialized = ref(false);
const editorRef = ref(null);
const showLoading = ref(false);
const uiStore = useUiStore();
const settingStore = useSettingStore();
let unmounted = false;

onMounted(() => {
  initTinyMCE();
});

onBeforeUnmount(() => {
  unmounted = true;
  destroyEditor();
});

watch(() => props.defValue, (newValue) => {
  if (editor.value && editor.value.getContent() !== newValue) {
    editor.value.setContent(newValue);
  }
});

watch(() => [uiStore.dark, settingStore.lang], () => {
  if (!window.tinymce || unmounted) return;
  destroyEditor();
  initEditor();
});

const language = computed(() => {
  return locale.value === 'zh' ? 'zh_CN' : 'en';
});

function clearEditor() {
  if (editor.value) {
    editor.value.setContent('');
  }
}

function initTinyMCE() {
  if (window.tinymce) {
    initEditor();
    return;
  }

  showLoading.value = true;
  let script = document.querySelector('script[data-tinymce-loader="1"]');
  if (!script) {
    script = document.createElement('script');
    script.src = '/tinymce/tinymce.min.js';
    script.dataset.tinymceLoader = '1';
    document.head.appendChild(script);
  }

  const onReady = () => {
    showLoading.value = false;
    if (!unmounted && window.tinymce) {
      nextTick(() => initEditor());
    }
  };
  const onFail = () => {
    showLoading.value = false;
  };

  if (window.tinymce) {
    onReady();
  } else {
    script.addEventListener('load', onReady, { once: true });
    script.addEventListener('error', onFail, { once: true });
  }
}

function initEditor() {
  if (!window.tinymce || unmounted || !document.getElementById(props.editorId)) return;
  window.tinymce.init({
    selector: `#${props.editorId}`,
    statusbar: false,
    height: "100%",
    auto_focus: true,
    forced_root_block: 'div',
    skin: `${uiStore.dark ? 'oxide-dark' : 'oxide'}`,
    content_css: `/tinymce/css/index.css,${uiStore.dark ? 'dark' : 'default'}`,
    content_style: `:root {
         --scrollbar-track-color: ${uiStore.dark ? '#11141B' : '#FFFFFF'};
         --scrollbar-thumb-color: ${uiStore.dark ? '#475569' : '#CBD5E1'};
    }
    body {
      background-color: ${uiStore.dark ? '#171B24' : '#FFFFFF'};
      color: ${uiStore.dark ? '#F1F5F9' : '#0F172A'};
      font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
    }`,
    plugins: 'link image advlist lists  emoticons fullscreen  table preview code',
    toolbar: 'bold emoticons forecolor backcolor italic fontsize | alignleft aligncenter alignright alignjustify | outdent indent |  bullist numlist | link image  | table code preview fullscreen',
    toolbar_mode: 'scrolling',
    font_size_formats: '8px 10px 12px 14px 16px 18px 24px 36px',
    emoticons_search: false,
    language: language.value,
    language_load: true,
    menubar: false,
    license_key: 'gpl',
    noneditable_class: 'mceNonEditable',
    setup: (ed) => {
      editor.value = ed;
      ed.on('init', () => {
        ed.setContent(props.defValue);
        isInitialized.value = true;
      });
      ed.on('input change', () => {
        const content = ed.getContent();
        const text = ed.getContent({ format: 'text' });
        emit('change', content, text);
      });
      ed.on('focus', () => {
        emit('focus', focus);
      });
    },
    autofocus: true,
    branding: false,
    file_picker_types: 'image',
    image_dimensions: false,
    image_description: false,
    link_title: false,
    dialog_type: 'none',
    file_picker_callback: (callback) => {
      const input = document.createElement('input');
      input.setAttribute('type', 'file');
      input.setAttribute('accept', 'image/*');

      input.addEventListener('change', (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = () => {
          const id = 'blobid' + Date.now();
          const blobCache = window.tinymce.activeEditor.editorUpload.blobCache;
          const base64 = String(reader.result || '').split(',')[1];
          const blobInfo = blobCache.create(id, file, base64);
          blobCache.add(blobInfo);
          callback(blobInfo.blobUri(), { title: file.name });
        };
        reader.readAsDataURL(file);
      });

      input.click();
    }
  });
}

function focus() {
  nextTick(() => {
    editor.value?.focus();
  });
}

function getContent() {
  return editor.value?.getContent();
}

function destroyEditor() {
  if (editor.value) {
    editor.value.destroy();
    editor.value = null;
  }
}
</script>

<style lang="scss" scoped>
.editor-box {
  height: 100%;
  width: 100%;
}

.loading {
  margin: auto;
}

.editor-box-loading {
  display: flex;
  align-items: center;
  justify-content: center;
}

:deep(.tox-tbtn.tox-tbtn--select.tox-tbtn--bespoke) {
  width: 80px !important;
}

:deep(.tox.tox-tinymce.tox-fullscreen) {
  padding: 15px;
  background: var(--surface-elevated);
  @media (max-width: 767px) {
    padding: 10px;
  }
}

:deep(.tox-tinymce) {
  border: none;
  border-radius: 0;
  background: transparent;
}

:deep(.tox-editor-header) {
  background: transparent !important;
  box-shadow: none !important;
  border-bottom: 1px solid var(--border-subtle) !important;
  padding: 2px 0 !important;
}

:deep(.tox-toolbar-overlord),
:deep(.tox-toolbar__primary) {
  background: transparent !important;
}

:deep(.tox-toolbar__group) {
  padding-left: 0 !important;
  margin: 0 !important;
}

:deep(.tox-tbtn) {
  margin: 0 1px !important;
  border-radius: 6px !important;
}

:deep(.tox .tox-edit-area::before) {
  display: none;
}
</style>
