import { parseHTML } from 'linkedom';

const BLOCKED_TAGS = new Set(['SCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'LINK', 'META', 'BASE', 'FRAME', 'FORM']);
const URL_ATTRS = new Set(['href', 'src', 'xlink:href', 'action', 'formaction', 'poster', 'background']);
const SAFE_DATA_IMAGE_RE = /^data:image\/(?:png|jpe?g|gif|webp|avif|bmp|x-icon);base64,/i;

function isUnsafeScheme(value, attrName) {
	// Strip whitespace and ASCII control characters so \x00-\x1f cannot evade scheme checks.
	const normalized = String(value || '').replace(/[\u0000-\u0020\u007f]+/g, '').toLowerCase();
	if (/^(?:javascript|vbscript):/.test(normalized)) {
		return true;
	}
	if (normalized.startsWith('data:')) {
		return !(attrName === 'src' && SAFE_DATA_IMAGE_RE.test(normalized));
	}
	return false;
}

export default function emailHtmlTemplate(html, nonce = '') {

	const raw = String(html || '');
	const hasDocumentShell = /<(?:html|body)\b/i.test(raw);
	const { document } = parseHTML(hasDocumentShell ? raw : `<!DOCTYPE html><html><body>${raw}</body></html>`);
	document.querySelectorAll('script, iframe, object, embed, link, meta, base, frame, form').forEach(node => node.remove());
	// 去掉内联事件、危险协议与所有元素样式中的外链 url/fixed 定位。
	document.querySelectorAll('*').forEach(el => {
		if (BLOCKED_TAGS.has(el.tagName)) {
			el.remove();
			return;
		}
		for (const name of el.getAttributeNames()) {
			const lower = name.toLowerCase();
			if (lower.startsWith('on') || lower === 'srcdoc') {
				el.removeAttribute(name);
				continue;
			}
			if (lower === 'style') {
				const safeStyle = sanitizeCssText(el.getAttribute(name) || '');
				if (safeStyle) {
					el.setAttribute('style', safeStyle);
				} else {
					el.removeAttribute(name);
				}
				continue;
			}
			if (!URL_ATTRS.has(lower)) {
				continue;
			}
			const value = el.getAttribute(name) || '';
			if (isUnsafeScheme(value, lower)) {
				el.removeAttribute(name);
			}
		}
	});
	document.querySelectorAll('style').forEach(styleEl => {
		styleEl.textContent = sanitizeCssText(styleEl.textContent || '');
	});
	const headStyles = Array.from(document.head?.querySelectorAll('style') || [])
		.map(s => `<style>${s.textContent}</style>`)
		.join('');
	const bodyStyle = sanitizeCssText(document.body?.getAttribute('style') || '');
	const bodyContent = document.body ? document.body.innerHTML : document.toString();
	const bodyHtml = `${headStyles}${bodyContent}`.replace(/{{domain}}/g, '/');
	const safeHtmlJson = JSON.stringify(bodyHtml).replace(/</g, '\\u003C');
	const safeBodyStyleJson = JSON.stringify(bodyStyle).replace(/</g, '\\u003C');
	const nonceAttr = nonce ? ` nonce="${nonce}"` : '';

	return `<!DOCTYPE html>
<html lang='en' >
<head>
    <meta charset='UTF-8'>
    <meta name='viewport' content='width=device-width, initial-scale=1.0'>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
            background: #FFF;
        }

        .content-box {
            padding: 15px 10px;
            width: 100%;
            height: 100%;
            overflow: auto;
            font-family: Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        .content-html {
            width: 100%;
            height: 100%;
        }
    </style>
</head>
<body>
    <div class='content-box'>
        <div id='container' class='content-html'></div>
    </div>

    <script${nonceAttr}>

        function renderHTML(bodyHtml, bodyStyle) {
            const container = document.getElementById('container');
            const shadowRoot = container.attachShadow({ mode: 'open' });

            const style = document.createElement('style');
            style.textContent = \`
                :host {
                    all: initial;
                    width: 100%;
                    height: 100%;
                    font-family: Inter, -apple-system, BlinkMacSystemFont,
                                'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                    font-size: 14px;
                    line-height: 1.5;
                    color: #13181D;
                    word-break: break-word;
                    overflow: auto;
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
                    max-width: 100% !important;
                    height: auto !important;
                }
            \`;

            const wrapper = document.createElement('div');
            wrapper.className = 'shadow-content';
            if (bodyStyle) {
                wrapper.style.cssText = bodyStyle;
            }
            wrapper.innerHTML = bodyHtml;

            shadowRoot.replaceChildren(style, wrapper);
            autoScale(shadowRoot, container);
        }

        function autoScale(shadowRoot, container) {

            if (!shadowRoot || !container) return;

            const parent = container;
            const shadowContent = shadowRoot.querySelector('.shadow-content');

            if (!shadowContent) return;

            const parentWidth = parent.offsetWidth;
            const childWidth = shadowContent.scrollWidth;

            if (childWidth === 0) return;

            const scale = parentWidth / childWidth;

            const hostElement = shadowRoot.host;
            hostElement.style.zoom = scale;
        }

        renderHTML(${safeHtmlJson}, ${safeBodyStyleJson});
    </script>
</body>
</html>`;
}

function decodeCssEscapes(css) {
	if (!css || !css.includes('\\')) return css;
	return String(css).replace(/\\(?:([0-9a-fA-F]{1,6})[ \t\r\n\f]?|([^\r\n\f0-9a-fA-F]))/g, (m, hex, ch) => {
		if (hex) {
			const code = parseInt(hex, 16);
			return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
		}
		return ch ?? m;
	});
}

function sanitizeCssText(css) {
	return decodeCssEscapes(String(css))
		.replace(/<\s*\/?\s*style/gi, '')
		.replace(/@import\b[^;]*(;|$)/gi, '')
		.replace(/\bposition\s*:\s*fixed\b/gi, 'position: relative')
		.replace(/image-set\s*\([^)]*\)/gi, 'none')
		.replace(/url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]+))\s*\)/gi, (full, dq, sq, uq) => {
			const val = (dq ?? sq ?? uq ?? '').trim();
			if (/^(https?:)?\/\//i.test(val) && !val.startsWith('/proxy?')) {
				return 'none';
			}
			return full;
		});
}
