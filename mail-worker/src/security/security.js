import BizError from '../error/biz-error';
import constant from '../const/constant';
import jwtUtils from '../utils/jwt-utils';
import cryptoUtils from '../utils/crypto-utils';
import KvConst from '../const/kv-const';
import dayjs from 'dayjs';
import userService from '../service/user-service';
import permService from '../service/perm-service';
import emailUtils from '../utils/email-utils';
import { t } from '../i18n/i18n';
import app from '../hono/hono';

const exclude = [
	'/login',
	'/register',
	'/setting/websiteConfig',
	'/webhooks',
	'/init',
	'/public/genToken',
	'/telegram',
	'/oauth'
];

const requirePerms = [
	'/email/send',
	'/email/delete',
	'/account/list',
	'/account/delete',
	'/account/add',
	'/account/setName',
	'/account/setAllReceive',
	'/account/setAsTop',
	'/my/delete',
	'/analysis/echarts',
	'/allEmail/list',
	'/allEmail/detail',
	'/allEmail/delete',
	'/allEmail/batchDelete',
	'/allEmail/latest',
	'/setting/setBackground',
	'/setting/deleteBackground',
	'/setting/set',
	'/setting/query',
	'/setting/setBlacklist'
];

const premKey = {
	'email:delete': ['/email/delete'],
	'email:send': ['/email/send'],
	'account:add': ['/account/add'],
	'account:query': ['/account/list', '/account/setName', '/account/setAllReceive', '/account/setAsTop'],
	'account:delete': ['/account/delete'],
	'my:delete': ['/my/delete'],
	'all-email:query': ['/allEmail/list', '/allEmail/detail', '/allEmail/latest'],
	'all-email:delete': ['/allEmail/delete', '/allEmail/batchDelete'],
	'setting:query': ['/setting/query'],
	'setting:set': ['/setting/set', '/setting/setBackground', '/setting/deleteBackground', '/setting/setBlacklist'],
	'analysis:query': ['/analysis/echarts']
};

function matchesPathPrefix(path, prefix) {
	return path === prefix || path.startsWith(prefix + '/');
}

app.use('*', async (c, next) => {

	const path = c.req.path;

	if (exclude.some(item => matchesPathPrefix(path, item))) {
		return await next();
	}

	if (matchesPathPrefix(path, '/public')) {

		const userPublicToken = await c.env.kv.get(KvConst.PUBLIC_KEY);
		const publicToken = c.req.header(constant.TOKEN_HEADER);
		if (!userPublicToken || !publicToken || !cryptoUtils.timingSafeEqualStr(publicToken, userPublicToken)) {
			throw new BizError(t('publicTokenFail'), 401);
		}
		return await next();
	}


	const jwt = c.req.header(constant.TOKEN_HEADER);

	const result = await jwtUtils.verifyToken(c, jwt);

	if (!result || result.gen !== constant.AUTH_GEN) {
		throw new BizError(t('authExpired'), 401);
	}

	const { userId, token } = result;
	const authInfo = await c.env.kv.get(KvConst.AUTH_INFO + userId, { type: 'json' });

	if (!authInfo || !Array.isArray(authInfo.tokens) || !authInfo.tokens.includes(token)) {
		throw new BizError(t('authExpired'), 401);
	}

	const permIndex = requirePerms.findIndex(item => matchesPathPrefix(path, item));

	if (permIndex > -1) {

		const permKeys = await permService.userPermKeys(c, authInfo.user.userId);

		const userPaths = permKeyToPaths(permKeys);

		const userPermIndex = userPaths.findIndex(item => matchesPathPrefix(path, item));

		if (userPermIndex === -1 && !emailUtils.isAdminEmail(c.env, authInfo.user.email)) {
			throw new BizError(t('unauthorized'), 403);
		}

	}

	const refreshTime = dayjs(authInfo.refreshTime).startOf('day');
	const nowTime = dayjs().startOf('day')

	if (!nowTime.isSame(refreshTime)) {
		authInfo.refreshTime = dayjs().toISOString();
		await userService.updateUserInfo(c, authInfo.user.userId);
		await c.env.kv.put(KvConst.AUTH_INFO + userId, JSON.stringify(authInfo), { expirationTtl: constant.TOKEN_EXPIRE });
	}

	c.set('user', authInfo.user)

	return await next();
});

function permKeyToPaths(permKeys) {

	const paths = [];

	for (const key of permKeys) {
		const routeList = premKey[key];
		if (routeList && Array.isArray(routeList)) {
			paths.push(...routeList);
		}
	}
	return paths;
}
