import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import { getSession, getSessionSets } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform, params }) => {
	if (!platform?.env?.DB) throw error(500, 'DB unavailable');
	const db = platform.env.DB;
	const session = await getSession(db, parseInt(params.id));
	if (!session) throw error(404, 'Session not found');

	const sets = await getSessionSets(db, session.id);
	const tpl = await db
		.prepare('SELECT name, focus FROM workout_templates WHERE id = ?')
		.bind(session.template_id)
		.first<{ name: string; focus: string }>();

	// Group sets by exercise
	const byExercise = new Map<string, typeof sets>();
	for (const s of sets) {
		const arr = byExercise.get(s.exercise_name) || [];
		arr.push(s);
		byExercise.set(s.exercise_name, arr);
	}

	return {
		session,
		template: tpl,
		exercises: Array.from(byExercise.entries()).map(([name, sets]) => ({ name, sets }))
	};
};
