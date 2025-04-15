<script>
  // src/routes/(app)/camera/+page.svelte
  import { browser } from '$app/environment';
  import { useSharedContext } from '$lib/useSharedContext.svelte.js';
  // import * as mediaService from '$lib/mediapipeService.svelte.js'; // No longer initialized here
  import { createOneHandController } from '$lib/controllerOneHand.svelte.js';
  import ThreeScene from '$lib/ThreeScene.svelte';

  // Get the shared context (provided by layout)
  const context = useSharedContext();
  
  // --- Controller: create but DON'T set immediately ---
  const handController = createOneHandController();

  // Set the default accessory for this route (Wand)
  const wandIndex = context.handAccessories.findIndex(acc => acc.name === 'Wand');
  if (wandIndex >= 0) context.selectedAccessoryIndex = wandIndex;

  // State for scene and initialization
  let sceneReady = $state(false);
  // let mediaPipeInitialized = $state(false); // State managed by layout now
  let initializationError = $state(null); // Can still show errors from layout/context?
  let debugInfo = $state({ status: 'Page Initializing' }); // Update initial status

  // Three.js scene ready/destroy handlers
  function handleThreeSceneReady(payload) {
    if (!payload || !payload.scene) return;
    
    context.threeJsScene = payload.scene;
    context.threeJsCamera = payload.camera;
    context.threeJsRenderer = payload.renderer;
    sceneReady = true;
    context.threeJsReady = true; // Inform context ThreeJS is ready
    
    // Add this line to update layout's loader state
    if (context.setSceneReady) context.setSceneReady(true);
    
    debugInfo.status = 'Scene ready';
  }
  
  function handleThreeSceneDestroy() {
    context.threeJsScene = null;
    context.threeJsCamera = null;
    context.threeJsRenderer = null;
    sceneReady = false;
    context.threeJsReady = false; // Inform context ThreeJS is not ready
    
    // Update layout's loader state
    if (context.setSceneReady) context.setSceneReady(false);
    
    debugInfo.status = 'Scene destroyed';
  }

  // Derived state to check if essential DOM elements from layout are ready
  // Depend on layoutInitialized as a trigger to re-check leftPane and canvas
  // We still need this to know when to mount ThreeScene
  const layoutDomReady = $derived(context.layoutInitialized && !!context.leftPane && !!context.canvas);

  // Log when layoutDomReady changes
  $effect(() => {
    console.log(`[Camera Page Effect] layoutDomReady changed to: ${layoutDomReady}`);
    if (layoutDomReady) {
      debugInfo.status = 'Layout Ready, waiting for Scene';
    }
  });

  /*
  // MediaPipe initialization (runs once when video is ready)
  // --- REMOVED --- This logic moves back to the layout
  $effect(() => {
    let cancelled = false;
    initializationError = null;
    mediaPipeInitialized = false;

    async function startup() {
      console.log('[Camera Page MP Startup] Checking conditions:', { layoutDomReady, videoReady: context.videoReady, activeController: !!context.activeController });
      // Explicitly wait for layout DOM elements, video, and controller
      if (!layoutDomReady || !context.videoReady || !context.activeController) {
        debugInfo.status = 'Waiting for video/canvas/controller';
        return;
      }
      
      try {
        debugInfo.status = 'Initializing MediaPipe';
        console.log('[Camera Page MP Startup] Calling mediaService.initializeWithVideoElement...');
        const result = await mediaService.initializeWithVideoElement(context.getVideoElement(), context.canvas);
        mediaPipeInitialized = result.success;
        if (!result.success) {
          initializationError = result.message;
          debugInfo.status = 'MediaPipe failed: ' + result.message;
        } else {
          debugInfo.status = 'MediaPipe ready';
        }
      } catch (error) {
        initializationError = error.message || 'MediaPipe initialization failed';
        debugInfo.status = 'MediaPipe error: ' + error.message;
        mediaPipeInitialized = false;
      }
    }
    startup();

    // Cleanup
    return () => {
      cancelled = true;
      context.mediaPipeLoaded = false;
      context.handFound = false;
      // Controller cleanup is handled in its own effect
    };
  });
  */

  // Set active controller in an effect - Ensure this runs after initial render potentially
  $effect(() => {
    console.log('[Camera Page Effect] Setting activeController in context.');
    context.activeController = handController;
    debugInfo.status = 'Controller Set'; // Update status
    // Cleanup function to remove the controller when the component unmounts
    return () => {
      if (context.activeController === handController) {
        console.log('[Camera Page Effect] Clearing activeController from context.');
        context.activeController = null;
      }
    };
  });

  // Derived values for accessory rendering - Depend on controller state now
  const accessoryVisible = $derived(context.activeController?.visible);
  const accessoryPosition = $derived(context.activeController?.position);
  const accessoryQuaternion = $derived(context.activeController?.quaternion);
  const accessoryScale = $derived(context.activeController?.scale);
</script>

<!-- Debug panel to help see what's happening -->
<div class="fixed top-0 left-0 z-max p-2 bg-black-50 white code">
  <div>Status: {debugInfo.status}</div>
  <div>LayoutDOM: {layoutDomReady ? 'Ready' : 'Waiting'}</div>
  <div>LeftPane: {context.leftPane ? 'Available' : 'Not Available'}</div>
  <div>SceneReady: {sceneReady ? 'Yes' : 'No'}</div>
  <div>MP Ready (Layout): {context.mediaPipeLoaded ? 'Ready' : 'Not Ready'}</div> <!-- Check layout's MP state -->
  <div>Controller: {context.activeController ? 'Set' : 'Not Set'}</div>
  <div>Selected: {context.selectedAccessory?.name || 'None'}</div>
</div>

<!-- Explicit check for layout DOM readiness -->
{#if layoutDomReady}
  <ThreeScene
    leftPane={context.leftPane} 
    onReady={handleThreeSceneReady}
    onDestroy={handleThreeSceneDestroy}
  />
  <div class="fixed top-16 left-0 z-max p-2 bg-green white">ThreeScene mounted</div>
{:else}
  <div class="fixed top-16 left-0 z-max p-2 bg-red white">
    [Camera Page] Layout DOM elements (leftPane/canvas) not available yet.
  </div>
{/if}

{#if sceneReady && context.threeJsScene && context.selectedAccessory && context.activeController}
  {@const Accessory = context.selectedAccessory.component}
  {#key context.selectedAccessory.name} 
    <Accessory
      scene={context.threeJsScene}
      visible={accessoryVisible}      
      position={accessoryPosition}   
      quaternion={accessoryQuaternion}
      scale={accessoryScale}      
    />
  {/key}
{/if}

{#if initializationError}
  <div class="fixed z-max top-24 left-1 bg-red white pa2 br3 code">
    Page Error: {initializationError}
  </div>
{/if}
{#if context.detectionStatus && context.detectionStatus.startsWith('Error')}
   <div class="fixed z-max top-32 left-1 bg-orange white pa2 br3 code">
    Layout/MP Error: {context.detectionStatus}
  </div>
{/if}