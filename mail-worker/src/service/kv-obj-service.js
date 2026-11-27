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

		// Batch KV deletes with bounded concurrency to stay within Workers subrequest limits.
		const CONCURRENCY = 16;
		for (let i = 0; i < keys.length; i += CONCURRENCY) {
			const batch = keys.slice(i, i + CONCURRENCY);
			await Promise.all(batch.map(key => c.env.kv.delete(key)));
		}
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
