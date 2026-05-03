<script lang="ts">
	import { goto } from '$app/navigation';

	let pin = $state('');
	let error = $state('');
	let loading = $state(false);

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		loading = true;
		try {
			const res = await fetch('/api/auth/login', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ pin })
			});
			if (res.ok) {
				goto('/');
			} else {
				error = 'Wrong PIN';
				pin = '';
			}
		} catch (err) {
			error = 'Network error';
		} finally {
			loading = false;
		}
	}
</script>

<header class="app-header">
	<div class="logo">PROTOCOL</div>
</header>

<div style="display: flex; flex-direction: column; min-height: 60vh; justify-content: center;">
	<div class="card">
		<h1 class="mb-md">Welcome back</h1>
		<p class="muted text-sm mb-md">Enter your PIN to continue</p>

		<form onsubmit={submit} class="flex-col gap-md">
			<input
				class="input text-mono"
				type="password"
				inputmode="numeric"
				autocomplete="off"
				bind:value={pin}
				placeholder="••••"
				autofocus
				style="text-align: center; letter-spacing: 8px; font-size: 22px;"
			/>
			{#if error}
				<div class="text-sm" style="color: var(--danger); text-align: center;">{error}</div>
			{/if}
			<button class="btn" type="submit" disabled={loading || !pin}>
				{loading ? 'Verifying...' : 'Enter'}
			</button>
		</form>
	</div>
</div>
