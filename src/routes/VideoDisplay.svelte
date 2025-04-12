<script>
// src/routes/VideoDisplay.svelte
import { onMount } from 'svelte';
import { log } from '$lib/mediapipeService';

export let videoElement;
export let handCanvas;
export let canvasCtx;
export let dividerPosition = 0;

let videoOverlayGray;

onMount(() => {
  // Initialize canvas context
  canvasCtx = handCanvas.getContext('2d');
  
  // Setup metadata handler
  if (videoElement) {
    videoElement.onloadedmetadata = fixCanvas;
  }
});

// Update clip path when divider changes
$: videoOverlayGray && updateClipPath(dividerPosition);

function updateClipPath(leftWidth) {
  videoOverlayGray.style.clipPath = `inset(0 0 0 ${leftWidth}px)`;
}

export function fixCanvas() {
  if (!handCanvas || !videoElement) {
    log("Cannot fix canvas: missing elements");
    return;
  }
  
  // Set dimensions and styles
  const width = videoElement.videoWidth || 640;
  const height = videoElement.videoHeight || 480;
  
  handCanvas.width = width;
  handCanvas.height = height;
  
  Object.assign(handCanvas.style, {
    position: 'absolute',
    top: '0',
    left: '0',
    width: '100%',
    height: '100%',
    zIndex: '5',
    pointerEvents: 'none'
  });
  
  log(`Canvas fixed: ${width}x${height}`);
  
  // Refresh context
  canvasCtx = handCanvas.getContext('2d');
}
</script>

<div class="video-container absolute top-0 left-0 w-100 vh-100">
  <video
    bind:this={videoElement}
    class="absolute top-0 left-0 w-100 h-100 object-cover"
    style="transform: scaleX(-1);"
    autoplay
    playsinline
    muted
  ></video>

  <div
    bind:this={videoOverlayGray}
    class="absolute top-0 left-0 w-100 h-100 grayscale-overlay"
  ></div>

  <canvas
    bind:this={handCanvas}
    class="absolute top-0 left-0 w-100 h-100"
    style="z-index: 5; pointer-events: none;"
  ></canvas>
</div>