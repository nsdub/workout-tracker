// Simple PIN-based auth for single user
// PIN stored as Cloudflare secret (AUTH_PIN)
// Sessions stored in D1 with 30-day expiry

const SESSION_DURATION_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export function generateToken(): string {
	const arr = new Uint8Array(32);
	crypto.getRandomValues(arr);
	return Array.from(arr, (b) => b.toString(16).padStart(2, '0')).join('');
}

export async function createSession(db: D1Database, userAgent?: string): Promise<string> {
	const token = generateToken();
	const expiresAt = new Date(Date.now() + SESSION_DURATION_MS).toISOString();
	await db
		.prepare('INSERT INTO auth_sessions (token, expires_at, user_agent) VALUES (?, ?, ?)')
		.bind(token, expiresAt, userAgent || '')
		.run();
	return token;
}

export async function isValidSession(db: D1Database, token: string | undefined): Promise<boolean> {
	if (!token) return false;
	const row = await db
		.prepare('SELECT expires_at FROM auth_sessions WHERE token = ?')
		.bind(token)
		.first<{ expires_at: string }>();
	if (!row) return false;
	return new Date(row.expires_at) > new Date();
}

export async function deleteSession(db: D1Database, token: string): Promise<void> {
	await db.prepare('DELETE FROM auth_sessions WHERE token = ?').bind(token).run();
}

// Constant-time PIN comparison
export function verifyPin(provided: string, actual: string): boolean {
	if (provided.length !== actual.length) return false;
	let result = 0;
	for (let i = 0; i < provided.length; i++) {
		result |= provided.charCodeAt(i) ^ actual.charCodeAt(i);
	}
	return result === 0;
}
