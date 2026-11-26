const MAX_EDGE_CACHE_BYTES = 10 * 1024 * 1024;

export function isPublicAssetKey(key) {
	if (!key || typeof key !== 'string') return false;
	if (key.includes('..') || key.includes('\\') || key.startsWith('/')) return false;
	return key.startsWith('attachments/') || key.startsWith('static/');
}

export function buildAssetCacheKey(key) {
	return new Request(`https://assets-cache.cloudmail.internal/${key}`, { method: 'GET' });
}

export function buildProxyCacheKey(targetUrl) {
	return new Request(`https://proxy-cache.cloudmail.internal/img?url=${encodeURIComponent(targetUrl)}`, { method: 'GET' });
}

export function getEdgeCache() {
	return typeof caches !== 'undefined' && caches?.default ? caches.default : null;
}

export async function matchAssetCache(req, cacheKey) {
	const cache = getEdgeCache();
	if (!cache || (req.method !== 'GET' && req.method !== 'HEAD')) return null;

	const cached = await cache.match(cacheKey);
	if (!cached) return null;

	const ifNoneMatch = req.headers.get('If-None-Match');
	const etag = cached.headers.get('ETag');
	if (ifNoneMatch && etag && etagMatches(ifNoneMatch, etag)) {
		void cached.body?.cancel?.();
		return new Response(null, { status: 304, headers: cached.headers });
	}
	if (req.method === 'HEAD') {
		void cached.body?.cancel?.();
		return new Response(null, { status: cached.status, headers: cached.headers });
	}
	return cached;
}

export function putEdgeCache(ctx, cacheKey, resp, maxBytes = MAX_EDGE_CACHE_BYTES) {
	const cache = getEdgeCache();
	if (!cache || !resp || !resp.ok || resp.status !== 200) return;

	const lenHeader = resp.headers.get('Content-Length');
	if (lenHeader && Number(lenHeader) > maxBytes) return;

	const task = cache.put(cacheKey, resp.clone()).catch(() => {});
	if (ctx && typeof ctx.waitUntil === 'function') {
		ctx.waitUntil(task);
	}
}

export function etagMatches(ifNoneMatch, etag) {
	if (!ifNoneMatch || !etag) return false;
	const cleanTarget = etag.replace(/^W\//, '').replace(/^"|"$/g, '');
	return ifNoneMatch.split(',').some(part => {
		const token = part.trim();
		if (token === '*') return true;
		return token.replace(/^W\//, '').replace(/^"|"$/g, '') === cleanTarget;
	});
}
