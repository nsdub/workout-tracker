import type { PageServerLoad } from './$types';
import {
	getActiveProgram,
	getNextTemplate,
	getTemplates,
	checkDeloadTriggers,
	weekInMesocycle,
	isDeloadWeek
} from '$lib/server/db';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return { error: 'Database not available' };
	}
	const db = platform.env.DB;

	const program = await getActiveProgram(db);
	if (!program) {
		return { error: 'No active program. Run migrations.' };
	}

	const templates = await getTemplates(db, program.id);
	const next = await getNextTemplate(db, program.id);
	const triggers = await checkDeloadTriggers(db, program.id);
	const wim = weekInMesocycle(program.current_week);
	const deload = isDeloadWeek(program.current_week);

	return {
		program,
		templates,
		nextTemplate: next,
		deloadTriggers: triggers,
		weekInMesocycle: wim,
		isDeload: deload || triggers.shouldDeload
	};
};
