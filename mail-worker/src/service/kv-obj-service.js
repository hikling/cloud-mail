import { IMMUTABLE_CACHE_CONTROL, publicFileHeaders } from '../utils/att-headers';

const kvObjService = {

	async putObj(c, key, content, metadata) {
		await c.env.kv.put(key, content, { metadata: metadata });
	},

	async deleteObj(c, keys) {

		if (typeof keys === 'string') {
			keys = [keys];
		}

		if (keys.length === 0) {
			return;
		}

		await Promise.all(keys.map(key => c.env.kv.delete(key)));
	},

	async getObj(c, key) {
		const obj = await c.env.kv.getWithMetadata(key, { type: "arrayBuffer" });
		if (!obj.value) {
			return null;
		}

		const isContentHashed = key.startsWith('attachments/') || key.startsWith('static/');
		return new Response(obj.value, {
			headers: publicFileHeaders({
				contentType: obj.metadata?.contentType,
				contentDisposition: obj.metadata?.contentDisposition,
				cacheControl: obj.metadata?.cacheControl || (isContentHashed ? IMMUTABLE_CACHE_CONTROL : undefined),
				etag: `"kv-${key}"`,
				contentLength: obj.value?.byteLength
			})
		});
	},

	async toObjResp(c, key) {
		return await this.getObj(c, key);
	}

};

export default kvObjService;
