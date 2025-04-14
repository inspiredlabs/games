<script>
// $lib/DebugController.svelte
import { useSharedContext } from '$lib/useSharedContext.svelte.js';

const context = useSharedContext();

// Get the controller instance reactively from the context
// Use $derived to react to changes in context.activeController
const activeController = $derived(context.activeController);

// Derive the debug state object from the active controller
// This will be null if no controller is active
const debugState = $derived(activeController?.debugState); 

</script>

<code class="meadow">
<div class="w-100 bg-black-60 pa3 br3 mb3">
{#if debugState}
  <strong class="db mb2">{debugState.controllerType ?? 'Controller'} Debug</strong>
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
<span class="gold">No active controller detected.</span>
{/if}
</div>
</code>

<!-- <style>
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style> -->
