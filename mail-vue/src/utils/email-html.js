import DOMPurify from 'dompurify'

DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.tagName !== 'A' && node.tagName !== 'AREA') return
    const target = (node.getAttribute('target') || '').trim().toLowerCase()
    if (!target || target === '_self') return
    if (target === '_top' || target === '_parent') {
        node.setAttribute('target', '_blank')
    }
    const rel = new Set((node.getAttribute('rel') || '').split(/\s+/).filter(Boolean))
    rel.add('noopener')
    rel.add('noreferrer')
    node.setAttribute('rel', [...rel].join(' '))
})

export function sanitizeEmailHtml(html) {
    if (!html) return html
    return DOMPurify.sanitize(html, {
        WHOLE_DOCUMENT: true,
        ADD_ATTR: ['target'],
    })
}
