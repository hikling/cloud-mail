import { isPublicAssetKey } from './edge-cache';

export const PRIVATE_ASSET_CACHE_CONTROL = 'private, max-age=3600';
const ASSET_SIGN_TTL_SEC = 14400; // 4 hours
const ASSET_EXP_BUCKET_SEC = 1800; // 30-min bucket so browser caches repeat views

const encoder = new TextEncoder();
const signingKeyCache = new Map();

function decodeSignature(sig) {
	if (!sig || !/^[A-Za-z0-9_-]{42}[AEIMQUYcgkosw048]$/.test(sig)) {
		return null;
	}
	const base64 = sig.replaceAll('-', '+').replaceAll('_', '/') + '=';
	return Uint8Array.from(atob(base64), ch => ch.charCodeAt(0));
}

async function assetSigningKey(env) {
	if (!env?.jwt_secret) {
		throw new Error('Missing jwt_secret for private asset signing');
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
			const derived = await crypto.subtle.sign('HMAC', root, encoder.encode('cloud-mail/private-asset/v1'));
			return crypto.subtle.importKey('raw', derived, algorithm, false, ['sign', 'verify']);
		})().catch(err => {
			signingKeyCache.delete(secret);
			throw err;
		});
		signingKeyCache.set(secret, pending);
	}
	return pending;
}

function signatureInput(key, exp) {
	return encoder.encode(JSON.stringify([key, exp]));
}

export async function signAssetPath(env, key, ttlSeconds = ASSET_SIGN_TTL_SEC) {
	if (!isPublicAssetKey(key) || !env?.jwt_secret) {
		return key ? '/' + String(key).replace(/^\/+/, '') : '';
	}
	const signingKey = await assetSigningKey(env);
	const now = Math.floor(Date.now() / 1000);
	const bucket = Math.min(ASSET_EXP_BUCKET_SEC, Math.max(60, Math.trunc(ttlSeconds / 2)));
	const exp = String(Math.ceil(now / bucket) * bucket + ttlSeconds);
	const sigBuf = await crypto.subtle.sign('HMAC', signingKey, signatureInput(key, exp));
	const sig = btoa(String.fromCharCode(...new Uint8Array(sigBuf)))
		.replaceAll('+', '-')
		.replaceAll('/', '_')
		.replaceAll('=', '');
	return `/${key}?${new URLSearchParams({ exp, sig })}`;
}

export async function verifyAssetSignature(env, key, searchParams) {
	if (!env?.jwt_secret || !isPublicAssetKey(key)) {
		return false;
	}
	const exp = searchParams?.get('exp');
	const sig = decodeSignature(searchParams?.get('sig'));
	if (!/^[1-9]\d{0,12}$/.test(exp || '') || Number(exp) <= Math.floor(Date.now() / 1000) || !sig) {
		return false;
	}
	try {
		const signingKey = await assetSigningKey(env);
		return await crypto.subtle.verify('HMAC', signingKey, sig, signatureInput(key, exp));
	} catch {
		return false;
	}
}

export async function signContentAssets(env, html, r2Domain, ttlSeconds = ASSET_SIGN_TTL_SEC) {
	if (!html || r2Domain || !env?.jwt_secret || !html.includes('{{domain}}attachments/')) {
		return html;
	}
	const matches = [];
	const regex = /\{\{domain\}\}(attachments\/[^"'<>\s?#)]+)(?:\?[^"'<>\s#)]*)?/g;
	html.replace(regex, (...args) => {
		matches.push(args);
		return args[0];
	});
	if (!matches.length) {
		return html;
	}
	const cache = new Map();
	const signedList = await Promise.all(matches.map(async m => {
		const key = m[1];
		if (!isPublicAssetKey(key)) {
			return m[0];
		}
		let pending = cache.get(key);
		if (!pending) {
			pending = signAssetPath(env, key, ttlSeconds).then(signedPath => `{{domain}}${signedPath.slice(1)}`);
			cache.set(key, pending);
		}
		return pending;
	}));
	let idx = 0;
	return html.replace(regex, () => signedList[idx++]);
}

export async function signAttList(env, attList, r2Domain, ttlSeconds = ASSET_SIGN_TTL_SEC) {
	if (!Array.isArray(attList) || !attList.length || r2Domain || !env?.jwt_secret) {
		return attList;
	}
	await Promise.all(attList.map(async item => {
		if (item?.key && String(item.key).startsWith('attachments/')) {
			item.url = await signAssetPath(env, item.key, ttlSeconds);
		}
	}));
	return attList;
}
