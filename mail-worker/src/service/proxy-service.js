import settingService from './setting-service';

// 可能带远程图地址的属性；data-* 覆盖懒加载写法。
const ATTRS = ['src', 'poster', 'background', 'data-src', 'data-original', 'data-lazy-src'];
const ATTR_SET = new Set(ATTRS);
const MEDIA_TAGS = new Set(['img', 'source', 'video', 'audio', 'track', 'input']);

const PROXY_MEDIA_TYPES = new Set([
	'image/avif', 'image/bmp', 'image/gif', 'image/jpeg', 'image/pjpeg', 'image/png', 'image/webp',
	'image/apng', 'image/x-icon', 'image/vnd.microsoft.icon'
]);

const PROXY_IMAGE_EXTENSIONS = new Map([
	['avif', 'image/avif'], ['bmp', 'image/bmp'], ['gif', 'image/gif'],
	['jpg', 'image/jpeg'], ['jpeg', 'image/jpeg'], ['jpe', 'image/jpeg'], ['jfif', 'image/jpeg'],
	['pjpeg', 'image/pjpeg'], ['png', 'image/png'], ['webp', 'image/webp'],
	['apng', 'image/apng'], ['ico', 'image/x-icon']
]);

const PROXY_IP_PLACEHOLDER = '192.0.2.1';
const PROXY_LINK_TTL = 3600;
const PROXY_MAX_REDIRECTS = 5;
const PROXY_REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const encoder = new TextEncoder();

const ATTR_REGEX = /\b([a-z][a-z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
const TAG_REGEX = /<([a-z][a-z0-9:-]*)(\s[^>]*?)?(\/?)>/gi;
const STYLE_TAG_REGEX = /(<style\b[^>]*>)([\s\S]*?)(<\/style>)/gi;

function decodeAttrValue(val) {
	if (!val || !val.includes('&')) return val;
	return val
		.replace(/&amp;/gi, '&')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;|&apos;/gi, "'")
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>');
}

function encodeAttrValue(val, quote) {
	let out = String(val).replace(/&/g, '&amp;');
	if (quote === '"') return out.replace(/"/g, '&quot;');
	if (quote === "'") return out.replace(/'/g, '&#39;');
	return out;
}

async function replaceAsync(str, regex, asyncFn) {
	const matches = [];
	str.replace(regex, (...args) => {
		matches.push(args);
		return args[0];
	});
	if (!matches.length) return str;
	const replacements = await Promise.all(matches.map(args => asyncFn(...args)));
	let idx = 0;
	return str.replace(regex, () => replacements[idx++]);
}

function extractCssProp(style, propName) {
	if (!style) return '';
	const m = style.match(new RegExp(`(?:^|;)\\s*${propName}\\s*:\\s*([^;]+)`, 'i'));
	return m ? m[1] : '';
}

function parseTagAttrs(attrStr) {
	const map = Object.create(null);
	if (!attrStr) return map;
	ATTR_REGEX.lastIndex = 0;
	let m;
	while ((m = ATTR_REGEX.exec(attrStr)) !== null) {
		const name = m[1].toLowerCase();
		const val = m[2] ?? m[3] ?? m[4] ?? '';
		if (!(name in map)) {
			map[name] = decodeAttrValue(val);
		}
	}
	return map;
}

const proxyService = {

	// 改写单封邮件 HTML：内部读取 R2 域名，把外链图换成 /proxy?url=。
	// 不写回数据库，只影响本次查询响应。CID / data / 本站附件不改。
	async rewriteHtml(c, html) {
		if (!html) {
			return html;
		}
		const { r2Domain } = await settingService.query(c);
		return this.applyRewrite(html, this.rewriter(await this.signingKey(c.env), r2Domain), r2Domain);
	},

	// 批量改写邮件列表的 content，R2 域名与签名密钥只查一次。
	async rewriteList(c, list) {
		if (!list?.length) {
			return list;
		}
		const { r2Domain } = await settingService.query(c);
		const rewriteUrl = this.rewriter(await this.signingKey(c.env), r2Domain);
		for (const item of list) {
			if (!item.content) {
				continue;
			}
			item.content = await this.applyRewrite(item.content, rewriteUrl, r2Domain);
		}
		return list;
	},

	// 发出邮件前把 /proxy?url= 还原成原始外链，避免引用正文把代理地址带给收件人。
	restoreHtml(html) {
		if (!html) {
			return html;
		}
		return this.applyRestore(html);
	},

	// Worker 入口 /proxy：验签后代拉，只返回允许的图片类型。
	async fetchImage(env, params) {
		const rawUrl = params.get('url');
		const exp = params.get('exp');
		const signature = this.decodeSignature(params.get('sig'));
		if (!rawUrl || !/^[1-9]\d{0,12}$/.test(exp) || Number(exp) <= Math.floor(Date.now() / 1000) ||
			!signature) {
			return new Response(null, { status: 403 });
		}
		try {

			const key = await this.signingKey(env);
			const valid = await crypto.subtle.verify('HMAC', key, signature, this.signatureInput(rawUrl, exp));
			if (!valid) {
				return new Response(null, { status: 403 });
			}

			let target = this.proxyTarget(rawUrl);

			if (!target) {
				return new Response(null, { status: 400 });
			}

			const requestOptions = {
				redirect: 'manual',
				// 使用文档保留地址覆盖可修改的访客 IP 头。
				headers: {
					'X-Real-IP': PROXY_IP_PLACEHOLDER,
					'CF-Connecting-IP': PROXY_IP_PLACEHOLDER
				}
			};

			let res = await fetch(target.href, requestOptions);

			for (let redirects = 0; PROXY_REDIRECT_STATUSES.has(res.status); redirects++) {
				const location = res.headers.get('Location');
				await res.body?.cancel();
				if (redirects >= PROXY_MAX_REDIRECTS) {
					return new Response(null, { status: 502 });
				}
				target = this.proxyTarget(location, target);
				if (!target) {
					return new Response(null, { status: 502 });
				}
				res = await fetch(target.href, requestOptions);
			}

			if (!res.ok) {
				await res.body?.cancel();
				return new Response(null, { status: 502 });
			}

			let type = res.headers.get('Content-Type')?.split(';')[0].trim().toLowerCase();

			if (!type || type === 'application/octet-stream') {
				// 仅在响应类型缺失或通用时，按最终 URL 的路径后缀推导。
				const extension = target.pathname.toLowerCase().match(/\.([a-z0-9]+)$/)?.[1];
				type = PROXY_IMAGE_EXTENSIONS.get(extension);
			}

			if (!res.body || !PROXY_MEDIA_TYPES.has(type)) {
				await res.body?.cancel();
				return new Response(null, { status: 415 });
			}

			const headers = new Headers({
				'Content-Type': type,
				'X-Content-Type-Options': 'nosniff',
				'Content-Security-Policy': "sandbox; default-src 'none'",
				'Referrer-Policy': 'no-referrer',
				'Cache-Control': 'public, max-age=3600'
			});

			const disposition = res.headers.get('Content-Disposition');
			if (disposition) {
				headers.set('Content-Disposition', disposition);
			}

			let body = res.body;
			const length = res.headers.get('Content-Length');
			const encoding = res.headers.get('Content-Encoding')?.toLowerCase();

			// Workers 从固定长度流生成 Content-Length。压缩响应的上游长度可能与解码后的内容不同。
			if (length && /^\d+$/.test(length) && Number.isSafeInteger(Number(length)) && (!encoding || encoding === 'identity')) {
				const { readable, writable } = new FixedLengthStream(Number(length));
				// 传输错误会通过 readable 传给客户端。
				body.pipeTo(writable).catch(() => {});
				body = readable;
			}

			return new Response(body, { status: res.status, headers });
		} catch {
			return new Response(null, { status: 502 });
		}
	},

	// ---------- 私有方法 ----------

	decodeSignature(sig) {
		// 32 字节的 Base64URL 签名末字符只有高 4 位有效。
		if (!sig || !/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(sig)) {
			return null;
		}
		const base64 = sig.replaceAll('-', '+').replaceAll('_', '/') + '=';
		return Uint8Array.from(atob(base64), ch => ch.charCodeAt(0));
	},

	async signingKey(env) {
		if (!env.jwt_secret) {
			throw new Error('Missing jwt_secret for image proxy');
		}
		const algorithm = { name: 'HMAC', hash: 'SHA-256' };
		const root = await crypto.subtle.importKey('raw', encoder.encode(env.jwt_secret), algorithm, false, ['sign']);
		// 从现有部署密钥派生图片代理专用密钥。
		const key = await crypto.subtle.sign('HMAC', root, encoder.encode('cloud-mail/image-proxy/v1'));
		return crypto.subtle.importKey('raw', key, algorithm, false, ['sign', 'verify']);
	},

	signatureInput(url, exp) {
		return encoder.encode(JSON.stringify([url, exp]));
	},

	rewriter(key, r2Domain) {
		const exp = String(Math.floor(Date.now() / 1000) + PROXY_LINK_TTL);
		const cache = new Map();
		return raw => {
			if (!raw) return null;
			const restored = this.fromProxyPath(raw);
			const url = restored || (this.shouldProxyUrl(raw, r2Domain) ? this.absoluteUrl(raw) : null);
			if (!url) return null;
			let pending = cache.get(url);
			if (!pending) {
				pending = this.toProxyPath(url, exp, key);
				cache.set(url, pending);
			}
			return pending;
		};
	},

	proxyTarget(rawUrl, base) {
		if (!rawUrl?.trim()) {
			return null;
		}
		try {
			const url = new URL(rawUrl, base);
			const host = url.hostname.replace(/\.$/, '');
			if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
				return null;
			}
			// 过滤 IP 字面量和本地域名，不解析 DNS 记录。
			if (!host.includes('.') || host.startsWith('[') || /^[\d.]+$/.test(host) ||
				/\.(localhost|local|internal)$/.test(host)) {
				return null;
			}
			return url;
		} catch {
			return null;
		}
	},

	// 优先读取内联样式，再回退到对应的 HTML 属性。
	// 仅识别过滤规则所需的 0 和 1px，其余值返回 undefined。
	imageDimensionFromAttrs(attrs, name) {
		const rawVal = extractCssProp(attrs.style, name) || attrs[name] || '';
		const value = rawVal.replace(/\s*!important$/i, '').trim();
		if (/^(?:0+(?:\.0+)?|\.0+)(?:px|%)?$/i.test(value)) {
			return 0;
		}
		if (/^0*1(?:\.0+)?(?:px)?$/i.test(value)) {
			return 1;
		}
	},

	// 在生成代理链接前移除疑似追踪图：宽或高为 0，或宽高均为 1px 的外链图片。
	removeTrackingImagesFromHtml(html, r2Domain) {
		if (!/<img\b/i.test(html)) {
			return html;
		}
		const isExternal = url => this.fromProxyPath(url) || this.shouldProxyUrl(url, r2Domain);
		const hasExternalAttrs = attrs => ATTRS.some(attr => isExternal(attrs[attr])) ||
			Boolean(attrs.srcset?.split(',').some(candidate => isExternal(candidate.trim().split(/\s+/, 1)[0])));

		const isTrackingImgTag = imgTag => {
			const m = imgTag.match(/^<img\b([^>]*)>/i);
			if (!m) return { tracking: false, external: false };
			const attrs = parseTagAttrs(m[1]);
			const width = this.imageDimensionFromAttrs(attrs, 'width');
			const height = this.imageDimensionFromAttrs(attrs, 'height');
			if (width !== 0 && height !== 0 && !(width === 1 && height === 1)) {
				return { tracking: false, external: false };
			}
			return { tracking: true, external: hasExternalAttrs(attrs) };
		};

		let result = html;
		if (/<picture\b/i.test(result)) {
			result = result.replace(/<picture\b[^>]*>[\s\S]*?<\/picture>/gi, pictureBlock => {
				const imgMatch = pictureBlock.match(/<img\b[^>]*>/i);
				if (!imgMatch) return pictureBlock;
				const { tracking, external } = isTrackingImgTag(imgMatch[0]);
				if (!tracking) return pictureBlock;
				if (external) return '';
				const sources = pictureBlock.match(/<source\b[^>]*>/gi) || [];
				const hasExternalSource = sources.some(srcTag => {
					const sm = srcTag.match(/^<source\b([^>]*)>/i);
					return sm ? hasExternalAttrs(parseTagAttrs(sm[1])) : false;
				});
				return hasExternalSource ? '' : pictureBlock;
			});
		}

		return result.replace(/<img\b[^>]*>/gi, imgTag => {
			const { tracking, external } = isTrackingImgTag(imgTag);
			return tracking && external ? '' : imgTag;
		});
	},

	// 零 DOM 解析快速改写 HTML，把 img/srcset/CSS url 等外链改成带签名的同源代理地址。
	async applyRewrite(html, rewriteUrl, r2Domain) {
		if (!html || !/https?:\/\/|\/\/|proxy\?/i.test(html)) {
			return html;
		}

		let result = this.removeTrackingImagesFromHtml(html, r2Domain);

		if (/<style\b/i.test(result) && /url\s*\(/i.test(result)) {
			result = await replaceAsync(result, STYLE_TAG_REGEX, async (full, open, css, close) => {
				if (!/url\s*\(/i.test(css)) return full;
				const rewritten = await this.rewriteCssUrls(css, rewriteUrl);
				return open + rewritten + close;
			});
		}

		result = await replaceAsync(result, TAG_REGEX, async (full, tagName, attrStr, selfClose) => {
			if (!attrStr || !/https?:\/\/|\/\/|proxy\?|url\s*\(/i.test(attrStr)) {
				return full;
			}
			const lowerTag = tagName.toLowerCase();
			const isMedia = MEDIA_TAGS.has(lowerTag);
			const rewrittenAttrs = await replaceAsync(attrStr, ATTR_REGEX, async (attrFull, name, dq, sq, uq) => {
				const lowerName = name.toLowerCase();
				const quote = dq !== undefined ? '"' : (sq !== undefined ? "'" : '');
				const rawVal = decodeAttrValue(dq ?? sq ?? uq ?? '');

				if (lowerName === 'style') {
					if (!/url\s*\(/i.test(rawVal)) return attrFull;
					const nextCss = await this.rewriteCssUrls(rawVal, rewriteUrl);
					if (nextCss === rawVal) return attrFull;
					return `${name}=${quote || '"'}${encodeAttrValue(nextCss, quote || '"')}${quote || '"'}`;
				}

				if (isMedia && lowerName === 'srcset') {
					const nextSrcset = await this.rewriteSrcset(rawVal, rewriteUrl);
					if (nextSrcset === rawVal) return attrFull;
					return `${name}=${quote || '"'}${encodeAttrValue(nextSrcset, quote || '"')}${quote || '"'}`;
				}

				if (lowerName === 'background' || (isMedia && ATTR_SET.has(lowerName))) {
					const nextPath = await rewriteUrl(rawVal);
					if (!nextPath) return attrFull;
					return `${name}=${quote || '"'}${encodeAttrValue(nextPath, quote || '"')}${quote || '"'}`;
				}

				return attrFull;
			});

			if (rewrittenAttrs === attrStr) return full;
			return `<${tagName}${rewrittenAttrs}${selfClose}>`;
		});

		return result;
	},

	// 把正文里的 /proxy?url= 还原成原始地址。
	applyRestore(html) {
		if (!html || !html.includes('proxy?')) {
			return html;
		}

		let result = html;
		if (/<style\b/i.test(result)) {
			result = result.replace(STYLE_TAG_REGEX, (full, open, css, close) => {
				if (!css.includes('proxy?')) return full;
				return open + this.restoreCssUrls(css) + close;
			});
		}

		return result.replace(TAG_REGEX, (full, tagName, attrStr, selfClose) => {
			if (!attrStr || !attrStr.includes('proxy?')) {
				return full;
			}
			const lowerTag = tagName.toLowerCase();
			const isMedia = MEDIA_TAGS.has(lowerTag);
			const restoredAttrs = attrStr.replace(ATTR_REGEX, (attrFull, name, dq, sq, uq) => {
				const lowerName = name.toLowerCase();
				const quote = dq !== undefined ? '"' : (sq !== undefined ? "'" : '');
				const rawVal = decodeAttrValue(dq ?? sq ?? uq ?? '');
				if (!rawVal.includes('proxy?')) return attrFull;

				if (lowerName === 'style') {
					const nextCss = this.restoreCssUrls(rawVal);
					return nextCss === rawVal ? attrFull : `${name}=${quote || '"'}${encodeAttrValue(nextCss, quote || '"')}${quote || '"'}`;
				}
				if (isMedia && lowerName === 'srcset') {
					const nextSrcset = this.restoreSrcset(rawVal);
					return nextSrcset === rawVal ? attrFull : `${name}=${quote || '"'}${encodeAttrValue(nextSrcset, quote || '"')}${quote || '"'}`;
				}
				if (lowerName === 'background' || (isMedia && ATTR_SET.has(lowerName))) {
					const original = this.fromProxyPath(rawVal);
					return original ? `${name}=${quote || '"'}${encodeAttrValue(original, quote || '"')}${quote || '"'}` : attrFull;
				}
				return attrFull;
			});
			return restoredAttrs === attrStr ? full : `<${tagName}${restoredAttrs}${selfClose}>`;
		});
	},

	// 拼浏览器可直接请求的签名代理地址。
	async toProxyPath(url, exp, key) {
		const signature = await crypto.subtle.sign('HMAC', key, this.signatureInput(url, exp));
		const sig = btoa(String.fromCharCode(...new Uint8Array(signature)))
			.replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
		return '/proxy?' + new URLSearchParams({ url, exp, sig });
	},

	// 从新旧代理链接中还原原图地址，兼容编辑器输出的相对地址。
	fromProxyPath(raw) {
		if (!raw || !String(raw).includes('proxy?')) {
			return null;
		}
		try {
			const path = new URL(raw, 'https://proxy.invalid/');
			if (path.pathname !== '/proxy') {
				return null;
			}
			const original = path.searchParams.get('url');
			return /^https?:\/\//i.test(original || '') ? original : null;
		} catch {
			return null;
		}
	},

	// 协议相对地址 //cdn.example/a.png 补成 https:。
	absoluteUrl(value) {
		const trimmed = String(value).trim();
		if (trimmed.startsWith('//')) {
			return 'https:' + trimmed;
		}
		return trimmed;
	},

	// 只代理 http(s) 外链；跳过 CID、data/blob、本站附件、已代理地址、自有 R2。
	shouldProxyUrl(raw, r2Domain) {
		if (!raw) {
			return false;
		}
		const value = String(raw).trim();
		if (!value || value.startsWith('{{domain}}') || /^(data:|blob:|cid:)/i.test(value)) {
			return false;
		}
		if (value.includes('proxy?url=')) {
			return false;
		}
		if (value.startsWith('//')) {
			return this.shouldProxyUrl('https:' + value, r2Domain);
		}
		if (!/^[a-z][a-z0-9+.-]*:/i.test(value)) {
			return false;
		}

		let parsed;
		try {
			parsed = new URL(value);
		} catch {
			return false;
		}
		if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
			return false;
		}
		const origin = this.r2Origin(r2Domain);
		return !(origin && parsed.origin === origin);
	},

	// 改写 srcset 里每一段 URL，保留 1x / 2x 等描述符。
	async rewriteSrcset(srcset, rewriteUrl) {
		const parts = await Promise.all(String(srcset).split(',').map(async part => {
			const bits = part.trim().split(/\s+/);
			const path = await rewriteUrl(bits[0]);
			if (path) {
				bits[0] = path;
			}
			return bits.join(' ');
		}));
		return parts.join(', ');
	},

	// 还原 srcset 里每一段代理地址。
	restoreSrcset(srcset) {
		return String(srcset).split(',').map(part => {
			const bits = part.trim().split(/\s+/);
			const original = this.fromProxyPath(bits[0]);
			if (original) {
				bits[0] = original;
			}
			return bits.join(' ');
		}).join(', ');
	},

	// 改写 style / <style> 中的 url(...)，一般是背景图。
	async rewriteCssUrls(css, rewriteUrl) {
		if (!css || !/url\s*\(/i.test(css)) {
			return css;
		}
		const pattern = /url\(\s*(['"]?)(.*?)\1\s*\)/gi;
		const paths = await Promise.all(Array.from(css.matchAll(pattern), match => rewriteUrl(match[2])));
		let index = 0;
		return css.replace(pattern, (match, quote) => {
			const path = paths[index++];
			return path ? 'url(' + quote + path + quote + ')' : match;
		});
	},

	// 还原 CSS url(...) 里的代理地址。
	restoreCssUrls(css) {
		if (!css || !css.includes('proxy?')) {
			return css;
		}
		return String(css).replace(/url\(\s*(['"]?)(.*?)\1\s*\)/gi, (match, quote, url) => {
			const original = this.fromProxyPath(url);
			if (!original) {
				return match;
			}
			return `url(${quote}${original}${quote})`;
		});
	},

	// 把配置里的 R2 域名收成 origin，用来识别自有对象存储上的图。
	r2Origin(r2Domain) {
		if (!r2Domain) {
			return '';
		}
		try {
			const withScheme = /^https?:\/\//i.test(r2Domain) ? r2Domain : `https://${r2Domain}`;
			return new URL(withScheme).origin;
		} catch {
			return '';
		}
	}
};

export default proxyService;
