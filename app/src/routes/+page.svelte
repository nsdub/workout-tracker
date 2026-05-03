<script lang="ts">
	let { data } = $props();
</script>

<header class="app-header">
	<div class="logo">PROTOCOL</div>
	{#if data.program}
		<div class="text-xs muted text-mono">
			Wk {data.program.current_week} · Meso {data.program.current_mesocycle}
		</div>
	{/if}
</header>

{#if data.error}
	<div class="card">
		<div class="card-title">Setup needed</div>
		<p class="muted text-sm">{data.error}</p>
	</div>
{:else if data.program}
	<!-- Phase banner -->
	<div class="phase-banner" class:deload={data.isDeload}>
		<div>
			<div class="phase-banner-text">
				{#if data.isDeload}
					⚠️ DELOAD WEEK
				{:else}
					{data.program.current_phase.toUpperCase()} · Week {data.weekInMesocycle} of 4
				{/if}
			</div>
			<div class="phase-banner-sub">
				{#if data.isDeload && data.deloadTriggers.shouldDeload}
					Auto-triggered: {data.deloadTriggers.reasons.join(', ')}
				{:else if data.isDeload}
					Volume -50%, RIR 4-5. Recover this week.
				{:else if data.weekInMesocycle === 1}
					MEV start - moderate intensity, RIR 1-2
				{:else if data.weekInMesocycle === 2}
					Add 1 set per primary, RIR 1
				{:else if data.weekInMesocycle === 3}
					Peak volume + load, RIR 0-1 (last set last week only)
				{/if}
			</div>
		</div>
	</div>

	<!-- Next workout (recommended) -->
	{#if data.nextTemplate}
		<div class="card" style="background: linear-gradient(135deg, var(--accent-soft) 0%, var(--bg-card) 100%); border-color: var(--accent);">
			<div class="card-title" style="color: var(--accent);">↓ Next Up</div>
			<div style="display: flex; justify-content: space-between; align-items: center;">
				<div>
					<h2>{data.nextTemplate.name}</h2>
					<div class="text-sm muted mt-sm">{data.nextTemplate.focus}</div>
				</div>
				<a href="/workout/{data.nextTemplate.id}" class="btn" style="width: auto; padding: 12px 22px;">Start</a>
			</div>
		</div>
	{/if}

	<!-- All workouts -->
	<div class="card-title" style="margin-top: 18px;">All workouts</div>
	{#each data.templates as t (t.id)}
		<a href="/workout/{t.id}" class="workout-card" style="display: block; color: inherit;">
			<div class="workout-card-header">
				<div>
					<div class="workout-card-name">{t.name}</div>
					<div class="workout-card-focus">{t.focus}</div>
				</div>
				{#if data.nextTemplate?.id === t.id}
					<span class="badge">NEXT</span>
				{/if}
			</div>
		</a>
	{/each}
{/if}
