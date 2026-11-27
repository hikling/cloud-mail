// 收件箱 / 全部邮件的 WebSocket 客户端（支持多视图订阅，避免 <keep-alive> 互相覆盖）。
// 仅在标签页可见时发送轻量文本 'ping'（配合 Durable Object AutoResponse 零唤醒应答）；切入后台暂停心跳。
const HEARTBEAT_MS = 45_000;
const RECONNECT_MAX_MS = 30_000;
const PULL_DEBOUNCE_MS = 150;
// 与 Worker 约定：鉴权 / Origin / 全部邮件权限失败时用此关闭码，不再重连。
const CLOSE_UNAUTHORIZED = 4401;

// autoRefresh：1 关闭，其它（含 2）开启。
export function isAutoRefreshEnabled(value) {
	return Number(value) !== 1;
}

export function createWsClient(scope) {
	const subscribers = new Set();
	let socket = null;
	let heartbeatTimer = null;
	let reconnectTimer = null;
	let pullTimer = null;
	let connected = false;
	let hasConnected = false;
	let listenersBound = false;
	let sessionToken = '';
	let authRejected = false;
	let reconnectAttempt = 0;

	function subscribe(opts) {
		subscribers.add(opts);
		if (subscribers.size === 1) {
			hasConnected = false;
			authRejected = false;
			reconnectAttempt = 0;
			sessionToken = getToken();
		}
		if (!listenersBound) {
			bindListeners();
			listenersBound = true;
		}
		sync();
		return () => {
			subscribers.delete(opts);
			if (subscribers.size === 0) {
				stopAll();
			} else {
				sync();
			}
		};
	}

	function stopAll() {
		subscribers.clear();
		clearPullTimer();
		disconnect();
		if (listenersBound) {
			unbindListeners();
			listenersBound = false;
		}
	}

	function sync() {
		if (shouldConnect()) {
			connect();
			return;
		}
		disconnect();
	}

	function shouldConnect() {
		if (subscribers.size === 0 || !getToken() || authRejected) return false;
		for (const sub of subscribers) {
			if (sub.isEnabled?.()) return true;
		}
		return false;
	}

	function getToken() {
		return localStorage.getItem('token') || '';
	}

	function getWsUrl() {
		const token = getToken();
		if (!token) return '';
		const base = import.meta.env.VITE_BASE_URL || '/api';
		const httpUrl = new URL(base, window.location.origin);
		const protocol = httpUrl.protocol === 'https:' ? 'wss:' : 'ws:';
		const wsUrl = new URL(`${protocol}//${httpUrl.host}/realtime`);
		if (scope && scope !== 'inbox') {
			wsUrl.searchParams.set('scope', scope);
		}
		return wsUrl.toString();
	}

	function bindListeners() {
		window.addEventListener('storage', onStorageChange);
		document.addEventListener('visibilitychange', onVisibilityChange);
	}

	function unbindListeners() {
		window.removeEventListener('storage', onStorageChange);
		document.removeEventListener('visibilitychange', onVisibilityChange);
	}

	function onStorageChange() {
		if (sessionToken === getToken()) return;
		sessionToken = getToken();
		authRejected = false;
		reconnectAttempt = 0;
		disconnect();
		sync();
	}

	function onVisibilityChange() {
		if (document.visibilityState !== 'visible') {
			clearHeartbeat();
			return;
		}
		if (!shouldConnect()) return;
		if (connected && socket?.readyState === WebSocket.OPEN) {
			sendHeartbeat();
			startHeartbeatTimer();
			return;
		}
		connect();
	}

	function startHeartbeatTimer() {
		clearHeartbeat();
		if (document.visibilityState !== 'visible') return;
		heartbeatTimer = window.setInterval(sendHeartbeat, HEARTBEAT_MS);
	}

	function connect() {
		if (!shouldConnect() || (socket && socket.readyState !== WebSocket.CLOSED)) {
			return;
		}

		const url = getWsUrl();
		const token = getToken();
		if (!url || !token) return;

		clearReconnectTimer();
		try {
			// Pass auth token via WebSocket subprotocol instead of query string to avoid log leakage.
			socket = new WebSocket(url, ['cloudmail', token]);
		} catch (e) {
			console.error(e);
			scheduleReconnect();
			return;
		}

		socket.onopen = () => {
			reconnectAttempt = 0;
			setConnected(true);
			if (document.visibilityState === 'visible') {
				sendHeartbeat();
				startHeartbeatTimer();
			}
			if (hasConnected) {
				schedulePull();
			}
			hasConnected = true;
		};

		socket.onmessage = (event) => {
			if (event.data === 'pong' || typeof event.data !== 'string') {
				return;
			}
			let payload;
			try {
				payload = JSON.parse(event.data);
			} catch {
				return;
			}
			if (payload?.type === 'error') {
				authRejected = true;
				setConnected(false);
				clearHeartbeat();
				return;
			}
			if (payload?.type !== 'new_message') {
				return;
			}
			for (const sub of subscribers) {
				if (sub.isEnabled?.()) {
					sub.onMessage?.(payload);
				}
			}
		};

		socket.onerror = () => {
			socket?.close();
		};

		socket.onclose = (event) => {
			clearHeartbeat();
			socket = null;
			setConnected(false);
			if (event.code === CLOSE_UNAUTHORIZED || authRejected) {
				authRejected = true;
				return;
			}
			scheduleReconnect();
		};
	}

	function disconnect() {
		clearHeartbeat();
		clearReconnectTimer();
		if (socket) {
			socket.onopen = null;
			socket.onmessage = null;
			socket.onerror = null;
			socket.onclose = null;
			socket.close(1000, 'client closed');
			socket = null;
		}
		setConnected(false);
	}

	function scheduleReconnect() {
		if (!shouldConnect() || reconnectTimer) return;
		const delay = Math.min(1_000 * 2 ** reconnectAttempt, RECONNECT_MAX_MS);
		reconnectAttempt += 1;
		reconnectTimer = window.setTimeout(() => {
			reconnectTimer = null;
			connect();
		}, delay);
	}

	function sendHeartbeat() {
		if (document.visibilityState !== 'visible') return;
		if (socket?.readyState === WebSocket.OPEN) {
			socket.send('ping');
		}
	}

	function setConnected(value) {
		connected = value;
	}

	function schedulePull() {
		clearPullTimer();
		pullTimer = window.setTimeout(() => {
			pullTimer = null;
			for (const sub of subscribers) {
				if (sub.isEnabled?.()) {
					sub.onReconnect?.();
				}
			}
		}, PULL_DEBOUNCE_MS);
	}

	function clearHeartbeat() {
		if (heartbeatTimer) {
			window.clearInterval(heartbeatTimer);
			heartbeatTimer = null;
		}
	}

	function clearReconnectTimer() {
		if (reconnectTimer) {
			window.clearTimeout(reconnectTimer);
			reconnectTimer = null;
		}
	}

	function clearPullTimer() {
		if (pullTimer) {
			window.clearTimeout(pullTimer);
			pullTimer = null;
		}
	}

	function retryNow() {
		reconnectAttempt = 0;
		if (!shouldConnect() || connected) return;
		if (socket && socket.readyState !== WebSocket.CLOSED) return;
		clearReconnectTimer();
		connect();
	}

	// 保留兼容 start/stop 调用别名
	function start(opts) {
		return subscribe(opts);
	}

	function stop() {
		stopAll();
	}

	return { subscribe, start, stop, stopAll, sync, retryNow };
}

export const inboxWs = createWsClient('inbox');
export const allEmailWs = createWsClient('all-email');
