<script>
	// $lib/DebugSceneInfo.svelte
  import { useSharedContext } from '$lib/useSharedContext.svelte.js';

  // Get the shared context
  const context = useSharedContext();
  
  // Create an array of state properties to display
  let eachStateProperty = $state([]);
  
  // Track individual state properties
  $effect(() => {
    eachStateProperty = [
      ['videoWidth', context.videoWidth],
      ['videoHeight', context.videoHeight],
      ['dividerPosition', context.dividerPosition],
      ['videoReady', context.videoReady],
      ['aspectRatio', context.aspectRatio],
      ['isDragging', context.dragging]
    ];
  });
</script>

<code class="meadow">
  <div class="w-100 bg-black-60 pa3 br3">
  {#each eachStateProperty as [key, value]}
    <strong class="o-60">{key}:</strong> {typeof value === 'function' ? '[Function]' : value}
    <br />
  {/each}
  </div>
</code>

<style>
  /* repomix-ignore-start */
    
  /* repomix-ignore-end */
  </style>