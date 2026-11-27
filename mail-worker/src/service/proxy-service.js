import settingService from './setting-service';
import { buildProxyCacheKey, getEdgeCache, putEdgeCache } from '../utils/edge-cache';

// 可能带远程图地址的属性；data-* 覆盖懒加载写法。
const ATTRS = ['src', 'poster', 'background', 'data-src', 'data-original', 'data-lazy-src'];
const ATTR_SET = new Set(ATTRS);
const MEDIA_TAGS = new Set(['img', 'source', 'video', 'audio', 'track', 'input', 'image', 'use', 'feimage']);
const SVG_MEDIA_TAGS = new Set(['image', 'use', 'feimage']);
const SVG_HREF_ATTRS = new Set(['href', 'xlink:href']);

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
const PROXY_EXP_BUCKET = 1800; // 30-minute windows so signed URLs hit browser/CDN caches instead of busting every second
const PROXY_MAX_REDIRECTS = 5;
const PROXY_REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);
const PROXY_TIMEOUT_MS = 10_000;
const PROXY_MAX_BYTES = 10 * 1024 * 1024;
const PROXY_CACHE_MAX_BYTES = 5 * 1024 * 1024;
const encoder = new TextEncoder();
const signingKeyCache = new Map();

const ATTR_REGEX = /\b([a-z][a-z0-9:-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/gi;
const TAG_REGEX = /<([a-z][a-z0-9:-]*)(\s[^>]*?)?(\/?)>/gi;
const CSS_URL_REGEX = /url\(\s*(?:"([^"]*)"|'([^']*)'|([^)"'\s]+))\s*\)/gi;

const NAMED_HTML_ENTITIES = {
	amp: '&',
	quot: '"',
	apos: "'",
	lt: '<',
	gt: '>',
	colon: ':',
	sol: '/',
	nbsp: ' '
};

function decodeAttrValue(val) {
	if (!val || !val.includes('&')) return val;
	return val.replace(/&(?:#(\d+);?|#x([0-9a-f]+);?|([a-z]+);)/gi, (match, dec, hex, named) => {
		if (dec) {
			const code = Number(dec);
			return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
		}
		if (hex) {
			const code = parseInt(hex, 16);
			return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
		}
		const mapped = NAMED_HTML_ENTITIES[named.toLowerCase()];
		return mapped !== undefined ? mapped : match;
	});
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

async function replaceTagBlockAsync(html, tagName, replacer) {
	const openRe = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
	const closeNeedle = `</${tagName}>`;
	const lowerHtml = html.toLowerCase();
	let out = '';
	let lastIdx = 0;
	let match;
	openRe.lastIndex = 0;
	while ((match = openRe.exec(html)) !== null) {
		if (match.index < lastIdx) continue;
		const contentStart = match.index + match[0].length;
		const closeStart = lowerHtml.indexOf(closeNeedle, contentStart);
		if (closeStart === -1) break;
		const closeEnd = closeStart + closeNeedle.length;
		out += html.slice(lastIdx, match.index);
		out += await replacer(html.slice(match.index, closeEnd), match[0], html.slice(contentStart, closeStart), html.slice(closeStart, closeEnd));
		lastIdx = closeEnd;
		openRe.lastIndex = lastIdx;
	}
	if (lastIdx === 0) return html;
	return out + html.slice(lastIdx);
}

function replaceTagBlockSync(html, tagName, replacer) {
	const openRe = new RegExp(`<${tagName}\\b[^>]*>`, 'gi');
	const closeNeedle = `</${tagName}>`;
	const lowerHtml = html.toLowerCase();
	let out = '';
	let lastIdx = 0;
	let match;
	openRe.lastIndex = 0;
	while ((match = openRe.exec(html)) !== null) {
		if (match.index < lastIdx) continue;
		const contentStart = match.index + match[0].length;
		const closeStart = lowerHtml.indexOf(closeNeedle, contentStart);
		if (closeStart === -1) break;
		const closeEnd = closeStart + closeNeedle.length;
		out += html.slice(lastIdx, match.index);
		out += replacer(html.slice(match.index, closeEnd), match[0], html.slice(contentStart, closeStart), html.slice(closeStart, closeEnd));
		lastIdx = closeEnd;
		openRe.lastIndex = lastIdx;
	}
	if (lastIdx === 0) return html;
	return out + html.slice(lastIdx);
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
	async fetchImage(env, params, ctx = null, req = null) {
		if (req && req.method !== 'GET' && req.method !== 'HEAD') {
			return new Response(null, { status: 405 });
		}
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

			const cache = getEdgeCache();
			const cacheKey = cache ? buildProxyCacheKey(target.href) : null;
			if (cache && cacheKey && (!req || req.method === 'GET' || req.method === 'HEAD')) {
				const cached = await cache.match(cacheKey);
				if (cached) {
					if (req?.method === 'HEAD') {
						void cached.body?.cancel?.();
						return new Response(null, { status: cached.status, headers: cached.headers });
					}
					return cached;
				}
			}

			const requestOptions = {
				redirect: 'manual',
				signal: AbortSignal.timeout(PROXY_TIMEOUT_MS),
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

			if ((!res.body && req?.method !== 'HEAD') || !PROXY_MEDIA_TYPES.has(type)) {
				await res.body?.cancel();
				return new Response(null, { status: 415 });
			}

			const length = res.headers.get('Content-Length');
			if (length && /^\d+$/.test(length) && Number(length) > PROXY_MAX_BYTES) {
				await res.body?.cancel();
				return new Response(null, { status: 413 });
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
				headers.set('Content-Disposition', disposition.replace(/[\r\n\0]/g, ''));
			}

			const encoding = res.headers.get('Content-Encoding')?.toLowerCase();

			if (req?.method === 'HEAD') {
				await res.body?.cancel();
				if (length && /^\d+$/.test(length) && Number.isSafeInteger(Number(length)) && (!encoding || encoding === 'identity')) {
					headers.set('Content-Length', length);
				}
				return new Response(null, { status: res.status, headers });
			}

			let body = this.limitStreamBytes(res.body, PROXY_MAX_BYTES);

			// Workers 从固定长度流生成 Content-Length。压缩响应的上游长度可能与解码后的内容不同。
			if (length && /^\d+$/.test(length) && Number.isSafeInteger(Number(length)) && (!encoding || encoding === 'identity')) {
				headers.set('Content-Length', length);
			}

			const response = new Response(body, { status: res.status, headers });
			if (cache && cacheKey && (!req || req.method === 'GET')) {
				putEdgeCache(ctx, cacheKey, response, PROXY_CACHE_MAX_BYTES);
			}
			return response;
		} catch {
			return new Response(null, { status: 502 });
		}
	},

	limitStreamBytes(stream, maxBytes) {
		let total = 0;
		return stream.pipeThrough(new TransformStream({
			transform(chunk, controller) {
				total += chunk.byteLength;
				if (total > maxBytes) {
					controller.error(new Error('Image exceeds size limit'));
					return;
				}
				controller.enqueue(chunk);
			}
		}));
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
		const secret = String(env.jwt_secret);
		let pending = signingKeyCache.get(secret);
		if (!pending) {
			if (signingKeyCache.size >= 4) {
				signingKeyCache.clear();
			}
			const algorithm = { name: 'HMAC', hash: 'SHA-256' };
			pending = (async () => {
				const root = await crypto.subtle.importKey('raw', encoder.encode(secret), algorithm, false, ['sign']);
				// 从现有部署密钥派生图片代理专用密钥。
				const derived = await crypto.subtle.sign('HMAC', root, encoder.encode('cloud-mail/image-proxy/v1'));
				return crypto.subtle.importKey('raw', derived, algorithm, false, ['sign', 'verify']);
			})().catch(err => {
				signingKeyCache.delete(secret);
				throw err;
			});
			signingKeyCache.set(secret, pending);
		}
		return pending;
	},

	signatureInput(url, exp) {
		return encoder.encode(JSON.stringify([url, exp]));
	},

	rewriter(key, r2Domain) {
		const now = Math.floor(Date.now() / 1000);
		const exp = String(Math.ceil(now / PROXY_EXP_BUCKET) * PROXY_EXP_BUCKET + PROXY_LINK_TTL);
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
		const hasExternalAttrs = (attrs, tagName = '') => {
			if (ATTRS.some(attr => isExternal(attrs[attr]))) return true;
			if (SVG_MEDIA_TAGS.has(tagName) && (isExternal(attrs.href) || isExternal(attrs['xlink:href']))) return true;
			return Boolean(attrs.srcset?.split(',').some(candidate => isExternal(candidate.trim().split(/\s+/, 1)[0])));
		};

		const isTrackingImgTag = imgTag => {
			const m = imgTag.match(/^<img\b([^>]*)>/i);
			if (!m) return { tracking: false, external: false };
			const attrs = parseTagAttrs(m[1]);
			const width = this.imageDimensionFromAttrs(attrs, 'width');
			const height = this.imageDimensionFromAttrs(attrs, 'height');
			if (width !== 0 && height !== 0 && !(width === 1 && height === 1)) {
				return { tracking: false, external: false };
			}
			return { tracking: true, external: hasExternalAttrs(attrs, 'img') };
		};

		let result = html;
		if (/<picture\b/i.test(result)) {
			result = replaceTagBlockSync(result, 'picture', pictureBlock => {
				const imgMatch = pictureBlock.match(/<img\b[^>]*>/i);
				if (!imgMatch) return pictureBlock;
				const { tracking, external } = isTrackingImgTag(imgMatch[0]);
				if (!tracking) return pictureBlock;
				if (external) return '';
				const sources = pictureBlock.match(/<source\b[^>]*>/gi) || [];
				const hasExternalSource = sources.some(srcTag => {
					const sm = srcTag.match(/^<source\b([^>]*)>/i);
					return sm ? hasExternalAttrs(parseTagAttrs(sm[1]), 'source') : false;
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
		if (!html || !/https?:\/\/|\/\/|proxy\?|&#|\\|url\s*\(|image-set\s*\(/i.test(html)) {
			return html;
		}

		let result = this.removeTrackingImagesFromHtml(html, r2Domain);

		if (/<style\b/i.test(result)) {
			result = await replaceTagBlockAsync(result, 'style', async (full, open, css, close) => {
				const normalizedCss = decodeCssEscapes(css);
				if (!/url\s*\(|image-set\s*\(/i.test(normalizedCss)) return full;
				const rewritten = await this.rewriteCssUrls(normalizedCss, rewriteUrl);
				return open + rewritten + close;
			});
		}

		result = await replaceAsync(result, TAG_REGEX, async (full, tagName, attrStr, selfClose) => {
			if (!attrStr || !/https?:\/\/|\/\/|proxy\?|&#|\\|url\s*\(|image-set\s*\(/i.test(attrStr)) {
				return full;
			}
			const lowerTag = tagName.toLowerCase();
			const isMedia = MEDIA_TAGS.has(lowerTag);
			const isSvgMedia = SVG_MEDIA_TAGS.has(lowerTag);
			const rewrittenAttrs = await replaceAsync(attrStr, ATTR_REGEX, async (attrFull, name, dq, sq, uq) => {
				const lowerName = name.toLowerCase();
				const quote = dq !== undefined ? '"' : (sq !== undefined ? "'" : '');
				const rawVal = decodeAttrValue(dq ?? sq ?? uq ?? '');

				if (lowerName === 'style') {
					const normalizedStyle = decodeCssEscapes(rawVal);
					if (!/url\s*\(|image-set\s*\(/i.test(normalizedStyle)) return attrFull;
					const nextCss = await this.rewriteCssUrls(normalizedStyle, rewriteUrl);
					if (nextCss === normalizedStyle && normalizedStyle === rawVal) return attrFull;
					return `${name}=${quote || '"'}${encodeAttrValue(nextCss, quote || '"')}${quote || '"'}`;
				}

				if (isMedia && lowerName === 'srcset') {
					const nextSrcset = await this.rewriteSrcset(rawVal, rewriteUrl);
					if (nextSrcset === rawVal) return attrFull;
					return `${name}=${quote || '"'}${encodeAttrValue(nextSrcset, quote || '"')}${quote || '"'}`;
				}

				if (lowerName === 'background' || (isMedia && ATTR_SET.has(lowerName)) || (isSvgMedia && SVG_HREF_ATTRS.has(lowerName))) {
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
			result = replaceTagBlockSync(result, 'style', (full, open, css, close) => {
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
			const isSvgMedia = SVG_MEDIA_TAGS.has(lowerTag);
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
				if (lowerName === 'background' || (isMedia && ATTR_SET.has(lowerName)) || (isSvgMedia && SVG_HREF_ATTRS.has(lowerName))) {
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

	// 改写 style / <style> 中的 url(...) 与 image-set(...)，一般是背景图。
	async rewriteCssUrls(css, rewriteUrl) {
		if (!css || !/url\s*\(|image-set\s*\(/i.test(css)) {
			return css;
		}
		let next = css;
		if (/url\s*\(/i.test(next)) {
			const matches = Array.from(next.matchAll(CSS_URL_REGEX));
			const paths = await Promise.all(matches.map(match => rewriteUrl(match[1] ?? match[2] ?? match[3] ?? '')));
			let index = 0;
			next = next.replace(CSS_URL_REGEX, (match, dq, sq) => {
				const path = paths[index++];
				const quote = dq !== undefined ? '"' : (sq !== undefined ? "'" : '');
				return path ? 'url(' + quote + path + quote + ')' : match;
			});
		}
		if (/image-set\s*\(/i.test(next)) {
			next = await replaceAsync(next, /(image-set\s*\()([^)]*)(\))/gi, async (full, open, inner, close) => {
				const rewrittenInner = await replaceAsync(inner, /"([^"]+)"|'([^']+)'/g, async (strFull, dq, sq) => {
					const rawUrl = dq ?? sq ?? '';
					const path = await rewriteUrl(rawUrl);
					if (!path) return strFull;
					const quote = dq !== undefined ? '"' : "'";
					return `${quote}${path}${quote}`;
				});
				return rewrittenInner === inner ? full : open + rewrittenInner + close;
			});
		}
		return next;
	},

	// 还原 CSS url(...) 里的代理地址。
	restoreCssUrls(css) {
		if (!css || !css.includes('proxy?')) {
			return css;
		}
		return String(css).replace(CSS_URL_REGEX, (match, dq, sq, uq) => {
			const url = dq ?? sq ?? uq ?? '';
			const original = this.fromProxyPath(url);
			if (!original) {
				return match;
			}
			const quote = dq !== undefined ? '"' : (sq !== undefined ? "'" : '');
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
