<script>
  // $lib/DebugController.svelte
  import { useSharedContext } from '$lib/useSharedContext.svelte.js';
  // Remove import { afterUpdate } from 'svelte'; 
  
  const context = useSharedContext();
  
  // Get the controller instance reactively from the context
  const activeController = $derived(context.activeController);
  
  // Derive the debug state object from the active controller
  const debugState = $derived(activeController?.debugState); 
  
  // Simplify controller status check for display
  const hasController = $derived(!!activeController);

  let controllerName = $state('Unknown');

  // Use $effect to react to changes in activeController
  $effect(() => {
    // This code will run whenever activeController changes
    if (activeController && activeController.constructor) {
      controllerName = activeController.constructor.name || 'Unnamed Controller';
    } else {
      controllerName = 'No Controller';
    }
  });
  
</script>

<code class="meadow">
<div class="w-100 bg-black-60 pa3 br3 mb3">
{#if debugState}
  <strong class="db mb2">{controllerName} Debug</strong>
  {#each Object.entries(debugState) as [key, value]}
    {#if key !== 'controllerType'}
    <div class="f7 truncate">
      <strong class="o-70 dib w-40">{key}:</strong> 
      {#if typeof value === 'object' && value !== null}
      <span class="code">{JSON.stringify(value, (k, v) => typeof v === 'number' ? v.toFixed(2) : v)}</span>
      {:else if typeof value === 'number'}
      <span class="code">{value.toFixed(3)}</span>
      {:else}
      <span class="code">{value}</span>
      {/if}
    </div>
    {/if}
  {/each}
{:else}
<span class="gold">
  {#if hasController}
    Controller ({controllerName}) has no debug state available.
  {:else}
    No active controller detected.
  {/if}
</span>
{/if}
</div>
</code>

<!-- <style>
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style> -->