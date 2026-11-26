// 公开对象（/oss、/attachments、/static）的响应头。
// 只允许栅格图 inline；SVG/HTML 等一律当附件，并加 nosniff + CSP sandbox。
export const ATT_CACHE_CONTROL = 'public, max-age=14400';
export const IMMUTABLE_CACHE_CONTROL = 'public, max-age=31536000, immutable';

const SAFE_INLINE_TYPES = new Set([
	'image/jpeg',
	'image/jpg',
	'image/png',
	'image/gif',
	'image/webp',
	'image/avif',
	'image/bmp',
	'image/x-icon',
	'image/vnd.microsoft.icon'
]);

export function mimeTypeOf(contentType) {
	if (!contentType) {
		return '';
	}
	return String(contentType).split(';')[0].trim().toLowerCase();
}

export function isSafeInlineAtt(contentType) {
	return SAFE_INLINE_TYPES.has(mimeTypeOf(contentType));
}

export function isDangerousAttType(contentType) {
	const type = mimeTypeOf(contentType);
	return /svg|html|xml|javascript|ecmascript/.test(type);
}

export function sanitizeDispositionFilename(filename = 'file') {
	return String(filename)
		.replace(/[\r\n\0"\\]/g, '_')
		.replace(/[;/]/g, '_')
		.trim() || 'file';
}

export function publicFileHeaders({ contentType, contentDisposition, cacheControl, etag, contentLength } = {}) {
	const type = mimeTypeOf(contentType);
	const safeInline = SAFE_INLINE_TYPES.has(type);
	const headers = {
		'Content-Type': isDangerousAttType(type) || !type
			? 'application/octet-stream'
			: contentType,
		'Content-Disposition': safeInline
			? (contentDisposition || 'inline')
			: toAttachmentDisposition(contentDisposition),
		'X-Content-Type-Options': 'nosniff',
		'Content-Security-Policy': 'sandbox',
		'Cache-Control': cacheControl || ATT_CACHE_CONTROL
	};
	if (Number.isFinite(contentLength) && contentLength >= 0) {
		headers['Content-Length'] = String(contentLength);
	}
	if (etag) {
		headers['ETag'] = etag.startsWith('"') || etag.startsWith('W/"') ? etag : `"${etag}"`;
	}
	return headers;
}

function toAttachmentDisposition(disposition) {
	if (!disposition) {
		return 'attachment';
	}
	const value = String(disposition).replace(/[\r\n\0]/g, '');
	if (/^\s*inline\b/i.test(value)) {
		return value.replace(/^\s*inline/i, 'attachment');
	}
	if (/^\s*attachment\b/i.test(value)) {
		return value;
	}
	return `attachment; ${value}`;
}
