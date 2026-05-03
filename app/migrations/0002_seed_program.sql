-- Seed: Protocol v4.2 - Final locked program for Nov 2026 physique competition
-- Lifter: 215 lb, 6'4" (194 cm), intermediate-advanced, pec injury (no flat bb, stop at 90° elbow)
-- Equipment: DB to 80, KB to 35, Smith only, cables, machines (no barbell, no hack squat, etc.)
-- Stage target: ~200 lb (~7% BF) by Wk 22; peak Wk 23-26
--
-- Split (5 lifting + 2 cardio days, fixed):
--   Mon: Push (chest emphasis)
--   Tue: Pull (back emphasis)
--   Wed: Legs A (quad-led, balanced)
--   Thu: LISS cardio
--   Fri: Upper (chest 2nd hit + shoulders/arms)
--   Sat: Legs B (posterior-led, balanced)
--   Sun: LISS or HIIT (phase-dependent)
--
-- 26-week phases:
--   Wks 1-8 BUILD: maintenance + slight surplus, target +3-5 lb
--   Wks 9-22 CUT: 0.6%/wk loss, 215+ → ~200
--   Wks 23-26 PEAK: peak week protocols
--
-- Mesocycle: 3 build weeks + 1 deload (every 4th week)

INSERT INTO programs (id, name, start_date, competition_date, current_phase, current_week, current_mesocycle, is_active)
VALUES (1, 'Protocol v4.2 - Nov 2026 Stage Prep', date('now'), '2026-11-01', 'hypertrophy', 1, 1, 1);

-- ============================================================
-- WORKOUT 1: PUSH (Chest Emphasis) - Monday
-- ============================================================
INSERT INTO workout_templates (id, program_id, name, focus, description, rotation_order)
VALUES (1, 1, 'Push', 'Chest Emphasis',
  'Heavy chest day. Smith Incline is the chest indicator. All pressing stops at 90° elbow. Pec injury protocol: never to failure, RIR 2+ on chest movements.',
  1);

INSERT INTO template_exercises (template_id, position, exercise_name, base_sets, reps_min, reps_max, rir_target_min, rir_target_max, is_indicator, sub_1, sub_2, end_goal_weight, end_goal_reps, notes) VALUES
  (1, 1, 'Smith Machine Incline Press', 4, 6, 8, 2, 3, 1, 'Chest Press Machine (incline setting)', 'Pec Deck', 215, 8, '30-45° bench. Stop at 90° elbow. RIR 2-3 always. INDICATOR.'),
  (1, 2, 'Pec Deck (lengthened bias)', 4, 10, 12, 1, 2, 0, 'Cable Crossover (Low to High)', 'Machine Chest Press', 130, 12, 'Slow 3-sec eccentric. Lengthened-position emphasis (Maeo et al. 2023).'),
  (1, 3, 'Machine Chest Press (neutral grip)', 3, 8, 10, 1, 2, 0, 'Smith Machine Incline Press', 'Pec Deck', 230, 10, 'Squeeze peak. Full ROM.'),
  (1, 4, 'Cable Crossover (High to Low)', 3, 12, 15, 1, 2, 0, 'Pec Deck', 'Cable Crossover (Low to High)', 45, 12, 'Lower chest. Hands meet at navel.'),
  (1, 5, 'Shoulder Press Machine', 3, 8, 10, 1, 2, 0, 'Smith Machine Overhead Press', 'Dumbbell Shoulder Press', 165, 10, 'Chest press converted. Slight forward lean.'),
  (1, 6, 'Dumbbell Lateral Raise', 4, 12, 15, 0, 1, 0, 'Cable Lateral Raise', NULL, 30, 15, 'Controlled. No swinging. DB cap 80.'),
  (1, 7, 'Machine Tricep Extension', 3, 10, 12, 0, 1, 0, 'Overhead Cable Tricep Extension', 'Rope Pushdown', 140, 12, 'Long head emphasis if available, else heavy reps.');

-- ============================================================
-- WORKOUT 2: PULL (Back Emphasis) - Tuesday
-- ============================================================
INSERT INTO workout_templates (id, program_id, name, focus, description, rotation_order)
VALUES (2, 1, 'Pull', 'Back Emphasis',
  'Heavy back day. Smith Bent Row is the back indicator. Width and thickness combined. Reverse pec deck for rear delts.',
  2);

INSERT INTO template_exercises (template_id, position, exercise_name, base_sets, reps_min, reps_max, rir_target_min, rir_target_max, is_indicator, sub_1, sub_2, end_goal_weight, end_goal_reps, notes) VALUES
  (2, 1, 'Lat Pulldown (Wide Grip)', 4, 8, 10, 1, 2, 0, 'Assisted Pullup', 'Lat Pulldown (Close Grip)', 180, 10, 'Wide overhand. Pull to upper chest. Slight lean.'),
  (2, 2, 'Smith Machine Bent Over Row', 4, 6, 8, 1, 2, 1, 'Seated Cable Row (Wide Grip)', NULL, 195, 8, '45° torso. Pull to lower chest. INDICATOR.'),
  (2, 3, 'Seated Cable Row (Neutral Grip)', 3, 10, 12, 1, 2, 0, 'Lat Pulldown (Close Grip)', NULL, 150, 10, 'Squeeze shoulder blades. Full ROM.'),
  (2, 4, 'Single-Arm Lat Pulldown (kneeling)', 3, 12, 15, 0, 1, 0, 'Lat Pulldown (Wide Grip)', NULL, 70, 12, 'Unilateral. Full lat stretch top.'),
  (2, 5, 'Reverse Pec Deck', 3, 12, 15, 0, 1, 0, 'Cable Face Pull', NULL, 110, 15, 'Rear delt isolation. Reversible pec deck.'),
  (2, 6, 'Machine Bicep Curl', 3, 10, 12, 0, 1, 0, 'Dumbbell Curl', 'Cable Curl', 100, 12, 'Squeeze peak.'),
  (2, 7, 'Cable Hammer Curl (rope)', 3, 12, 15, 0, 1, 0, 'Dumbbell Hammer Curl', NULL, 60, 12, 'Brachialis emphasis.');

-- ============================================================
-- WORKOUT 3: LEGS A (Quad-led, balanced) - Wednesday
-- ============================================================
INSERT INTO workout_templates (id, program_id, name, focus, description, rotation_order)
VALUES (3, 1, 'Legs A', 'Quad-Led, Balanced',
  'Quad-emphasis with balanced ham/glute work. Leg Press FEET LOW for quad bias. Indicator: Leg Press.',
  3);

INSERT INTO template_exercises (template_id, position, exercise_name, base_sets, reps_min, reps_max, rir_target_min, rir_target_max, is_indicator, sub_1, sub_2, end_goal_weight, end_goal_reps, notes) VALUES
  (3, 1, 'Leg Press (Feet LOW)', 4, 8, 10, 1, 2, 1, 'Smith Machine Squat', NULL, 295, 10, 'Feet LOW and narrow for quad bias. Don''t lock knees. INDICATOR.'),
  (3, 2, 'Seated Leg Extension (paused top)', 4, 10, 12, 0, 1, 0, NULL, NULL, 200, 12, '2-sec pause peak contraction. Control negative.'),
  (3, 3, 'Smith Bulgarian Split Squat', 2, 8, 10, 1, 2, 0, 'Smith Reverse Lunge', 'DB Walking Lunge', 95, 10, 'Per leg. Heavier setup, lighter load. 2 sets only - quad volume already high.'),
  (3, 4, 'Seated Leg Curl', 4, 10, 12, 0, 1, 0, 'Exercise Ball Leg Curl', NULL, 175, 12, 'Hamstring isolation. Squeeze peak.'),
  (3, 5, 'Hip Adductor', 3, 12, 15, 0, 1, 0, NULL, NULL, 130, 15, 'Inner thigh. Pause at contraction.'),
  (3, 6, 'Smith Calf Raise (toes elevated)', 4, 8, 12, 0, 1, 0, 'Leg Press Calf Raise', NULL, 245, 12, 'Bar on shoulders, plate under toes. 3-sec stretch bottom.'),
  (3, 7, 'Abs Machine', 3, 10, 15, 0, 1, 0, 'Cable Crunch', 'Hanging Leg Raise', 90, 12, 'Crunch with rotation. Don''t pull with arms.');

-- ============================================================
-- WORKOUT 4: UPPER (Chest 2nd + Shoulders/Arms) - Friday
-- ============================================================
INSERT INTO workout_templates (id, program_id, name, focus, description, rotation_order)
VALUES (4, 1, 'Upper', 'Chest #2 + Shoulders + Arms',
  'Second chest hit at lower volume. Add face pull for rear delt. 6 exercises max - end of work week, prioritize quality.',
  4);

INSERT INTO template_exercises (template_id, position, exercise_name, base_sets, reps_min, reps_max, rir_target_min, rir_target_max, is_indicator, sub_1, sub_2, end_goal_weight, end_goal_reps, notes) VALUES
  (4, 1, 'Smith Machine Incline Press (low incline ~15°)', 3, 8, 10, 2, 3, 0, 'Chest Press Machine', 'Dumbbell Incline Press', 195, 10, 'Light incline. Stop at 90° elbow. RIR 2-3 always.'),
  (4, 2, 'Cable Crossover (Low to High, lengthened)', 4, 12, 15, 1, 2, 0, 'Pec Deck', NULL, 35, 12, 'Deep stretch position. Upper chest emphasis.'),
  (4, 3, 'Lat Pulldown (Close Neutral Grip)', 3, 10, 12, 0, 1, 0, 'Single-Arm Lat Pulldown', NULL, 160, 10, 'Full stretch top. Squeeze lats.'),
  (4, 4, 'Cable Face Pull (rope to face)', 3, 12, 15, 0, 1, 0, 'Reverse Pec Deck', NULL, 50, 15, 'Rear delt 2nd hit. Pull rope to face, separate hands.'),
  (4, 5, 'Cable Lateral Raise', 3, 12, 15, 0, 1, 0, 'Dumbbell Lateral Raise', NULL, 22, 15, 'Side delt 2nd hit. Pause at top.'),
  (4, 6, 'Incline Dumbbell Curl', 3, 10, 12, 0, 1, 0, 'Machine Bicep Curl', NULL, 45, 10, '45° incline. Long head stretch.');

-- ============================================================
-- WORKOUT 5: LEGS B (Posterior-led, balanced) - Saturday
-- ============================================================
INSERT INTO workout_templates (id, program_id, name, focus, description, rotation_order)
VALUES (5, 1, 'Legs B', 'Posterior Chain, Balanced',
  'Hams, glutes, posterior emphasis. Leg Press FEET HIGH for glute/ham bias. B-stance hip thrust solves load problem (unilateral allows 80lb DB to be sufficient).',
  5);

INSERT INTO template_exercises (template_id, position, exercise_name, base_sets, reps_min, reps_max, rir_target_min, rir_target_max, is_indicator, sub_1, sub_2, end_goal_weight, end_goal_reps, notes) VALUES
  (5, 1, 'Smith Romanian Deadlift', 4, 8, 10, 2, 2, 0, 'Lower Back Machine (45° hyper)', 'Dumbbell RDL', 245, 10, 'Start at ~205 lb (75% of Smith DL 285). Push hips back. Hamstring stretch.'),
  (5, 2, 'Seated Leg Curl', 4, 10, 12, 0, 1, 0, NULL, NULL, 195, 12, 'Heavier rep range than Wed. Full ROM.'),
  (5, 3, 'Leg Press (Feet HIGH wide)', 3, 10, 12, 1, 2, 0, 'Smith Machine Squat', NULL, 280, 12, 'Feet HIGH and WIDE for glute/ham bias.'),
  (5, 4, 'B-stance DB Hip Thrust', 3, 8, 10, 1, 2, 0, 'Cable Pull-Through', '45° Hyper (neutral spine, hip-hinge)', 80, 10, 'Single-leg emphasis - 80lb DB is adequate load. Bench-supported.'),
  (5, 5, 'Hip Abductor (forward lean)', 3, 12, 15, 0, 1, 0, NULL, NULL, 165, 15, 'Glute medius. Lean forward = glute bias.'),
  (5, 6, 'Smith Single-Leg Calf Raise', 4, 10, 12, 0, 1, 0, 'Leg Press Calf Raise', NULL, 135, 12, 'Per leg. Smith bar on shoulders. 3-sec stretch.'),
  (5, 7, 'Hanging Leg Raise', 3, 10, 15, 1, 1, 0, 'Abs Machine', 'Cable Crunch', 0, 15, 'Lower ab emphasis. Curl pelvis up.');
