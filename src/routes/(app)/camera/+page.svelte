<script>
  // src/routes/(app)/camera/+page.svelte
  import { browser } from '$app/environment';
  import { useSharedContext } from '$lib/useSharedContext.svelte.js';
  import * as mediaService from '$lib/mediapipeService.svelte.js';
  import { createOneHandController } from '$lib/controllerOneHand.svelte.js';
  import ThreeScene from '$lib/ThreeScene.svelte';

  // Get the shared context (provided by layout)
  const context = useSharedContext();
  
  // --- Controller: create and set IMMEDIATELY (not in an effect) ---
  const handController = createOneHandController();
  context.activeController = handController;

  // Set the default accessory for this route (Wand)
  const wandIndex = context.handAccessories.findIndex(acc => acc.name === 'Wand');
  if (wandIndex >= 0) context.selectedAccessoryIndex = wandIndex;

  // State for scene and initialization
  let sceneReady = $state(false);
  let mediaPipeInitialized = $state(false);
  let initializationError = $state(null);
  let debugInfo = $state({ status: 'Initializing' });

  // Three.js scene ready/destroy handlers
  function handleThreeSceneReady(payload) {
    if (!payload || !payload.scene) return;
    
    console.log("[Camera Page] ThreeScene ready callback triggered");
    context.threeJsScene = payload.scene;
    context.threeJsCamera = payload.camera;
    context.threeJsRenderer = payload.renderer;
    sceneReady = true;
    context.threeJsReady = true;
    
    // Add this line to update layout's loader state
    if (context.setSceneReady) context.setSceneReady(true);
    
    debugInfo.status = 'Scene ready';
  }
  
  function handleThreeSceneDestroy() {
    context.threeJsScene = null;
    context.threeJsCamera = null;
    context.threeJsRenderer = null;
    sceneReady = false;
    context.threeJsReady = false;
    
    // Update layout's loader state
    if (context.setSceneReady) context.setSceneReady(false);
    
    debugInfo.status = 'Scene destroyed';
  }
  
  // Force ThreeScene to render if leftPane is available
  $effect(() => {
    if (context.leftPane) {
      console.log("[Camera Page] leftPane is available, status:", debugInfo.status);
      debugInfo.leftPane = 'Available';
    } else {
      console.log("[Camera Page] leftPane is NOT available");
      debugInfo.leftPane = 'Not Available';
    }
  });

  // MediaPipe initialization (runs once when video is ready)
  $effect(() => {
    let cancelled = false;
    initializationError = null;
    mediaPipeInitialized = false;

    async function startup() {
      if (!context.videoReady || !context.canvas || !context.activeController) {
        debugInfo.status = 'Waiting for video/canvas/controller';
        return;
      }
      
      try {
        debugInfo.status = 'Initializing MediaPipe';
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
      if (context.activeController === handController) {
        context.activeController = null;
      }
    };
  });

  // Derived values for accessory rendering
  const accessoryVisible = $derived(handController.visible);
  const accessoryPosition = $derived(handController.position);
  const accessoryQuaternion = $derived(handController.quaternion);
  const accessoryScale = $derived(handController.scale);
</script>

<!-- Debug panel to help see what's happening -->
<div class="fixed top-0 left-0 z-max p-2 bg-black-50 white code">
  <div>Status: {debugInfo.status}</div>
  <div>LeftPane: {debugInfo.leftPane}</div>
  <div>SceneReady: {sceneReady ? 'Yes' : 'No'}</div>
  <div>MediaPipe: {mediaPipeInitialized ? 'Ready' : 'Not Ready'}</div>
  <div>Controller: {context.activeController ? 'Set' : 'Not Set'}</div>
  <div>Selected: {context.selectedAccessory?.name || 'None'}</div>
</div>

<!-- Explicit check for leftPane existence -->
{#if context.leftPane}
  <ThreeScene
    leftPane={context.leftPane}
    onReady={handleThreeSceneReady}
    onDestroy={handleThreeSceneDestroy}
  />
  <div class="fixed top-16 left-0 z-max p-2 bg-green white">ThreeScene mounted with leftPane</div>
{:else}
  <div class="fixed top-16 left-0 z-max p-2 bg-red white">
    Left pane not available, cannot mount ThreeScene!
  </div>
{/if}

{#if sceneReady && context.threeJsScene && context.selectedAccessory && handController}
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
    Error: {initializationError}
  </div>
{/if}