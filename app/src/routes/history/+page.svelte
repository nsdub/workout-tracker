<script lang="ts">
	let { data } = $props();

	function fmtDate(iso: string): string {
		const d = new Date(iso);
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}
</script>

<header class="app-header">
	<div class="logo">PROTOCOL</div>
	<a class="icon-btn" href="/">←</a>
</header>

<div class="card-title">Recent Sessions</div>

{#if data.sessions.length === 0}
	<div class="empty">No sessions logged yet. Start training!</div>
{:else}
	{#each data.sessions as s (s.id)}
		<a href="/history/{s.id}" class="card" style="display: block; color: inherit;">
			<div style="display: flex; justify-content: space-between; align-items: flex-start;">
				<div>
					<div class="text-mono text-xs muted">{fmtDate(s.date)}</div>
					<div style="font-weight: 600; font-size: 15px; margin-top: 2px;">
						{s.template_name}
						{#if s.is_deload}<span class="badge badge-warning" style="margin-left: 6px;">DELOAD</span>{/if}
					</div>
					<div class="text-xs muted">{s.template_focus}</div>
				</div>
				<div style="text-align: right;">
					<div class="text-xs muted">{s.total_sets} sets</div>
					<div class="text-mono text-sm" style="margin-top: 2px;">{Math.round(s.total_volume).toLocaleString()} lbs</div>
				</div>
			</div>
		</a>
	{/each}
{/if}
