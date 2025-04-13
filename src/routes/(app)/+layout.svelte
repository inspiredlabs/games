<script>
// src/routes/[slug]/+layout.svelte
import '$src/app.css';
import { useSharedContext, createSharedContext } from '$lib/useSharedContext.svelte.js';
import RightMenu from '$lib/RightMenu.svelte';
import { browser } from '$app/environment';

/*
* About `src/routes/[slug]/+layout.svelte`
* This layout handles shared functionality across all game routes and manages scoped state.
* This page uses a declarative structure: Defining the outermost page structure common to all slug routes.
* It contains the UI & main content,using Svelte's `{@render children()}` because `<svelte:component this={sharedContext}>` is deprecated.
*/
// Create the shared context during component initialization
const sharedContext = createSharedContext();

// Accept children as props
const { children } = $props();











// This is the orchestration component that loads the correct game based on slug
import ThreeScene from '$lib/ThreeScene.svelte';
import * as mediaService from '$lib/mediapipeService.svelte.js';
import { createOneHandController } from '$lib/controllerOneHand.svelte.js';


// Get the shared context
const context = useSharedContext();





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

// --- Component Selection & Controller Context Setup ---
$effect(() => {
  if (data?.data?.slug) {
    const slug = data.data.slug.charAt(0).toUpperCase() + data.data.slug.slice(1);
    const accessoryIndex = context.handAccessories.findIndex(acc => acc.name === slug);
    if (accessoryIndex >= 0) {
      context.selectedAccessoryIndex = accessoryIndex;
    } else {
      console.error(`[Route] Accessory '${slug}' not found.`);
    }

    // Set Active Controller in Context
    if (context.activeController !== handController) {
        context.activeController = handController;
    }
    // Cleanup
    return () => {
        if (context.activeController === handController) {
            context.activeController = null;
        }
    };
  }
});

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

// --- Camera and MediaPipe Initialization Flow ---
async function initializeCamera() {
    if (!browser || !videoElement || cameraReady) return false;
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
        console.error(`[Page ${data.data.slug}] Camera init failed:`, error);
        cameraReady = false;
        return false;
    }
}

async function initializeMediaPipe() {
    if (!browser || mediaPipeInitialized || !cameraReady || !handCanvas || !context.activeController) return false;
    try {
        const result = await mediaService.initializeWithVideoElement(videoElement, handCanvas);
        mediaPipeInitialized = result.success;
        return mediaPipeInitialized;
    } catch (error) {
        console.error(`[Page ${data.data.slug}] MediaPipe init error:`, error);
        mediaPipeInitialized = false;
        return false;
    }
}

// Main initialization effect
$effect(() => {
    if (!browser) return;
    let cancelled = false;
    async function startup() {
        await initializeCamera();
        if (cancelled) return;
        await initializeMediaPipe();
    }
    startup();

    // Nested retry effect
    $effect(() => {
        if (browser && !cancelled && !mediaPipeInitialized && cameraReady && handCanvas && context.activeController) {
          initializeMediaPipe();
        }
    });

    // Cleanup
    return () => {
        cancelled = true;
        if (videoElement && videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
            videoElement.srcObject = null;
        }
        cameraReady = false;
        mediaPipeInitialized = false;
        context.videoReady = false;
        context.mediaPipeLoaded = false;
        context.handFound = false;
        if (context.activeController === handController) {
            context.activeController = null;
        }
    };
});








// Instantiate the controller
const handController = createOneHandController({
  tweenDuration: 200,
  fistThreshold: 0.23
});

// Debug - log controller methods with $inspect
$effect(() => {
  $inspect('Controller values:', {
    position: handController.position,
    visible: handController.visible,
    scale: handController.scale,
    state: handController.stableHandState,
    debugMsg: handController.debugState?.message
  });
});

// Add a debug overlay to show what's happening
let debugInfo = $state({
  visible: false,
  position: { x: 0, y: 0, z: 0 },
  scale: 1,
  state: 'unknown'
});

// Keep the debug info updated
$effect(() => {
  debugInfo.visible = handController.visible;
  debugInfo.position = handController.position;
  debugInfo.scale = handController.scale;
  debugInfo.state = handController.stableHandState;
});



// Use $derived to access the current store values
const accessoryVisible = $derived(handController.visible);
const accessoryPosition = $derived(handController.position && typeof handController.position.subscribe === 'function' 
  ? $handController.position  // Use $ to get the store value
  : handController.position);
const accessoryQuaternion = $derived(handController.quaternion && typeof handController.quaternion.subscribe === 'function'
  ? $handController.quaternion
  : handController.quaternion);
const accessoryScale = $derived(handController.scale && typeof handController.scale.subscribe === 'function'
  ? $handController.scale
  : handController.scale);

// Add debug logging with proper Svelte 5 inspection
$effect(() => {
  if (!handController) return;
  
  $inspect('[Debug] Controller Interface:', {
    hasPosition: !!handController.position,
    hasQuaternion: !!handController.quaternion,
    hasScale: !!handController.scale,
    hasVisible: !!handController.visible,
    isPositionStore: handController.position && typeof handController.position.subscribe === 'function',
    visible: accessoryVisible,
    currentPosition: accessoryPosition,
    currentScale: accessoryScale
  });
});



// Keep the debug info up to date
$effect(() => {
  debugInfo.visible = accessoryVisible;
  debugInfo.state = handController.stableHandState;
  debugInfo.position = accessoryPosition;
  debugInfo.scale = accessoryScale;
});
</script>
  
<RightMenu />
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
  </div>
  <!-- Debug data display -->
  <div class="fixed z-max top-1 left-1 bg-black-90 pa1 br3">
    <textarea class="highlight code meadow input-reset bg-transparent white bn h4 w5">
    Visible: {debugInfo.visible ? 'Yes' : 'No'}
    State: {debugInfo.state}
    Position: 
      x: {debugInfo.position?.x?.toFixed(2) ?? '?'}, 
      y: {debugInfo.position?.y?.toFixed(2) ?? '?'}, 
      z: {debugInfo.position?.z?.toFixed(2) ?? '?'}
    Scale: {typeof debugInfo.scale === 'number' ? debugInfo.scale.toFixed(2) : '?'}
    </textarea>
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