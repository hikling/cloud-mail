import orm from '../entity/orm';
import { att } from '../entity/att';
import { and, eq, inArray, desc } from 'drizzle-orm';
import r2Service from './r2-service';
import constant from '../const/constant';
import fileUtils from '../utils/file-utils';
import { attConst } from '../const/entity-const';
import { parseHTML } from 'linkedom';
import { v4 as uuidv4 } from 'uuid';
import domainUtils from '../utils/domain-uitls';
import settingService from "./setting-service";
import proxyService from './proxy-service';
import { IMMUTABLE_CACHE_CONTROL, isDangerousAttType, isSafeInlineAtt, sanitizeDispositionFilename } from '../utils/att-headers';

const CHUNK_SIZE = 90;
const ALLOWED_ATT_FIELDS = new Set(['user_id', 'email_id', 'account_id']);

const attService = {

	async addAtt(c, attachments) {

		for (const attachment of attachments) {

			const safeFilename = sanitizeDispositionFilename(attachment.filename);
			const metadate = {
				contentType: isDangerousAttType(attachment.mimeType)
					? 'application/octet-stream'
					: attachment.mimeType,
			};

			if (attachment.contentId) {
				metadate.cacheControl = IMMUTABLE_CACHE_CONTROL;
				metadate.contentDisposition = isSafeInlineAtt(attachment.mimeType)
					? `inline; filename="${safeFilename}"`
					: `attachment; filename="${safeFilename}"`;
			} else {
				metadate.contentDisposition = `attachment; filename="${safeFilename}"`;
			}

			await r2Service.putObj(c, attachment.key, attachment.content, metadate);

		}

		await orm(c).insert(att).values(attachments).run();
	},

	async toImageUrlHtml(c, content, userId) {

		const { r2Domain } = await settingService.query(c);

		const { document } = parseHTML(content);

		const images = Array.from(document.querySelectorAll('img'));

		let imageDataList = [];

		for (const img of images) {

			//邮件正文base64图片转cid附件
			const src = img.getAttribute('src');
			if (src && src.startsWith('data:image')) {
				const file = fileUtils.base64ToFile(src);
				const buff = await file.arrayBuffer();
				const cid = uuidv4().replace(/-/g, '');
				const key = constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(buff) + fileUtils.getExtFileName(file.name);

				img.setAttribute('src', 'cid:' + cid);

				imageDataList.push({
					key,
					filename: sanitizeDispositionFilename(file.name),
					mimeType: file.type,
					size: file.size,
					buff,
					content: fileUtils.base64ToDataStr(src),
					contentId: cid
				});
			}

			// TinyMCE 可能把路径收成 ../attachments 或 /attachments
			const proxyUrl = proxyService.fromProxyPath(src);
			if (proxyUrl) {
				img.setAttribute('src', proxyUrl);
			}

			const attKey = this.fromAttSrc(src);
			const ossDomain = domainUtils.toOssDomain(r2Domain);
			const fromOss = ossDomain && src && src.startsWith(ossDomain);

			//邮件正文站内图片转cid附件
			if (fromOss || attKey) {

				const cid = uuidv4().replace(/-/g, '');
				img.setAttribute('src', 'cid:' + cid);

				imageDataList.push({
					key: fromOss ? src.replace(ossDomain + '/', '') : attKey,
					contentId: cid,
					type: attConst.type.EMBED
				});

			}

			const hasInlineWidth = img.hasAttribute('width');
			const style = img.getAttribute('style') || '';
			const hasStyleWidth = /(^|\s)width\s*:\s*[^;]+/.test(style);

			if (!hasInlineWidth && !hasStyleWidth) {
				const newStyle = (style ? style.trim().replace(/;$/, '') + '; ' : '') + 'max-width: 100%;';
				img.setAttribute('style', newStyle);
			}
		}

		// 查询已有内嵌 URL 图片信息（强制校验归属 userId，防止越权读取他人附件）
		const keys = [...new Set(imageDataList.filter(item => !item.content && item.key).map(item => item.key))];
		const dbImageList = await this.selectOneByKeys(c, keys, userId);

		// 设置给当前附件
		await Promise.all(imageDataList.map(async image => {
			if (image.content) {
				return;
			}

			const dbImage = dbImageList.find(dbItem => image.key === dbItem.key);
			if (!dbImage) {
				return;
			}

			image.size = dbImage.size;
			image.filename = dbImage.filename;
			image.mimeType = dbImage.mimeType;
			image.contentType = dbImage.mimeType;

			const obj = await r2Service.getObj(c, image.key);
			if (!obj) {
				return;
			}

			image.content = obj instanceof ArrayBuffer ? obj : await obj.arrayBuffer();
		}));

		imageDataList = imageDataList.filter(image => image.content);

		return { imageDataList, html: document.toString() };
	},

	async saveSendAtt(c, attList, userId, accountId, emailId) {

		const attDataList = [];

		for (const item of attList) {
			const safeFilename = sanitizeDispositionFilename(item.filename);
			item.buff = fileUtils.base64ToUint8Array(item.content);
			item.key = constant.ATTACHMENT_PREFIX + await fileUtils.getBuffHash(item.buff) + fileUtils.getExtFileName(safeFilename);
			attDataList.push({
				userId,
				accountId,
				emailId,
				key: item.key,
				size: item.buff.length,
				filename: safeFilename,
				mimeType: item.type,
				type: attConst.type.ATT
			});
		}

		await orm(c).insert(att).values(attDataList).run();

		for (const item of attList) {
			const safeFilename = sanitizeDispositionFilename(item.filename);
			await r2Service.putObj(c, item.key, item.buff, {
				contentType: isDangerousAttType(item.type) ? 'application/octet-stream' : item.type,
				cacheControl: IMMUTABLE_CACHE_CONTROL,
				contentDisposition: `attachment; filename="${safeFilename}"`
			});
			delete item.buff;
		}

	},

	async saveArticleAtt(c, attDataList, userId, accountId, emailId) {

		for (const attData of attDataList) {
			attData.userId = userId;
			attData.emailId = emailId;
			attData.accountId = accountId;
			attData.type = attConst.type.EMBED;
			if (!attData.buff) {
				continue;
			}
			const safeFilename = sanitizeDispositionFilename(attData.filename);
			await r2Service.putObj(c, attData.key, attData.buff, {
				contentType: isDangerousAttType(attData.mimeType)
					? 'application/octet-stream'
					: attData.mimeType,
				cacheControl: IMMUTABLE_CACHE_CONTROL,
				contentDisposition: isSafeInlineAtt(attData.mimeType)
					? `inline; filename="${safeFilename}"`
					: `attachment; filename="${safeFilename}"`
			});
			delete attData.buff;
		}

		await orm(c).insert(att).values(attDataList).run();

	},

	async removeByUserIds(c, userIds) {
		await this.removeAttByField(c, 'user_id', userIds);
	},

	async removeByEmailIds(c, emailIds) {
		await this.removeAttByField(c, 'email_id', emailIds);
	},

	async selectByEmailIds(c, emailIds) {
		if (!emailIds || emailIds.length === 0) return [];
		if (emailIds.length <= CHUNK_SIZE) {
			return orm(c).select().from(att).where(
				and(
					inArray(att.emailId, emailIds),
					eq(att.type, attConst.type.ATT)
				)
			).all();
		}
		const allRows = [];
		for (let i = 0; i < emailIds.length; i += CHUNK_SIZE) {
			const chunk = emailIds.slice(i, i + CHUNK_SIZE);
			const rows = await orm(c).select().from(att).where(
				and(inArray(att.emailId, chunk), eq(att.type, attConst.type.ATT))
			).all();
			allRows.push(...rows);
		}
		return allRows;
	},

	async removeAttByField(c, fieldName, fieldValues) {
		if (!ALLOWED_ATT_FIELDS.has(fieldName)) {
			throw new Error(`Invalid attachment field: ${fieldName}`);
		}
		if (!Array.isArray(fieldValues) || fieldValues.length === 0) return;

		const candidateKeys = new Set();

		for (let i = 0; i < fieldValues.length; i += CHUNK_SIZE) {
			const chunk = fieldValues.slice(i, i + CHUNK_SIZE);
			const placeholders = chunk.map(() => '?').join(', ');
			const [keyRes] = await c.env.db.batch([
				c.env.db.prepare(`SELECT DISTINCT key FROM attachments WHERE ${fieldName} IN (${placeholders})`).bind(...chunk),
				c.env.db.prepare(`DELETE FROM attachments WHERE ${fieldName} IN (${placeholders})`).bind(...chunk)
			]);
			for (const row of keyRes.results || []) {
				if (row.key) candidateKeys.add(row.key);
			}
		}

		if (candidateKeys.size === 0) return;

		const keysToCheck = [...candidateKeys];
		const stillUsedKeys = new Set();

		for (let i = 0; i < keysToCheck.length; i += CHUNK_SIZE) {
			const chunk = keysToCheck.slice(i, i + CHUNK_SIZE);
			const placeholders = chunk.map(() => '?').join(', ');
			const res = await c.env.db.prepare(
				`SELECT DISTINCT key FROM attachments WHERE key IN (${placeholders})`
			).bind(...chunk).all();
			for (const row of res.results || []) {
				stillUsedKeys.add(row.key);
			}
		}

		const delKeyList = keysToCheck.filter(k => !stillUsedKeys.has(k));

		if (delKeyList.length > 0) {
			try {
				await this.batchDelete(c, delKeyList);
			} catch (e) {
				console.error('删除附件文件失败：', e);
			}
		}
	},

	async batchDelete(c, keys) {
		if (!keys.length) return;

		const BATCH_SIZE = 1000;

		for (let i = 0; i < keys.length; i += BATCH_SIZE) {
			const batch = keys.slice(i, i + BATCH_SIZE);
			await r2Service.delete(c, batch);
		}
	},

	async removeByAccountId(c, accountId) {
		await this.removeAttByField(c, "account_id", [accountId]);
	},

	selectOneByKeys(c, keys, userId) {
		if (!keys || keys.length === 0) {
			return [];
		}
		const conds = [inArray(att.key, keys.slice(0, CHUNK_SIZE))];
		if (userId != null) {
			conds.push(eq(att.userId, userId));
		}
		return orm(c).select().from(att).where(and(...conds)).orderBy(desc(att.attId)).groupBy(att.key).all();
	},

	// attachments/、/attachments/、../attachments/ 都收成存储 key。
	fromAttSrc(src) {
		if (!src) {
			return null;
		}
		const marker = 'attachments/';
		const idx = String(src).indexOf(marker);
		if (idx === -1) {
			return null;
		}
		return String(src).slice(idx);
	}
};

export default attService;
