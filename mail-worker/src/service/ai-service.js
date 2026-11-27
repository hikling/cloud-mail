import { settingConst } from '../const/entity-const';

const DEFAULT_MODEL = '@cf/meta/llama-3.1-8b-instruct-fast';
const OTP_KEYWORD_RE = /(?:verification\s*code|security\s*code|login\s*code|auth(?:entication)?\s*code|one[- ]time\s*(?:password|passcode|code)|confirm(?:ation)?\s*code|passcode|\botp\b|\bpin\b|\bcode\b|验证码|校验码|动态码|安全码|认证码|確認コード|認証コード|ワンタイム|コード)/i;

function decodeBasicEntities(text) {
	return text
		.replace(/&nbsp;/gi, ' ')
		.replace(/&amp;/gi, '&')
		.replace(/&lt;/gi, '<')
		.replace(/&gt;/gi, '>')
		.replace(/&quot;/gi, '"')
		.replace(/&#39;|&apos;/gi, "'")
		.replace(/&#(\d+);/g, (_, dec) => {
			const code = Number(dec);
			return Number.isInteger(code) && code >= 32 && code <= 126 ? String.fromCharCode(code) : ' ';
		});
}

function stripTagBlocks(html, tagNames) {
	let result = String(html || '');
	for (const tag of tagNames) {
		const openRe = new RegExp(`<${tag}\\b`, 'gi');
		const closeNeedle = `</${tag}>`;
		let out = '';
		let lastIdx = 0;
		let match;
		openRe.lastIndex = 0;
		while ((match = openRe.exec(result)) !== null) {
			if (match.index < lastIdx) continue;
			const openEnd = result.indexOf('>', match.index);
			if (openEnd === -1) break;
			const lowerRest = result.toLowerCase();
			const closeStart = lowerRest.indexOf(closeNeedle, openEnd + 1);
			out += result.slice(lastIdx, match.index) + ' ';
			if (closeStart === -1) {
				lastIdx = result.length;
				break;
			}
			lastIdx = closeStart + closeNeedle.length;
			openRe.lastIndex = lastIdx;
		}
		if (lastIdx > 0) {
			out += result.slice(lastIdx);
			result = out;
		}
	}
	return result;
}

function resolveSenderEmail(email = {}) {
	return String(email?.sendEmail || email?.from?.address || '').trim();
}

function resolveSenderName(email = {}) {
	return String(email?.name || email?.from?.name || '').trim();
}

function normalizeBodyText(email = {}) {
	const rawText = typeof email.text === 'string'
		? email.text.replace(/\r\n/g, '\n').replace(/[ \t]+/g, ' ').replace(/\n{3,}/g, '\n\n').trim()
		: '';
	// PostalMime puts HTML in email.html while DB records store it in email.content.
	const html = typeof email.content === 'string'
		? email.content
		: (typeof email.html === 'string' ? email.html : '');

	if (rawText && (/\d/.test(rawText) || !html)) {
		return rawText;
	}

	if (!html) {
		return rawText;
	}

	const stripped = stripTagBlocks(html, ['style', 'script', 'noscript'])
		.replace(/<br\s*\/?>/gi, '\n')
		.replace(/<\/(p|div|li|tr|h[1-6]|section|article|table)>/gi, '\n')
		.replace(/<[^>]+>/g, ' ');

	const htmlText = decodeBasicEntities(stripped)
		.replace(/[ \t]+/g, ' ')
		.replace(/\s*\n\s*/g, '\n')
		.replace(/\n{3,}/g, '\n\n')
		.trim();

	return htmlText || rawText;
}

function buildPromptContent(email = {}, bodyText = '') {
	const subject = String(email.subject || '').trim();
	const from = resolveSenderEmail(email) || resolveSenderName(email);
	let snippet = bodyText;

	if (snippet.length > 3500) {
		const keywordMatch = OTP_KEYWORD_RE.exec(snippet);
		if (keywordMatch && keywordMatch.index > 600) {
			const lead = snippet.slice(0, 800);
			const winStart = Math.max(0, keywordMatch.index - 450);
			const window = snippet.slice(winStart, winStart + 2600);
			snippet = `${lead}\n...\n${window}`;
		} else {
			snippet = snippet.slice(0, 3500);
		}
	}

	return [
		subject ? `Subject: ${subject}` : '',
		from ? `From: ${from}` : '',
		snippet ? `Body:\n${snippet}` : ''
	].filter(Boolean).join('\n');
}

function sanitizeExtractedCode(value) {
	if (value === null || value === undefined) return '';
	let code = String(value).trim();
	if (!code) return '';
	// Normalize spaces inside numeric codes like "123 456"
	if (/^\d{2,4}(?:\s+\d{2,4}){1,2}$/.test(code)) {
		code = code.replace(/\s+/g, '');
	}
	if (/[\r\n\s]/.test(code)) return '';
	if (code.length < 3 || code.length > 16) return '';
	if (!/^[A-Za-z0-9-]+$/.test(code) || !/\d/.test(code)) return '';
	return code;
}

function extractRawAiString(result) {
	if (typeof result === 'string') return result;
	if (!result || typeof result !== 'object') return '';
	if (Object.prototype.hasOwnProperty.call(result, 'code')) return result;
	if (result.response !== undefined) return result.response;
	const choiceContent = result.choices?.[0]?.message?.content;
	if (choiceContent !== undefined) return choiceContent;
	return '';
}

function parseCodeFromAiOutput(result) {
	const payload = extractRawAiString(result);

	if (payload && typeof payload === 'object' && Object.prototype.hasOwnProperty.call(payload, 'code')) {
		return { ok: true, code: sanitizeExtractedCode(payload.code) };
	}

	if (typeof payload !== 'string') {
		return { ok: false, code: '' };
	}

	let text = payload.trim();
	if (!text) {
		return { ok: false, code: '' };
	}

	// Strip optional markdown code fences
	const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
	if (fenceMatch) {
		text = fenceMatch[1].trim();
	}

	const jsonSliceMatch = text.match(/\{[\s\S]*\}/);
	if (jsonSliceMatch) {
		try {
			const parsed = JSON.parse(jsonSliceMatch[0]);
			if (parsed && typeof parsed === 'object' && Object.prototype.hasOwnProperty.call(parsed, 'code')) {
				return { ok: true, code: sanitizeExtractedCode(parsed.code) };
			}
		} catch {
			// Fall through to non-JSON handling
		}
	}

	// Support non-JSON model replying with only the bare code token
	const bareToken = sanitizeExtractedCode(text.replace(/^["'`]|["'`]$/g, ''));
	if (bareToken) {
		return { ok: true, code: bareToken };
	}

	return { ok: false, code: '' };
}

function isLikelyYearOrDate(candidate, contextSlice, indexInSlice) {
	if (/^(19|20)\d{2}$/.test(candidate)) {
		const before = contextSlice[indexInSlice - 1] || '';
		const after = contextSlice[indexInSlice + candidate.length] || '';
		if (before === '-' || before === '/' || after === '-' || after === '/') {
			return true;
		}
	}
	return false;
}

function findCodeNearKeyword(text) {
	if (!text) return '';
	const keywordGlobal = new RegExp(OTP_KEYWORD_RE.source, 'gi');
	let match;

	while ((match = keywordGlobal.exec(text)) !== null) {
		const start = match.index;
		const end = start + match[0].length;

		// Look immediately after the keyword first (e.g. "验证码: 123456", "code is G-482910")
		const afterSlice = text.slice(end, Math.min(text.length, end + 96));
		const afterMatch = afterSlice.match(
			/^\s*(?:is|:|：|=|为|是|\(|\[)?[^\S\r\n]*(?:your\s+)?(?:verification\s+code\s*(?:is|:)\s*)?([A-Za-z]{1,4}-\d{4,8}|\d{2,4}\s+\d{2,4}|\b[A-Z0-9]{4,8}\b|\b\d{4,8}\b)/i
		);
		if (afterMatch) {
			const rawCandidate = afterMatch[1];
			const normalized = sanitizeExtractedCode(rawCandidate);
			const offset = afterSlice.indexOf(rawCandidate);
			if (normalized && !isLikelyYearOrDate(normalized, afterSlice, offset)) {
				return normalized;
			}
		}

		// Search slightly further after keyword for numeric/hyphenated OTP
		const digitAfter = afterSlice.match(/(?<![A-Za-z0-9#/.])(\d{6}|\d{4,8}|[A-Za-z0-9]{2,4}-\d{4,8})(?![A-Za-z0-9])/);
		if (digitAfter) {
			const candidate = sanitizeExtractedCode(digitAfter[1]);
			if (candidate && /\d/.test(candidate) && !isLikelyYearOrDate(candidate, afterSlice, digitAfter.index)) {
				return candidate;
			}
		}

		// Check immediately before keyword (e.g. "482910 is your verification code")
		const beforeSlice = text.slice(Math.max(0, start - 48), start);
		const beforeMatch = beforeSlice.match(/(?<![A-Za-z0-9#/.])(\d{4,8}|[A-Z0-9]{4,8})(?:\s+(?:is|为|是))?\s*$/i);
		if (beforeMatch) {
			const candidate = sanitizeExtractedCode(beforeMatch[1]);
			if (candidate && /\d/.test(candidate) && !isLikelyYearOrDate(candidate, beforeSlice, beforeMatch.index)) {
				return candidate;
			}
		}
	}

	return '';
}

function extractFallbackCode(subject = '', bodyText = '') {
	const subjectCode = findCodeNearKeyword(String(subject || ''));
	if (subjectCode) return subjectCode;
	return findCodeNearKeyword(bodyText);
}

const aiService = {
	normalizeBodyText,
	parseCodeFromAiOutput,
	extractFallbackCode,

	async extractCode(c, email, options = {}) {
		if (!this.shouldExtractCode(options.aiCode, options.aiCodeFilter, email)) {
			return '';
		}

		const bodyText = normalizeBodyText(email);
		if (!email?.subject && !bodyText) {
			return '';
		}

		const ai = c?.env?.ai || c?.env?.AI;
		if (!ai || typeof ai.run !== 'function') {
			return extractFallbackCode(email.subject, bodyText);
		}

		const content = buildPromptContent(email, bodyText);
		const model = c.env.ai_model || DEFAULT_MODEL;
		const messages = [
			{
				role: 'system',
				content:
					'Extract the email verification / login OTP code and respond strictly with a JSON object like {"code":"123456"}. ' +
					'Return {"code":""} if no verification code is present (e.g. newsletters, receipts, order IDs, amounts, dates). ' +
					'Only output the JSON object, with no spaces inside the code.'
			},
			{
				role: 'user',
				content
			}
		];

		try {
			let result;
			try {
				result = await ai.run(model, {
					messages,
					response_format: { type: 'json_object' },
					temperature: 0,
					max_tokens: 64
				});
			} catch (jsonModeError) {
				// Some custom Workers AI models reject response_format; retry once with plain chat completion.
				console.warn('AI JSON mode failed, retrying plain mode:', jsonModeError?.message || jsonModeError);
				result = await ai.run(model, {
					messages,
					temperature: 0,
					max_tokens: 64
				});
			}

			const parsed = parseCodeFromAiOutput(result);
			if (parsed.ok) {
				return parsed.code;
			}

			return extractFallbackCode(email.subject, bodyText);
		} catch (e) {
			console.error('AI extractCode error:', e);
			return extractFallbackCode(email.subject, bodyText);
		}
	},

	shouldExtractCode(aiCode, aiCodeFilterStr, email) {
		if (Number(aiCode) !== settingConst.aiCode.OPEN) {
			return false;
		}
		const filterList = aiCodeFilterStr
			? String(aiCodeFilterStr).split(',').map(item => item.trim().toLowerCase()).filter(Boolean)
			: [];
		if (filterList.length === 0) {
			return true;
		}
		const sender = resolveSenderEmail(email).toLowerCase();
		return filterList.some(item => {
			if (item.startsWith('@')) {
				return sender.endsWith(item);
			}
			return sender === item || sender.endsWith('@' + item);
		});
	}
};

export default aiService;
