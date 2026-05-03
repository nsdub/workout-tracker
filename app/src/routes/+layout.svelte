<script lang="ts">
	import '../app.css';
	import { page } from '$app/state';

	let { children, data } = $props();

	const showNav = $derived(data.isAuthenticated && !page.url.pathname.startsWith('/login'));
	const currentPath = $derived(page.url.pathname);
</script>

<svelte:head>
	<title>Protocol Workout</title>
	<meta name="viewport" content="width=device-width, initial-scale=1.0, viewport-fit=cover, user-scalable=no" />
	<meta name="theme-color" content="#B8704B" />
	<meta name="apple-mobile-web-app-capable" content="yes" />
	<meta name="apple-mobile-web-app-status-bar-style" content="default" />
	<meta name="apple-mobile-web-app-title" content="Protocol" />
	<link rel="manifest" href="/manifest.json" />
</svelte:head>

<div class="container">
	{@render children()}
</div>

{#if showNav}
	<nav class="bottom-nav">
		<div class="bottom-nav-inner">
			<a class="nav-btn" class:active={currentPath === '/' || currentPath.startsWith('/workout')} href="/">
				<span class="nav-icon">🏋️</span>
				Train
			</a>
			<a class="nav-btn" class:active={currentPath.startsWith('/history')} href="/history">
				<span class="nav-icon">📊</span>
				History
			</a>
			<a class="nav-btn" class:active={currentPath.startsWith('/progress')} href="/progress">
				<span class="nav-icon">📈</span>
				Progress
			</a>
			<a class="nav-btn" class:active={currentPath.startsWith('/settings')} href="/settings">
				<span class="nav-icon">⚙️</span>
				Settings
			</a>
		</div>
	</nav>
{/if}
