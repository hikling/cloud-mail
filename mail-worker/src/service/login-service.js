import BizError from '../error/biz-error';
import userService from './user-service';
import emailUtils from '../utils/email-utils';
import domainUtils from '../utils/domain-uitls';
import { isDel, settingConst, userConst } from '../const/entity-const';
import JwtUtils from '../utils/jwt-utils';
import { v4 as uuidv4 } from 'uuid';
import KvConst from '../const/kv-const';
import constant from '../const/constant';
import userContext from '../security/user-context';
import verifyUtils from '../utils/verify-utils';
import accountService from './account-service';
import settingService from './setting-service';
import cryptoUtils from '../utils/crypto-utils';
import roleService from './role-service';
import dayjs from 'dayjs';
import { t } from '../i18n/i18n.js';
import orm from '../entity/orm';
import user from '../entity/user';
import account from '../entity/account';
import { count, eq } from 'drizzle-orm';
import reqUtils from '../utils/req-utils';
import { revokeUserWs } from '../websocket/notify';

const MAX_PWD_VERIFY_LEN = 128;
const LOGIN_RATE_LIMIT = 20;
const LOGIN_RATE_WINDOW_SEC = 300;

const loginService = {

	async register(c, params) {

		const { email, password } = params;

		// 个人收件模式：仅首次搭建（尚无任何用户）允许注册管理员账号，之后彻底关闭公开注册
		const hasUsers = await userService.hasAnyUser(c);
		if (hasUsers) {
			throw new BizError(t('regDisabled', null, c));
		}

		if (c.env.admin && !emailUtils.isAdminEmail(c.env, email)) {
			throw new BizError(t('regDisabled', null, c));
		}

		const { minEmailPrefix, emailPrefixFilter } = await settingService.query(c);

		if (!verifyUtils.isEmail(email)) {
			throw new BizError(t('notEmail', null, c));
		}

		if (emailUtils.getName(email).length < minEmailPrefix) {
			throw new BizError(t('minEmailPrefix', { msg: minEmailPrefix }, c));
		}

		if (emailPrefixFilter.some(content => emailUtils.getName(email).includes(content))) {
			throw new BizError(t('banEmailPrefix', null, c));
		}

		if (emailUtils.getName(email).length > 64) {
			throw new BizError(t('emailLengthLimit', null, c));
		}

		if (typeof password !== 'string' || !password || password.length > 30) {
			throw new BizError(t('pwdLengthLimit', null, c));
		}

		if (password.length < 6) {
			throw new BizError(t('pwdMinLength', null, c));
		}

		const domainList = domainUtils.getDomainList(c.env.domain) || [];
		if (!domainList.includes(emailUtils.getDomain(email).toLowerCase())) {
			throw new BizError(t('notEmailDomain', null, c));
		}

		const accountRow = await accountService.selectByEmailIncludeDel(c, email);

		if (accountRow && accountRow.isDel === isDel.DELETE) {
			throw new BizError(t('isDelUser'));
		}

		if (accountRow) {
			throw new BizError(t('isRegAccount'));
		}

		const roleRow = await roleService.selectDefaultRole(c);
		const defType = roleRow?.roleId || 1;

		if (roleRow && !roleService.hasAvailDomainPerm(roleRow.availDomain, email)) {
			throw new BizError(t('noDomainPermReg'), 403);
		}

		const { salt, hash } = await cryptoUtils.hashPassword(password);

		const userId = await userService.insert(c, { email, regKeyId: 0, password: hash, salt, type: defType });

		// 并发竞态防护：若多请求同时通过前置检查导致用户数 > 1，保留最先创建的 user 并回滚后者
		const totalRow = await orm(c).select({ total: count() }).from(user).get();
		if (Number(totalRow?.total || 0) > 1) {
			await orm(c).delete(user).where(eq(user.userId, userId)).run();
			throw new BizError(t('regDisabled'));
		}

		try {
			await accountService.insert(c, { userId, email, name: emailUtils.getName(email) });
		} catch (e) {
			await orm(c).delete(account).where(eq(account.userId, userId)).run();
			await orm(c).delete(user).where(eq(user.userId, userId)).run();
			throw e;
		}

		await userService.updateUserInfo(c, userId, true);

		return { regVerifyOpen: false };

	},

	async login(c, params, noVerifyPwd = false) {

		const { email, password } = params || {};

		if ((!email || !password) && !noVerifyPwd) {
			throw new BizError(t('emailAndPwdEmpty', null, c));
		}

		if (!noVerifyPwd && (typeof password !== 'string' || password.length > MAX_PWD_VERIFY_LEN)) {
			throw new BizError(t('IncorrectPwd', null, c));
		}

		const rateKey = !noVerifyPwd && c.env?.kv
			? `${KvConst.LOGIN_RATE}${reqUtils.getIp(c) || 'unknown'}:${String(email).trim().toLowerCase()}`
			: null;
		const ipRateKey = !noVerifyPwd && c.env?.kv
			? `${KvConst.LOGIN_RATE}ip:${reqUtils.getIp(c) || 'unknown'}`
			: null;

		if (rateKey && ipRateKey) {
			const [acctAttempts, ipAttempts] = await Promise.all([
				c.env.kv.get(rateKey),
				c.env.kv.get(ipRateKey)
			]);
			if (Number(acctAttempts || 0) >= LOGIN_RATE_LIMIT || Number(ipAttempts || 0) >= LOGIN_RATE_LIMIT * 3) {
				throw new BizError(t('tooManyAttempts', null, c), 429);
			}
		}

		const recordFailure = async () => {
			if (!rateKey || !ipRateKey) return;
			const [acctAttempts, ipAttempts] = await Promise.all([
				c.env.kv.get(rateKey),
				c.env.kv.get(ipRateKey)
			]);
			await Promise.all([
				c.env.kv.put(rateKey, String((Number(acctAttempts) || 0) + 1), { expirationTtl: LOGIN_RATE_WINDOW_SEC }),
				c.env.kv.put(ipRateKey, String((Number(ipAttempts) || 0) + 1), { expirationTtl: LOGIN_RATE_WINDOW_SEC })
			]);
		};

		const userRow = await userService.selectByEmailIncludeDel(c, email);

		if (!userRow) {
			await recordFailure();
			throw new BizError(t('notExistUser', null, c));
		}

		if (userRow.isDel === isDel.DELETE) {
			await recordFailure();
			throw new BizError(t('isDelUser', null, c));
		}

		if (userRow.status === userConst.status.BAN) {
			await recordFailure();
			throw new BizError(t('isBanUser', null, c));
		}

		if (!noVerifyPwd && !await cryptoUtils.verifyPassword(password, userRow.salt, userRow.password)) {
			await recordFailure();
			throw new BizError(t('IncorrectPwd', null, c));
		}

		if (rateKey) {
			await c.env.kv.delete(rateKey);
		}

		const uuid = uuidv4();
		const jwt = await JwtUtils.generateToken(c, { userId: userRow.userId, token: uuid, gen: constant.AUTH_GEN }, constant.TOKEN_EXPIRE);

		let authInfo = await c.env.kv.get(KvConst.AUTH_INFO + userRow.userId, { type: 'json' });

		if (authInfo && (authInfo.user.email === userRow.email)) {

			if (authInfo.tokens.length > 10) {
				authInfo.tokens.shift();
			}

			authInfo.tokens.push(uuid);

		} else {

			authInfo = {
				tokens: [uuid],
				user: userRow,
				refreshTime: dayjs().toISOString()
			};

		}

		await userService.updateUserInfo(c, userRow.userId);

		await c.env.kv.put(KvConst.AUTH_INFO + userRow.userId, JSON.stringify(authInfo), { expirationTtl: constant.TOKEN_EXPIRE });
		return jwt;
	},

	async logout(c, userId) {
		const token = await userContext.getToken(c);
		const authInfo = await c.env.kv.get(KvConst.AUTH_INFO + userId, { type: 'json' });
		if (authInfo?.tokens) {
			const index = authInfo.tokens.findIndex(item => item === token);
			if (index > -1) {
				authInfo.tokens.splice(index, 1);
				await c.env.kv.put(KvConst.AUTH_INFO + userId, JSON.stringify(authInfo), { expirationTtl: constant.TOKEN_EXPIRE });
			}
		}
		if (token) {
			await revokeUserWs(c, userId, { sessionToken: token });
		}
	}

};

export default loginService;
