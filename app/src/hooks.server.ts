import type { Handle } from '@sveltejs/kit';
import { isValidSession } from '$lib/server/auth';

const PUBLIC_ROUTES = ['/login', '/api/auth/login'];

export const handle: Handle = async ({ event, resolve }) => {
	const platform = event.platform;
	const token = event.cookies.get('session');

	let isAuthenticated = false;
	if (platform?.env?.DB && token) {
		isAuthenticated = await isValidSession(platform.env.DB, token);
	}

	event.locals.isAuthenticated = isAuthenticated;

	const isPublic = PUBLIC_ROUTES.some((r) => event.url.pathname === r || event.url.pathname.startsWith(r + '/'));

	if (!isAuthenticated && !isPublic) {
		// API requests get 401, page requests get redirect
		if (event.url.pathname.startsWith('/api/')) {
			return new Response('Unauthorized', { status: 401 });
		}
		return new Response(null, { status: 303, headers: { Location: '/login' } });
	}

	return resolve(event);
};
