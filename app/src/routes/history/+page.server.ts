import type { PageServerLoad } from './$types';
import { getRecentSessions, getActiveProgram } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) return { sessions: [], program: null };
	const db = platform.env.DB;
	const program = await getActiveProgram(db);
	const sessions = await getRecentSessions(db, 50);

	// Enrich with template name and total volume
	const enriched = await Promise.all(
		sessions.map(async (s) => {
			const tpl = await db
				.prepare('SELECT name, focus FROM workout_templates WHERE id = ?')
				.bind(s.template_id)
				.first<{ name: string; focus: string }>();
			const vol = await db
				.prepare('SELECT SUM(weight * reps) as v, COUNT(*) as c FROM logged_sets WHERE session_id = ?')
				.bind(s.id)
				.first<{ v: number; c: number }>();
			return {
				...s,
				template_name: tpl?.name || '?',
				template_focus: tpl?.focus || '',
				total_volume: vol?.v || 0,
				total_sets: vol?.c || 0
			};
		})
	);

	return { sessions: enriched, program };
};
