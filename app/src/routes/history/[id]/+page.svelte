<script lang="ts">
	let { data } = $props();
	function fmtDate(iso: string) {
		return new Date(iso).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
	}
</script>

<header class="app-header">
	<a class="icon-btn" href="/history">←</a>
	<div style="text-align: center; flex: 1;">
		<div class="text-xs muted">{fmtDate(data.session.date)}</div>
		<h2 style="font-size: 16px;">{data.template?.name}</h2>
	</div>
	<div style="width: 40px;"></div>
</header>

{#if data.session.bodyweight}
	<div class="card">
		<div class="text-xs muted">Bodyweight: <span class="text-mono">{data.session.bodyweight} lbs</span></div>
	</div>
{/if}

{#each data.exercises as ex (ex.name)}
	<div class="exercise">
		<div class="exercise-name mb-sm">
			{ex.name}
			{#if ex.sets[0]?.is_substitute}<span class="badge badge-warning" style="margin-left: 6px;">SUB: {ex.sets[0].actual_exercise_name}</span>{/if}
		</div>
		{#each ex.sets as s, i}
			<div class="set-row">
				<div class="set-num">{i + 1}</div>
				<div class="set-input logged">{s.weight}</div>
				<div class="x-sep">×</div>
				<div class="set-input logged">{s.reps}</div>
				<div class="rir-input">{s.rir ?? '—'}</div>
			</div>
		{/each}
		{#if ex.sets[0]?.exercise_note}
			<div class="text-xs muted mt-sm">📝 {ex.sets[0].exercise_note}</div>
		{/if}
	</div>
{/each}

{#if data.session.checkin_sleep}
	<div class="card">
		<div class="card-title">Check-in</div>
		<div class="row gap-md">
			<div>Sleep: <span class="text-mono">{data.session.checkin_sleep}/10</span></div>
			<div>Stress: <span class="text-mono">{data.session.checkin_stress}/10</span></div>
			<div>Soreness: <span class="text-mono">{data.session.checkin_soreness}/10</span></div>
		</div>
	</div>
{/if}
