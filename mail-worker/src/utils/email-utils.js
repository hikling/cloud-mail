const HTML_ENTITY_MAP = {
	nbsp: ' ',
	amp: '&',
	lt: '<',
	gt: '>',
	quot: '"',
	apos: "'",
	mdash: '—',
	ndash: '–',
	hellip: '…',
	copy: '©',
	reg: '®',
	trade: '™',
	laquo: '«',
	raquo: '»',
	lsquo: '‘',
	rsquo: '’',
	ldquo: '“',
	rdquo: '”',
	bull: '•',
	middot: '·',
};

function decodeHtmlEntities(str) {
	if (!str || !str.includes('&')) return str;
	return str.replace(/&(?:#(\d+)|#x([0-9a-f]+)|([a-z]+));/gi, (match, dec, hex, named) => {
		if (dec) {
			const code = Number(dec);
			return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
		}
		if (hex) {
			const code = parseInt(hex, 16);
			return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : '';
		}
		const mapped = HTML_ENTITY_MAP[named.toLowerCase()];
		return mapped !== undefined ? mapped : match;
	});
}

const emailUtils = {

	getDomain(email) {
		if (typeof email !== 'string') return '';
		const parts = email.split('@');
		return parts.length === 2 ? parts[1] : '';
	},

	getName(email) {
		if (typeof email !== 'string') return '';
		const parts = email.trim().split('@');
		return parts.length === 2 ? parts[0] : '';
	},

	getBaseEmail(email) {
		const parts = email.split('@');
		if (parts.length !== 2) return '';
		const localPart = parts[0].split('+')[0];
		return localPart + '@' + parts[1];
	},

	isAdminEmail(env, email) {
		const admin = String(env?.admin || '').trim().toLowerCase();
		const target = String(email || '').trim().toLowerCase();
		return Boolean(admin && target && admin === target);
	},

	formatText(text) {
		if (!text) return ''
		return text
			.split('\n')
			.map(line => {
				return line.replace(/[\u200B-\u200F\uFEFF\u034F\u00A0\u3000\u00AD]/g, '')
					.replace(/\s+/g, ' ')
					.trim();
			})
			.join('\n')
			.replace(/\n{3,}/g, '\n')
			.trim();
	},

	htmlToText(content) {
		if (!content) return '';
		try {
			const text = String(content)
				.replace(/<!--[\s\S]*?(?:-->|$)/g, '')
				.replace(/<(script|style|head|title|noscript)\b[^>]*>[\s\S]*?(?:<\/\1\s*>|$)/gi, '')
				.replace(/<(?:br|hr)\b[^>]*\/?>/gi, '\n')
				.replace(/<\/(?:p|div|tr|li|h[1-6]|blockquote|section|article|header|footer|table)\s*>/gi, '\n')
				.replace(/<\/(?:td|th)\s*>/gi, ' ')
				.replace(/<[^>]*>?/g, '');
			return this.formatText(decodeHtmlEntities(text));
		} catch (e) {
			console.error(e);
			return '';
		}
	}
};

export default emailUtils;
