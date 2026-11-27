import test from 'node:test';
import assert from 'node:assert/strict';

import aiService from '../src/service/ai-service.js';
import proxyService from '../src/service/proxy-service.js';
import resendService from '../src/service/resend-service.js';
import domainUtils from '../src/utils/domain-uitls.js';
import attService from '../src/service/att-service.js';
import forwardMime from '../src/utils/forward-mime.js';
import emailMsgTemplate from '../src/template/email-msg.js';
import emailHtmlTemplate from '../src/template/email-html.js';
import { signAssetPath, verifyAssetSignature, signContentAssets } from '../src/utils/asset-sign.js';
import worker from '../src/index.js';

test('aiService supports PostalMime objects (html + from.address) and multipart digit fallback', async () => {
	const postalEmail = {
		subject: 'Your verification code',
		from: { name: 'Acme', address: 'noreply@acme.com' },
		text: 'Please view this email in an HTML client.',
		html: '<div><p>Hello!</p><p>Your verification code is: <strong>482910</strong></p></div>'
	};

	let capturedPrompt = '';
	const mockAi = {
		async run(_model, payload) {
			capturedPrompt = payload.messages[1].content;
			return { response: '{"code":"482910"}' };
		}
	};

	const ctx = { env: { ai: mockAi } };
	const code = await aiService.extractCode(ctx, postalEmail, {
		aiCode: 0,
		aiCodeFilter: 'acme.com'
	});

	assert.equal(code, '482910');
	assert.match(capturedPrompt, /From: noreply@acme\.com/);
	assert.match(capturedPrompt, /482910/);

	// Ensure non-matching sender is filtered out rather than passing empty sender
	const skipped = await aiService.extractCode(ctx, postalEmail, {
		aiCode: 0,
		aiCodeFilter: 'other.com'
	});
	assert.equal(skipped, '');
});

test('proxyService HEAD request handles Content-Encoding without TDZ ReferenceError', async () => {
	const originalFetch = globalThis.fetch;
	globalThis.fetch = async () => new Response(null, {
		status: 200,
		headers: {
			'Content-Type': 'image/png',
			'Content-Length': '1234',
			'Content-Encoding': 'identity'
		}
	});
	try {
		const env = { jwt_secret: 'test-secret-key-for-proxy' };
		const key = await proxyService.signingKey(env);
		const exp = String(Math.floor(Date.now() / 1000) + 600);
		const signedPath = await proxyService.toProxyPath('https://cdn.example.com/logo.png', exp, key);
		const url = new URL('https://mail.example.com' + signedPath);
		const req = new Request(url.toString(), { method: 'HEAD' });
		const res = await proxyService.fetchImage(env, url.searchParams, null, req);
		assert.equal(res.status, 200);
		assert.equal(res.headers.get('Content-Length'), '1234');
	} finally {
		globalThis.fetch = originalFetch;
	}
});

test('proxyService neutralizes HTML numeric entities, SVG image href, CSS escapes, and image-set', async () => {
	const env = { jwt_secret: 'test-secret-key-for-proxy' };
	const key = await proxyService.signingKey(env);
	const html = [
		'<img src="https&#58;//tracker.example.com/px.png" width="1" height="1">',
		'<svg><image href="https://cdn.example.com/a.png" /></svg>',
		'<div style="background: url(\\68 ttps://cdn.example.com/bg.png)"></div>',
		'<style>.hero { background-image: image-set("https://cdn.example.com/hero.webp" 1x); }</style>'
	].join('');

	const out = await proxyService.applyRewrite(html, proxyService.rewriter(key, ''), '');
	assert.ok(!out.includes('tracker.example.com'), '1x1 numeric-entity tracking pixel must be stripped');
	assert.ok(out.includes('href="/proxy?url='), 'SVG image href must be proxied');
	assert.ok(!out.includes('url(\\68 ttps://cdn.example.com/bg.png)'), 'CSS escape must be proxied');
	assert.ok(out.includes('image-set("/proxy?url='), 'image-set URL must be proxied');
});

test('resendService verifyWebhookRequest fails closed without secret and validates Svix HMAC signatures', async () => {
	const body = JSON.stringify({ type: 'email.delivered', data: { email_id: 're_123' } });
	const noSecretCtx = {
		env: {},
		req: { header: () => undefined }
	};
	assert.equal(await resendService.verifyWebhookRequest(noSecretCtx, body), false);

	// Generate valid whsec_ secret & Svix v1 signature
	const rawSecret = new Uint8Array(32).fill(7);
	const secretB64 = btoa(String.fromCharCode(...rawSecret));
	const whsec = 'whsec_' + secretB64;
	const svixId = 'msg_abc123';
	const svixTs = String(Math.floor(Date.now() / 1000));
	const cryptoKey = await crypto.subtle.importKey('raw', rawSecret, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
	const sigBuf = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(`${svixId}.${svixTs}.${body}`));
	const sigB64 = btoa(String.fromCharCode(...new Uint8Array(sigBuf)));

	const validCtx = {
		env: { resend_webhook_secret: whsec },
		req: {
			header(name) {
				const map = {
					'svix-id': svixId,
					'svix-timestamp': svixTs,
					'svix-signature': `v1,${sigB64}`
				};
				return map[name.toLowerCase()];
			}
		}
	};
	assert.equal(await resendService.verifyWebhookRequest(validCtx, body), true);

	// Tampered body must fail
	assert.equal(await resendService.verifyWebhookRequest(validCtx, body + ' '), false);
});

test('asset-sign signs and verifies private attachments and attService strips query parameters', async () => {
	const env = { jwt_secret: 'asset-signing-test-secret' };
	const signed = await signAssetPath(env, 'attachments/abc123.pdf', 3600);
	const url = new URL('https://mail.example.com' + signed);
	assert.equal(await verifyAssetSignature(env, 'attachments/abc123.pdf', url.searchParams), true);
	assert.equal(await verifyAssetSignature(env, 'attachments/other.pdf', url.searchParams), false);

	const signedHtml = await signContentAssets(env, '<img src="{{domain}}attachments/inline.png">', '');
	assert.match(signedHtml, /\{\{domain\}\}attachments\/inline\.png\?exp=\d+&sig=/);
	assert.equal(attService.fromAttSrc('/attachments/inline.png?exp=123&sig=abc'), 'attachments/inline.png');
	assert.equal(attService.fromAttSrc('../attachments/../etc/passwd'), null);
});

test('domainUtils.toOssDomain normalizes scheme and trims trailing slashes', () => {
	assert.equal(domainUtils.toOssDomain('cdn.example.com/'), 'https://cdn.example.com');
	assert.equal(domainUtils.toOssDomain('https://cdn.example.com///'), 'https://cdn.example.com');
	assert.equal(domainUtils.toOssDomain(''), null);
});

test('emailHtmlTemplate and emailMsgTemplate sanitize fragment HTML, inline styles, and entities', () => {
	const tg = emailMsgTemplate({ subject: 'A & B <tag>', name: 'N&M', sendEmail: 'a@b.com', toEmail: 'c@d.com', text: '1 < 2 & 3 > 0' }, 'show', 'show', 'show');
	assert.ok(tg.includes('A &amp; B &lt;tag&gt;'));
	assert.ok(tg.includes('1 &lt; 2 &amp; 3 &gt; 0'));

	const rendered = emailHtmlTemplate('<div style="position: fixed; background: url(https://evil.com/x.png)"><a href="ja\x01vascript:alert(1)">click</a>hi</div>');
	assert.ok(!rendered.includes('javascript:'), 'control-char javascript scheme must be stripped');
	assert.ok(!rendered.includes('https://evil.com/x.png'), 'external child inline style url must be stripped');
	assert.ok(rendered.includes('position: relative'), 'fixed positioning must be downgraded');
	assert.ok(rendered.includes('hi'), 'fragment text must not be lost');
});

test('forwardMime strips CRLF from attachment contentType and contentId headers', () => {
	const rawMime = forwardMime.build({
		accountEmail: 'a@example.com',
		name: 'Alice',
		receiveEmail: [{ address: 'b@example.com', name: 'Bob' }],
		subject: 'Test',
		text: 'hello',
		attachments: [{
			filename: 'a.txt',
			type: 'text/plain\r\nX-Injected: yes',
			contentId: 'cid1\r\nBcc: evil@example.com',
			content: new Uint8Array([65, 66, 67])
		}]
	});
	assert.ok(!rawMime.includes('\r\nX-Injected:'), 'contentType CRLF must not inject headers');
	assert.ok(!rawMime.includes('\r\nBcc: evil@example.com'), 'contentId CRLF must not inject headers');
});

test('worker /attachments/* rejects unauthenticated requests with 403 and allows signed URLs with private cache headers', async () => {
	const kvStore = new Map([
		['setting:', JSON.stringify({ bucket: '', endpoint: '', s3AccessKey: '', s3SecretKey: '' })]
	]);
	kvStore.set('attachments/secret.png', new TextEncoder().encode('PNGDATA').buffer);
	const env = {
		jwt_secret: 'worker-entry-test-secret',
		domain: ['example.com'],
		kv: {
			async get(key) {
				const v = kvStore.get(key);
				return typeof v === 'string' ? JSON.parse(v) : v ?? null;
			},
			async getWithMetadata(key) {
				const value = kvStore.get(key);
				if (!value) return { value: null, metadata: null };
				return {
					value,
					metadata: { contentType: 'image/png', contentDisposition: 'inline; filename="secret.png"' }
				};
			}
		}
	};

	const unauthRes = await worker.fetch(new Request('https://mail.example.com/attachments/secret.png'), env, {});
	assert.equal(unauthRes.status, 403);

	const unauthOssRes = await worker.fetch(new Request('https://mail.example.com/oss/attachments/secret.png'), env, {});
	assert.equal(unauthOssRes.status, 403);

	const signedPath = await signAssetPath(env, 'attachments/secret.png', 3600);
	const authRes = await worker.fetch(new Request('https://mail.example.com' + signedPath), env, {});
	assert.equal(authRes.status, 200);
	assert.match(authRes.headers.get('Cache-Control') || '', /^private,/);
});
