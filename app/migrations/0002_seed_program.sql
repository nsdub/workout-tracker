-- Seed: Protocol v4.0 program for Nov 2026 physique competition
-- Equipment-audited against actual gym (DB cap 80, KB cap 35, Smith only, no barbell)
-- 5-day rolling rotation: Push A, Pull A, Legs A, Push B, Pull B

INSERT INTO programs (id, name, start_date, competition_date, current_phase, current_week, current_mesocycle, is_active)
VALUES (1, 'Protocol v4.0 - Nov 2026 Prep', date('now'), '2026-11-01', 'hypertrophy', 1, 1, 1);

-- ============================================================
-- WORKOUT 1: PUSH A (Chest Emphasis)
-- ============================================================
INSERT INTO workout_templates (id, program_id, name, focus, description, rotation_order)
VALUES (1, 1, 'Push A', 'Chest Emphasis',
  'Primary chest day. Smith Incline Press is the chest indicator lift. Machine and cable work for safe pec injury management.',
  1);

INSERT INTO template_exercises (template_id, position, exercise_name, base_sets, reps_min, reps_max, rir_target_min, rir_target_max, is_indicator, sub_1, sub_2, end_goal_weight, end_goal_reps, notes) VALUES
  (1, 1, 'Smith Machine Incline Press', 4, 6, 8, 1, 2, 1, 'Chest Press Machine (incline setting)', 'Pec Deck', 220, 8, '30-45° bench. Stop at 90° elbow. INDICATOR.'),
  (1, 2, 'Machine Chest Press', 3, 8, 10, 1, 2, 0, 'Smith Machine Incline Press', 'Pec Deck', 230, 10, 'Squeeze peak. Full ROM.'),
  (1, 3, 'Pec Deck', 3, 12, 15, 1, 2, 0, 'Cable Crossover (Low to High)', 'Machine Chest Press', 130, 15, 'Lengthened position. Full stretch.'),
  (1, 4, 'Dumbbell Shoulder Press', 3, 8, 10, 1, 2, 0, 'Shoulder Press Machine', 'Smith Machine Overhead Press', 55, 10, 'Slight forward lean. DB cap 80 lbs.'),
  (1, 5, 'Cable Lateral Raise', 4, 12, 15, 1, 2, 0, 'Dumbbell Lateral Raise', NULL, 20, 15, 'Lead with elbow. Pause at top.'),
  (1, 6, 'Overhead Cable Tricep Extension', 3, 10, 12, 1, 2, 0, 'Machine Tricep Extension', 'Rope Pushdown', 75, 12, 'Long head. Full overhead stretch.'),
  (1, 7, 'Rope Pushdown', 2, 12, 15, 1, 2, 0, 'Machine Tricep Extension', 'Reverse Grip Pushdown', 50, 15, 'Split rope at bottom.');

-- ============================================================
-- WORKOUT 2: PULL A (Back Width + Deadlift)
-- ============================================================
INSERT INTO workout_templates (id, program_id, name, focus, description, rotation_order)
VALUES (2, 1, 'Pull A', 'Back Width + Deadlift',
  'Heavy hip hinge. Smith Deadlift is indicator lift. Vertical pulling for lat width.',
  2);

INSERT INTO template_exercises (template_id, position, exercise_name, base_sets, reps_min, reps_max, rir_target_min, rir_target_max, is_indicator, sub_1, sub_2, end_goal_weight, end_goal_reps, notes) VALUES
  (2, 1, 'Smith Machine Deadlift', 4, 4, 6, 2, 2, 1, 'Smith RDL', NULL, 335, 5, 'Bar at mid-shin. Reset each rep. INDICATOR. Never grind.'),
  (2, 2, 'Lat Pulldown (Wide Grip)', 4, 8, 12, 1, 2, 0, 'Assisted Pullup', 'Lat Pulldown (Close Grip)', 180, 10, 'Wide overhand. Pull to upper chest.'),
  (2, 3, 'Seated Cable Row (Wide Grip)', 3, 10, 12, 1, 2, 0, 'Lat Pulldown (Close Grip)', NULL, 150, 10, 'Wide grip. Row to lower chest.'),
  (2, 4, 'Dumbbell Curl', 3, 8, 10, 1, 2, 0, 'Machine Bicep Curl', 'Cable Curl', 45, 10, 'Supinate at top. DB cap 80.'),
  (2, 5, 'Cable Hammer Curl', 3, 10, 12, 1, 2, 0, 'Machine Bicep Curl', 'Dumbbell Hammer Curl', 60, 10, 'Rope. Brachialis emphasis.'),
  (2, 6, 'Face Pulls', 2, 15, 20, 0, 1, 0, 'Reverse Pec Deck', NULL, 45, 18, 'External rotation. Rear delts.');

-- ============================================================
-- WORKOUT 3: LEGS A (Quad Emphasis)
-- ============================================================
INSERT INTO workout_templates (id, program_id, name, focus, description, rotation_order)
VALUES (3, 1, 'Legs A', 'Quad Emphasis',
  'Quad-dominant. Leg Press (feet low) is the indicator lift. Direct ab work via hanging leg raise.',
  3);

INSERT INTO template_exercises (template_id, position, exercise_name, base_sets, reps_min, reps_max, rir_target_min, rir_target_max, is_indicator, sub_1, sub_2, end_goal_weight, end_goal_reps, notes) VALUES
  (3, 1, 'Leg Press (Feet Low)', 4, 8, 10, 1, 2, 1, 'Smith Machine Squat', NULL, 320, 10, 'Feet low/narrow for quads. Don''t lock knees. INDICATOR.'),
  (3, 2, 'Smith RDL', 3, 8, 10, 2, 2, 0, 'Lower Back Machine', 'Dumbbell RDL', 245, 10, 'Slight knee bend. Push hips back. Hamstring stretch.'),
  (3, 3, 'Leg Extension', 4, 12, 15, 0, 1, 0, NULL, NULL, 200, 15, '2-second pause at top. Control negative.'),
  (3, 4, 'Seated Leg Curl', 4, 10, 12, 0, 1, 0, NULL, NULL, 175, 12, 'Full ROM. Squeeze peak.'),
  (3, 5, 'Smith Calf Raise', 4, 8, 12, 0, 1, 0, 'Leg Press Calf Raise', NULL, 245, 12, 'Smith bar on shoulders, plate under toes. Full stretch bottom, pause top.'),
  (3, 6, 'Leg Press Calf Raise', 3, 15, 20, 0, 1, 0, 'Smith Calf Raise', NULL, 280, 18, 'Toes on platform edge. Soleus emphasis.'),
  (3, 7, 'Hanging Leg Raise', 2, 10, 15, 1, 1, 0, 'Abs Machine', 'Cable Crunch', 0, 15, 'Hang bar. Curl pelvis up.');

-- ============================================================
-- WORKOUT 4: PUSH B (Shoulder Emphasis + 2nd Chest)
-- ============================================================
INSERT INTO workout_templates (id, program_id, name, focus, description, rotation_order)
VALUES (4, 1, 'Push B', 'Shoulder Emphasis',
  'Vertical push priority. 2nd chest hit via cable crossovers and assisted dips. Rear delts via reverse pec deck.',
  4);

INSERT INTO template_exercises (template_id, position, exercise_name, base_sets, reps_min, reps_max, rir_target_min, rir_target_max, is_indicator, sub_1, sub_2, end_goal_weight, end_goal_reps, notes) VALUES
  (4, 1, 'Smith Machine Overhead Press', 4, 6, 8, 1, 2, 0, 'Shoulder Press Machine', 'Dumbbell Shoulder Press', 155, 8, 'Slight incline bench. Bar to chin level.'),
  (4, 2, 'Dumbbell Lateral Raise', 3, 12, 15, 0, 1, 0, 'Cable Lateral Raise', NULL, 25, 15, 'Controlled negatives. No swinging. DB cap 80.'),
  (4, 3, 'Cable Crossover (High to Low)', 3, 12, 15, 1, 2, 0, 'Pec Deck', 'Machine Chest Press', 45, 12, 'Lower chest emphasis. Hands meet at navel.'),
  (4, 4, 'Reverse Pec Deck', 3, 12, 15, 0, 1, 0, 'Face Pulls', NULL, 110, 15, 'Rear delt isolation. Reversible pec deck.'),
  (4, 5, 'Assisted Dips', 3, 8, 12, 1, 2, 0, 'Machine Chest Press', NULL, -20, 12, 'Upright torso for triceps. Negative = assistance.'),
  (4, 6, 'Cable Crossover (Low to High)', 3, 12, 15, 1, 2, 0, 'Pec Deck', NULL, 30, 12, 'Upper chest. Hands at eye level.'),
  (4, 7, 'Reverse Grip Pushdown', 3, 12, 15, 0, 1, 0, 'Machine Tricep Extension', 'Rope Pushdown', 35, 15, 'Medial head. Underhand grip.');

-- ============================================================
-- WORKOUT 5: PULL B (Back Thickness + Arms)
-- ============================================================
INSERT INTO workout_templates (id, program_id, name, focus, description, rotation_order)
VALUES (5, 1, 'Pull B', 'Back Thickness + Arms',
  'Horizontal rowing for mid-back. Smith Bent Over Row is indicator. Bicep work targets long head and forearms.',
  5);

INSERT INTO template_exercises (template_id, position, exercise_name, base_sets, reps_min, reps_max, rir_target_min, rir_target_max, is_indicator, sub_1, sub_2, end_goal_weight, end_goal_reps, notes) VALUES
  (5, 1, 'Smith Bent Over Row', 4, 6, 8, 1, 2, 1, 'Seated Cable Row (Wide Grip)', NULL, 200, 8, '45° torso. Pull to lower chest. INDICATOR.'),
  (5, 2, 'Lat Pulldown (Close Grip)', 3, 10, 12, 1, 2, 0, 'Lat Pulldown (Wide Grip)', NULL, 165, 10, 'Neutral close grip. Full stretch top.'),
  (5, 3, 'Straight Arm Pulldown', 3, 12, 15, 1, 2, 0, NULL, NULL, 65, 12, 'Lat isolation. Arms straight.'),
  (5, 4, 'Smith Machine Shrug', 3, 12, 15, 1, 2, 0, 'Dumbbell Shrug (80 cap)', NULL, 245, 15, 'Heavy traps. Smith allows higher loading than 80lb DB cap.'),
  (5, 5, 'Incline Dumbbell Curl', 4, 8, 10, 0, 1, 0, 'Dumbbell Curl', 'Machine Bicep Curl', 40, 10, '45° incline. Long head stretch. DB cap 80.'),
  (5, 6, 'Cable Reverse Curl', 3, 12, 15, 0, 1, 0, NULL, NULL, 40, 15, 'Brachioradialis and forearms.'),
  (5, 7, 'Cable Crunch', 2, 12, 15, 0, 1, 0, 'Abs Machine', 'Hanging Leg Raise', 65, 15, 'Crunch ribs to hips. Don''t pull with arms.');
