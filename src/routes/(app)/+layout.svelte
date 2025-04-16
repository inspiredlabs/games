<script>
  // src/routes/(app)/+layout.svelte
  import '$src/app.css';
  import { useSharedContext, createSharedContext } from '$lib/useSharedContext.svelte.js';
  import RightMenu from '$lib/RightMenu.svelte';
  import Loader from '$lib/Loader.svelte';
  import * as mediaService from '$lib/mediapipeService.svelte.js'; // Import MediaPipe Service
  import { DRAWING_CONFIG } from '$lib/wireframeHandDrawing.js'; // Import drawing config

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
  let handCanvas; // IMPORTANT: Keep binding this
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
      // Ensure context has canvas context after setting elements
      if (handCanvas && !context.canvasContext) {
        context.canvasContext = handCanvas.getContext('2d');
        console.log('[Layout Effect] Canvas context explicitly set.');
      }
      if (!context.layoutInitialized) {
        context.updateLayout(context.dividerPosition);
        const resizeCleanup = context.setupResizeListener();
        context.layoutInitialized = true; 
        console.log('[Layout Effect] Context layoutInitialized set to true.');
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
      await context.initCamera(); 
      if (context.videoReady && handCanvas) { 
        console.log('[Layout Startup] Camera ready, syncing canvas size.')
        if (handCanvas.width !== context.videoWidth || handCanvas.height !== context.videoHeight) {
          handCanvas.width = context.videoWidth;
          handCanvas.height = context.videoHeight;
          console.log(`[Layout Startup] Canvas resized to ${handCanvas.width}x${handCanvas.height}`);
        }
      }
      console.log(`[Layout Startup] Camera init result: ${context.videoReady}`);
      return context.videoReady;
    } catch (error) {
      console.error("[Layout Startup] Camera initialization failed:", error);
      throw error; 
    }
  }

  // MediaPipe Initialization
  async function initializeMediaPipe() {
    if (!videoElement || !handCanvas || !context.videoReady) {
      console.log(`[Layout Startup] Skipping MediaPipe init (video=${!!videoElement}, canvas=${!!handCanvas}, videoReady=${context.videoReady}).`);
      return false;
    }
    try {
      console.log('[Layout Startup] Initializing MediaPipe...');
      // Pass handCanvas and context
      const result = await mediaService.initializeWithVideoElement(videoElement, handCanvas, context); 
      mediaPipeInitialized = result.success;
      context.mediaPipeLoaded = result.success;
      context.detectionStatus = result.message || (result.success ? 'MediaPipe Ready' : 'MediaPipe Failed');
      console.log(`[Layout Startup] MediaPipe init result: ${result.success}, Msg: ${context.detectionStatus}`);
      if (!result.success) {
          initializationError = context.detectionStatus;
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
  // Handles sequence: Bind elements -> Init Camera -> Init MediaPipe
  $effect(() => {
    initializing = true;
    initializationError = null;
    cameraReady = false;
    mediaPipeInitialized = false;
    sceneReady = false;

    let cancelled = false;

    async function startup() {
      // 1. Initialize Camera (depends on videoElement)
      const camSuccess = await initializeCamera();
      if (cancelled || !camSuccess) {
          console.log('[Layout Startup] Camera initialization failed or cancelled.');
          return;
      }
      cameraReady = true;
      console.log('[Layout Startup] Camera initialized.');

      // 2. Initialize MediaPipe (depends on cameraReady and handCanvas)
      if (cameraReady && handCanvas && context.canvasContext) { // Ensure canvas and context are ready
        console.log('[Layout Startup] Conditions met for MediaPipe initialization.');
        const mpSuccess = await initializeMediaPipe();
        if (cancelled || !mpSuccess) {
             if (!cancelled) console.warn('[Layout Startup] MediaPipe initialization failed or cancelled.');
             return; 
        }
        mediaPipeInitialized = true;
        console.log('[Layout Startup] MediaPipe initialized.');
      } else {
          console.log(`[Layout Startup] Skipping MediaPipe (cameraReady=${cameraReady}, handCanvas=${!!handCanvas}, contextReady=${!!context.canvasContext})`);
      }
    }

    // Run startup only when videoElement and handCanvas are bound
    if (videoElement && handCanvas) {
      console.log('[Layout Startup Effect] videoElement and handCanvas bound, starting sequence.');
      startup().finally(() => { 
          if (!cancelled) initializing = false; 
      });
    } else {
      console.log('[Layout Startup Effect] Waiting for videoElement and handCanvas binding...');
      initializing = false; // Not actively initializing if elements aren't bound
    }

    // Cleanup function for this effect
    return () => {
      cancelled = true;
      console.log('[Layout Effect Cleanup] Stopping tracks, resetting states...');
      const vidElem = context.getVideoElement();
      if (vidElem && vidElem.srcObject) {
        vidElem.srcObject.getTracks().forEach(track => track.stop());
        vidElem.srcObject = null;
      }
      cameraReady = false;
      mediaPipeInitialized = false;
      sceneReady = false;
      initializing = false;
      initializationError = null;
      context.videoReady = false;
      context.mediaPipeLoaded = false;
      context.detectionStatus = 'Inactive';
      // Maybe reset context.canvasContext = null here?
    };
  });

  // --- Drawing Effect --- 
  // This effect runs whenever landmarks or the canvas context changes.
  $effect(() => {
    // Ensure we have access to drawing functions (put on window by service)
    const drawConnectors = window.drawConnectors;
    const drawLandmarks = window.drawLandmarks;
    const HAND_CONNECTIONS = window.HAND_CONNECTIONS;

    // Get necessary items from context
    const ctx = context.canvasContext;
    const canvas = context.canvas;
    const landmarks = context.handLandmarks;
    const dividerPos = context.dividerPosition; // Get divider position

    // Guard: Ensure canvas, context, and drawing utils are ready
    if (!canvas || !ctx || !drawConnectors || !drawLandmarks || !HAND_CONNECTIONS) {
      // Optionally log if skipping draw due to missing resources
      // console.log('[Drawing Effect] Skipping draw - missing canvas/context/utils.');
      return; 
    }

    // Clear canvas first
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw only if landmarks exist
    if (landmarks && landmarks.length > 0) {
      // console.log('[Drawing Effect] Drawing landmarks...'); // Debug log

      ctx.save();
      // Mirror the drawing context
      ctx.scale(-1, 1);
      ctx.translate(-canvas.width, 0);

      // --- Clipping logic from working example --- 
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const screenWidth = window.innerWidth;
      const scaleFactor = canvasWidth / screenWidth; 
      const intrinsicDividerX = dividerPos * scaleFactor;
      const rightWidth = canvasWidth - intrinsicDividerX;

      ctx.beginPath();
      ctx.rect(intrinsicDividerX, 0, rightWidth, canvasHeight); // Clip to the *visual* right side
      ctx.clip();
      // --- End Clipping --- 

      // Draw landmarks
      for (const landmarkSet of landmarks) {
        try {
          drawConnectors(ctx, landmarkSet, HAND_CONNECTIONS, {
            color: DRAWING_CONFIG.wireframe.color,
            lineWidth: DRAWING_CONFIG.wireframe.lineWidth
          });
          drawLandmarks(ctx, landmarkSet, {
            color: DRAWING_CONFIG.landmarks.color,
            lineWidth: DRAWING_CONFIG.landmarks.lineWidth,
            radius: DRAWING_CONFIG.landmarks.radius
          });
        } catch (error) {
          console.error('[Drawing Effect] Error drawing landmarks:', error);
        }
      }

      ctx.restore(); // Restore context (removes mirroring and clipping)
    } else {
      // console.log('[Drawing Effect] No landmarks to draw.'); // Debug log
      // Canvas was already cleared
    }
  });

  const showLoader = $derived(!layoutSceneReady);

</script>

<RightMenu />

{#if showLoader}
  <Loader />
{/if}

<main class="bg-dark-gray white h-100 vh-100">
  {#if sharedContext}
    {@render children()}

    <div class="video-background absolute top-0 left-0 w-100 vh-100 z-0">
      <!-- Video MUST BE mirrored --> 
      <video
        bind:this={videoElement} 
        style="transform: scaleX(-1);"
        class="absolute top-0 left-0 w-100 h-100 object-cover"
        autoplay
        playsinline
        muted
      ></video>
      <div bind:this={videoOverlayGray} class="absolute top-0 left-0 w-100 h-100 grayscale-overlay"></div>
      <!-- Canvas MUST BE mirrored --> 
      <canvas 
        bind:this={handCanvas} 
        style="transform: scaleX(-1);"
        class="absolute top-0 left-0 w-100 h-100 hand-canvas pointer-events-none"
      ></canvas>
    </div>

    <section bind:this={container} class="flex vh-100 relative z-2">
      <div bind:this={leftPane} class="relative leftPane overflow-hidden" style="width: {context.dividerPosition}px;">
      </div>
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
      <div bind:this={rightPane} class="relative rightPane" style:width="calc(100% - {context.dividerPosition}px)">
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
    /* Mirroring handled by drawing context, not CSS */
    /* transform: scaleX(-1); <-- REMOVED */ 
    position: absolute;
    top: 0;
    left: 0;
    width: 100%; 
    height: 100%;
    z-index: 10; /* Keep high z-index */
    pointer-events: none;
    opacity: 1; 
    mix-blend-mode: normal;
  }
  :global(.w05) { width: 10px; }
  :global(.hover-bg-white:hover) { background-color: rgba(255, 255, 255, 0.9); }
  :global(.resizer) { top: 0; transform: translateX(-50%); height: 100%; cursor: col-resize; background: rgba(255, 255, 255, 0.1); transition: background-color 0.2s ease; }
  :global(.resizer:hover) { background-color: rgba(255, 255, 255, 0.3); }
  :global(.handle) { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); width: 24px; height: 24px; background-color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3); pointer-events: none; }
  :global(.handle-icon) { transform: rotate(90deg); font-weight: bold; color: #555; user-select: none; }
</style>
