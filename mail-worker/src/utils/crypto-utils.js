const encoder = new TextEncoder();
const PBKDF2_PREFIX = 'pbkdf2$';
const PBKDF2_ITERATIONS = 100_000;

function bytesToBase64(bytes) {
	let binary = '';
	for (let i = 0; i < bytes.length; i++) {
		binary += String.fromCharCode(bytes[i]);
	}
	return btoa(binary);
}

const saltHashUtils = {

	generateSalt(length = 16) {
		const array = new Uint8Array(length);
		crypto.getRandomValues(array);
		return bytesToBase64(array);
	},

	timingSafeEqualStr(a, b) {
		if (typeof a !== 'string' || typeof b !== 'string') return false;
		const aBytes = encoder.encode(a);
		const bBytes = encoder.encode(b);
		const maxLen = Math.max(aBytes.length, bBytes.length);
		let diff = aBytes.length ^ bBytes.length;
		for (let i = 0; i < maxLen; i++) {
			diff |= (aBytes[i] ?? 0) ^ (bBytes[i] ?? 0);
		}
		return diff === 0;
	},

	async hashPassword(password) {
		const salt = this.generateSalt();
		const hash = await this.genPbkdf2Hash(password, salt, PBKDF2_ITERATIONS);
		return { salt, hash: `${PBKDF2_PREFIX}${PBKDF2_ITERATIONS}$${hash}` };
	},

	async genPbkdf2Hash(password, salt, iterations = PBKDF2_ITERATIONS) {
		const keyMaterial = await crypto.subtle.importKey(
			'raw',
			encoder.encode(String(password)),
			'PBKDF2',
			false,
			['deriveBits']
		);
		const derivedBits = await crypto.subtle.deriveBits(
			{
				name: 'PBKDF2',
				salt: encoder.encode(String(salt)),
				iterations,
				hash: 'SHA-256'
			},
			keyMaterial,
			256
		);
		return bytesToBase64(new Uint8Array(derivedBits));
	},

	async genHashPassword(password, salt) {
		const data = encoder.encode(salt + password);
		const hashBuffer = await crypto.subtle.digest('SHA-256', data);
		return bytesToBase64(new Uint8Array(hashBuffer));
	},

	async verifyPassword(inputPassword, salt, storedHash) {
		if (typeof inputPassword !== 'string' || !inputPassword || inputPassword.length > 128 || !salt || !storedHash) return false;
		if (storedHash.startsWith(PBKDF2_PREFIX)) {
			const parts = storedHash.split('$');
			if (parts.length !== 3) return false;
			const iterations = Number(parts[1]);
			const expected = parts[2];
			if (!Number.isInteger(iterations) || iterations < 10_000 || iterations > 100_000) return false;
			const derived = await this.genPbkdf2Hash(inputPassword, salt, iterations);
			return this.timingSafeEqualStr(derived, expected);
		}
		const legacyHash = await this.genHashPassword(inputPassword, salt);
		return this.timingSafeEqualStr(legacyHash, storedHash);
	},

	genRandomPwd(length = 12) {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
		const randomBytes = new Uint8Array(length);
		crypto.getRandomValues(randomBytes);
		let result = '';
		for (let i = 0; i < length; i++) {
			result += chars.charAt(randomBytes[i] % chars.length);
		}
		return result;
	}
};

export default saltHashUtils;
