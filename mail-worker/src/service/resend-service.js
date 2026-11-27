import emailService from './email-service';
import { emailConst } from '../const/entity-const';
import cryptoUtils from '../utils/crypto-utils';

const encoder = new TextEncoder();
const SVIX_TOLERANCE_SEC = 300;
const HANDLED_EVENT_STATUS = {
	'email.delivered': emailConst.status.DELIVERED,
	'email.complained': emailConst.status.COMPLAINED,
	'email.bounced': emailConst.status.BOUNCED,
	'email.delivery_delayed': emailConst.status.DELAYED,
	'email.failed': emailConst.status.FAILED
};

function decodeWebhookSecret(secret) {
	const trimmed = String(secret || '').trim();
	const raw = trimmed.startsWith('whsec_') ? trimmed.slice(6) : trimmed;
	const binary = atob(raw);
	const bytes = new Uint8Array(binary.length);
	for (let i = 0; i < binary.length; i++) {
		bytes[i] = binary.charCodeAt(i);
	}
	return bytes;
}

function bytesToBase64(bytes) {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

const resendService = {

	async verifyWebhookRequest(c, rawBody) {
		const secret = String(c?.env?.resend_webhook_secret || c?.env?.RESEND_WEBHOOK_SECRET || '').trim();
		if (!secret) {
			return false;
		}

		const svixId = c.req.header('svix-id') || c.req.header('webhook-id');
		const svixTimestamp = c.req.header('svix-timestamp') || c.req.header('webhook-timestamp');
		const svixSignature = c.req.header('svix-signature') || c.req.header('webhook-signature');

		if (svixId && svixTimestamp && svixSignature) {
			if (!/^\d+$/.test(svixTimestamp)) {
				return false;
			}
			const ts = Number(svixTimestamp);
			const now = Math.floor(Date.now() / 1000);
			if (!Number.isFinite(ts) || Math.abs(now - ts) > SVIX_TOLERANCE_SEC) {
				return false;
			}
			try {
				const secretBytes = decodeWebhookSecret(secret);
				const key = await crypto.subtle.importKey(
					'raw',
					secretBytes,
					{ name: 'HMAC', hash: 'SHA-256' },
					false,
					['sign']
				);
				const signedContent = `${svixId}.${svixTimestamp}.${rawBody}`;
				const expectedSig = bytesToBase64(
					new Uint8Array(await crypto.subtle.sign('HMAC', key, encoder.encode(signedContent)))
				);
				const candidates = svixSignature.split(/\s+/).filter(Boolean);
				return candidates.some(item => {
					const commaIdx = item.indexOf(',');
					if (commaIdx <= 0) return false;
					const version = item.slice(0, commaIdx);
					const sig = item.slice(commaIdx + 1);
					return version === 'v1' && cryptoUtils.timingSafeEqualStr(sig, expectedSig);
				});
			} catch {
				return false;
			}
		}

		// Optional shared bearer token if admin configured a non-whsec_ secret.
		if (!secret.startsWith('whsec_')) {
			const auth = c.req.header('authorization') || '';
			const bearer = auth.startsWith('Bearer ') ? auth.slice(7).trim() : auth.trim();
			return Boolean(bearer && cryptoUtils.timingSafeEqualStr(bearer, secret));
		}

		return false;
	},

	async webhooks(c, body) {
		const emailId = body?.data?.email_id;
		const eventType = body?.type;
		if (typeof emailId !== 'string' || !emailId || emailId.length > 200 || !eventType) {
			return;
		}

		const nextStatus = HANDLED_EVENT_STATUS[eventType];
		if (nextStatus === undefined) {
			return;
		}

		const params = {
			resendEmailId: emailId,
			status: nextStatus,
			message: null
		};

		if (eventType === 'email.bounced') {
			params.message = body.data?.bounce ? JSON.stringify(body.data.bounce) : null;
		} else if (eventType === 'email.failed') {
			params.message = body.data?.failed?.reason ? String(body.data.failed.reason) : 'Failed';
		}

		const emailRow = await emailService.updateEmailStatus(c, params);

		if (!emailRow) {
			console.warn(`resend webhook: unknown email_id ${params.resendEmailId}, type ${eventType}`);
		}

	}
};

export default resendService;
