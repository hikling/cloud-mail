import app from './hono/webs';
import { email } from './email/email';
import emailService from './service/email-service';
import r2Service from './service/r2-service';
import oauthService from './service/oauth-service';
import analysisService from './service/analysis-service';
import { handleWsUpgrade } from './websocket/connect';
import { getWsUser } from './websocket/auth';
import proxyService from './service/proxy-service';
import constant from './const/constant';
import { buildAssetCacheKey, isPublicAssetKey, matchAssetCache, putEdgeCache } from './utils/edge-cache';
import { PRIVATE_ASSET_CACHE_CONTROL, verifyAssetSignature } from './utils/asset-sign';
export { MailHub } from './websocket/hub'; // Durable Object 必须从 Worker 入口导出

async function servePublicAsset(req, env, ctx, key) {
	if (!isPublicAssetKey(key) || !key.startsWith('static/')) {
		return new Response('Not Found', { status: 404 });
	}
	if (req.method !== 'GET' && req.method !== 'HEAD') {
		return new Response('Method Not Allowed', { status: 405 });
	}

	const cacheKey = buildAssetCacheKey(key);
	const cached = await matchAssetCache(req, cacheKey);
	if (cached) {
		return cached;
	}

	const resp = await r2Service.toObjResp({ env }, key);
	if (!resp) {
		return new Response('Not Found', { status: 404 });
	}
	if (req.method === 'HEAD') {
		void resp.body?.cancel?.();
		return new Response(null, { status: resp.status, headers: resp.headers });
	}
	putEdgeCache(ctx, cacheKey, resp);
	return resp;
}

async function servePrivateAttachment(req, env, url, key) {
	if (!isPublicAssetKey(key) || !key.startsWith('attachments/')) {
		return new Response('Not Found', { status: 404 });
	}
	if (req.method !== 'GET' && req.method !== 'HEAD') {
		return new Response('Method Not Allowed', { status: 405 });
	}

	const sigValid = await verifyAssetSignature(env, key, url.searchParams);
	if (!sigValid) {
		const headerUser = await getWsUser(env, req.headers.get(constant.TOKEN_HEADER));
		if (!headerUser?.userId) {
			return new Response('Forbidden', {
				status: 403,
				headers: { 'Cache-Control': 'no-store' }
			});
		}
	}

	const resp = await r2Service.toObjResp({ env }, key);
	if (!resp) {
		return new Response('Not Found', { status: 404 });
	}

	const headers = new Headers(resp.headers);
	headers.set('Cache-Control', PRIVATE_ASSET_CACHE_CONTROL);

	if (req.method === 'HEAD') {
		void resp.body?.cancel?.();
		return new Response(null, { status: resp.status, headers });
	}
	return new Response(resp.body, { status: resp.status, headers });
}

export default {
	 async fetch(req, env, ctx) {

		const url = new URL(req.url)

		// WebSocket：浏览器连 /realtime，转到 MailHub Durable Object
		if (url.pathname === '/realtime') {
			return handleWsUpgrade(req, env);
		}

		// 邮件图片代理：校验链接签名后，由 Worker 代拉外链图。
		if (url.pathname === '/proxy') {
			return proxyService.fetchImage(env, url.searchParams, ctx, req);
		}

		if (url.pathname.startsWith('/api/')) {
			url.pathname = url.pathname.replace('/api', '')
			req = new Request(url.toString(), req)
			return app.fetch(req, env, ctx);
		}

		if (url.pathname.startsWith('/oss/')) {
			const key = url.pathname.slice('/oss/'.length);
			return key.startsWith('attachments/')
				? servePrivateAttachment(req, env, url, key)
				: servePublicAsset(req, env, ctx, key);
		}

		if (url.pathname.startsWith('/attachments/')) {
			return servePrivateAttachment(req, env, url, url.pathname.substring(1));
		}

		if (url.pathname.startsWith('/static/')) {
			return servePublicAsset(req, env, ctx, url.pathname.substring(1));
		}

		return env.assets.fetch(req);
	},
	email: email,
	async scheduled(c, env, ctx) {
		const invocationCtx = { env };
		await emailService.completeReceiveAll(invocationCtx)
		await emailService.autoClean(invocationCtx)
		await analysisService.refreshEchartsCache(invocationCtx)
		await oauthService.clearNoBindOathUser(invocationCtx)
	},
};
