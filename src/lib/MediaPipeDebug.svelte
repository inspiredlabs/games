<script>
  // $lib/DebugMediaPipe.svelte
  import { useSharedContext } from '$lib/useSharedContext.svelte.js';

  // Get the shared context
  const context = useSharedContext();
  
  // Computed values for display
  const handStateInfo = $derived(
    context.handFound 
      ? `Found (${context.handState})` 
      : 'Not detected'
  );
  
  const detectionStatusInfo = $derived(
    context.handDetectionReady 
      ? context.detectionStatus 
      : 'Initializing...'
  );
  
  const handLandmarksInfo = $derived(
    context.handLandmarks && context.handLandmarks.length > 0
      ? `${context.handLandmarks.length} hands, ${context.handLandmarks[0]?.length || 0} landmarks`
      : 'No landmarks'
  );
</script>

<div class="debug-section">
  <div class="debug-item">
    <div class="label">Status:</div>
    <div class="value">{detectionStatusInfo}</div>
  </div>
  
  <div class="debug-item">
    <div class="label">Hand:</div>
    <div class="value" class:active={context.handFound}>{handStateInfo}</div>
  </div>
  
  <div class="debug-item">
    <div class="label">Landmarks:</div>
    <div class="value">{handLandmarksInfo}</div>
  </div>
  
  <div class="debug-item">
    <div class="label">Make a fist to show the selected accessory!</div>
  </div>
</div>

<style>
  .debug-section {
    margin-bottom: 1.5rem;
  }
  
  .debug-item {
    margin-bottom: 0.5rem;
  }
  
  .label {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.7);
    margin-bottom: 0.25rem;
  }
  
  .value {
    background-color: rgba(255, 255, 255, 0.1);
    padding: 0.5rem;
    border-radius: 0.25rem;
    font-size: 0.875rem;
    word-break: break-word;
  }
  
  .active {
    background-color: rgba(0, 255, 0, 0.3);
  }
</style>