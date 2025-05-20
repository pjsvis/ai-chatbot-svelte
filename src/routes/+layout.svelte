<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<div class="min-h-screen">
	{@render children()}
</div>

<style>
	:global(body) {
		margin: 0;
		padding: 0;
	}
</style>
