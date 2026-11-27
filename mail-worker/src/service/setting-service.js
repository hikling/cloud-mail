import KvConst from '../const/kv-const';
import setting from '../entity/setting';
import user from '../entity/user';
import orm from '../entity/orm';
import { count } from 'drizzle-orm';
import { settingConst } from '../const/entity-const';
import fileUtils from '../utils/file-utils';
import r2Service from './r2-service';
import constant from '../const/constant';
import BizError from '../error/biz-error';
import { t } from '../i18n/i18n';
import { withSchemaRecovery } from '../init/schema-migrations';
import userContext from '../security/user-context';
import jwtUtils from '../utils/jwt-utils';
import domainUtils from '../utils/domain-uitls';
import { IMMUTABLE_CACHE_CONTROL, sanitizeDispositionFilename } from '../utils/att-headers';

const perCtxSettingCache = new WeakMap();
const MAX_BG_BASE64_LEN = 20 * 1024 * 1024; // ~15MB binary limit

const WRITABLE_SETTING_FIELDS = new Set([
	'register', 'receive', 'title', 'manyEmail', 'addEmail', 'autoRefresh',
	'send', 'r2Domain', 'regKey',
	'loginOpacity', 'resendTokens', 'noRecipient', 'loginDomain',
	'tgBotToken', 'tgChatId', 'tgBotStatus', 'customDomain', 'tgMsgFrom', 'tgMsgTo', 'tgMsgText',
	'forwardEmail', 'forwardStatus', 'ruleEmail', 'ruleType',
	'bucket', 'region', 'endpoint', 's3AccessKey', 's3SecretKey', 'forcePathStyle',
	'minEmailPrefix', 'emailPrefixFilter', 'blackSubject', 'blackContent', 'blackFrom',
	'aiCode', 'syncDelete', 'aiCodeFilter',
	'linuxdoClientId', 'linuxdoClientSecret', 'linuxdoSwitch',
	'githubClientId', 'githubClientSecret', 'githubSwitch',
	'googleClientId', 'googleClientSecret', 'googleSwitch',
	'autoCleanDays', 'autoCleanExclude',
	'webhookUrl', 'webhookStatus', 'webhookRetry', 'webhookSecret'
]);

export function isSafeExternalUrl(rawUrl) {
	if (!rawUrl) return true;
	try {
		const url = new URL(rawUrl);
		const host = url.hostname.replace(/\.$/, '').toLowerCase();
		if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
			return false;
		}
		if (!host.includes('.') || host === 'localhost' || host.startsWith('[') || /^[\d.]+$/.test(host) || /\.(localhost|local|internal)$/.test(host)) {
			return false;
		}
		return true;
	} catch {
		return false;
	}
}

function maskSecret(val, showChars = 6) {
	if (!val) return null;
	return `${String(val).slice(0, showChars)}******`;
}

const settingService = {

	async refresh(c) {
		const settingRow = await withSchemaRecovery(c, () => orm(c).select().from(setting).get());
		settingRow.resendTokens = JSON.parse(settingRow.resendTokens || '{}');
		settingRow.r2Domain = '';
		if (c && typeof c === 'object') {
			c.set?.('setting', settingRow);
			perCtxSettingCache.set(c, settingRow);
		}
		await c.env.kv.put(KvConst.SETTING, JSON.stringify(settingRow));
	},

	async query(c) {

		if (c?.get?.('setting')) {
			return c.get('setting');
		}
		if (c && typeof c === 'object' && perCtxSettingCache.has(c)) {
			return perCtxSettingCache.get(c);
		}

		const settingData = await c.env.kv.get(KvConst.SETTING, { type: 'json' });

		if (!settingData) {
			throw new BizError('数据库未初始化 Database not initialized.');
		}

		const domainList = domainUtils.getDomainList(c.env.domain);

		if (!domainList) {
			throw new BizError(t('notJsonDomain'));
		}

		if (domainList.length === 0) {
			throw new BizError(t('noDomainVariable'));
		}

		settingData.domainList = domainList.map(item => '@' + item);

		let projectLink = c.env.project_link;
		if (typeof projectLink === 'string' && projectLink === 'false') {
			projectLink = false;
		} else if (projectLink === false) {
			projectLink = false;
		} else {
			projectLink = true;
		}

		settingData.projectLink = projectLink;
		settingData.aiCode = Number(settingData.aiCode) === settingConst.aiCode.OPEN ? settingConst.aiCode.OPEN : settingConst.aiCode.CLOSE;

		settingData.emailPrefixFilter = String(settingData.emailPrefixFilter || '').split(',').filter(Boolean);
		settingData.autoRefresh = Number(settingData.autoRefresh) === 1 ? 1 : 2; // 1 关闭，2 开启
		settingData.resendTokens = settingData.resendTokens && typeof settingData.resendTokens === 'object' ? settingData.resendTokens : {};

		c?.set?.('setting', settingData);
		if (c && typeof c === 'object') {
			perCtxSettingCache.set(c, settingData);
		}
		return settingData;
	},

	async get(c) {

		const rawSetting = await this.query(c);

		const maskedTokens = {};
		Object.keys(rawSetting.resendTokens || {}).forEach(key => {
			maskedTokens[key] = maskSecret(rawSetting.resendTokens[key], 12);
		});

		const settingRow = {
			...rawSetting,
			resendTokens: maskedTokens,
			s3AccessKey: maskSecret(rawSetting.s3AccessKey, 12),
			s3SecretKey: maskSecret(rawSetting.s3SecretKey, 12),
			tgBotToken: maskSecret(rawSetting.tgBotToken, 20),
			webhookSecret: rawSetting.webhookSecret ? maskSecret(rawSetting.webhookSecret, 6) : '',
			linuxdoClientSecret: rawSetting.linuxdoClientSecret ? maskSecret(rawSetting.linuxdoClientSecret, 6) : '',
			githubClientSecret: rawSetting.githubClientSecret ? maskSecret(rawSetting.githubClientSecret, 6) : '',
			googleClientSecret: rawSetting.googleClientSecret ? maskSecret(rawSetting.googleClientSecret, 6) : '',
			hasR2: !!c.env.r2,
			hasCfEmail: !!c.env.email,
			hasAi: Boolean(c.env.ai || c.env.AI),
		};

		settingRow.storageType = await r2Service.storageType(c);

		return settingRow;
	},

	async set(c, params) {
		const settingData = await this.query(c);
		const updateData = {};

		for (const [k, v] of Object.entries(params || {})) {
			if (WRITABLE_SETTING_FIELDS.has(k) && v !== undefined) {
				updateData[k] = v;
			}
		}

		if (updateData.resendTokens !== undefined) {
			const mergedTokens = { ...settingData.resendTokens, ...updateData.resendTokens };
			Object.keys(mergedTokens).forEach(domain => {
				if (!mergedTokens[domain]) delete mergedTokens[domain];
			});
			updateData.resendTokens = JSON.stringify(mergedTokens);
		}

		if (Array.isArray(updateData.emailPrefixFilter)) {
			updateData.emailPrefixFilter = updateData.emailPrefixFilter.join(',');
		}

		if (Array.isArray(updateData.aiCodeFilter)) {
			updateData.aiCodeFilter = updateData.aiCodeFilter.join(',');
		}

		if (updateData.webhookUrl !== undefined) {
			const normalized = domainUtils.toOssDomain(String(updateData.webhookUrl).trim()) || '';
			if (normalized && !isSafeExternalUrl(normalized)) {
				throw new BizError(t('webhookIpNotSupported') || 'Invalid webhook URL', 400);
			}
			updateData.webhookUrl = normalized;
		}

		if (updateData.webhookRetry !== undefined) {
			const retry = Math.trunc(Number(updateData.webhookRetry));
			updateData.webhookRetry = Number.isFinite(retry) ? Math.min(5, Math.max(0, retry)) : 0;
		}

		if (updateData.autoRefresh !== undefined) {
			updateData.autoRefresh = Number(updateData.autoRefresh) === 1 ? 1 : 2;
		}

		if (updateData.aiCode !== undefined) {
			updateData.aiCode = Number(updateData.aiCode) === settingConst.aiCode.OPEN ? settingConst.aiCode.OPEN : settingConst.aiCode.CLOSE;
		}

		if (Object.keys(updateData).length === 0) {
			return;
		}

		await withSchemaRecovery(c, () => orm(c).update(setting).set(updateData).returning().get());
		await this.refresh(c);
	},

	async deleteBackground(c) {

		const { background } = await this.query(c);
		if (!background) return;

		if (/^https?:\/\//i.test(background)) {
			await withSchemaRecovery(c, () => orm(c).update(setting).set({ background: '' }).run());
			await this.refresh(c);
			return;
		}

		await r2Service.delete(c, background);
		await withSchemaRecovery(c, () => orm(c).update(setting).set({ background: '' }).run());
		await this.refresh(c);
	},

	async setBackground(c, params) {

		let { background } = params || {};

		if (background && typeof background !== 'string') {
			throw new BizError('Invalid background payload', 400);
		}

		if (background && background.length > MAX_BG_BASE64_LEN) {
			throw new BizError('Background image is too large', 413);
		}

		const isRemoteUrl = Boolean(background && /^https?:\/\//i.test(background.trim()));
		if (isRemoteUrl) {
			background = background.trim();
			if (!isSafeExternalUrl(background)) {
				throw new BizError('Invalid background URL', 400);
			}
		} else if (background) {
			let file;
			let arrayBuffer;
			try {
				file = fileUtils.base64ToFile(background);
				arrayBuffer = await file.arrayBuffer();
			} catch {
				throw new BizError('Invalid background image', 400);
			}
			const safeFilename = sanitizeDispositionFilename(file.name);
			const key = constant.BACKGROUND_PREFIX + await fileUtils.getBuffHash(arrayBuffer) + fileUtils.getExtFileName(safeFilename);
			await r2Service.putObj(c, key, arrayBuffer, {
				contentType: file.type,
				cacheControl: IMMUTABLE_CACHE_CONTROL,
				contentDisposition: `inline; filename="${safeFilename}"`
			});
			background = key;
		}

		await this.deleteBackground(c);

		await withSchemaRecovery(c, () => orm(c).update(setting).set({ background: background || '' }).run());
		await this.refresh(c);
		return background || '';
	},

	async setBlacklist(c, params) {
		const { blackSubject, blackContent, blackFrom } = params;
		await withSchemaRecovery(c, () => orm(c).update(setting).set({ blackSubject, blackContent, blackFrom }).run());
		await this.refresh(c);
		return this.get(c);
	},

	async hasActiveSession(c) {
		const jwt = c.req?.header?.(constant.TOKEN_HEADER);
		if (!jwt) return false;
		const payload = await jwtUtils.verifyToken(c, jwt);
		if (!payload || payload.gen !== constant.AUTH_GEN || !payload.userId || !payload.token) {
			return false;
		}
		const authInfo = await c.env.kv.get(KvConst.AUTH_INFO + payload.userId, { type: 'json' });
		return Boolean(authInfo?.tokens?.includes(payload.token));
	},

	async websiteConfig(c) {

		const [settingRow, userCountRow] = await Promise.all([
			this.get(c),
			orm(c).select({ total: count() }).from(user).get()
		]);
		const hasUsers = Number(userCountRow?.total || 0) > 0;
		const authed = settingRow.loginDomain === 1 ? await this.hasActiveSession(c) : true;

		return {
			register: hasUsers ? settingConst.register.CLOSE : settingConst.register.OPEN,
			allowAdminRegister: !hasUsers,
			title: settingRow.title,
			manyEmail: settingRow.manyEmail,
			addEmail: settingRow.addEmail,
			autoRefresh: settingRow.autoRefresh,
			send: settingRow.send,
			r2Domain: settingRow.r2Domain,
			background: settingRow.background,
			loginOpacity: settingRow.loginOpacity,
			domainList: settingRow.loginDomain === 1 && !authed ? [] : settingRow.domainList,
			regKey: settingConst.regKey.CLOSE,
			loginDomain: settingRow.loginDomain,
			linuxdoClientId: settingRow.linuxdoClientId,
			linuxdoSwitch: settingRow.linuxdoSwitch,
			githubClientId: settingRow.githubClientId,
			githubSwitch: settingRow.githubSwitch,
			googleClientId: settingRow.googleClientId,
			googleSwitch: settingRow.googleSwitch,
			minEmailPrefix: settingRow.minEmailPrefix,
			projectLink: settingRow.projectLink
		};
	},

};

export default settingService;
