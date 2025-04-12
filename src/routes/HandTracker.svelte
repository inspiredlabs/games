<script>
// src/routes/HandTracker.svelte
import { onMount, onDestroy } from 'svelte';
import { 
  initializeMediaPipe, 
  createHandsModel, 
  initCamera, 
  startManualProcessing, 
  drawHandLandmarks, 
  log 
} from '$lib/mediapipeService';

export let videoElement;
export let handCanvas;
export let canvasCtx;
export let dividerPosition = 0;

export let handLandmarks = [];
export let debugInfo = '';
export let handDetectionStatus = 'Waiting for model to load...';
export let handFound = false;

let hands;
let camera;
let animationId;

onMount(() => setTimeout(loadMediaPipe, 500));

onDestroy(() => {
  camera?.stop?.();
  hands?.close?.();
  if (animationId) cancelAnimationFrame(animationId);
});

async function loadMediaPipe() {
  try {
    handDetectionStatus = "Loading MediaPipe...";
    
    // Initialize MediaPipe
    const mp = await initializeMediaPipe();
    if (mp.error) throw new Error(mp.error);
    
    // Set global references
    Object.assign(window, {
      HAND_CONNECTIONS: mp.HAND_CONNECTIONS,
      drawConnectors: mp.drawConnectors,
      drawLandmarks: mp.drawLandmarks
    });
    
    // Create hands model
    hands = createHandsModel(mp.Hands);
    
    // Set up results handler
    hands.onResults(handleResults);
    
    handDetectionStatus = "MediaPipe loaded, initializing camera...";
    debugInfo = "Starting camera";
    
    // Initialize camera
    try {
      const onFrame = async () => {
        if (hands && videoElement) {
          await hands.send({ image: videoElement });
        }
      };
      
      camera = await initCamera(mp.Camera, videoElement, onFrame);
      handDetectionStatus = "Hand detection running";
    } catch (cameraError) {
      log('Camera initialization failed, using fallback:', cameraError);
      handDetectionStatus = "Using manual detection (fallback)";
      debugInfo = `Camera error: ${cameraError.message}`;
      
      // Start manual processing
      animationId = startManualProcessing(videoElement, async () => {
        try {
          await hands.send({ image: videoElement });
        } catch (e) {
          console.error('Process frame error:', e);
        }
      });
    }
  } catch (error) {
    handDetectionStatus = `Error: ${error.message}`;
    debugInfo = `Failed to initialize: ${error.message}`;
    console.error('MediaPipe initialization error:', error);
  }
}

function handleResults(results) {
  if (!canvasCtx || !handCanvas) return;

  // Update canvas dimensions if needed
  if (videoElement?.videoWidth > 0 && 
      (handCanvas.width !== videoElement.videoWidth || 
       handCanvas.height !== videoElement.videoHeight)) {
    handCanvas.width = videoElement.videoWidth;
    handCanvas.height = videoElement.videoHeight;
    log(`Canvas resized: ${handCanvas.width}x${handCanvas.height}`);
  }

  // Clear canvas
  canvasCtx.clearRect(0, 0, handCanvas.width, handCanvas.height);

  // Process hand landmarks
  if (results.multiHandLandmarks?.length) {
    handFound = true;
    handDetectionStatus = `Detected ${results.multiHandLandmarks.length} hand(s)`;
    handLandmarks = results.multiHandLandmarks;
    
    // Draw hands
    const drawInfo = drawHandLandmarks(
      canvasCtx, 
      handCanvas, 
      results.multiHandLandmarks, 
      window.HAND_CONNECTIONS,
      dividerPosition
    );
    
    // Update debug info
    debugInfo = `Canvas: ${drawInfo.canvasWidth}x${drawInfo.canvasHeight}, ` +
                `Divider: ${drawInfo.dividerPos}, ` +
                `Left: ${drawInfo.intrinsicDividerX}px, ` +
                `Right: ${drawInfo.rightWidth}px`;
  } else {
    handFound = false;
    handDetectionStatus = "No hands detected";
    handLandmarks = [];
  }
}

export function reload() {
  log("Reloading hand tracking...");
  
  // Clean up
  camera?.stop?.();
  if (animationId) cancelAnimationFrame(animationId);
  hands?.close?.();
  
  // Reset state
  handFound = false;
  handLandmarks = [];
  handDetectionStatus = "Reloading...";
  debugInfo = "Restarting MediaPipe...";
  
  // Restart
  setTimeout(loadMediaPipe, 500);
}
</script>