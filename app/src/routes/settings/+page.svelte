<script lang="ts">
	import { goto } from '$app/navigation';

	let { data } = $props();
	let downloading = $state(false);
	let toastMsg = $state('');

	async function downloadBackup() {
		downloading = true;
		try {
			const res = await fetch('/api/backup');
			if (!res.ok) throw new Error('Failed');
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `protocol-backup-${new Date().toISOString().split('T')[0]}.json`;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);
			toastMsg = 'Backup downloaded';
		} catch (err) {
			toastMsg = 'Backup failed';
		} finally {
			downloading = false;
			setTimeout(() => (toastMsg = ''), 2000);
		}
	}

	async function logout() {
		await fetch('/api/auth/logout', { method: 'POST' });
		goto('/login');
	}
</script>

{#if toastMsg}
	<div class="toast show">{toastMsg}</div>
{/if}

<header class="app-header">
	<div class="logo">SETTINGS</div>
	<a class="icon-btn" href="/">←</a>
</header>

<!-- Current program info -->
{#if data.program}
	<div class="card">
		<div class="card-title">Active Program</div>
		<div style="font-weight: 600;">{data.program.name}</div>
		<div class="text-sm muted mt-sm">
			Phase: <span class="text-mono">{data.program.current_phase}</span> ·
			Week <span class="text-mono">{data.program.current_week}</span>/26 ·
			Mesocycle <span class="text-mono">{data.program.current_mesocycle}</span>
		</div>
		{#if data.program.competition_date}
			<div class="text-sm muted mt-sm">
				Competition: <span class="text-mono">{data.program.competition_date}</span>
			</div>
		{/if}
		<div class="text-sm muted mt-sm">
			Sessions logged: <span class="text-mono">{data.sessionCount}</span>
		</div>
	</div>
{/if}

<!-- Backup -->
<div class="card">
	<div class="card-title">Data</div>
	<button class="btn btn-secondary" onclick={downloadBackup} disabled={downloading}>
		{downloading ? 'Downloading...' : '📥 Download Full Backup (JSON)'}
	</button>
	<div class="text-xs muted mt-sm">All sessions, sets, PRs, and program state in a single JSON file.</div>
</div>

<!-- Phase info -->
<div class="card">
	<div class="card-title">Phase Plan</div>
	<div class="text-sm" style="line-height: 1.7;">
		<div><strong>Wks 1-8</strong> — BUILD (maintenance + small surplus, target +3-5 lb)</div>
		<div><strong>Wks 9-22</strong> — CUT (~0.6%/wk loss, 215 → ~200 lb)</div>
		<div><strong>Wks 23-26</strong> — PEAK (water/sodium/carb manipulation)</div>
	</div>
	<div class="text-xs muted mt-md">Deload every 4 weeks. Indicator lifts tested fresh on Day 3 of deload.</div>
</div>

<!-- Logout -->
<div class="mt-lg">
	<button class="btn btn-ghost" onclick={logout}>Log out</button>
</div>
