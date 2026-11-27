import orm from '../entity/orm';
import email from '../entity/email';
import settingService from './setting-service';
import { eq } from 'drizzle-orm';
import jwtUtils from '../utils/jwt-utils';
import emailMsgTemplate from '../template/email-msg';
import emailTextTemplate from '../template/email-text';
import emailHtmlTemplate from '../template/email-html';
import domainUtils from "../utils/domain-uitls";
import proxyService from './proxy-service';
import { signContentAssets } from '../utils/asset-sign';

const TG_PREVIEW_TTL = 60 * 60 * 24 * 7;

const telegramService = {

	async getEmailContent(c, params) {

		const { token } = params;
		const nonce = crypto.randomUUID().replace(/-/g, '');
		const result = await jwtUtils.verifyToken(c, token);

		if (!result || result.purpose !== 'tg_preview' || !result.emailId) {
			return { html: emailTextTemplate('Access denied'), nonce };
		}

		const emailRow = await orm(c).select().from(email).where(eq(email.emailId, result.emailId)).get();

		if (emailRow) {

			if (emailRow.content) {
				// Telegram 网页预览：外链图改成 /proxy?url=，私有内嵌图签名并保留 7 天有效期。
				const { r2Domain } = await settingService.query(c);
				let html = await proxyService.rewriteHtml(c, emailRow.content);
				html = await signContentAssets(c.env, html, r2Domain, TG_PREVIEW_TTL);
				return { html: emailHtmlTemplate(html || '', nonce), nonce };
			} else {
				return { html: emailTextTemplate(emailRow.text || ''), nonce };
			}

		} else {
			return { html: emailTextTemplate('The email does not exist'), nonce };
		}

	},

	async sendEmailToBot(c, email) {

		const { tgBotToken, tgChatId, customDomain, tgMsgTo, tgMsgFrom, tgMsgText } = await settingService.query(c);

		if (!tgBotToken || !/^\d+:[A-Za-z0-9_-]{20,}$/.test(tgBotToken)) {
			return;
		}

		const tgChatIds = String(tgChatId || '').split(',').map(s => s.trim()).filter(Boolean);
		if (!tgChatIds.length) {
			return;
		}

		const jwtToken = await jwtUtils.generateToken(c, { emailId: email.emailId, purpose: 'tg_preview' }, TG_PREVIEW_TTL);

		const webAppUrl = customDomain ? `${domainUtils.toOssDomain(customDomain)}/api/telegram/getEmail/${jwtToken}` : 'https://www.cloudflare.com/404'
		const inlineKeyboard = [
			[
				{
					text: 'View',
					web_app: { url: webAppUrl }
				}
			]
		];

		if (email.code) {
			inlineKeyboard.push([
				{
					text: email.code,
					copy_text: { text: email.code }
				}
			]);
		}

		await Promise.all(tgChatIds.map(async chatId => {
			try {
				const res = await fetch(`https://api.telegram.org/bot${tgBotToken}/sendMessage`, {
					method: 'POST',
					signal: AbortSignal.timeout(8_000),
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						chat_id: chatId,
						parse_mode: 'HTML',
						text: emailMsgTemplate(email, tgMsgTo, tgMsgFrom, tgMsgText),
						reply_markup: {
							inline_keyboard: inlineKeyboard
						}
					})
				});
				if (!res.ok) {
					console.error(`转发 Telegram 失败 status: ${res.status} response: ${await res.text()}`);
				}
			} catch (e) {
				console.error(`转发 Telegram 失败:`, e.message);
			}
		}));

	}

}

export default telegramService
