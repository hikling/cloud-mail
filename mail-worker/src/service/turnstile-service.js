import BizError from '../error/biz-error';
import settingService from './setting-service';
import { t } from '../i18n/i18n'

const turnstileService = {

	async verify(c, token) {

		if (!token) {
			throw new BizError(t('emptyBotToken'),400);
		}

		const settingRow = await settingService.query(c)

		const body = new URLSearchParams({
			secret: settingRow.secretKey || '',
			response: token
		});
		const remoteIp = c.req.header('cf-connecting-ip');
		if (remoteIp) {
			body.set('remoteip', remoteIp);
		}

		const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
			method: 'POST',
			signal: AbortSignal.timeout(8_000),
			headers: {
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body
		});

		const result = await res.json();

		if (!result.success) {
			throw new BizError(t('botVerifyFail'),400)
		}
	}
};

export default turnstileService;
