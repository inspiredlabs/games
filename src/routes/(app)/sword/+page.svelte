<script>
// src/routes/(app)/sword/+page.svelte

/*
* Example UX:
* The player should be able to use the sword holding it under the hilt with two fists.
* Specification:
* The sword should use a different `controller` to the existing codebase. It will be defined in `import { createTwoHandController } from '$lib/controllerTwoHands.svelte.js';`.
* Visualise the page data for debugging:
* akin to: `{@html JSON.stringify(data?.data, null, 2) }` */
</script>
  
  <!-- routes/(app)/+layout.svelte is COMMON TO ALL ROUTES -->
  <div class="absolute z-max top-0 left-0 w-4 h-4 bg-black gold" style="width: auto;">
    THIS IS UNIQUE TO: routes/(app)/sword
  </div>