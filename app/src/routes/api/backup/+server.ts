import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ platform }) => {
	if (!platform?.env?.DB) return new Response('DB unavailable', { status: 500 });
	const db = platform.env.DB;

	const programs = (await db.prepare('SELECT * FROM programs').all()).results;
	const templates = (await db.prepare('SELECT * FROM workout_templates').all()).results;
	const exercises = (await db.prepare('SELECT * FROM template_exercises').all()).results;
	const sessions = (await db.prepare('SELECT * FROM sessions').all()).results;
	const sets = (await db.prepare('SELECT * FROM logged_sets').all()).results;
	const prs = (await db.prepare('SELECT * FROM personal_records').all()).results;
	const indicatorHistory = (await db.prepare('SELECT * FROM indicator_history').all()).results;
	const deloadEvents = (await db.prepare('SELECT * FROM deload_events').all()).results;

	const backup = {
		version: '4.2',
		exportDate: new Date().toISOString(),
		programs,
		templates,
		exercises,
		sessions,
		sets,
		prs,
		indicatorHistory,
		deloadEvents
	};

	return new Response(JSON.stringify(backup, null, 2), {
		headers: {
			'Content-Type': 'application/json',
			'Content-Disposition': 'attachment; filename="protocol-backup.json"'
		}
	});
};
