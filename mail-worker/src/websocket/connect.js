import { buildSessionTag, canWatchAllEmail, getWsUser, hasValidWsOrigin } from './auth';
import { ALL_EMAIL_HUB } from './notify';
import constant from '../const/constant';

// 鉴权失败用 WebSocket 关闭码 4401，前端可据此停止重连（浏览器读不到握手阶段的 HTTP 401）。
const CLOSE_UNAUTHORIZED = 4401;

function extractWsAuth(request, url) {
	const headerToken = request.headers.get(constant.TOKEN_HEADER);
	if (headerToken) {
		return { token: headerToken, subprotocol: null };
	}
	const protoHeader = request.headers.get('Sec-WebSocket-Protocol');
	if (protoHeader) {
		const parts = protoHeader.split(',').map(p => p.trim()).filter(Boolean);
		if (parts.length >= 2 && parts[0] === 'cloudmail') {
			return { token: parts[1], subprotocol: 'cloudmail' };
		}
	}
	return { token: url.searchParams.get('token'), subprotocol: null };
}

// Worker 入口：先完成 Upgrade，再校验 Origin / 登录态 / 全部邮件权限。
// 失败则发错误信息并以 4401 关闭；成功则转到对应 Durable Object。
// scope=inbox（默认）→ 用户自己的 hub；scope=all-email → 全部邮件共享 hub。
export async function handleWsUpgrade(request, env) {
	if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
		return new Response('Expected WebSocket upgrade', { status: 426 });
	}

	if (!env.ws) {
		return new Response('WebSocket unavailable', { status: 503 });
	}

	const url = new URL(request.url);
	const { token, subprotocol } = extractWsAuth(request, url);
	const user = await getWsUser(env, token);
	const scope = url.searchParams.get('scope') || 'inbox';

	// Origin 不合法、未登录、无全部邮件权限，一律按 401 用 4401 关掉。
	if (!hasValidWsOrigin(request) || !user?.userId) {
		return rejectUnauthorized(subprotocol);
	}
	if (scope === 'all-email' && !await canWatchAllEmail(env, user)) {
		return rejectUnauthorized(subprotocol);
	}

	const sessionTag = await buildSessionTag(user.sessionToken);
	const tags = [`uid:${user.userId}`];
	if (sessionTag) {
		tags.push(sessionTag);
	}

	const headers = new Headers(request.headers);
	headers.set('x-ws-tags', JSON.stringify(tags));
	if (subprotocol) {
		headers.set('x-ws-protocol', subprotocol);
	}

	const hubName = scope === 'all-email' ? ALL_EMAIL_HUB : String(user.userId);
	const stub = env.ws.getByName(hubName);
	return stub.fetch(new Request('https://mail-ws/connect', {
		method: request.method,
		headers
	}));
}

// 先 Upgrade 再告诉客户端失败，关闭码 4401。
function rejectUnauthorized(subprotocol) {
	const pair = new WebSocketPair();
	const client = pair[0];
	const server = pair[1];
	server.accept();
	try {
		server.send(JSON.stringify({ type: 'error', code: 401 }));
	} catch {
		// ignore
	}
	server.close(CLOSE_UNAUTHORIZED, 'Unauthorized');
	const headers = subprotocol ? { 'Sec-WebSocket-Protocol': subprotocol } : undefined;
	return new Response(null, { status: 101, webSocket: client, headers });
}
