import type { PageServerLoad } from './$types';
import { getActiveProgram } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) return { program: null, sessionCount: 0 };
	const db = platform.env.DB;
	const program = await getActiveProgram(db);
	const count = await db.prepare('SELECT COUNT(*) as c FROM sessions WHERE is_complete = 1').first<{ c: number }>();
	return { program, sessionCount: count?.c ?? 0 };
};
