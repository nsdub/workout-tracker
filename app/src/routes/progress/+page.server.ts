import type { PageServerLoad } from './$types';
import { getActiveProgram, getAllPRs } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) return { prs: [], program: null, indicatorHistory: [] };
	const db = platform.env.DB;
	const program = await getActiveProgram(db);

	const prs = await getAllPRs(db);
	const prList = Array.from(prs.entries())
		.map(([name, data]) => ({ exercise_name: name, ...data }))
		.sort((a, b) => b.e1rm - a.e1rm);

	// Indicator lift history
	const indicatorRows = await db
		.prepare(
			`SELECT exercise_name, test_date, weight, reps, e1rm, week_number
			 FROM indicator_history ORDER BY test_date DESC LIMIT 50`
		)
		.all<any>();

	// Bodyweight trend
	const bwRows = await db
		.prepare(
			`SELECT date, bodyweight FROM sessions
			 WHERE bodyweight IS NOT NULL AND is_complete = 1
			 ORDER BY date DESC LIMIT 30`
		)
		.all<{ date: string; bodyweight: number }>();

	return {
		program,
		prs: prList,
		indicatorHistory: indicatorRows.results || [],
		bodyweightTrend: (bwRows.results || []).reverse()
	};
};
