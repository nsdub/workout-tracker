// Database access helpers for D1
// All weights stored canonically in lbs

export interface Program {
	id: number;
	name: string;
	start_date: string;
	competition_date: string | null;
	current_phase: 'hypertrophy' | 'intensification' | 'peak' | 'buffer';
	current_week: number;
	current_mesocycle: number;
	is_active: number;
}

export interface WorkoutTemplate {
	id: number;
	program_id: number;
	name: string;
	focus: string | null;
	description: string | null;
	rotation_order: number;
}

export interface TemplateExercise {
	id: number;
	template_id: number;
	position: number;
	exercise_name: string;
	base_sets: number;
	reps_min: number;
	reps_max: number;
	rir_target_min: number;
	rir_target_max: number;
	is_indicator: number;
	notes: string | null;
	sub_1: string | null;
	sub_2: string | null;
	end_goal_weight: number | null;
	end_goal_reps: number | null;
}

export interface Session {
	id: number;
	program_id: number;
	template_id: number;
	date: string;
	week_number: number;
	mesocycle_number: number;
	is_deload: number;
	bodyweight: number | null;
	duration_minutes: number | null;
	session_notes: string | null;
	checkin_sleep: number | null;
	checkin_stress: number | null;
	checkin_soreness: number | null;
	is_complete: number;
	created_at: string;
}

export interface LoggedSet {
	id: number;
	session_id: number;
	exercise_name: string;
	set_number: number;
	weight: number;
	reps: number;
	rir: number | null;
	is_warmup: number;
	is_substitute: number;
	actual_exercise_name: string | null;
	exercise_note: string | null;
	created_at: string;
}

export async function getActiveProgram(db: D1Database): Promise<Program | null> {
	return db.prepare('SELECT * FROM programs WHERE is_active = 1 ORDER BY id DESC LIMIT 1').first<Program>();
}

export async function getTemplates(db: D1Database, programId: number): Promise<WorkoutTemplate[]> {
	const result = await db
		.prepare('SELECT * FROM workout_templates WHERE program_id = ? ORDER BY rotation_order')
		.bind(programId)
		.all<WorkoutTemplate>();
	return result.results || [];
}

export async function getTemplate(db: D1Database, templateId: number): Promise<WorkoutTemplate | null> {
	return db.prepare('SELECT * FROM workout_templates WHERE id = ?').bind(templateId).first<WorkoutTemplate>();
}

export async function getTemplateExercises(db: D1Database, templateId: number): Promise<TemplateExercise[]> {
	const result = await db
		.prepare('SELECT * FROM template_exercises WHERE template_id = ? ORDER BY position')
		.bind(templateId)
		.all<TemplateExercise>();
	return result.results || [];
}

export async function getRecentSessions(db: D1Database, limit: number = 50): Promise<Session[]> {
	const result = await db
		.prepare('SELECT * FROM sessions WHERE is_complete = 1 ORDER BY date DESC LIMIT ?')
		.bind(limit)
		.all<Session>();
	return result.results || [];
}

export async function getSession(db: D1Database, id: number): Promise<Session | null> {
	return db.prepare('SELECT * FROM sessions WHERE id = ?').bind(id).first<Session>();
}

export async function getSessionSets(db: D1Database, sessionId: number): Promise<LoggedSet[]> {
	const result = await db
		.prepare('SELECT * FROM logged_sets WHERE session_id = ? ORDER BY exercise_name, set_number')
		.bind(sessionId)
		.all<LoggedSet>();
	return result.results || [];
}

// Cross-workout: get last performance of an exercise (any session)
export async function getLastPerformance(
	db: D1Database,
	exerciseName: string
): Promise<{ session: Session; sets: LoggedSet[] } | null> {
	const lastSet = await db
		.prepare(
			`SELECT s.* FROM sessions s
			 JOIN logged_sets ls ON ls.session_id = s.id
			 WHERE ls.exercise_name = ? AND s.is_complete = 1
			 ORDER BY s.date DESC LIMIT 1`
		)
		.bind(exerciseName)
		.first<Session>();

	if (!lastSet) return null;

	const sets = await db
		.prepare('SELECT * FROM logged_sets WHERE session_id = ? AND exercise_name = ? ORDER BY set_number')
		.bind(lastSet.id, exerciseName)
		.all<LoggedSet>();

	return { session: lastSet, sets: sets.results || [] };
}

// Cross-workout: get last N performances of an exercise
export async function getExerciseHistory(
	db: D1Database,
	exerciseName: string,
	limit: number = 8
): Promise<Array<{ session: Session; sets: LoggedSet[] }>> {
	const sessions = await db
		.prepare(
			`SELECT DISTINCT s.* FROM sessions s
			 JOIN logged_sets ls ON ls.session_id = s.id
			 WHERE ls.exercise_name = ? AND s.is_complete = 1
			 ORDER BY s.date DESC LIMIT ?`
		)
		.bind(exerciseName, limit)
		.all<Session>();

	const result = [];
	for (const session of sessions.results || []) {
		const sets = await db
			.prepare('SELECT * FROM logged_sets WHERE session_id = ? AND exercise_name = ? ORDER BY set_number')
			.bind(session.id, exerciseName)
			.all<LoggedSet>();
		result.push({ session, sets: sets.results || [] });
	}
	return result;
}

// Determine which template should come next based on rolling sequence
export async function getNextTemplate(db: D1Database, programId: number): Promise<WorkoutTemplate | null> {
	const lastSession = await db
		.prepare(
			`SELECT s.*, t.rotation_order as last_order FROM sessions s
			 JOIN workout_templates t ON t.id = s.template_id
			 WHERE s.program_id = ? AND s.is_complete = 1
			 ORDER BY s.date DESC LIMIT 1`
		)
		.bind(programId)
		.first<Session & { last_order: number }>();

	const templates = await getTemplates(db, programId);
	if (templates.length === 0) return null;

	if (!lastSession) return templates[0];

	// Rolling: find next rotation_order, wrap around
	const nextOrder = (lastSession.last_order % templates.length) + 1;
	return templates.find((t) => t.rotation_order === nextOrder) || templates[0];
}

export interface CheckResult {
	shouldDeload: boolean;
	reasons: string[];
}

// Check auto-deload triggers
export async function checkDeloadTriggers(db: D1Database, programId: number): Promise<CheckResult> {
	const reasons: string[] = [];
	const now = new Date();

	// Trigger 1: 6+ days since last session
	const lastSession = await db
		.prepare('SELECT date FROM sessions WHERE program_id = ? AND is_complete = 1 ORDER BY date DESC LIMIT 1')
		.bind(programId)
		.first<{ date: string }>();

	if (lastSession) {
		const lastDate = new Date(lastSession.date);
		const daysSince = (now.getTime() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
		if (daysSince >= 6) {
			reasons.push(`${Math.floor(daysSince)} days since last session`);
		}
	}

	// Trigger 2: 2+ indicator regressions ≥7%
	const indicators = await db
		.prepare(
			`SELECT exercise_name FROM template_exercises te
			 JOIN workout_templates wt ON wt.id = te.template_id
			 WHERE wt.program_id = ? AND te.is_indicator = 1`
		)
		.bind(programId)
		.all<{ exercise_name: string }>();

	let regressions = 0;
	for (const ind of indicators.results || []) {
		const recent = await db
			.prepare(
				`SELECT e1rm FROM indicator_history WHERE exercise_name = ? ORDER BY test_date DESC LIMIT 2`
			)
			.bind(ind.exercise_name)
			.all<{ e1rm: number }>();
		const arr = recent.results || [];
		if (arr.length >= 2 && arr[1].e1rm > 0) {
			const drop = ((arr[1].e1rm - arr[0].e1rm) / arr[1].e1rm) * 100;
			if (drop >= 7) regressions++;
		}
	}
	if (regressions >= 2) {
		reasons.push(`${regressions} indicator lifts regressed ≥7%`);
	}

	// Trigger 3: 2 consecutive check-ins ≤5/10
	const checkins = await db
		.prepare(
			`SELECT (checkin_sleep + checkin_stress + checkin_soreness)/3.0 as avg_score FROM sessions
			 WHERE program_id = ? AND is_complete = 1 AND checkin_sleep IS NOT NULL
			 ORDER BY date DESC LIMIT 2`
		)
		.bind(programId)
		.all<{ avg_score: number }>();
	const cArr = checkins.results || [];
	if (cArr.length >= 2 && cArr[0].avg_score <= 5 && cArr[1].avg_score <= 5) {
		reasons.push('2 consecutive check-ins below 5/10');
	}

	return { shouldDeload: reasons.length > 0, reasons };
}

// Calculate Epley 1RM
export function calculateE1RM(weight: number, reps: number): number {
	if (reps === 0) return 0;
	return weight * (1 + reps / 30);
}

// Get current PRs
export async function getAllPRs(db: D1Database): Promise<Map<string, { e1rm: number; weight: number; reps: number; date: string }>> {
	const result = await db.prepare('SELECT * FROM personal_records').all<any>();
	const map = new Map();
	for (const pr of result.results || []) {
		map.set(pr.exercise_name, { e1rm: pr.e1rm, weight: pr.weight, reps: pr.reps, date: pr.date });
	}
	return map;
}

// Update PR if beaten
export async function checkAndUpdatePR(
	db: D1Database,
	exerciseName: string,
	weight: number,
	reps: number,
	sessionId: number,
	date: string
): Promise<boolean> {
	if (reps === 0) return false;
	const e1rm = calculateE1RM(weight, reps);
	const existing = await db.prepare('SELECT e1rm FROM personal_records WHERE exercise_name = ?').bind(exerciseName).first<{ e1rm: number }>();

	if (!existing || e1rm > existing.e1rm) {
		await db
			.prepare(
				`INSERT INTO personal_records (exercise_name, e1rm, weight, reps, date, session_id)
				 VALUES (?, ?, ?, ?, ?, ?)
				 ON CONFLICT(exercise_name) DO UPDATE SET
				 e1rm=excluded.e1rm, weight=excluded.weight, reps=excluded.reps, date=excluded.date, session_id=excluded.session_id`
			)
			.bind(exerciseName, e1rm, weight, reps, date, sessionId)
			.run();
		return true;
	}
	return false;
}

// Volume progression based on week within mesocycle (1=MEV, 2=+1set, 3=+2sets+5lbs, 4=DELOAD)
export function getProgressedSets(baseSets: number, weekInMeso: number): number {
	if (weekInMeso === 1) return baseSets;
	if (weekInMeso === 2) return baseSets + 1;
	if (weekInMeso === 3) return baseSets + 2;
	if (weekInMeso === 4) return Math.ceil(baseSets / 2); // deload: 50% volume
	return baseSets;
}

export function getProgressedRIR(baseMin: number, baseMax: number, weekInMeso: number): { min: number; max: number } {
	if (weekInMeso === 4) return { min: 4, max: 5 }; // deload RIR
	if (weekInMeso === 3) return { min: Math.max(0, baseMin - 1), max: Math.max(0, baseMax - 1) };
	return { min: baseMin, max: baseMax };
}

export function isDeloadWeek(weekNumber: number): boolean {
	// Every 4th week (week 4, 8, 12, 16, 20) is deload
	return weekNumber % 4 === 0;
}

export function weekInMesocycle(weekNumber: number): number {
	const w = ((weekNumber - 1) % 4) + 1;
	return w;
}
