import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession } from '$lib/server/auth';

export const POST: RequestHandler = async ({ platform, cookies }) => {
	const token = cookies.get('session');
	if (token && platform?.env?.DB) {
		await deleteSession(platform.env.DB, token);
	}
	cookies.delete('session', { path: '/' });
	return json({ ok: true });
};
