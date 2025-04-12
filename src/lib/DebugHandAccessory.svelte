<script>
  // $lib/DebugHandAccessory.svelte
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
      {#each context.handAccessories as accessory, i}
        <option value={i}>{accessory.name}</option>
      {/each}
    </select>
  </div>
</code>