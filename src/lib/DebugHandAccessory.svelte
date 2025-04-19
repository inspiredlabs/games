<script>
// $lib/DebugHandAccessory.svelte

/*
 * How this component works:
 * 
 * 1. It uses the shared context to access the list of available accessories
    and the currently selected accessory index.
 * 2. The dropdown displays all accessories from context.currentGameAccessories,
    which are populated by the current route (e.g., camera/+page.svelte).
 * 3. When a user selects a different option, handleSelectChange updates
    the selectedAccessoryIndex in the shared context.
 * 4. Other components that use selectedAccessoryIndex or selectedAccessory
    will react to this change (like the page.svelte component).
 * 
 * To add new accessories:
 * 
 * 1. Create a new accessory component (similar to Wand.svelte, Sword.svelte)
 * 2. Import it in your route's page.svelte
 * 3. Add it to the HAND_ACCESSORIES_LIST array with a name and component reference
 * 4. The dropdown will automatically show the new accessory
*/

import { useSharedContext } from '$lib/useSharedContext.svelte.js';

// Get the shared context
const context = useSharedContext();

// Handler directly sets the index on the context
function handleSelectChange(event) {
  context.selectedAccessoryIndex = event.target.value; // The setter handles parsing/validation
}
</script>

<code class="meadow db">
<div class="w-100 bg-black-60 pa3 br3">
  <label for="accessory-select" class="db mb2">Accessory:</label>
  <select
    id="accessory-select"
    onchange={handleSelectChange}
    class="pa2 ba b--transparent input-reset w-100"
    value={context.selectedAccessoryIndex}
  >
    {#each context.currentGameAccessories as accessory, i}
      <option value={i}>{accessory.name}</option>
    {/each}
  </select>
</div>
</code>