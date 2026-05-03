<script lang="ts">
	let { data } = $props();

	function fmt(d: string) {
		return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}

	// Group indicator history by exercise
	const byExercise = $derived.by(() => {
		const map = new Map<string, any[]>();
		for (const row of data.indicatorHistory) {
			const arr = map.get(row.exercise_name) || [];
			arr.push(row);
			map.set(row.exercise_name, arr);
		}
		return Array.from(map.entries());
	});

	// Bodyweight average (last 7 sessions)
	const bwAvg = $derived(
		data.bodyweightTrend.length > 0
			? data.bodyweightTrend.slice(-7).reduce((s, r) => s + r.bodyweight, 0) / Math.min(7, data.bodyweightTrend.length)
			: null
	);

	const bwLatest = $derived(data.bodyweightTrend.at(-1)?.bodyweight ?? null);
	const bwFirst = $derived(data.bodyweightTrend[0]?.bodyweight ?? null);
	const bwChange = $derived(bwLatest && bwFirst ? bwLatest - bwFirst : null);
</script>

<header class="app-header">
	<div class="logo">PROGRESS</div>
	<a class="icon-btn" href="/">←</a>
</header>

<!-- Bodyweight section -->
<div class="card">
	<div class="card-title">Bodyweight</div>
	{#if bwLatest}
		<div class="row gap-md">
			<div>
				<div class="text-xs muted">Latest</div>
				<div class="text-mono" style="font-size: 22px; font-weight: 700;">{bwLatest} <span class="text-xs muted">lbs</span></div>
			</div>
			{#if bwAvg}
				<div>
					<div class="text-xs muted">7-day avg</div>
					<div class="text-mono" style="font-size: 18px;">{bwAvg.toFixed(1)}</div>
				</div>
			{/if}
			{#if bwChange !== null}
				<div>
					<div class="text-xs muted">Change</div>
					<div class="text-mono" style="font-size: 18px; color: {bwChange < 0 ? 'var(--sage)' : 'var(--accent)'};">
						{bwChange > 0 ? '+' : ''}{bwChange.toFixed(1)}
					</div>
				</div>
			{/if}
		</div>
	{:else}
		<div class="muted text-sm">No bodyweight logged yet</div>
	{/if}
</div>

<!-- Indicator lifts -->
<div class="card-title mt-lg">⭐ Indicator Lifts</div>
{#if byExercise.length === 0}
	<div class="empty">No indicator tests yet. Tested in deload weeks (W4, W8, W12...).</div>
{:else}
	{#each byExercise as [name, history] (name)}
		<div class="card">
			<div style="font-weight: 600; margin-bottom: 8px;">{name}</div>
			{#each history as h, i}
				<div style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px solid var(--border); font-size: 13px;">
					<div class="text-mono muted">Wk {h.week_number} · {fmt(h.test_date)}</div>
					<div class="text-mono">{h.weight}×{h.reps} <span class="muted">(e1RM {Math.round(h.e1rm)})</span></div>
				</div>
			{/each}
		</div>
	{/each}
{/if}

<!-- All PRs -->
<div class="card-title mt-lg">🏆 Personal Records</div>
{#if data.prs.length === 0}
	<div class="empty">No PRs yet. Log a workout to start tracking.</div>
{:else}
	<div class="card" style="padding: 8px;">
		{#each data.prs as pr (pr.exercise_name)}
			<div style="display: flex; justify-content: space-between; padding: 8px 6px; border-bottom: 1px solid var(--border);">
				<div style="font-size: 13px;">{pr.exercise_name}</div>
				<div class="text-mono text-sm">
					{pr.weight}×{pr.reps}
					<span class="muted text-xs">({Math.round(pr.e1rm)} e1RM)</span>
				</div>
			</div>
		{/each}
	</div>
{/if}
