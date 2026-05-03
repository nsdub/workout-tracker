-- Protocol Workout v4.0 Database Schema
-- Cloudflare D1 (SQLite at edge)
-- All weights stored canonically in lbs

-- ============================================================
-- PROGRAMS: 26-week training cycle (20 programmed + 6 buffer)
-- ============================================================
CREATE TABLE programs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  start_date TEXT NOT NULL,           -- ISO date
  competition_date TEXT,              -- ISO date
  current_phase TEXT NOT NULL DEFAULT 'hypertrophy',  -- 'hypertrophy' | 'intensification' | 'peak' | 'buffer'
  current_week INTEGER NOT NULL DEFAULT 1,
  current_mesocycle INTEGER NOT NULL DEFAULT 1,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- ============================================================
-- WORKOUT TEMPLATES: Push A, Pull A, Legs A, Push B, Pull B
-- ============================================================
CREATE TABLE workout_templates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL REFERENCES programs(id),
  name TEXT NOT NULL,                 -- "Push A"
  focus TEXT,                         -- "Chest Emphasis"
  description TEXT,
  rotation_order INTEGER NOT NULL,    -- 1-5
  UNIQUE(program_id, rotation_order)
);

-- ============================================================
-- TEMPLATE EXERCISES: prescribed exercises with progression rules
-- ============================================================
CREATE TABLE template_exercises (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  template_id INTEGER NOT NULL REFERENCES workout_templates(id),
  position INTEGER NOT NULL,
  exercise_name TEXT NOT NULL,
  base_sets INTEGER NOT NULL,
  reps_min INTEGER NOT NULL,
  reps_max INTEGER NOT NULL,
  rir_target_min INTEGER NOT NULL DEFAULT 1,
  rir_target_max INTEGER NOT NULL DEFAULT 2,
  is_indicator INTEGER NOT NULL DEFAULT 0,    -- indicator lift?
  notes TEXT,
  sub_1 TEXT,                          -- substitution alternatives
  sub_2 TEXT,
  end_goal_weight REAL,                -- target weight at end of program
  end_goal_reps INTEGER,
  UNIQUE(template_id, position)
);

-- ============================================================
-- SESSIONS: actual logged workouts
-- ============================================================
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  program_id INTEGER NOT NULL REFERENCES programs(id),
  template_id INTEGER NOT NULL REFERENCES workout_templates(id),
  date TEXT NOT NULL,                  -- ISO timestamp
  week_number INTEGER NOT NULL,
  mesocycle_number INTEGER NOT NULL,
  is_deload INTEGER NOT NULL DEFAULT 0,
  bodyweight REAL,                     -- lbs, optional
  duration_minutes INTEGER,
  session_notes TEXT,
  -- Post-workout check-in (only on last session of cycle)
  checkin_sleep INTEGER,               -- 1-10
  checkin_stress INTEGER,              -- 1-10
  checkin_soreness INTEGER,            -- 1-10
  is_complete INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_sessions_date ON sessions(date);
CREATE INDEX idx_sessions_program ON sessions(program_id);

-- ============================================================
-- LOGGED SETS: actual sets performed
-- ============================================================
CREATE TABLE logged_sets (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,         -- canonical name (cross-workout aggregation key)
  set_number INTEGER NOT NULL,
  weight REAL NOT NULL,                -- always lbs
  reps INTEGER NOT NULL,
  rir INTEGER,                         -- self-reported reps in reserve, nullable
  is_warmup INTEGER NOT NULL DEFAULT 0,
  is_substitute INTEGER NOT NULL DEFAULT 0,  -- did they swap exercise?
  actual_exercise_name TEXT,           -- if substituted, what they did
  exercise_note TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX idx_logged_sets_session ON logged_sets(session_id);
CREATE INDEX idx_logged_sets_exercise ON logged_sets(exercise_name);

-- ============================================================
-- PERSONAL RECORDS: auto-calculated, by exercise name
-- ============================================================
CREATE TABLE personal_records (
  exercise_name TEXT PRIMARY KEY,
  e1rm REAL NOT NULL,
  weight REAL NOT NULL,
  reps INTEGER NOT NULL,
  date TEXT NOT NULL,
  session_id INTEGER REFERENCES sessions(id)
);

-- ============================================================
-- INDICATOR HISTORY: track indicator lift performance over time
-- ============================================================
CREATE TABLE indicator_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  exercise_name TEXT NOT NULL,
  test_date TEXT NOT NULL,
  weight REAL NOT NULL,
  reps INTEGER NOT NULL,
  rir INTEGER,
  e1rm REAL NOT NULL,
  week_number INTEGER NOT NULL,
  mesocycle_number INTEGER NOT NULL,
  was_regression INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

-- ============================================================
-- AUTO-DELOAD EVENTS: track when triggers fire
-- ============================================================
CREATE TABLE deload_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  triggered_at TEXT NOT NULL DEFAULT (datetime('now')),
  trigger_reason TEXT NOT NULL,        -- 'scheduled' | 'gap' | 'regression' | 'checkin' | 'bw_drop'
  trigger_details TEXT,                -- JSON with specifics
  week_number INTEGER NOT NULL,
  was_acknowledged INTEGER NOT NULL DEFAULT 0
);

-- ============================================================
-- AUTH: single-user PIN-based auth with session tokens
-- ============================================================
CREATE TABLE auth_sessions (
  token TEXT PRIMARY KEY,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT NOT NULL,
  user_agent TEXT
);

-- ============================================================
-- BACKUPS: daily snapshots for safety
-- ============================================================
CREATE TABLE backups (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  trigger TEXT NOT NULL,               -- 'auto-daily' | 'manual' | 'pre-import'
  data_json TEXT NOT NULL,
  size_bytes INTEGER
);
