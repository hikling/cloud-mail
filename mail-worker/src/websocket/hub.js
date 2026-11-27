import { DurableObject } from 'cloudflare:workers';

// 每个用户一个实例（按 userId 命名），全部邮件共用 ALL_EMAIL_HUB。
// 使用 Hibernation WebSocket + AutoResponse：ping/pong 心跳在边缘直接应答，不唤醒 DO。
export class MailHub extends DurableObject {

	constructor(ctx, env) {
		super(ctx, env);
		this.ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong'));
	}

	// 接受浏览器的 WebSocket 升级，接入当前 hub。
	async fetch(request) {
		if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
			return new Response('Expected WebSocket upgrade', { status: 426 });
		}

		let tags = [];
		try {
			const parsed = JSON.parse(request.headers.get('x-ws-tags') || '[]');
			if (Array.isArray(parsed)) {
				tags = parsed.filter(t => typeof t === 'string' && t.length > 0 && t.length <= 256).slice(0, 10);
			}
		} catch {
			tags = [];
		}

		const pair = new WebSocketPair();
		this.ctx.acceptWebSocket(pair[1], tags);
		const subprotocol = request.headers.get('x-ws-protocol');
		const headers = subprotocol ? { 'Sec-WebSocket-Protocol': subprotocol } : undefined;
		return new Response(null, { status: 101, webSocket: pair[0], headers });
	}

	// 主动断开指定标签（如登出当前会话、封禁用户、改密踢出其它设备）上的在线连接。
	async revokeSockets({ userTag, sessionTag, keepSessionTag, closeAll = false } = {}) {
		let targets;
		if (closeAll) {
			targets = this.ctx.getWebSockets();
		} else if (sessionTag) {
			targets = this.ctx.getWebSockets(sessionTag);
		} else if (userTag) {
			targets = this.ctx.getWebSockets(userTag);
		} else {
			return;
		}
		for (const socket of targets) {
			if (keepSessionTag && typeof this.ctx.getTags === 'function') {
				const tags = this.ctx.getTags(socket) || [];
				if (tags.includes(keepSessionTag)) {
					continue;
				}
			}
			try {
				socket.close(4401, 'Session revoked');
			} catch {
				// ignore already closed
			}
		}
	}

	// 向本 hub 上所有连接推送新邮件摘要。出站消息不计请求。
	async notify(payload) {
		const sockets = this.ctx.getWebSockets();
		if (!sockets.length) return;
		const message = JSON.stringify(payload);
		for (const socket of sockets) {
			try {
				socket.send(message);
			} catch {
				socket.close(1011, 'Delivery failed');
			}
		}
	}

	// 兼容旧版 JSON 心跳帧。
	async webSocketMessage(socket, message) {
		if (message === 'ping') {
			socket.send('pong');
			return;
		}
		if (typeof message !== 'string') {
			return;
		}
		try {
			const parsed = JSON.parse(message);
			if (parsed?.type === 'ping') {
				socket.send('pong');
			}
		} catch {
			// ignore malformed client frames
		}
	}

	// 客户端断开时关闭服务端套接字，便于对象休眠。
	async webSocketClose(socket) {
		socket.close();
	}
}
