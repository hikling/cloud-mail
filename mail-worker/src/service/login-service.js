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

const loginService = {

	async register(c, params) {

		const { email, password } = params;

		// 个人收件模式：仅首次搭建（尚无任何用户）允许注册管理员账号，之后彻底关闭公开注册
		const hasUsers = await userService.hasAnyUser(c);
		if (hasUsers) {
			throw new BizError(t('regDisabled'));
		}

		if (c.env.admin && !emailUtils.isAdminEmail(c.env, email)) {
			throw new BizError(t('regDisabled'));
		}

		const { minEmailPrefix, emailPrefixFilter } = await settingService.query(c);

		if (!verifyUtils.isEmail(email)) {
			throw new BizError(t('notEmail'));
		}

		if (emailUtils.getName(email).length < minEmailPrefix) {
			throw new BizError(t('minEmailPrefix', { msg: minEmailPrefix }));
		}

		if (emailPrefixFilter.some(content => emailUtils.getName(email).includes(content))) {
			throw new BizError(t('banEmailPrefix'));
		}

		if (emailUtils.getName(email).length > 64) {
			throw new BizError(t('emailLengthLimit'));
		}

		if (!password || password.length > 30) {
			throw new BizError(t('pwdLengthLimit'));
		}

		if (password.length < 6) {
			throw new BizError(t('pwdMinLength'));
		}

		const domainList = domainUtils.getDomainList(c.env.domain) || [];
		if (!domainList.includes(emailUtils.getDomain(email).toLowerCase())) {
			throw new BizError(t('notEmailDomain'));
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

		const { email, password } = params;

		if ((!email || !password) && !noVerifyPwd) {
			throw new BizError(t('emailAndPwdEmpty'));
		}

		const userRow = await userService.selectByEmailIncludeDel(c, email);

		if (!userRow) {
			throw new BizError(t('notExistUser'));
		}

		if (userRow.isDel === isDel.DELETE) {
			throw new BizError(t('isDelUser'));
		}

		if (userRow.status === userConst.status.BAN) {
			throw new BizError(t('isBanUser'));
		}

		if (!noVerifyPwd && !await cryptoUtils.verifyPassword(password, userRow.salt, userRow.password)) {
			throw new BizError(t('IncorrectPwd'));
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
		if (!authInfo?.tokens) return;
		const index = authInfo.tokens.findIndex(item => item === token);
		if (index > -1) {
			authInfo.tokens.splice(index, 1);
			await c.env.kv.put(KvConst.AUTH_INFO + userId, JSON.stringify(authInfo), { expirationTtl: constant.TOKEN_EXPIRE });
		}
	}

};

export default loginService;
