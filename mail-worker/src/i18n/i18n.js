import zh from './zh.js';
import en from './en.js';
import app from '../hono/hono';

export function langOf(ctxOrLang) {
	if (typeof ctxOrLang === 'string') {
		return ctxOrLang === 'zh' ? 'zh' : 'en';
	}
	const cached = ctxOrLang?.get?.('lang');
	if (cached) {
		return cached;
	}
	const headerLang = ctxOrLang?.req?.header?.('accept-language')?.split(',')[0]?.split('-')[0];
	return headerLang === 'zh' ? 'zh' : 'en';
}

app.use('*', async (c, next) => {
	const headerLang = c.req.header('accept-language')?.split(',')[0]?.split('-')[0];
	c.set('lang', headerLang === 'zh' ? 'zh' : 'en');
	return await next();
});

function lookup(obj, path) {
	return path.split('.').reduce((acc, part) => (acc && typeof acc === 'object' ? acc[part] : undefined), obj);
}

export const t = (key, values, ctxOrLang) => {
	const lang = langOf(ctxOrLang);
	const dict = lang === 'zh' ? zh : en;
	let msg = lookup(dict, key) ?? lookup(en, key) ?? key;
	if (typeof msg !== 'string') return String(msg);
	if (values && typeof values === 'object') {
		for (const [k, v] of Object.entries(values)) {
			msg = msg.replaceAll(`{{${k}}}`, String(v ?? ''));
		}
	}
	return msg;
};

export default { t, langOf };
