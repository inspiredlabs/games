

<script>
  // src/routes/(app)/+layout.svelte - Refactored Initialization
  import '$src/app.css';
  import { useSharedContext, createSharedContext } from '$lib/useSharedContext.svelte.js';
  import RightMenu from '$lib/RightMenu.svelte';
  import { browser } from '$app/environment';
  import Loader from '$lib/Loader.svelte';
  
  // Create the shared context during component initialization
  const sharedContext = createSharedContext();
  
  // Accept children as props
  const { children, data } = $props();
  
  // This is the orchestration component that loads the correct game based on slug
  import ThreeScene from '$lib/ThreeScene.svelte';
  import * as mediaService from '$lib/mediapipeService.svelte.js';
  import { createOneHandController } from '$lib/controllerOneHand.svelte.js';
  
  // Get the shared context
  const context = useSharedContext();
  
  // Instantiate the controller FIRST
  const handController = createOneHandController({
    tweenDuration: 200,
    fistThreshold: 0.23
  });
  
  // Set the controller in context IMMEDIATELY
  context.activeController = handController;
  
  // DOM References
  let container;
  let rightPane;
  let resizer;
  let videoElement;
  let videoOverlayGray;
  let handCanvas;
  
  // State
  let leftPane = $state(null);
  let sceneReady = $state(false);
  let cameraReady = $state(false);
  let mediaPipeInitialized = $state(false);
  let initializationError = $state(null);
  let initializing = $state(true); // Start in initializing state
  // These timestamps are only used for debugging but retained for compatibility with setCameraReady/setMediaPipeInitialized
  let cameraSyncTimestamp = $state(Date.now());
  let mediaPipeSyncTimestamp = $state(Date.now());
  
  // --- Callbacks for ThreeScene ---
  function handleThreeSceneReady(payload) {
    if (!payload || !payload.scene) {
      return;
    }
    context.threeJsScene = payload.scene;
    context.threeJsCamera = payload.camera;
    context.threeJsRenderer = payload.renderer;
    sceneReady = true;
    context.threeJsReady = true;
  }
  
  function handleThreeSceneDestroy() {
    context.threeJsScene = null;
    context.threeJsCamera = null;
    context.threeJsRenderer = null;
    sceneReady = false;
    context.threeJsReady = false;
  }
  
  // --- Layout and DOM Element Setup ---
  $effect(() => {
    if (container && leftPane && rightPane && resizer && videoElement && handCanvas) {
      context.setElements({ container, leftPane, rightPane, resizer, videoElement, videoOverlayGray, handCanvas });
      if (!context.layoutInitialized) {
        context.updateLayout(context.dividerPosition);
        context.setupResizeListener();
        context.layoutInitialized = true;
      }
    }
  });
  
  // --- Camera and MediaPipe Initialization Flow (Refactored) ---
  
  // Helper function: Initializes camera, returns boolean success status
  async function initializeCamera() {
    if (!browser || !videoElement) {
      return false;
    } 
    
    try {
      await context.initCamera(); // Assumes this updates context.videoReady
      const isReady = context.videoReady; 
      if (isReady && handCanvas) { // Adjust canvas size if needed
        if (handCanvas.width !== context.videoWidth || handCanvas.height !== context.videoHeight) {
          handCanvas.width = context.videoWidth;
          handCanvas.height = context.videoHeight;
        }
      }
      return isReady; // Return success status
    } catch (error) {
      throw error; // Re-throw to be caught by startup
    }
  }
  
  // Helper function: Initializes MediaPipe, returns boolean success status
  async function initializeMediaPipe() {
    // Check cameraReady state directly here, as it's a precondition
    if (!browser || !cameraReady || !handCanvas || !context.activeController) {
      return false;
    }
    
    try {
      const result = await mediaService.initializeWithVideoElement(videoElement, handCanvas);
      return result.success; // Return success status
    } catch (error) {
      throw error; // Re-throw to be caught by startup
    }
  }
  
  // Simplified state change functions
  function setCameraReady(value) {
    cameraReady = value;
    cameraSyncTimestamp = Date.now();
  }
  
  function setMediaPipeInitialized(value) {
    mediaPipeInitialized = value;
    mediaPipeSyncTimestamp = Date.now();
  }
  
  // --- Main Initialization Effect --- 
  $effect(() => {
    if (!browser) return; // Only run in browser
  
    // Reset state for initialization
    initializing = true;
    initializationError = null;
    cameraReady = false; // Reset state
    mediaPipeInitialized = false; // Reset state
    sceneReady = false; // Explicitly reset sceneReady here too
  
    let cancelled = false;
  
    async function startup() {
      // Wait briefly for DOM elements 
      await new Promise(resolve => setTimeout(resolve, 0)); 
  
      if (cancelled || !videoElement || !handCanvas) {
          initializing = false; 
          if (!cancelled) initializationError = 'DOM elements not found';
          return;
      }
  
      try {
        // --- Camera Init --- 
        const camSuccessResult = await initializeCamera();
        
        // Set component state immediately after await completes
        setCameraReady(camSuccessResult);
  
        if (cancelled || !camSuccessResult) {
          if (!cancelled) throw new Error("Camera initialization failed or was skipped.");
          return;
        }
  
        if (!context.activeController) {
          throw new Error("FATAL: activeController not set before MediaPipe init!");
        }
  
        // --- MediaPipe Init --- 
        const mpSuccessResult = await initializeMediaPipe();
        // Set component state immediately after await completes
        setMediaPipeInitialized(mpSuccessResult);
  
        if (cancelled || !mpSuccessResult) {
          if (!cancelled) throw new Error("MediaPipe initialization failed.");
          return;
        }
  
        // Note: sceneReady is set asynchronously by handleThreeSceneReady
  
      } catch (error) {
        if (!cancelled) {
          initializationError = error.message || 'An unknown error occurred during initialization.';
          // Ensure states reflect failure if error occurred after success
          if (error.message?.includes("MediaPipe")) mediaPipeInitialized = false;
          // cameraReady is likely already false if camera init failed, or true if MP failed later
        }
      } finally {
        if (!cancelled) {
          initializing = false; // Finished initialization attempt
        }
      }
    }
  
    startup();
  
    // Cleanup function for this effect
    return () => {
      cancelled = true;
      if (videoElement && videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
      }
      // Reset flags
      setCameraReady(false);
      setMediaPipeInitialized(false);
      sceneReady = false; // Ensure sceneReady is also reset here
      initializing = false; // Ensure initializing is false on cleanup
      initializationError = null;
      context.videoReady = false;
      context.mediaPipeLoaded = false;
      context.handFound = false;
      // context itself is reset when component unmounts
    };
  });
  
  // Use $derived to create stable derived values from the state variables
  const accessoryVisible = $derived(handController?.visible ?? false);
  const accessoryPosition = $derived(handController?.position ?? { x: 0, y: 1, z: 0 });
  const accessoryQuaternion = $derived(handController?.quaternion ?? { x: 0, y: 0, z: 0, w: 1 });
  const accessoryScale = $derived(handController?.scale ?? 1);
</script>

<RightMenu />

{#if !sceneReady}
<Loader />
{/if}

<main class="bg-dark-gray white h-100 vh-100">
  <!-- Render the children inside the shared context -->
  {#if sharedContext}
  <!-- slot -->
  {@render children()}

  <!-- Video Background Layer -->
  <div class="video-background absolute top-0 left-0 w-100 vh-100 z-0">
    <video
      bind:this={videoElement}
      style="transform: scaleX(-1);"
      class="absolute top-0 left-0 w-100 h-100 object-cover"
      autoplay
      playsinline
      muted
    ></video>
    <div bind:this={videoOverlayGray} class="absolute top-0 left-0 w-100 h-100 grayscale-overlay"></div>
    <canvas style="transform: scaleX(-1);" bind:this={handCanvas} class="absolute top-0 left-0 w-100 h-100 hand-canvas z-1 pointer-events-none"></canvas>
  </div>

  <!-- Main Content Section -->
  <section bind:this={container} class="flex vh-100 relative z-2">
    <!-- Left Pane (Hosts Three.js) -->
    <div bind:this={leftPane} class="relative leftPane overflow-hidden" style="width: {context.dividerPosition}px;">
      {#if leftPane}
         <ThreeScene
          {leftPane}
          onReady={handleThreeSceneReady}
          onDestroy={handleThreeSceneDestroy}
        />
      {/if}

      <!-- Render the selected accessory -->
      {#if sceneReady && context.threeJsScene && context.selectedAccessory && handController}
        <svelte:component 
          this={context.selectedAccessory.component}
          scene={context.threeJsScene}
          visible={accessoryVisible}
          position={accessoryPosition}
          quaternion={accessoryQuaternion}
          scale={accessoryScale}
        />
      {/if}
    </div>

    <!-- Resizer -->
    <div
      bind:this={resizer}
      role="slider"
      aria-valuenow="{context.dividerPosition}"
      tabindex="0"
      aria-label="Central Resizer"
      aria-orientation="vertical"
      class="resizer absolute bg-white-60 hover-bg-white vh-100 w05 z-3 col-resize flex items-center justify-center"
      style:left="{context.dividerPosition}px"
      onmousedown={context.pointerstart}
      ontouchstart={context.pointerstart}
    >
      <div class="handle"><div class="handle-icon">⋮</div></div>
    </div>

    <!-- Right Pane -->
    <div bind:this={rightPane} class="relative rightPane" style:width="calc(100% - {context.dividerPosition}px)">
        <!-- Right pane content -->
    </div>
  </section>
  {/if}
</main>

<style>
  /* Global reset and base styles */
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  :global(body) {
    margin: 0;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
  }

  /* Common component styles */
  :global(.video-container) {
    overflow: hidden;
  }

  :global(.object-cover) {
    object-fit: cover;
  }

  :global(.grayscale-overlay) {
    background: transparent;
    backdrop-filter: grayscale(1) brightness(1) contrast(0.8) saturate(0);
    -webkit-backdrop-filter: grayscale(1) brightness(1) contrast(0.8) saturate(0);
  }

  :global(.col-resize) {
    cursor: col-resize;
  }

  :global(.leftPane) {
    position: relative;
    background: transparent;
    /* width is set dynamically via inline style from context */
    height: 100%;
    overflow: hidden;
  }

  :global(.rightPane) {
    background: rgba(50, 50, 50, 0.3);
    /* width is set dynamically via inline style from context */
    height: 100%;
    overflow: hidden;
  }

  :global(.video-background) { z-index: 0; }

  :global(.grayscale-overlay) {
    background: transparent;
    backdrop-filter: grayscale(0.8) brightness(0.9) contrast(0.9) saturate(0);
    -webkit-backdrop-filter: grayscale(0.8) brightness(0.9) contrast(0.9) saturate(0);
    pointer-events: none;
  }

  /* Ensure hand canvas is mirrored and positioned correctly */
  :global(.hand-canvas) {
    transform: scaleX(-1); /* Mirror canvas overlay */
    mix-blend-mode: screen; /* Adjust blend mode as needed */
    opacity: 0.7;
    z-index: 1; /* Above video/overlay */
  }

  :global(.w05) { width: 10px; }
  :global(.hover-bg-white:hover) { background-color: rgba(255, 255, 255, 0.9); }

  :global(.resizer) { top: 0; transform: translateX(-50%); height: 100%; cursor: col-resize; background: rgba(255, 255, 255, 0.1); transition: background-color 0.2s ease; }
  :global(.resizer:hover) { background-color: rgba(255, 255, 255, 0.3); }
  :global(.handle) { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 24px; height: 24px; background-color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); pointer-events: none; }
  :global(.handle-icon) { transform: rotate(90deg); font-weight: bold; color: #555; user-select: none; }
</style>