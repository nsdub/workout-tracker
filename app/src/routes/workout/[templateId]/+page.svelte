<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();

	type SetState = { weight: string; reps: string; rir: string; logged: boolean };

	// Per-exercise state: array of sets + note + actual exercise (substitution) + showSubs flag
	let exerciseState = $state(
		data.exercises.map((ex) => ({
			id: ex.id,
			actualName: ex.exercise_name,
			showSubs: false,
			note: '',
			sets: Array.from({ length: ex.progressedSets }, () => ({ weight: '', reps: '', rir: '', logged: false }) as SetState)
		}))
	);

	let bodyweight = $state('');
	let saving = $state(false);
	let toastMsg = $state('');
	let toastKind = $state<'ok' | 'error' | 'warn'>('ok');
	let showCheckin = $state(false);
	let checkinSleep = $state(7);
	let checkinStress = $state(5);
	let checkinSoreness = $state(5);

	function showToast(msg: string, kind: 'ok' | 'error' | 'warn' = 'ok') {
		toastMsg = msg;
		toastKind = kind;
		setTimeout(() => (toastMsg = ''), 2200);
	}

	function selectSub(exIdx: number, name: string) {
		exerciseState[exIdx].actualName = name;
		exerciseState[exIdx].showSubs = false;
	}

	function fillSameAsLast(exIdx: number, ex: any) {
		const last = ex.lastPerformance;
		if (!last || !last.sets || last.sets.length === 0) {
			showToast('No history to copy', 'warn');
			return;
		}
		exerciseState[exIdx].sets = exerciseState[exIdx].sets.map((s, i) => {
			const lastSet = last.sets[Math.min(i, last.sets.length - 1)];
			return {
				weight: String(lastSet.weight),
				reps: String(lastSet.reps),
				rir: '',
				logged: false
			};
		});
	}

	function adjustWeight(exIdx: number, setIdx: number, delta: number) {
		const cur = parseFloat(exerciseState[exIdx].sets[setIdx].weight) || 0;
		const next = Math.max(0, cur + delta);
		exerciseState[exIdx].sets[setIdx].weight = String(next % 1 === 0 ? next : next.toFixed(1));
	}

	function markSetLogged(exIdx: number, setIdx: number) {
		const s = exerciseState[exIdx].sets[setIdx];
		if (s.weight && s.reps) {
			s.logged = true;
		}
	}

	async function saveAndFinish() {
		saving = true;
		try {
			const payload = {
				templateId: data.template.id,
				bodyweight: bodyweight ? parseFloat(bodyweight) : null,
				checkin: showCheckin ? { sleep: checkinSleep, stress: checkinStress, soreness: checkinSoreness } : null,
				exercises: exerciseState.map((es, idx) => {
					const tpl = data.exercises[idx];
					return {
						exerciseName: tpl.exercise_name,
						actualExerciseName: es.actualName !== tpl.exercise_name ? es.actualName : null,
						note: es.note,
						sets: es.sets
							.filter((s) => s.weight && s.reps)
							.map((s, i) => ({
								setNumber: i + 1,
								weight: parseFloat(s.weight),
								reps: parseInt(s.reps),
								rir: s.rir ? parseInt(s.rir) : null
							}))
					};
				})
			};

			const res = await fetch('/api/sessions', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(payload)
			});

			if (!res.ok) {
				const err = await res.text();
				showToast('Save failed: ' + err, 'error');
				saving = false;
				return;
			}

			const result = await res.json();
			if (result.newPRs && result.newPRs.length) {
				showToast('🎉 PR! ' + result.newPRs.join(', '));
				setTimeout(() => goto('/'), 2500);
			} else {
				showToast('Saved');
				setTimeout(() => goto('/'), 1200);
			}
		} catch (err) {
			showToast('Network error', 'error');
			saving = false;
		}
	}

	function formatLastSets(last: any): string {
		if (!last || !last.sets || last.sets.length === 0) return '';
		const date = new Date(last.session.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
		const sets = last.sets.map((s: any) => `${s.weight}×${s.reps}`).join(', ');
		return `${date}: ${sets}`;
	}
</script>

{#if toastMsg}
	<div class="toast show" class:error={toastKind === 'error'} class:warning={toastKind === 'warn'}>{toastMsg}</div>
{/if}

<header class="app-header">
	<a href="/" class="icon-btn">←</a>
	<div style="text-align: center; flex: 1;">
		<div class="text-mono text-xs muted">Wk {data.program.current_week} · Meso {data.program.current_mesocycle} · W{data.weekInMesocycle}/4</div>
		<h2 style="font-size: 16px;">{data.template.name}</h2>
	</div>
	<div style="width: 40px;"></div>
</header>

<!-- Phase / Deload banner -->
<div class="phase-banner" class:deload={data.isDeload}>
	<div>
		<div class="phase-banner-text">
			{#if data.isDeload}⚠️ DELOAD — RIR 4-5, 50% volume{:else}{data.template.focus}{/if}
		</div>
		{#if data.template.description && !data.isDeload}
			<div class="phase-banner-sub">{data.template.description}</div>
		{/if}
	</div>
</div>

<!-- Bodyweight input -->
<div class="card">
	<div class="card-title">Today</div>
	<div class="row gap-md">
		<div style="flex: 1;">
			<label class="label" for="bw">Bodyweight (lbs)</label>
			<input id="bw" class="input text-mono" type="number" inputmode="decimal" placeholder="optional" bind:value={bodyweight} />
		</div>
	</div>
</div>

<!-- Exercises -->
{#each data.exercises as ex, exIdx (ex.id)}
	{@const state = exerciseState[exIdx]}
	<div class="exercise">
		<div class="exercise-header">
			<div style="flex: 1;">
				<div class="exercise-name">
					{state.actualName}
					{#if ex.is_indicator}<span class="badge" style="margin-left: 6px;">⭐ INDICATOR</span>{/if}
				</div>
			</div>
			<div class="exercise-meta">
				{ex.progressedSets}×{ex.reps_min}-{ex.reps_max}<br />RIR {ex.progressedRIR.min}-{ex.progressedRIR.max}
			</div>
		</div>

		{#if ex.end_goal_weight && ex.end_goal_weight > 0}
			<div class="exercise-target">🎯 Goal: {ex.end_goal_weight}×{ex.end_goal_reps}</div>
		{/if}

		{#if ex.lastPerformance}
			<div class="exercise-last">↩ Last — {formatLastSets(ex.lastPerformance)}</div>
		{/if}

		{#if ex.notes}
			<div class="text-xs muted mb-sm">{ex.notes}</div>
		{/if}

		<!-- Sub link -->
		{#if ex.sub_1 || ex.sub_2}
			<button class="sub-link" onclick={() => (state.showSubs = !state.showSubs)}>
				{state.showSubs ? '▾ Hide subs' : '▸ Need to swap?'}
			</button>
			{#if state.showSubs}
				<div class="flex-col gap-sm mt-sm">
					<button class="btn btn-secondary text-sm" style="padding: 8px;" onclick={() => selectSub(exIdx, ex.exercise_name)}>
						Use prescribed: {ex.exercise_name}
					</button>
					{#if ex.sub_1}
						<button class="btn btn-secondary text-sm" style="padding: 8px;" onclick={() => selectSub(exIdx, ex.sub_1)}>{ex.sub_1}</button>
					{/if}
					{#if ex.sub_2}
						<button class="btn btn-secondary text-sm" style="padding: 8px;" onclick={() => selectSub(exIdx, ex.sub_2)}>{ex.sub_2}</button>
					{/if}
				</div>
			{/if}
		{/if}

		<!-- Sets -->
		<div class="mt-sm">
			{#each state.sets as set, setIdx}
				<div class="set-row">
					<div class="set-num">{setIdx + 1}</div>
					<input
						class="set-input"
						class:logged={set.logged}
						type="number"
						inputmode="decimal"
						placeholder={ex.lastPerformance?.sets?.[setIdx]?.weight ?? 'lbs'}
						bind:value={set.weight}
						onblur={() => markSetLogged(exIdx, setIdx)}
					/>
					<div class="x-sep">×</div>
					<input
						class="set-input"
						class:logged={set.logged}
						type="number"
						inputmode="numeric"
						placeholder={ex.lastPerformance?.sets?.[setIdx]?.reps ?? 'reps'}
						bind:value={set.reps}
						onblur={() => markSetLogged(exIdx, setIdx)}
					/>
					<input class="rir-input" type="number" inputmode="numeric" placeholder="RIR" bind:value={set.rir} />
				</div>
			{/each}
		</div>

		<!-- Quick fill -->
		<div class="row gap-sm mt-sm">
			<button class="icon-btn text-xs" style="flex: 1;" onclick={() => fillSameAsLast(exIdx, ex)}>↩ Same as last</button>
		</div>

		<!-- Note input -->
		<input
			class="input text-sm mt-sm"
			type="text"
			placeholder="Note (optional)"
			bind:value={state.note}
			style="padding: 8px 10px; min-height: 38px; font-size: 13px;"
		/>
	</div>
{/each}

<!-- Sunday check-in (only when ending the rolling cycle) -->
<div class="card">
	<button class="btn btn-secondary" onclick={() => (showCheckin = !showCheckin)}>
		{showCheckin ? 'Hide check-in' : '+ Add post-workout check-in'}
	</button>
	{#if showCheckin}
		<div class="mt-md flex-col gap-md">
			<div>
				<label class="label">Sleep quality (1-10): {checkinSleep}</label>
				<input type="range" min="1" max="10" bind:value={checkinSleep} style="width: 100%;" />
			</div>
			<div>
				<label class="label">Stress level (1=low, 10=high): {checkinStress}</label>
				<input type="range" min="1" max="10" bind:value={checkinStress} style="width: 100%;" />
			</div>
			<div>
				<label class="label">Soreness (1=none, 10=severe): {checkinSoreness}</label>
				<input type="range" min="1" max="10" bind:value={checkinSoreness} style="width: 100%;" />
			</div>
		</div>
	{/if}
</div>

<!-- Save button -->
<div class="mt-lg">
	<button class="btn" onclick={saveAndFinish} disabled={saving}>
		{saving ? 'Saving...' : 'Finish Workout'}
	</button>
</div>
