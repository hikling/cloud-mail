import domainUtils from '../utils/domain-uitls';
import { isSafeExternalUrl } from './setting-service';

const webhookService = {

	async sendEmail(c, emailRow, webhookUrl, retry = 0, webhookSecret) {

		webhookUrl = domainUtils.toOssDomain(webhookUrl);

		if (!webhookUrl || !isSafeExternalUrl(webhookUrl)) {
			return;
		}

		retry = Math.trunc(Number(retry));
		if (!Number.isFinite(retry) || retry < 0) {
			retry = 0;
		} else if (retry > 5) {
			retry = 5;
		}

		const headers = {
			'Content-Type': 'application/json'
		};

		if (webhookSecret) {
			headers['Authorization'] = webhookSecret;
		}

		const body = JSON.stringify({
			emailId: emailRow.emailId,
			sendEmail: emailRow.sendEmail,
			sendName: emailRow.name,
			toEmail: emailRow.toEmail,
			toName: emailRow.toName,
			subject: emailRow.subject,
			text: emailRow.text,
			content: emailRow.content,
			code: emailRow.code,
			createTime: emailRow.createTime
		});

		let lastError = '';

		for (let i = 0; i <= retry; i++) {
			try {
				const res = await fetch(webhookUrl, {
					method: 'POST',
					redirect: 'manual',
					signal: AbortSignal.timeout(8_000),
					headers,
					body
				});

				if (res.status >= 300 && res.status < 400) {
					await res.body?.cancel();
					lastError = `redirect blocked: ${res.status}`;
					continue;
				}

				if (res.ok) {
					await res.body?.cancel();
					return;
				}

				lastError = `status: ${res.status} response: ${await res.text()}`;
			} catch (e) {
				lastError = e.message;
			}
		}

		console.error(`Webhook 推送失败: ${lastError}`);
	}

};

export default webhookService;
