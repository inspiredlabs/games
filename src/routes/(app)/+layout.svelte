<script>
  // src/routes/(app)/+layout.svelte
  import '$src/app.css';
  import { useSharedContext, createSharedContext } from '$lib/useSharedContext.svelte.js';
  import RightMenu from '$lib/RightMenu.svelte';
  import Loader from '$lib/Loader.svelte';

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
  let sceneReady = $state(false);
  let cameraReady = $state(false);
  let initializationError = $state(null);
  let initializing = $state(true);
  let layoutSceneReady = $state(false);
  let cameraSyncTimestamp = $state(Date.now());

  // Get the shared context
  const context = useSharedContext();

  // Debug DOM references
  $effect(() => {
    if (leftPane) {
      console.log("[Layout] leftPane initialized");
    }
  });

  // --- Callbacks for ThreeScene ---
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
      console.log("[Layout] Setting elements in context");
      context.setElements({ container, leftPane, rightPane, resizer, videoElement, videoOverlayGray, handCanvas });
      if (!context.layoutInitialized) {
        context.updateLayout(context.dividerPosition);
        context.setupResizeListener();
        context.layoutInitialized = true;
        console.log("[Layout] Layout initialized");
      }
    }

     // Add a method to allow pages to update scene ready state
     context.setSceneReady = (ready) => {
      console.log("[Layout] Scene ready state updated:", ready);
      layoutSceneReady = ready;
    };

  });

  // Camera initialization (no MediaPipe, no controller)
  async function initializeCamera() {
    if (!videoElement) return false;
    try {
      await context.initCamera();
      cameraReady = context.videoReady;
      if (cameraReady && handCanvas) {
        if (handCanvas.width !== context.videoWidth || handCanvas.height !== context.videoHeight) {
          handCanvas.width = context.videoWidth;
          handCanvas.height = context.videoHeight;
        }
      }
      return cameraReady;
    } catch (error) {
      throw error;
    }
  }

  function setCameraReady(value) {
    cameraReady = value;
    cameraSyncTimestamp = Date.now();
  }

  // --- Main Initialization Effect (NO MediaPipe here) ---
  $effect(() => {
    initializing = true;
    initializationError = null;
    cameraReady = false;
    sceneReady = false;

    let cancelled = false;

    async function startup() {
      await new Promise(resolve => setTimeout(resolve, 0));
      if (cancelled || !videoElement || !handCanvas) {
        initializing = false;
        if (!cancelled) initializationError = 'DOM elements not found';
        return;
      }
      try {
        const camSuccessResult = await initializeCamera();
        setCameraReady(camSuccessResult);
        if (cancelled || !camSuccessResult) {
          if (!cancelled) throw new Error("Camera initialization failed or was skipped.");
          return;
        }
      } catch (error) {
        if (!cancelled) {
          initializationError = error.message || 'An unknown error occurred during initialization.';
        }
      } finally {
        if (!cancelled) {
          initializing = false;
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
      setCameraReady(false);
      sceneReady = false;
      initializing = false;
      initializationError = null;
      context.videoReady = false;
    };
  });

  // Loader: show until the 3D scene is ready (set by child page)
  const showLoader = $derived(!layoutSceneReady);
</script>

<RightMenu />

{#if showLoader}
  <Loader />
{/if}

<main class="bg-dark-gray white h-100 vh-100">
  {#if sharedContext}
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
