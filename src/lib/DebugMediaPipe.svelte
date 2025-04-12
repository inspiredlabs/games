<script>
	// $lib/DebugMediaPipe.svelte
  import { useSharedContext } from './useSharedContext.svelte.js';
  import * as mediaService from './mediapipeService.svelte.js';

  // Get the shared context
  const context = useSharedContext();
  
  // Initialize flags
  let initialized = $state(false);
  let error = $state(null);
  
  // Auto-initialize MediaPipe when component mounts
  $effect.pre(async () => {
    // Check if MediaPipe is already initialized from the page component
    if (context.mediaPipeLoaded) {
      initialized = true;
      error = null;
      return;
    }
    
    try {
      // Find a video element
      const videoElement = context.getVideoElement() || document.querySelector('video');
      
      if (!videoElement) {
        throw new Error('No video element found in context or DOM');
      }
      
      // Try to initialize with direct video reference
      const result = await mediaService.initializeWithVideoElement(videoElement);
      
      if (result.success) {
        initialized = true;
        error = null;
      } else {
        error = result.message;
      }
    } catch (err) {
      console.error('Failed to initialize MediaPipe:', err);
      error = err.message;
    }
  });
  
  // Track MediaPipe related properties
  const mediaPipeInfo = $derived([
    ['Status', context.detectionStatus || 'Not initialized'],
    ['Hand Found', context.handFound ? 'Yes' : 'No'],
    ['Hand Pose', context.handState || 'unknown'],
    ['Hand Center', context.handCenter ? 
      `X: ${context.handCenter.x.toFixed(2)}, Y: ${context.handCenter.y.toFixed(2)}, Z: ${context.handCenter.z.toFixed(2)}` : 
      'N/A'],
    ['Frame Count', context.renderCount || 0]
  ]);
</script>

<code class="meadow">
  <div class="w-100 bg-black-60 pa3 br3">
  {#if error}
    <div class="gold">
      Error: {error}
    </div>
  {:else if !initialized}
    <div class="green">
      {context.detectionStatus || 'Initializing hand tracking...'}
    </div>
  {:else}
    <div>
      <!-- $derived key for reactivity -->
      {#each mediaPipeInfo as [key, value] (key)}
      <strong class="o-70">{key}:</strong> <span>{value}</span><br />
    {/each}
    </div>
  {/if}
  </div>
</code>

<style>
/* repomix-ignore-start */
  
/* repomix-ignore-end */
</style>