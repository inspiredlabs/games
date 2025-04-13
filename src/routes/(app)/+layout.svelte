<script>
// src/routes/(app)/+layout.svelte - REMOVED CONSOLE INSPECT
import '$src/app.css';
import { useSharedContext, createSharedContext } from '$lib/useSharedContext.svelte.js';
import RightMenu from '$lib/RightMenu.svelte';
import { browser } from '$app/environment';
import { page } from '$app/stores'; // Import page store

/*
* About `src/routes/(app)/+layout.svelte`
* This layout handles shared functionality across all game routes and manages scoped state.
* This page uses a declarative structure: Defining the outermost page structure common to all slug routes.
* It contains the UI & main content,using Svelte's `{@render children()}`.
*/
// Create the shared context during component initialization
const sharedContext = createSharedContext();

// Accept children as props
const { children, data } = $props(); // Ensure data is destructured if coming from +layout.js/.server.js











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




// --- Callbacks for ThreeScene ---
function handleThreeSceneReady(payload) {
  if (!payload || !payload.scene) return;
  // console.log('[Layout] handleThreeSceneReady: Setting scene, camera, renderer in context.');
  context.threeJsScene = payload.scene;
  context.threeJsCamera = payload.camera;
  context.threeJsRenderer = payload.renderer;
  sceneReady = true;
  context.threeJsReady = true;
}

function handleThreeSceneDestroy() {
  // console.log('[Layout] handleThreeSceneDestroy: Clearing scene, camera, renderer in context.');
  context.threeJsScene = null;
  context.threeJsCamera = null;
  context.threeJsRenderer = null;
  sceneReady = false;
  context.threeJsReady = false;
}

// --- Accessory Selection Based on Slug ---
$effect(() => {
  // console.log('[Layout Effect Slug Check] Running effect.');
  const currentSlug = $page.params.slug; // Use $page store for route params
  // console.log('[Layout Effect Slug Check] Current page params:', $page.params);
  // console.log('[Layout Effect Slug Check] currentSlug:', currentSlug);

  if (currentSlug) {
    // console.log('[Layout Effect Slug Check] Found slug:', currentSlug);
    const slugUpper = currentSlug.charAt(0).toUpperCase() + currentSlug.slice(1);
    // console.log('[Layout Effect Slug Check] Capitalized Slug:', slugUpper);
    // console.log('[Layout Effect Slug Check] Available Accessories:', context.handAccessories.map(a => a.name));
    const accessoryIndex = context.handAccessories.findIndex(acc => acc.name === slugUpper);
    // console.log('[Layout Effect Slug Check] Found accessoryIndex:', accessoryIndex);

    if (accessoryIndex >= 0) {
      console.log(`[Layout Effect Slug Check] Setting selectedAccessoryIndex to ${accessoryIndex}`); // KEEP (Line 89)
      context.selectedAccessoryIndex = accessoryIndex;
    } else {
      console.error(`[Layout Effect Slug Check] Accessory '${slugUpper}' not found.`); // KEEP (Line 11)
      // Reset index if slug doesn't match an accessory
      context.selectedAccessoryIndex = -1; 
    }
  } else {
    // console.log('[Layout Effect Slug Check] No slug found in $page.params.');
    // Reset index if no slug
    context.selectedAccessoryIndex = -1; 
  }
  
  // Cleanup: We don't need to manage activeController here anymore
  return () => {
      // console.log('[Layout Effect Slug Check] Cleanup: Slug changed, accessory selection updated.');
  };
});

// --- Layout and DOM Element Setup ---
$effect(() => {
  if (container && leftPane && rightPane && resizer && videoElement && handCanvas) {
    // console.log('[Layout] Setting DOM elements in context.');
    context.setElements({ container, leftPane, rightPane, resizer, videoElement, videoOverlayGray, handCanvas });
    if (!context.layoutInitialized) {
      // console.log('[Layout] Initializing layout (divider, resize listener).');
      context.updateLayout(context.dividerPosition);
      context.setupResizeListener();
      context.layoutInitialized = true;
    }
  }
});

// --- Camera and MediaPipe Initialization Flow ---
async function initializeCamera() {
    if (!browser || !videoElement || cameraReady) {
      // console.log('[Layout Init] Skipping camera init:', { browser, videoElementExists: !!videoElement, cameraReady });
      return false;
    }
    // console.log('[Layout Init] Initializing camera...');
    try {
        await context.initCamera();
        cameraReady = context.videoReady;
        if (cameraReady) {
            // console.log('[Layout Init] Camera ready. Setting canvas size.');
            if (handCanvas && (handCanvas.width !== context.videoWidth || handCanvas.height !== context.videoHeight)) {
                handCanvas.width = context.videoWidth;
                handCanvas.height = context.videoHeight;
            }
        } else {
            // console.warn('[Layout Init] context.initCamera finished but videoReady is still false.');
        }
        return cameraReady;
    } catch (error) {        
        console.error('[Layout Init] Camera init failed:', error); // KEEP (Line 21)
        cameraReady = false;
        return false;
    }
}

async function initializeMediaPipe() {
    // Check for activeController *before* proceeding (should always be true now)
    if (!browser || mediaPipeInitialized || !cameraReady || !handCanvas || !context.activeController) {
         console.log('[Layout Init] Skipping MediaPipe init:', { 
             browser, mediaPipeInitialized, cameraReady, 
             handCanvasExists: !!handCanvas, 
             activeControllerExists: !!context.activeController 
         });
        return false;
    }
    // console.log('[Layout Init] Initializing MediaPipe...');
    try {
        // Pass context explicitly if needed, though mediapipeService uses useSharedContext
        const result = await mediaService.initializeWithVideoElement(videoElement, handCanvas);
        mediaPipeInitialized = result.success;
        if (mediaPipeInitialized) {
          // console.log('[Layout Init] MediaPipe initialized successfully.');
        } else {
          // console.warn('[Layout Init] MediaPipe initialization returned success: false.');
        }
        return mediaPipeInitialized;
    } catch (error) {
        console.error('[Layout Init] MediaPipe init error:', error); // KEEP (Line 25)
        mediaPipeInitialized = false;
        return false;
    }
}

// Main initialization effect
$effect(() => {
    if (!browser) return;
    // console.log('[Layout Init Effect] Running main initialization effect.');
    let cancelled = false;
    async function startup() {
        const camSuccess = await initializeCamera();
        if (cancelled || !camSuccess) return;
        // Ensure controller is set before initializing mediapipe
        if (!context.activeController) {
            console.error('[Layout Init Effect] FATAL: activeController not set before MediaPipe init!');
            return; 
        }
        await initializeMediaPipe();
    }
    startup();

    // Nested retry effect (may need adjustment if startup handles retries internally)
    $effect(() => {
        if (browser && !cancelled && !mediaPipeInitialized && cameraReady && handCanvas && context.activeController) {
          // console.log('[Layout Init Effect] Retrying MediaPipe initialization...');
          initializeMediaPipe();
        }
    });

    // Cleanup
    return () => {
        // console.log('[Layout Init Effect] Cleanup: Stopping tracks, resetting flags.');
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
        // Reset active controller ONLY when layout unmounts
        context.activeController = null; 
    };
});




// Debug - log controller methods with $inspect (Suppressed)
$effect(() => {
  // $inspect('[Layout Controller Inspect] Controller values:', { ... });
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
  if (!handController) return; // Add safety check
  debugInfo.visible = handController.visible;
  debugInfo.position = handController.position;
  debugInfo.scale = handController.scale;
  debugInfo.state = handController.stableHandState;
});



// Use $derived to access the current store values (Simplified)
const accessoryVisible = $derived(handController?.visible ?? false);
const accessoryPosition = $derived(handController?.position ?? { x: 0, y: 1, z: 0 }); // Default to object
const accessoryQuaternion = $derived(handController?.quaternion ?? { x: 0, y: 0, z: 0, w: 1 }); // Default to object
const accessoryScale = $derived(handController?.scale ?? 1);

// --- REMOVED CONSOLE INSPECT --- 
// $effect(() => {
//   if (!handController) return;
// 
//   $inspect('[Layout Accessory Derived Values]:', { // KEEP (Line 281)
//     hasPosition: !!handController.position,
//     hasQuaternion: !!handController.quaternion,
//     hasScale: !!handController.scale,
//     hasVisible: !!handController.visible,
//     visible: accessoryVisible,
//     currentPosition: accessoryPosition,
//     currentScale: accessoryScale
//   });
// });
// --- END REMOVED CONSOLE INSPECT --- 



// Keep the debug info up to date
$effect(() => {
  if (!handController) return; // Add safety check
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
    <!-- *** LOGGING ADDED HERE *** -->
    <div class="absolute top-1 left-1 white z-5 bg-black-50 pa1 dn">Accessory Render Check:
      sceneReady: {sceneReady ? '✅' : '❌'},
      context.threeJsScene: {context.threeJsScene ? '✅' : '❌'},
      context.selectedAccessory: {context.selectedAccessory ? `✅ (${context.selectedAccessory.name})` : '❌'},
      handController: {handController ? '✅' : '❌'}
    </div>
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
    {:else}
     <!-- Optional: Add a placeholder or message when accessory doesn't render -->
     <!-- <div class="absolute top-2 left-1 white z-5 bg-red-50 pa1">Accessory not rendering.</div> -->
    {/if}
  </div>
  <!-- Debug data display -->
  <div class="fixed z-max top-1 left-1 bg-black-90 pa1 br3">
    <textarea class="highlight code meadow input-reset bg-transparent white bn h4 w5">
    Visible: {debugInfo.visible ? 'Yes' : 'No'}
    State: {debugInfo.state}
    Position:
      x: {debugInfo.position?.x?.toFixed(2) ?? '?'}
      y: {debugInfo.position?.y?.toFixed(2) ?? '?'}
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
