import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';
import {
	getActiveProgram,
	getTemplate,
	getTemplateExercises,
	getLastPerformance,
	getProgressedSets,
	getProgressedRIR,
	weekInMesocycle,
	isDeloadWeek
} from '$lib/server/db';

export const load: PageServerLoad = async ({ platform, params }) => {
	if (!platform?.env?.DB) throw error(500, 'DB not available');
	const db = platform.env.DB;

	const templateId = parseInt(params.templateId);
	const template = await getTemplate(db, templateId);
	if (!template) throw error(404, 'Workout not found');

	const program = await getActiveProgram(db);
	if (!program) throw error(500, 'No active program');

	const exercises = await getTemplateExercises(db, templateId);
	const wim = weekInMesocycle(program.current_week);
	const deload = isDeloadWeek(program.current_week);

	const exercisesWithLast = await Promise.all(
		exercises.map(async (ex) => {
			const last = await getLastPerformance(db, ex.exercise_name);
			const progressedSets = getProgressedSets(ex.base_sets, wim);
			const progressedRIR = getProgressedRIR(ex.rir_target_min, ex.rir_target_max, wim);
			return {
				...ex,
				lastPerformance: last,
				progressedSets,
				progressedRIR,
				isDeload: deload
			};
		})
	);

	return {
		program,
		template,
		exercises: exercisesWithLast,
		weekInMesocycle: wim,
		isDeload: deload
	};
};
