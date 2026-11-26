import BizError from "../error/biz-error";
import orm from "../entity/orm";
import { oauth } from "../entity/oauth";
import { and, eq, inArray, lt } from 'drizzle-orm';
import userService from "./user-service";
import loginService from "./login-service";
import cryptoUtils from "../utils/crypto-utils";
import settingService from "./setting-service";
import jwtUtils from "../utils/jwt-utils";
import dayjs from "dayjs";
import { t } from '../i18n/i18n';

const OAUTH_FETCH_TIMEOUT_MS = 10_000;
const OAUTH_BIND_TTL_SEC = 900;

const oauthService = {

	async bindUser(c, params) {

		const { email, oauthUserId, bindToken } = params || {};

		const verified = await jwtUtils.verifyToken(c, bindToken);
		if (!verified || verified.purpose !== 'oauth_bind' || !verified.platform || String(verified.oauthUserId) !== String(oauthUserId)) {
			throw new BizError(t('authExpired'), 401);
		}

		const oauthRow = await this.getByPlatformAndId(c, verified.platform, verified.oauthUserId);
		if (!oauthRow) {
			throw new BizError(t('notExistUser'));
		}

		let userRow = oauthRow.userId ? await userService.selectByIdIncludeDel(c, oauthRow.userId) : null;

		if (userRow) {
			throw new BizError('用户已绑定有邮箱');
		}

		await loginService.register(c, { email, password: cryptoUtils.genRandomPwd() }, true);

		userRow = await userService.selectByEmail(c, email);

		await orm(c).update(oauth).set({ userId: userRow.userId }).where(
			and(eq(oauth.platform, verified.platform), eq(oauth.oauthUserId, verified.oauthUserId))
		).run();
		const jwtToken = await loginService.login(c, { email, password: null }, true);

		return { userInfo: oauthRow, token: jwtToken };
	},

	async linuxDoLogin(c, params) {

		const { code, redirectUri } = params;

		const setting = await settingService.query(c);
		this.assertEnabled(setting, 'linuxdoSwitch');

		const reqParams = new URLSearchParams();
		reqParams.append('client_id', setting.linuxdoClientId);
		reqParams.append('client_secret', setting.linuxdoClientSecret);
		reqParams.append('code', code);
		reqParams.append('redirect_uri', redirectUri);
		reqParams.append('grant_type', 'authorization_code');

		const tokenRes = await fetch("https://connect.linux.do/oauth2/token", {
			method: "POST",
			signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: reqParams.toString()
		});

		if (!tokenRes.ok) {
			throw new BizError(tokenRes.statusText);
		}

		const token = await tokenRes.json();

		const userRes = await fetch('https://connect.linux.do/api/user', {
			signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
			headers: {
				Authorization: 'Bearer ' + token.access_token
			}
		});

		if (!userRes.ok) {
			throw new BizError(userRes.statusText);
		}

		const userInfo = await userRes.json();

		userInfo.oauthUserId = String(userInfo.id);
		userInfo.active = userInfo.active ? 0 : 1;
		userInfo.silenced = userInfo.silenced ? 0 : 1;
		userInfo.trustLevel = userInfo.trust_level;
		userInfo.avatar = userInfo.avatar_url;
		userInfo.platform = 'linuxdo';

		return await this.saveAndLogin(c, userInfo);
	},

	async githubLogin(c, params) {

		const { code, redirectUri } = params;

		const setting = await settingService.query(c);
		this.assertEnabled(setting, 'githubSwitch');

		const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
			method: "POST",
			signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
			headers: {
				"Content-Type": "application/json",
				"Accept": "application/json"
			},
			body: JSON.stringify({
				client_id: setting.githubClientId,
				client_secret: setting.githubClientSecret,
				code: code,
				redirect_uri: redirectUri
			})
		});

		if (!tokenRes.ok) {
			throw new BizError(tokenRes.statusText);
		}

		const token = await tokenRes.json();

		if (token.error) {
			throw new BizError(token.error_description || token.error);
		}

		const userRes = await fetch('https://api.github.com/user', {
			signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
			headers: {
				Authorization: 'Bearer ' + token.access_token,
				'User-Agent': 'cloud-mail'
			}
		});

		if (!userRes.ok) {
			throw new BizError(userRes.statusText);
		}

		const userInfo = await userRes.json();

		userInfo.oauthUserId = String(userInfo.id);
		userInfo.username = userInfo.login;
		userInfo.avatar = userInfo.avatar_url;
		userInfo.platform = 'github';

		return await this.saveAndLogin(c, userInfo);
	},

	async googleLogin(c, params) {

		const { code, redirectUri } = params;

		const setting = await settingService.query(c);
		this.assertEnabled(setting, 'googleSwitch');

		const reqParams = new URLSearchParams();
		reqParams.append('client_id', setting.googleClientId);
		reqParams.append('client_secret', setting.googleClientSecret);
		reqParams.append('code', code);
		reqParams.append('redirect_uri', redirectUri);
		reqParams.append('grant_type', 'authorization_code');

		const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
			method: "POST",
			signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
			headers: { "Content-Type": "application/x-www-form-urlencoded" },
			body: reqParams.toString()
		});

		if (!tokenRes.ok) {
			throw new BizError(tokenRes.statusText);
		}

		const token = await tokenRes.json();

		const userRes = await fetch('https://openidconnect.googleapis.com/v1/userinfo', {
			signal: AbortSignal.timeout(OAUTH_FETCH_TIMEOUT_MS),
			headers: {
				Authorization: 'Bearer ' + token.access_token
			}
		});

		if (!userRes.ok) {
			throw new BizError(userRes.statusText);
		}

		const userInfo = await userRes.json();

		userInfo.oauthUserId = String(userInfo.sub);
		userInfo.username = userInfo.email;
		userInfo.avatar = userInfo.picture;
		userInfo.platform = 'google';

		return await this.saveAndLogin(c, userInfo);
	},

	async saveAndLogin(c, userInfo) {

		const oauthRow = await this.saveUser(c, userInfo);
		const userRow = oauthRow.userId ? await userService.selectByIdIncludeDel(c, oauthRow.userId) : null;

		if (!userRow) {
			const bindToken = await jwtUtils.generateToken(c, {
				oauthUserId: oauthRow.oauthUserId,
				platform: oauthRow.platform,
				purpose: 'oauth_bind'
			}, OAUTH_BIND_TTL_SEC);
			return { userInfo: oauthRow, token: null, bindToken };
		}

		const JwtToken = await loginService.login(c, { email: userRow.email, password: null }, true);
		return { userInfo: oauthRow, token: JwtToken };
	},

	async saveUser(c, userInfo) {

		const userInfoRow = await this.getByPlatformAndId(c, userInfo.platform, userInfo.oauthUserId);
		const record = {
			oauthUserId: userInfo.oauthUserId,
			username: userInfo.username || '',
			name: userInfo.name || '',
			avatar: userInfo.avatar || '',
			active: userInfo.active ?? 0,
			trustLevel: userInfo.trustLevel ?? 0,
			silenced: userInfo.silenced ?? 0,
			platform: userInfo.platform
		};

		if (!userInfoRow) {
			return await orm(c).insert(oauth).values(record).returning().get();
		} else {
			return await orm(c).update(oauth).set(record).where(
				and(eq(oauth.platform, userInfo.platform), eq(oauth.oauthUserId, userInfo.oauthUserId))
			).returning().get();
		}

	},

	assertEnabled(setting, switchKey) {
		if (setting[switchKey] !== 0) {
			throw new BizError(t('oauthDisabled'));
		}
	},

	async getByPlatformAndId(c, platform, oauthUserId) {
		return await orm(c).select().from(oauth).where(
			and(eq(oauth.platform, platform), eq(oauth.oauthUserId, oauthUserId))
		).get();
	},

	async deleteByUserIds(c, userIds) {
		if (!userIds?.length) return;
		await orm(c).delete(oauth).where(inArray(oauth.userId, userIds)).run();
	},

	// 定时任务清除超过 1 小时仍未绑定邮箱的临时 oauth 用户
	async clearNoBindOathUser(c) {
		const cutoff = dayjs().subtract(1, 'hour').format('YYYY-MM-DD HH:mm:ss');
		await orm(c).delete(oauth).where(and(eq(oauth.userId, 0), lt(oauth.createTime, cutoff))).run();
	},

};

export default oauthService;
