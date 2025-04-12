<script>
// src/routes/+page.svelte
import { onMount, onDestroy } from 'svelte';

// Component references
let container;
let leftPane;
let rightPane;
let resizer;

// Video elements
let videoElement;
let videoOverlayGray;
let handCanvas;
let canvasCtx;
let videoReady = false;

// MediaPipe Hands
let hands;
let isHandsModelLoaded = false;
let handDetectionStatus = "Waiting for model to load...";
let debugInfo = "";
let handFound = false;
let handLandmarks = [];

// Resizing state
let dragging = false;
let startX;
let leftPaneStartWidth;
let rightPaneStartWidth;
let dividerPosition = 0;

onMount(() => {
  // Set initial widths explicitly
  const containerWidth = container.offsetWidth;
  const initialLeftWidth = Math.floor(containerWidth / 2);

  leftPane.style.width = `${initialLeftWidth}px`;
  rightPane.style.width = `${containerWidth - initialLeftWidth}px`;

  // Position resizer at boundary and store position
  resizer.style.left = `${initialLeftWidth - 5}px`;
  dividerPosition = initialLeftWidth;

  // Set the clip path for the grayscale overlay
  updateClipPath(initialLeftWidth);

  console.log('Initial pane widths:', initialLeftWidth, containerWidth - initialLeftWidth);

  // Initialize canvas with correct styling
  if (handCanvas) {
    canvasCtx = handCanvas.getContext('2d');
  }

  // Load MediaPipe Hands and initialize camera
  loadMediaPipeHandsModel();
});

onDestroy(() => {
  // Clean up MediaPipe resources when component is destroyed
  if (hands) {
    hands.close();
  }
});

async function loadMediaPipeHandsModel() {
  try {
    handDetectionStatus = "Loading MediaPipe Hands model...";
    console.log('Loading MediaPipe Hands model...');

    const handsModule = await import('@mediapipe/hands');
    const drawingUtils = await import('@mediapipe/drawing_utils');

    const { Hands, HAND_CONNECTIONS } = handsModule;
    const { drawConnectors, drawLandmarks } = drawingUtils;

    window.HAND_CONNECTIONS = HAND_CONNECTIONS;
    window.drawConnectors = drawConnectors;
    window.drawLandmarks = drawLandmarks;

    debugInfo = "Modules loaded, initializing Hands model";
    console.log(debugInfo);

    hands = new Hands({
      locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
    });

    hands.setOptions({
      maxNumHands: 2,
      modelComplexity: 1,
      minDetectionConfidence: 0.3,
      minTrackingConfidence: 0.3,
      selfieMode: false
    });

    debugInfo = "Hands options set";
    console.log(debugInfo);

    hands.onResults((results) => {
      if (!canvasCtx || !handCanvas) {
        console.error("Canvas or context is not available!");
        return;
      }

      if (videoElement && 
          (handCanvas.width !== videoElement.videoWidth || 
           handCanvas.height !== videoElement.videoHeight)) {
        handCanvas.width = videoElement.videoWidth;
        handCanvas.height = videoElement.videoHeight;
        console.log(`Updated canvas size: ${handCanvas.width}x${handCanvas.height}`);
      }

      canvasCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);

      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        handFound = true;
        handDetectionStatus = `Detected ${results.multiHandLandmarks.length} hand(s)`;
        handLandmarks = results.multiHandLandmarks; // Use landmarks directly
      } else {
        handFound = false;
        handDetectionStatus = "No hands detected";
        handLandmarks = [];
        return;
      }

      const containerWidth = container.offsetWidth;
      const canvasWidth = handCanvas.width;
      const canvasHeight = handCanvas.height;

      const scaleFactor = canvasWidth / containerWidth;
      const intrinsicDividerX = dividerPosition * scaleFactor;
      const rightSideWidthIntrinsic = canvasWidth - intrinsicDividerX;

      console.log("Container width:", containerWidth);
      console.log("Canvas intrinsic width:", canvasWidth);
      console.log("Divider position (container):", dividerPosition);
      console.log("Intrinsic divider X:", intrinsicDividerX);
      console.log("Right side width (intrinsic):", rightSideWidthIntrinsic);

      canvasCtx.save();

      canvasCtx.strokeStyle = '#FF0000';
      canvasCtx.lineWidth = 2;
      canvasCtx.strokeRect(0, 0, canvasWidth, canvasHeight);

      canvasCtx.beginPath();
      canvasCtx.rect(intrinsicDividerX, 0, rightSideWidthIntrinsic, canvasHeight);
      canvasCtx.clip();

      const videoMirrored = window.getComputedStyle(videoElement).transform.includes('matrix(-1');
      if (videoMirrored) {
        canvasCtx.scale(-1, 1);
        canvasCtx.translate(-canvasWidth, 0);
      }

      for (const landmarks of handLandmarks) {
        try {
          window.drawConnectors(canvasCtx, landmarks, window.HAND_CONNECTIONS, {
            color: '#00FF00',
            lineWidth: 8
          });
          window.drawLandmarks(canvasCtx, landmarks, {
            color: '#FF0000',
            lineWidth: 3,
            radius: 8
          });
        } catch (error) {
          console.error('Error drawing hand landmarks:', error);
        }
      }

      canvasCtx.restore();

      debugInfo = `Canvas: ${canvasWidth}x${canvasHeight}, Divider: ${dividerPosition}, ` +
                  `Left side: ${intrinsicDividerX}px, Right side: ${rightSideWidthIntrinsic}px`;
    });

    isHandsModelLoaded = true;
    handDetectionStatus = "MediaPipe Hands model loaded successfully";
    debugInfo = "Model loaded, waiting for camera";
    console.log('MediaPipe Hands model loaded');

    initCamera();
  } catch (error) {
    handDetectionStatus = `Error loading MediaPipe: ${error.message}`;
    debugInfo = `Error: ${error.message}`;
    console.error('Error loading MediaPipe Hands:', error);
  }
}

async function initCamera() {
  try {
    handDetectionStatus = "Requesting camera access...";
    debugInfo = "Requesting camera";
    console.log('Requesting camera access...');

    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'user', 
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 15 }
      } 
    });

    if (videoElement) {
      videoElement.srcObject = stream;
      debugInfo = "Stream attached to video";

      videoElement.onloadedmetadata = () => {
        videoReady = true;
        handDetectionStatus = "Camera initialized, starting hand detection";
        debugInfo = "Camera ready";
        console.log('Camera initialized');
        console.log(`Video dimensions: ${videoElement.videoWidth}x${videoElement.videoHeight}`);

        if (handCanvas) {
          handCanvas.width = videoElement.videoWidth;
          handCanvas.height = videoElement.videoHeight;
          console.log(`Canvas size set to: ${handCanvas.width}x${handCanvas.height}`);
          debugInfo = `Canvas: ${handCanvas.width}x${handCanvas.height}`;
        }

        if (isHandsModelLoaded && hands) {
          debugInfo = "Starting camera tracking";

          import('@mediapipe/camera_utils').then(({ Camera }) => {
            if (Camera) {
              try {
                debugInfo = "Creating Camera instance";
                const camera = new Camera(videoElement, {
                  onFrame: async () => {
                    if (hands && videoElement) {
                      await hands.send({ image: videoElement }); // Send full video
                    }
                  }
                });

                camera.start();
                debugInfo = "Camera tracking started";
                handDetectionStatus = "Hand detection running";
                console.log("MediaPipe camera started");
              } catch (camError) {
                console.error("Camera initialization error:", camError);
                handDetectionStatus = "Error starting camera, using fallback";
                debugInfo = `Camera error: ${camError.message}`;
                processHandsManually();
              }
            } else {
              handDetectionStatus = "Camera utils not available, using fallback";
              debugInfo = "No Camera module, using fallback";
              processHandsManually();
            }
          }).catch(err => {
            console.error("Error importing camera_utils:", err);
            debugInfo = `Import error: ${err.message}`;
            processHandsManually();
          });
        }
      };
    }
  } catch (error) {
    handDetectionStatus = `Camera access error: ${error.message}`;
    debugInfo = `Camera error: ${error.message}`;
    console.error('Camera access error:', error);
  }
}

function processHandsManually() {
  if (!videoReady || !hands || !videoElement) return;

  handDetectionStatus = "Using manual hand detection processing";
  debugInfo = "Using frame-by-frame processing";

  const processFrame = async () => {
    if (videoElement.readyState === 4) {
      try {
        await hands.send({ image: videoElement });
      } catch (error) {
        console.error('Hand detection error:', error);
        debugInfo = `Process error: ${error.message}`;
      }
    }
    requestAnimationFrame(processFrame);
  };

  processFrame();
}

function updateClipPath(leftWidth) {
  if (videoOverlayGray) {
    videoOverlayGray.style.clipPath = `inset(0 0 0 ${leftWidth}px)`;
  }
  dividerPosition = leftWidth;
}

function pointermove(e) {
  if (!dragging) return;

  const dx = e.clientX - startX;
  const newLeftWidth = Math.max(50, leftPaneStartWidth + dx);
  const containerWidth = container.offsetWidth;
  const newRightWidth = Math.max(50, containerWidth - newLeftWidth);

  leftPane.style.width = `${newLeftWidth}px`;
  rightPane.style.width = `${newRightWidth}px`;
  resizer.style.left = `${newLeftWidth - 5}px`;
  updateClipPath(newLeftWidth);
}

function pointerend() {
  dragging = false;
  document.body.style.cursor = 'default';

  leftPaneStartWidth = leftPane.offsetWidth;
  rightPaneStartWidth = rightPane.offsetWidth;

  window.removeEventListener('mousemove', pointermove);
  window.removeEventListener('mouseup', pointerend);
  window.removeEventListener('touchmove', pointermove);
  window.removeEventListener('touchend', pointerend);
}

function pointerstart(e) {
  const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;

  startX = clientX;
  dragging = true;

  leftPaneStartWidth = leftPane.offsetWidth;
  rightPaneStartWidth = rightPane.offsetWidth;

  console.log('Starting resize with widths:', leftPaneStartWidth, rightPaneStartWidth);

  document.body.style.cursor = 'col-resize';

  window.addEventListener('mousemove', pointermove);
  window.addEventListener('mouseup', pointerend);
  window.addEventListener('touchmove', pointermove, { passive: false });
  window.addEventListener('touchend', pointerend);

  e.preventDefault();
}

let showDebug = false;
function toggleDebug() {
  showDebug = !showDebug;
}
</script>

<div class="video-container absolute top-0 left-0 w-100 vh-100">
  <video 
    bind:this={videoElement}
    class="absolute top-0 left-0 w-100 h-100 object-cover"
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

<section bind:this={container} class="flex vh-100 relative z-2">
  <div bind:this={leftPane} class="relative" style="background: transparent;"></div>

  <div 
    bind:this={resizer}
    class="absolute bg-white-60 hover-bg-white h-100 w05 z-3 col-resize flex items-center justify-center"
    on:mousedown={pointerstart}
    on:touchstart={pointerstart}
    role="slider"
    tabindex=0
  >
    <div class="handle">
      <div class="handle-icon">⋮</div>
    </div>
  </div>

  <div bind:this={rightPane} class="relative" style="background: transparent;"></div>
</section>

<button
  class="status-button"
  on:click={toggleDebug}>
  <span>{handFound ? '👋' : '🔍'}</span>
</button>

{#if showDebug}
<div class="debug-panel">
  <div class="debug-header">
    <h3>Hand Detection Debug</h3>
    <button class="close-button" on:click={toggleDebug}>×</button>
  </div>

  <div class="debug-content">
    <div class="debug-item">
      <div class="label">Status:</div>
      <div class="value" class:highlight={handFound}>{handDetectionStatus}</div>
    </div>

    <div class="debug-item">
      <div class="label">Divider Position:</div>
      <div class="value">{dividerPosition}px</div>
    </div>

    <div class="debug-item">
      <div class="label">Info:</div>
      <div class="value">{debugInfo}</div>
    </div>

    <div class="debug-item">
      <div class="label">Hands:</div>
      <div class="value">{handLandmarks.length}</div>
    </div>

    <div class="debug-item" style="display:block;height: 66px">
      {#if handLandmarks.length > 0}
        <div class="label">Finger Tips:</div>
        <div class="value small">
          {#if handLandmarks[0]}
            Thumb: ({(handLandmarks[0][4]?.x / videoElement.videoWidth * 100).toFixed(0)}%, {(handLandmarks[0][4]?.y / videoElement.videoHeight * 100).toFixed(0)}%)<br>
            Index: ({(handLandmarks[0][8]?.x / videoElement.videoWidth * 100).toFixed(0)}%, {(handLandmarks[0][8]?.y / videoElement.videoHeight * 100).toFixed(0)}%)<br>
            Middle: ({(handLandmarks[0][12]?.x / videoElement.videoWidth * 100).toFixed(0)}%, {(handLandmarks[0][12]?.y / videoElement.videoHeight * 100).toFixed(0)}%)<br>
          {/if}
        </div>
      {/if}
    </div>

    <div class="debug-controls">
      <button 
        class="debug-button" 
        on:click={() => {
          if (handCanvas && videoElement) {
            handCanvas.width = videoElement.videoWidth;
            handCanvas.height = videoElement.videoHeight;
            handCanvas.style.position = 'absolute';
            handCanvas.style.top = '0';
            handCanvas.style.left = '0';
            handCanvas.style.width = '100%';
            handCanvas.style.height = '100%';
            handCanvas.style.zIndex = '5';
            handCanvas.style.pointerEvents = 'none';
            console.log("Canvas repositioned and resized");
            debugInfo = "Canvas fixed, try moving your hand now";
          }
        }}
      >
        Fix Canvas
      </button>
      
      <button 
        class="debug-button" 
        on:click={() => {
          if (hands) {
            hands.close();
            loadMediaPipeHandsModel();
            debugInfo = "Reloading hand detection...";
          }
        }}
      >
        Reload
      </button>
    </div>
  </div>
</div>
{/if}

<style>
*, *::before, *::after {
box-sizing: border-box;
}

:global(body) { 
margin: 0;
overflow: hidden;
}

.aside {
  cursor: move;
  padding: 1rem;
  position: relative; /* Start with relative positioning */
  user-select: none; /* Prevent text selection during drag */
}

/* Video container */
.video-container {
overflow: hidden;
}

.w05 {
width: 10px;
}

.hover-bg-white:hover {
background-color: rgba(255, 255, 255, 0.9);
}

.col-resize {
cursor: col-resize;
}

/* Object fit ensures the video covers the container properly */
.object-cover {
object-fit: cover;
}

/* Grayscale overlay */
.grayscale-overlay {
background: transparent;
/* Apply grayscale filter to what's beneath this element */
backdrop-filter: grayscale(1) brightness(1) contrast(0.8) saturate(0);
-webkit-backdrop-filter: grayscale(1) brightness(1) contrast(0.8) saturate(0);
}

/* Status button - fixed position */
.status-button {
position: fixed;
bottom: 20px;
right: 20px;
width: 50px;
height: 50px;
border: none;
border-radius: 50%;
background-color: rgba(0, 0, 0, 0.7);
color: white;
display: flex;
align-items: center;
justify-content: center;
font-size: 24px;
cursor: pointer;
z-index: 100;
/* box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3); */
user-select: none;
}

.status-button:hover {
background-color: rgba(0, 0, 0, 0.9);
}

/* Debug panel */
.debug-panel {
position: fixed;
bottom: 80px;
right: 20px;
width: 300px;
background-color: rgba(0, 0, 0, 0.8);
color: white;
border-radius: 10px;
padding: 15px;
z-index: 100;
font-family: sans-serif;
box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
max-height: 80vh;
overflow-y: auto;
}

.debug-header {
display: flex;
justify-content: space-between;
align-items: center;
margin-bottom: 15px;
border-bottom: 1px solid rgba(255, 255, 255, 0.2);
padding-bottom: 10px;
}

.debug-header h3 {
margin: 0;
font-size: 16px;
font-weight: 500;
}

.close-button {
background: none;
border: none;
color: white;
font-size: 24px;
cursor: pointer;
padding: 0;
margin: 0;
}

.debug-content {
display: flex;
flex-direction: column;
gap: 12px;
}

.debug-item {
display: flex;
flex-direction: column;
gap: 4px;
}

.label {
font-size: 12px;
color: rgba(255, 255, 255, 0.7);
}

.value {
font-size: 14px;
background-color: rgba(255, 255, 255, 0.1);
padding: 8px 10px;
border-radius: 4px;
word-break: break-word;
}

.value.small {
font-size: 12px;
line-height: 1.4;
}

.highlight {
background-color: rgba(0, 128, 0, 0.5);
}

.debug-controls {
display: flex;
gap: 10px;
margin-top: 10px;
}

.debug-button {
padding: 8px 16px;
background-color: rgba(255, 255, 255, 0.15);
color: white;
border: none;
border-radius: 4px;
cursor: pointer;
font-size: 14px;
flex: 1;
}

.debug-button:hover {
background-color: rgba(255, 255, 255, 0.25);
}

/* Handle for resizer */
.handle {
position: absolute;
top: 50%;
left: 50%;
transform: translate(-50%, -50%);
width: 24px;
height: 24px;
background-color: white;
border-radius: 50%;
display: flex;
align-items: center;
justify-content: center;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
}

.handle-icon {
transform: rotate(90deg);
font-weight: bold;
}

/* Utility classes from tachyons */
.absolute { position: absolute; }
.relative { position: relative; }
.flex { display: flex; }
.items-center { align-items: center; }
.justify-center { justify-content: center; }
.top-0 { top: 0; }
.left-0 { left: 0; }
.vh-100 { height: 100vh; }
.w-100 { width: 100%; }
.h-100 { height: 100%; }
.z-2 { z-index: 2; }
.z-3 { z-index: 3; }
.bg-white-60 { background-color: rgba(255, 255, 255, 0.6); }
</style>

<!-- usage: claude.ai/chat/457a7db6-2bab-4596-9444-91d052c11984 -->