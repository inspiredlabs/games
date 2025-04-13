<script lang="ts">
// src/routes/+layout.svelte
import '$src/app.css';
import Defs from '$lib/Defs.svelte';

let { children } = $props();
</script>

<!-- ROOT ONLY -->
{@render children()}

<Defs />