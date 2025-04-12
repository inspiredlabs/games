<script>
// src/routes/[slug]/+layout.svelte
  
/*
* About `src/routes/[slug]/+layout.svelte`
* This layout handles shared functionality across all game routes and manages scoped state.
* This page uses a declarative structure: Defining the outermost page structure common to all slug routes.
* It contains the UI & main content,using Svelte's `{@render children()}` because `<svelte:component this={sharedContext}>` is deprecated.
*/


import { createSharedContext } from '$lib/useSharedContext.svelte.js';
import RightMenu from '$lib/RightMenu.svelte';

// Create the shared context during component initialization
const sharedContext = createSharedContext();

// Accept children as props
const { children } = $props();
</script>
  
<RightMenu />
<main class="bg-dark-gray white h-100 vh-100">
  
<!-- Render the children inside the shared context -->
{#if sharedContext}
  {@render children()}
{/if}  
</main>

<style>
  /* Global reset and base styles */
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }
  
  :global(body) {
    margin: 0;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
  }
  
  /* Common component styles */
  :global(.video-container) {
    overflow: hidden;
  }
  
  :global(.object-cover) {
    object-fit: cover;
  }
  
  :global(.grayscale-overlay) {
    background: transparent;
    backdrop-filter: grayscale(1) brightness(1) contrast(0.8) saturate(0);
    -webkit-backdrop-filter: grayscale(1) brightness(1) contrast(0.8) saturate(0);
  }
  
  :global(.col-resize) {
    cursor: col-resize;
  }
</style>

<!-- <script>
  // src/routes/[slug]/+layout.svelte
  let { data, component } = $props();
  console.log("🔍 Layout received data:", data);
</script>

{@render component({ routeData: data })} -->