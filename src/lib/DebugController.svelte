<script>
// $lib/DebugController.svelte - UPDATED
import { useSharedContext } from '$lib/useSharedContext.svelte.js';

const context = useSharedContext();

// Get the controller instance reactively from the context
const activeController = $derived(context.activeController);

// Derive the core controller state for display
const controllerVisible = $derived(activeController?.visible ?? false);
const controllerPosition = $derived(activeController?.position ?? { x: 0, y: 0, z: 0 });
const controllerQuaternion = $derived(activeController?.quaternion ?? { x: 0, y: 0, z: 0, w: 1 });
const controllerScale = $derived(activeController?.scale ?? 1);
const controllerState = $derived(activeController?.stableHandState ?? 'unknown');

// Compute the 'has' flags
const hasPosition = $derived(activeController?.position !== undefined);
const hasQuaternion = $derived(activeController?.quaternion !== undefined);
const hasScale = $derived(activeController?.scale !== undefined);
const hasVisible = $derived(activeController?.visible !== undefined);

// Derive the specific debug state object from the active controller
const debugState = $derived(activeController?.debugState); 

// Helper to format object/number values
function formatValue(value) {
  if (typeof value === 'object' && value !== null) {
    return JSON.stringify(value, (k, v) => typeof v === 'number' ? v.toFixed(2) : v);
  } else if (typeof value === 'number') {
    return value.toFixed(3);
  } else {
    return value;
  }
}

</script>

<code class="meadow">
<div class="w-100 bg-black-60 pa3 br3 mb3">
{#if activeController}
  <strong class="db mb2">{debugState?.controllerType ?? 'Controller'} Debug</strong>
  
  <!-- Derived Accessory Values -->
  <strong class="db mt2 mb1 f7 o-70">Accessory Derived Values:</strong>
  <div class="f7 truncate"><strong class="o-70 dib w-40">hasPosition:</strong> {hasPosition ? '✅' : '❌'}</div>
  <div class="f7 truncate"><strong class="o-70 dib w-40">hasQuaternion:</strong> {hasQuaternion ? '✅' : '❌'}</div>
  <div class="f7 truncate"><strong class="o-70 dib w-40">hasScale:</strong> {hasScale ? '✅' : '❌'}</div>
  <div class="f7 truncate"><strong class="o-70 dib w-40">hasVisible:</strong> {hasVisible ? '✅' : '❌'}</div>
  <div class="f7 truncate"><strong class="o-70 dib w-40">visible:</strong> {formatValue(controllerVisible)}</div>
  <div class="f7 truncate"><strong class="o-70 dib w-40">currentPosition:</strong> {formatValue(controllerPosition)}</div>
  <div class="f7 truncate"><strong class="o-70 dib w-40">currentScale:</strong> {formatValue(controllerScale)}</div>

  <!-- Detailed Debug State -->
  {#if debugState}
    <strong class="db mt2 mb1 f7 o-70">Detailed Debug State:</strong>
    {#each Object.entries(debugState) as [key, value]}
      {#if key !== 'controllerType'}
        <div class="f7 truncate">
          <strong class="o-70 dib w-40">{key}:</strong> 
          <span class="code">{formatValue(value)}</span>
        </div>
      {/if}
    {/each}
  {:else}
     <div class="f7 gold">Detailed debugState not available.</div>
  {/if}

{:else}
<span class="gold">No active controller detected.</span>
{/if}
</div>
</code>

<!-- <style>
.truncate { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
</style> -->
