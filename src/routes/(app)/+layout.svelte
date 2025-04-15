<script>
  // src/routes/(app)/+layout.svelte
  import '$src/app.css';
  import { useSharedContext, createSharedContext } from '$lib/useSharedContext.svelte.js';
  import RightMenu from '$lib/RightMenu.svelte';
  import Loader from '$lib/Loader.svelte';
  import * as mediaService from '$lib/mediapipeService.svelte.js'; // Import MediaPipe Service

  // Create the shared context during component initialization
  const sharedContext = createSharedContext();

  // Accept children as props
  const { children, data } = $props();

  // DOM References
  let container;
  let rightPane;
  let resizer;
  let videoElement;
  let videoOverlayGray;
  let handCanvas;
  let leftPane = $state(null);

  // State
  let sceneReady = $state(false); // Set by page via context.setSceneReady
  let cameraReady = $state(false); // Set by initializeCamera
  let mediaPipeInitialized = $state(false); // Set by initializeMediaPipe
  let initializationError = $state(null);
  let initializing = $state(true);
  let layoutSceneReady = $state(false); // Controlled by page using context.setSceneReady
  let cameraSyncTimestamp = $state(Date.now());

  // Get the shared context
  const context = useSharedContext();

  // --- Callbacks for ThreeScene (Passed down to child pages if needed) ---
  // Although layout doesn't render ThreeScene, context might hold refs
  function handleThreeSceneReady(payload) {
    if (!payload || !payload.scene) return;
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
      console.log('[Layout Effect] All DOM elements bound.');
      context.setElements({ container, leftPane, rightPane, resizer, videoElement, videoOverlayGray, handCanvas });
      if (!context.layoutInitialized) {
        context.updateLayout(context.dividerPosition);
        const resizeCleanup = context.setupResizeListener();
        context.layoutInitialized = true;
        console.log('[Layout Effect] Context layoutInitialized set to true.');
        // Return cleanup function for resize listener
        return resizeCleanup;
      }
    }
  });

   // Add a method to allow pages to update scene ready state
  $effect(() => {
      context.setSceneReady = (ready) => {
      console.log("[Layout] Scene ready state updated by page:", ready);
      layoutSceneReady = ready;
    };
  });

  // Camera initialization 
  async function initializeCamera() {
    if (!videoElement) return false;
    try {
      console.log('[Layout Startup] Initializing Camera...')
      await context.initCamera(); // Uses context's method which updates context state
      if (context.videoReady && handCanvas) {
        console.log('[Layout Startup] Camera ready, syncing canvas size.')
        if (handCanvas.width !== context.videoWidth || handCanvas.height !== context.videoHeight) {
          handCanvas.width = context.videoWidth;
          handCanvas.height = context.videoHeight;
        }
      }
       console.log(`[Layout Startup] Camera init result: ${context.videoReady}`);
      return context.videoReady;
    } catch (error) {
      console.error("[Layout Startup] Camera initialization failed:", error);
      throw error; // Propagate error
    }
  }

  // MediaPipe Initialization
  async function initializeMediaPipe() {
    // Requires video element and canvas, implies camera init must have succeeded
    if (!videoElement || !handCanvas || !context.videoReady) {
      console.log('[Layout Startup] Skipping MediaPipe init (video/canvas not ready).');
      return false;
    }
    try {
      console.log('[Layout Startup] Initializing MediaPipe...');
      const result = await mediaService.initializeWithVideoElement(videoElement, handCanvas, context); // Pass context
      mediaPipeInitialized = result.success;
      context.mediaPipeLoaded = result.success; // Update context state
      context.detectionStatus = result.message || (result.success ? 'MediaPipe Ready' : 'MediaPipe Failed');
      console.log(`[Layout Startup] MediaPipe init result: ${result.success}, Msg: ${context.detectionStatus}`);
      if (!result.success) {
          initializationError = context.detectionStatus; // Show MP error
      }
      return result.success;
    } catch (error) {
      console.error("[Layout Startup] MediaPipe initialization failed:", error);
      mediaPipeInitialized = false;
      context.mediaPipeLoaded = false;
      context.detectionStatus = `Error: ${error.message}`;
      initializationError = context.detectionStatus;
      return false;
    }
  }

  // --- Main Initialization Effect --- 
  $effect(() => {
    initializing = true;
    initializationError = null;
    cameraReady = false;
    mediaPipeInitialized = false; // Reset MP state on effect run
    sceneReady = false; // Reset scene state

    let cancelled = false;

    async function startup() {
      // 1. Wait for DOM elements needed for camera/canvas
      await new Promise(resolve => setTimeout(resolve, 0)); // Ensure DOM bindings can apply
      if (cancelled || !videoElement || !handCanvas) {
        if (!cancelled) initializationError = 'DOM elements not found';
        console.log('[Layout Startup] Aborted - DOM elements not found.');
        initializing = false;
        return;
      }
      console.log('[Layout Startup] DOM elements ready.');

      // 2. Initialize Camera
      try {
        const camSuccess = await initializeCamera();
        if (cancelled || !camSuccess) {
          if (!cancelled) throw new Error("Camera initialization failed or was skipped.");
          return;
        }
        cameraReady = true; // Set local state
        console.log('[Layout Startup] Camera initialized successfully.');

        // 3. Initialize MediaPipe (only if camera is ready)
        if (cameraReady) {
          const mpSuccess = await initializeMediaPipe();
          if (cancelled || !mpSuccess) {
              if (!cancelled) console.warn('[Layout Startup] MediaPipe initialization failed or was skipped.');
              // Don't necessarily stop everything if MP fails, maybe allow fallback?
              // If MP error needs to halt, throw an error here.
          } else {
               console.log('[Layout Startup] MediaPipe initialized successfully.');
          }
        }

      } catch (error) {
        if (!cancelled) {
           console.error('[Layout Startup] Initialization Error:', error);
          initializationError = error.message || 'An unknown error occurred during initialization.';
          // Update context status if appropriate
          if (context.detectionStatus !== `Error: ${initializationError}`) {
              context.detectionStatus = `Error: ${initializationError}`;
          }
        }
      } finally {
        if (!cancelled) {
          initializing = false;
          console.log('[Layout Startup] Finalizing initialization.');
        }
      }
    }
    startup();

    // Cleanup function for this effect
    return () => {
      cancelled = true;
      console.log('[Layout Effect Cleanup] Stopping tracks, resetting states...');
      // Stop camera tracks
      if (videoElement && videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
      }
      // Reset states
      cameraReady = false;
      mediaPipeInitialized = false;
      sceneReady = false;
      initializing = false;
      initializationError = null;
      // Reset context states managed by layout
      context.videoReady = false;
      context.mediaPipeLoaded = false;
      context.detectionStatus = 'Inactive';
      // Don't reset layoutInitialized here, it's tied to DOM binding effect
      // Don't reset threeJsReady, that's controlled by scene
    };
  });

  // Loader: Show while initializing OR if camera/MP failed AND scene isn't ready
  // Or maybe just while the page hasn't signaled scene ready?
  const showLoader = $derived(!layoutSceneReady);

</script>

<RightMenu />

{#if showLoader}
  <Loader />
{/if}

<main class="bg-dark-gray white h-100 vh-100">
  {#if sharedContext}
    <!-- Render children (the page) -->
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
      <!-- Left Pane (for Three.js scene) -->
      <div bind:this={leftPane} class="relative leftPane overflow-hidden" style="width: {context.dividerPosition}px;">
        <!-- Child components will render their content here -->
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
        <!-- Right pane content (menu, debug, etc) is handled by RightMenu -->
      </div>
    </section>
  {/if}

  {#if initializationError && !showLoader}
    <div class="fixed bottom-1 left-1 z-max bg-red white pa2 br3 code">
      Layout Init Error: {initializationError}
    </div>
  {/if}
</main>

<style>
  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }
  :global(body) {
    margin: 0;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
  }
  :global(.video-container) { overflow: hidden; }
  :global(.object-cover) { object-fit: cover; }
  :global(.grayscale-overlay) {
    background: transparent;
    backdrop-filter: grayscale(1) brightness(1) contrast(0.8) saturate(0);
    -webkit-backdrop-filter: grayscale(1) brightness(1) contrast(0.8) saturate(0);
  }
  :global(.col-resize) { cursor: col-resize; }
  :global(.leftPane) {
    position: relative;
    background: transparent;
    height: 100%;
    overflow: hidden;
  }
  :global(.rightPane) {
    background: rgba(50, 50, 50, 0.3);
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
  :global(.hand-canvas) {
    transform: scaleX(-1);
    mix-blend-mode: screen;
    opacity: 0.7;
    z-index: 1;
  }
  :global(.w05) { width: 10px; }
  :global(.hover-bg-white:hover) { background-color: rgba(255, 255, 255, 0.9); }
  :global(.resizer) { top: 0; transform: translateX(-50%); height: 100%; cursor: col-resize; background: rgba(255, 255, 255, 0.1); transition: background-color 0.2s ease; }
  :global(.resizer:hover) { background-color: rgba(255, 255, 255, 0.3); }
  :global(.handle) { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 24px; height: 24px; background-color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); pointer-events: none; }
  :global(.handle-icon) { transform: rotate(90deg); font-weight: bold; color: #555; user-select: none; }
</style>
