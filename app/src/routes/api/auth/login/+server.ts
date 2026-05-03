import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSession, verifyPin } from '$lib/server/auth';

export const POST: RequestHandler = async ({ request, platform, cookies }) => {
	if (!platform?.env?.DB) {
		return json({ error: 'DB not available' }, { status: 500 });
	}

	const { pin } = await request.json();
	const expected = platform.env.AUTH_PIN || '';

	if (!expected) {
		return json({ error: 'Auth not configured. Set AUTH_PIN secret.' }, { status: 500 });
	}

	if (!pin || !verifyPin(String(pin), expected)) {
		return json({ error: 'Invalid PIN' }, { status: 401 });
	}

	const userAgent = request.headers.get('user-agent') || '';
	const token = await createSession(platform.env.DB, userAgent);

	cookies.set('session', token, {
		path: '/',
		httpOnly: true,
		secure: true,
		sameSite: 'lax',
		maxAge: 30 * 24 * 60 * 60
	});

	return json({ ok: true });
};
