<template>
  <div class="content-box" ref="contentBox">
    <div ref="container" class="content-html"></div>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount, watch } from 'vue'
import { sanitizeEmailHtml } from '@/utils/email-html.js'

const BLOCKED_TAGS = new Set(['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'BASE', 'FRAME', 'FORM'])

const HOST_CSS = `
  :host {
    all: initial;
    display: block;
    width: 100%;
    height: 100%;
    font-family: Inter, 'Helvetica Neue', Helvetica, 'PingFang SC',
                'Hiragino Sans GB', 'Microsoft YaHei', '微软雅黑', Arial, sans-serif;
    font-size: 14px;
    line-height: 1.5;
    color: #13181D;
    word-break: break-word;
  }

  h1, h2, h3, h4 {
    font-size: 18px;
    font-weight: 700;
  }

  p {
    margin: 0;
  }

  a {
    text-decoration: none;
    color: #0E70DF;
  }

  .shadow-content {
    position: relative;
    background: #FFFFFF;
    width: fit-content;
    height: fit-content;
    min-width: 100%;
  }

  img:not(table img) {
    max-width: 100%;
    height: auto !important;
  }
`

const props = defineProps({
  html: {
    type: String,
    required: true
  }
})

const container = ref(null)
const contentBox = ref(null)
let shadowRoot = null
let resizeObserver = null

function decodeCssEscapes(css) {
  if (!css || !css.includes('\\')) return css
  return String(css).replace(/\\(?:([0-9a-fA-F]{1,6})[ \t\r\n\f]?|([^\r\n\f0-9a-fA-F]))/g, (m, hex, ch) => {
    if (hex) {
      const code = parseInt(hex, 16)
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : ''
    }
    return ch ?? m
  })
}

function sanitizeCssText(css) {
  return decodeCssEscapes(String(css))
    .replace(/<\s*\/?\s*style/gi, '')
    .replace(/@import\b[^;]*(;|$)/gi, '')
    .replace(/\bposition\s*:\s*fixed\b/gi, 'position: relative')
    .replace(/image-set\s*\([^)]*\)/gi, 'none')
    .replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]+))\s*\)/gi, (full, dq, sq, uq) => {
      const val = (dq ?? sq ?? uq ?? '').trim()
      if (/^(https?:)?\/\//i.test(val) && !val.startsWith('/proxy?')) {
        return 'none'
      }
      return full
    })
}

function updateContent() {
  if (!shadowRoot) return

  const style = document.createElement('style')
  style.textContent = HOST_CSS

  const content = document.createElement('div')
  content.className = 'shadow-content'

  const doc = new DOMParser().parseFromString(sanitizeEmailHtml(props.html) || '', 'text/html')
  // 只取 CSSOM 解析后的声明并净化 position:fixed / 外部 url() 追踪。
  if (doc.body?.style?.cssText) {
    content.style.cssText = sanitizeCssText(doc.body.style.cssText)
  }

  for (const node of doc.head.querySelectorAll('style')) {
    const styleEl = document.createElement('style')
    styleEl.textContent = sanitizeCssText(node.textContent || '')
    content.appendChild(styleEl)
  }
  for (const node of [...doc.body.childNodes]) {
    if (node.nodeType === Node.ELEMENT_NODE && BLOCKED_TAGS.has(node.tagName)) continue
    content.appendChild(document.importNode(node, true))
  }
  content.querySelectorAll('script,iframe,object,embed,link,meta,base,frame,form').forEach((node) => node.remove())
  // Sanitize <style> elements inside <body> as well as <head>.
  content.querySelectorAll('style').forEach((styleEl) => {
    if (!styleEl.closest || styleEl.parentElement) {
      styleEl.textContent = sanitizeCssText(styleEl.textContent || '')
    }
  })
  content.querySelectorAll('[style]').forEach((el) => {
    const rawStyle = el.getAttribute('style')
    if (rawStyle) {
      el.setAttribute('style', sanitizeCssText(rawStyle))
    }
  })

  shadowRoot.replaceChildren(style, content)
}

function autoScale() {
  if (!shadowRoot || !contentBox.value) return

  const parent = contentBox.value
  const shadowContent = shadowRoot.querySelector('.shadow-content')

  if (!shadowContent) return

  const hostElement = shadowRoot.host
  hostElement.style.zoom = ''

  const parentWidth = parent.offsetWidth
  const childWidth = shadowContent.scrollWidth

  if (parentWidth <= 0 || childWidth <= 0 || childWidth <= parentWidth) return

  const scale = parentWidth / childWidth
  hostElement.style.zoom = scale
}

onMounted(() => {
  shadowRoot = container.value.attachShadow({ mode: 'open' })
  updateContent()
  autoScale()
  if (contentBox.value && typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(() => autoScale())
    resizeObserver.observe(contentBox.value)
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(() => props.html, () => {
  updateContent()
  autoScale()
})
</script>

<style scoped>
.content-box {
  position: relative;
  contain: layout paint;
  transform: translateZ(0);
  width: 100%;
  height: 100%;
  overflow: hidden;
  font-family: Inter, "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
}

.content-html {
  width: 100%;
  height: 100%;
}
</style>
