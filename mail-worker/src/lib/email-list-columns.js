import { getTableColumns, sql } from 'drizzle-orm';
import email from '../entity/email';

export const EMAIL_LIST_TEXT_LEN = 300;
export const EMAIL_BRIEF_HTML_LEN = 8000;

/** 完整查询：全部字段 */
export const emailListColumns = getTableColumns(email);

/** 摘要查询：列表 + 详情头部；有 text 则不读 content，没有才从 <body 起截取前 16KB 用于提取摘要 */
export const emailBriefColumns = {
	emailId: email.emailId,
	sendEmail: email.sendEmail,
	name: email.name,
	subject: email.subject,
	code: email.code,
	recipient: email.recipient,
	cc: email.cc,
	toEmail: email.toEmail,
	type: email.type,
	status: email.status,
	message: email.message,
	unread: email.unread,
	createTime: email.createTime,
	isDel: email.isDel,
	content: sql`CASE WHEN trim(coalesce(${email.text}, '')) != '' THEN NULL ELSE substr(coalesce(${email.content}, ''), CASE WHEN instr(lower(coalesce(${email.content}, '')), '<body') > 0 THEN instr(lower(coalesce(${email.content}, '')), '<body') ELSE 1 END, ${EMAIL_BRIEF_HTML_LEN}) END`.as('content'),
	text: sql`substr(coalesce(${email.text}, ''), 1, ${EMAIL_LIST_TEXT_LEN})`.as('text'),
};
