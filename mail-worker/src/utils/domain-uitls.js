const domainUtils = {
	toOssDomain(domain) {

		if (!domain || typeof domain !== 'string') {
			return null;
		}

		let normalized = domain.trim();
		if (!normalized) {
			return null;
		}

		if (!/^https?:\/\//i.test(normalized)) {
			normalized = 'https://' + normalized;
		}

		return normalized.replace(/\/+$/, '');
	},

	getDomainList(rawDomain) {
		let list = rawDomain;
		if (typeof list === 'string') {
			try {
				list = JSON.parse(list);
			} catch {
				return null;
			}
		}
		if (!Array.isArray(list)) {
			return null;
		}
		return list
			.map(item => String(item || '').trim().toLowerCase().replace(/^@+/, ''))
			.filter(Boolean);
	}
}

export default  domainUtils
