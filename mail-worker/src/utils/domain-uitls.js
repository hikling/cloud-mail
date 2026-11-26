const domainUtils = {
	toOssDomain(domain) {

		if (!domain) {
			return null
		}

		if (!domain.startsWith('http')) {
			return 'https://' + domain
		}

		if (domain.endsWith("/")) {
			domain = domain.slice(0, -1);
		}

		return domain
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
