import BizError from '../error/biz-error';
import orm from '../entity/orm';
import { v4 as uuidv4 } from 'uuid';
import { and, asc, desc, eq, sql } from 'drizzle-orm';
import cryptoUtils from '../utils/crypto-utils';
import emailUtils from '../utils/email-utils';
import domainUtils from '../utils/domain-uitls';
import roleService from './role-service';
import verifyUtils from '../utils/verify-utils';
import { t } from '../i18n/i18n';
import reqUtils from '../utils/req-utils';
import dayjs from 'dayjs';
import { isDel, roleConst, settingConst } from '../const/entity-const';
import email from '../entity/email';
import userService from './user-service';
import KvConst from '../const/kv-const';
import proxyService from './proxy-service';
import settingService from './setting-service';
import verifyRecordService from './verify-record-service';
import turnstileService from './turnstile-service';

const publicService = {

	async emailList(c, params) {

		let { toEmail, content, subject, sendName, sendEmail, timeSort, num, size, type, isDel } = params;

		const query = orm(c).select({
			emailId: email.emailId,
			sendEmail: email.sendEmail,
			sendName: email.name,
			subject: email.subject,
			toEmail: email.toEmail,
			toName: email.toName,
			type: email.type,
			createTime: email.createTime,
			content: email.content,
			text: email.text,
			isDel: email.isDel,
		}).from(email);

		size = Number(size);
		num = Number(num);

		if (!Number.isFinite(size) || size < 1) {
			size = 20;
		} else if (size > 50) {
			size = 50;
		} else {
			size = Math.trunc(size);
		}

		if (!Number.isFinite(num) || num < 1) {
			num = 1;
		} else {
			num = Math.trunc(num);
		}

		const offset = (num - 1) * size;

		const conditions = [];

		if (toEmail) {
			conditions.push(sql`${email.toEmail} COLLATE NOCASE LIKE ${toEmail}`);
		}

		if (sendEmail) {
			conditions.push(sql`${email.sendEmail} COLLATE NOCASE LIKE ${sendEmail}`);
		}

		if (sendName) {
			conditions.push(sql`${email.name} COLLATE NOCASE LIKE ${sendName}`);
		}

		if (subject) {
			conditions.push(sql`${email.subject} COLLATE NOCASE LIKE ${subject}`);
		}

		if (content) {
			conditions.push(sql`${email.content} COLLATE NOCASE LIKE ${content}`);
		}

		if (type || type === 0) {
			conditions.push(eq(email.type, type));
		}

		if (isDel || isDel === 0) {
			conditions.push(eq(email.isDel, isDel));
		}

		if (conditions.length === 1) {
			query.where(...conditions);
		} else if (conditions.length > 1) {
			query.where(and(...conditions));
		}

		if (timeSort === 'asc') {
			query.orderBy(asc(email.emailId));
		} else {
			query.orderBy(desc(email.emailId));
		}

		const rows = await query.limit(size).offset(offset);
		// 公开邮件列表也把外链图改成 /proxy?url=。
		return proxyService.rewriteList(c, rows);

	},

	async addUser(c, params) {
		const { list } = params;

		if (!Array.isArray(list) || list.length === 0) return;

		if (list.length > 50) {
			throw new BizError('Batch size cannot exceed 50', 400);
		}

		const domainList = domainUtils.getDomainList(c.env.domain) || [];

		for (const emailRow of list) {
			if (!verifyUtils.isEmail(emailRow.email)) {
				throw new BizError(t('notEmail'));
			}

			if (!domainList.includes(emailUtils.getDomain(emailRow.email).toLowerCase())) {
				throw new BizError(t('notEmailDomain'));
			}

			const { salt, hash } = await cryptoUtils.hashPassword(
				emailRow.password || cryptoUtils.genRandomPwd()
			);

			emailRow.salt = salt;
			emailRow.hash = hash;
		}

		const activeIp = reqUtils.getIp(c);
		const { os, browser, device } = reqUtils.getUserAgent(c);
		const activeTime = dayjs().format('YYYY-MM-DD HH:mm:ss');

		const roleList = await roleService.roleSelectUse(c);
		const defRole = roleList.find(roleRow => roleRow.isDefault === roleConst.isDefault.OPEN);

		const stmts = [];

		for (const emailRow of list) {
			const { email: emailAddr, hash, salt, roleName } = emailRow;
			let type = defRole?.roleId || 1;

			if (roleName) {
				const roleRow = roleList.find(role => role.name === roleName);
				type = roleRow ? roleRow.roleId : type;
			}

			stmts.push(
				c.env.db.prepare(
					`INSERT INTO user (email, password, salt, type, os, browser, active_ip, create_ip, device, active_time, create_time)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
				).bind(emailAddr, hash, salt, type, os, browser, activeIp, activeIp, device, activeTime, activeTime)
			);

			stmts.push(
				c.env.db.prepare(
					`INSERT INTO account (email, name, user_id) VALUES (?, ?, 0)`
				).bind(emailAddr, emailUtils.getName(emailAddr))
			);
		}

		stmts.push(
			c.env.db.prepare(
				`UPDATE account SET user_id = (SELECT user_id FROM user WHERE user.email = account.email) WHERE user_id = 0`
			)
		);

		try {
			await c.env.db.batch(stmts);
		} catch (e) {
			if (e.message.includes('SQLITE_CONSTRAINT')) {
				throw new BizError(t('emailExistDatabase'));
			}
			throw e;
		}

	},

	async genToken(c, params) {

		await this.verifyUser(c, params);

		const uuid = uuidv4();

		await c.env.kv.put(KvConst.PUBLIC_KEY, uuid);

		return { token: uuid };
	},

	async verifyUser(c, params) {

		const { email: emailAddr, password, token } = params || {};

		if (!emailAddr || !password) {
			throw new BizError(t('emailAndPwdEmpty'));
		}

		const { loginVerify, loginVerifyCount = 1 } = await settingService.query(c);
		const effectiveLimit = Math.max(5, Number(loginVerifyCount) || 5);
		const allowedFree = await verifyRecordService.consumeLoginAttempt(c, effectiveLimit);
		if (loginVerify === settingConst.loginVerify.OPEN || (!allowedFree && loginVerify === settingConst.loginVerify.COUNT)) {
			await turnstileService.verify(c, token);
		} else if (!allowedFree) {
			throw new BizError(t('botVerifyFail') || 'Too many failed attempts', 429);
		}

		const userRow = await userService.selectByEmailIncludeDel(c, emailAddr);

		if (!emailUtils.isAdminEmail(c.env, emailAddr)) {
			throw new BizError(t('notAdmin'));
		}

		if (!userRow || userRow.isDel === isDel.DELETE) {
			throw new BizError(t('notExistUser'));
		}

		if (!await cryptoUtils.verifyPassword(password, userRow.salt, userRow.password)) {
			throw new BizError(t('IncorrectPwd'));
		}
	}

};

export default publicService;
