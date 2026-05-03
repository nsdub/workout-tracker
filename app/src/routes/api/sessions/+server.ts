import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import {
	getActiveProgram,
	checkAndUpdatePR,
	calculateE1RM,
	weekInMesocycle,
	isDeloadWeek,
	getTemplateExercises
} from '$lib/server/db';

interface SetPayload {
	setNumber: number;
	weight: number;
	reps: number;
	rir: number | null;
}

interface ExercisePayload {
	exerciseName: string;
	actualExerciseName: string | null;
	note: string;
	sets: SetPayload[];
}

interface SessionPayload {
	templateId: number;
	bodyweight: number | null;
	checkin: { sleep: number; stress: number; soreness: number } | null;
	exercises: ExercisePayload[];
}

export const POST: RequestHandler = async ({ request, platform }) => {
	if (!platform?.env?.DB) return json({ error: 'DB unavailable' }, { status: 500 });
	const db = platform.env.DB;

	const payload = (await request.json()) as SessionPayload;
	const program = await getActiveProgram(db);
	if (!program) return json({ error: 'No active program' }, { status: 400 });

	const now = new Date().toISOString();
	const wim = weekInMesocycle(program.current_week);
	const deload = isDeloadWeek(program.current_week);

	// Insert session
	const sessionRes = await db
		.prepare(
			`INSERT INTO sessions
			 (program_id, template_id, date, week_number, mesocycle_number, is_deload, bodyweight,
			  checkin_sleep, checkin_stress, checkin_soreness, is_complete)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
		)
		.bind(
			program.id,
			payload.templateId,
			now,
			program.current_week,
			program.current_mesocycle,
			deload ? 1 : 0,
			payload.bodyweight,
			payload.checkin?.sleep ?? null,
			payload.checkin?.stress ?? null,
			payload.checkin?.soreness ?? null
		)
		.run();

	const sessionId = sessionRes.meta.last_row_id as number;

	// Insert sets
	const newPRs: string[] = [];
	const templateExercises = await getTemplateExercises(db, payload.templateId);
	const indicatorMap = new Map(templateExercises.map((te) => [te.exercise_name, te.is_indicator === 1]));

	for (const ex of payload.exercises) {
		for (const s of ex.sets) {
			await db
				.prepare(
					`INSERT INTO logged_sets
					 (session_id, exercise_name, set_number, weight, reps, rir, is_substitute, actual_exercise_name, exercise_note)
					 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
				)
				.bind(
					sessionId,
					ex.exerciseName,
					s.setNumber,
					s.weight,
					s.reps,
					s.rir,
					ex.actualExerciseName ? 1 : 0,
					ex.actualExerciseName,
					ex.note || null
				)
				.run();
		}

		// Check PRs (best set in this exercise)
		const sets = ex.sets.filter((s) => s.reps > 0);
		if (sets.length > 0) {
			let bestE1RM = 0;
			let bestSet = sets[0];
			for (const s of sets) {
				const e = calculateE1RM(s.weight, s.reps);
				if (e > bestE1RM) {
					bestE1RM = e;
					bestSet = s;
				}
			}
			const isPR = await checkAndUpdatePR(db, ex.exerciseName, bestSet.weight, bestSet.reps, sessionId, now);
			if (isPR) newPRs.push(ex.exerciseName);

			// Indicator history
			if (indicatorMap.get(ex.exerciseName)) {
				await db
					.prepare(
						`INSERT INTO indicator_history
						 (exercise_name, test_date, weight, reps, rir, e1rm, week_number, mesocycle_number)
						 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
					)
					.bind(
						ex.exerciseName,
						now,
						bestSet.weight,
						bestSet.reps,
						bestSet.rir,
						bestE1RM,
						program.current_week,
						program.current_mesocycle
					)
					.run();
			}
		}
	}

	// Advance program (rolling: last template completes a cycle if rotation_order == 5; advance week)
	const completedTemplate = await db
		.prepare('SELECT rotation_order FROM workout_templates WHERE id = ?')
		.bind(payload.templateId)
		.first<{ rotation_order: number }>();

	if (completedTemplate?.rotation_order === 5) {
		// End of rolling cycle - advance week and possibly mesocycle/phase
		let newWeek = program.current_week + 1;
		let newMeso = program.current_mesocycle;
		if (newWeek % 4 === 1 && newWeek > 1) {
			newMeso += 1;
		}
		let newPhase = program.current_phase;
		if (newWeek > 12 && newWeek <= 16) newPhase = 'intensification';
		else if (newWeek > 16 && newWeek <= 20) newPhase = 'peak';
		else if (newWeek > 20) newPhase = 'buffer';

		await db
			.prepare('UPDATE programs SET current_week = ?, current_mesocycle = ?, current_phase = ? WHERE id = ?')
			.bind(newWeek, newMeso, newPhase, program.id)
			.run();
	}

	return json({ ok: true, sessionId, newPRs });
};
