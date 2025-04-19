// $lib/mediapipeService.svelte.js
// Consolidated MediaPipe service with direct video element handling
import { useSharedContext } from './useSharedContext.svelte.js';
import { 
  getDetailedHandPose,
  calculateHandCenter,
  calculateAvgFingerTipDistance
} from './handGestureUtils.js';
import {
  drawHandLandmarks,
  initSmoothingStores,
  updateSmoothedValues
} from './wireframeHandDrawing.js';

// MediaPipe configuration
export const MEDIAPIPE_CONFIG = {
  maxNumHands: 1,
  modelComplexity: 1,
  minDetectionConfidence: 0.3,
  minTrackingConfidence: 0.3,
  selfieMode: true
};

// Logger utility with timestamps
export function log(...args) {
  if (process.env.NODE_ENV !== 'production') 
    console.log(`[MediaPipe ${new Date().toISOString().substring(11, 19)}]`, ...args);
}

// Load all MediaPipe dependencies
export async function initializeMediaPipe() {
  try {
    log('Loading MediaPipe modules...');
    
    const [handsModule, drawingUtils, cameraUtils] = await Promise.all([
      import('@mediapipe/hands'),
      import('@mediapipe/drawing_utils'),
      import('@mediapipe/camera_utils')
    ]);
    
    log('MediaPipe modules loaded successfully');
    
    return { 
      Hands: handsModule.Hands, 
      HAND_CONNECTIONS: handsModule.HAND_CONNECTIONS,
      drawConnectors: drawingUtils.drawConnectors,
      drawLandmarks: drawingUtils.drawLandmarks,
      Camera: cameraUtils.Camera,
      error: null
    };
  } catch (error) {
    console.error('Error initializing MediaPipe:', error);
    return { error: error.message };
  }
}

// Create and configure hands model
export function createHandsModel(Hands) {
  log('Creating hand model');
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });
  
  hands.setOptions(MEDIAPIPE_CONFIG);
  return hands;
}

// Initialize camera with MediaPipe
export async function initCamera(Camera, videoElement, onFrame) {
  if (!videoElement) {
    throw new Error('Video element not available');
  }
  
  try {
    // Set up video stream if needed
    if (!videoElement.srcObject) {
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'user', 
          width: { ideal: 640 },
          height: { ideal: 480 },
          frameRate: { ideal: 30 }
        } 
      });
      
      videoElement.srcObject = stream;
    }
    
    // Create and start camera instance
    const camera = new Camera(videoElement, { onFrame });
    await camera.start();
    log('MediaPipe camera started');
    return camera;
  } catch (error) {
    log('Camera error:', error);
    throw error;
  }
}

/**
 * Initialize MediaPipe with direct video element reference
 */
export async function initializeWithVideoElement(videoElement, canvas = null, context) {
  // Ensure context is passed or retrieved
  if (!context) {
    context = useSharedContext(); 
  }
  
  if (!videoElement) {
    return { success: false, message: 'Video element not provided' };
  }
  
  if (context.mediaPipeLoaded) {
    return { success: true, message: 'MediaPipe already initialized' };
  }
  
  try {
    context.detectionStatus = 'Loading MediaPipe modules...';
    
    const mediaPipeModules = await initializeMediaPipe();
    
    if (mediaPipeModules.error) {
      context.detectionStatus = `MediaPipe initialization failed: ${mediaPipeModules.error}`;
      return { success: false, message: mediaPipeModules.error };
    }
    
    const { Hands, HAND_CONNECTIONS, drawConnectors, drawLandmarks, Camera } = mediaPipeModules;
    
    // Store drawing utilities for access
    window.drawConnectors = drawConnectors;
    window.drawLandmarks = drawLandmarks;
    window.HAND_CONNECTIONS = HAND_CONNECTIONS;
    
    // Create the hands model
    const hands = createHandsModel(Hands);
    
    // Set up canvas if needed
    let ctx;
    if (canvas) {
      ctx = canvas.getContext('2d');
      context.canvas = canvas; // Update context even if canvas provided
      context.canvasContext = ctx;
    } else if (context.canvas && context.canvasContext) {
      canvas = context.canvas;
      ctx = context.canvasContext;
    } else {
       console.warn('[MediaPipe Service] Canvas not provided and not found in context. Drawing disabled.');
    }
    
    // Append canvas to document if provided and not already added
    if (canvas && !canvas.parentNode && document?.body) { 
      // document.body.appendChild(canvas); 
      // log('Canvas appended to document body');
    } else if (canvas && canvas.parentNode) {
      // log('Canvas already in document.');
    }
    
    // Initialize smoothing stores
    const { smoothedHandLandmarksForDisplay, smoothedHandCenterForDisplay } = initSmoothingStores();

    // req. for FOCUSED LOG
    let previousHandState = null;
    
    // Configure hand detection callback
    hands.onResults((results) => {
        
      // --- FOCUSED LOG --- 
      const currentHandState = results.multiHandLandmarks && results.multiHandLandmarks.length > 0 
      ? `Found ${results.multiHandLandmarks.length} hand(s)`
      : 'No hands found';

      // Only log when state changes
      if (currentHandState !== previousHandState) {
      console.log(`[MediaPipe Service onResults] ${currentHandState}`);
      previousHandState = currentHandState;
      }
      // --- END FOCUSED LOG ---
        
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
        const landmarks = results.multiHandLandmarks[0]; 

        context.handLandmarks = results.multiHandLandmarks;
        context.handState = getDetailedHandPose(landmarks);
        context.handCenter = calculateHandCenter(landmarks);
        context.handFound = true;
        context.detectionStatus = `Hand detected: ${context.handState}`;
        
        const { centerStore } = updateSmoothedValues(results.multiHandLandmarks, context.handCenter);
        centerStore.subscribe(value => { context.handCenterSmoothed = value; });
        
        if (ctx && canvas) {
          drawHandLandmarks(
            ctx, 
            canvas, 
            results.multiHandLandmarks, 
            HAND_CONNECTIONS, 
            context.dividerPosition,
            { drawConnectors, drawLandmarks }
          );
        }
      } else {
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
        context.handLandmarks = [];
        context.handState = 'unknown';
        context.handCenter = null;
        context.handCenterSmoothed = null;
        context.handFound = false;
        context.detectionStatus = 'No hand detected';
        updateSmoothedValues([], null); 
      }

      if (context.activeController) {
        context.activeController.update(results.multiHandLandmarks); // Always call update
      }
      
      context.renderCount = (context.renderCount || 0) + 1;
    });
    
    try {
      context.detectionStatus = 'Starting camera with hand detection...';
      await initCamera(Camera, videoElement, async () => {
        try {
          await hands.send({image: videoElement});
        } catch (error) {
          log('Error processing frame:', error);
        }
      });
      
      context.mediaPipeLoaded = true;
      context.handDetectionReady = true;
      context.detectionStatus = 'MediaPipe ready and running';
      
      return { success: true, message: 'MediaPipe initialized successfully' };
    } catch (cameraError) {
      log('Camera initialization with MediaPipe failed, attempting fallback processing', cameraError);
      context.detectionStatus = 'Using fallback processing...';
      
      // Fallback manual processing loop
      let animFrameId = null;
      function process() {
        if (!context.mediaPipeLoaded) return; // Stop if cleaned up
        if (videoElement.readyState >= 2) {
          hands.send({image: videoElement}).catch(e => log('Manual process error:', e));
        }
        animFrameId = requestAnimationFrame(process);
      };
      animFrameId = requestAnimationFrame(process);
      
      context.mediaPipeLoaded = true;
      context.handDetectionReady = true;
      context.detectionStatus = 'MediaPipe running (fallback mode)';
      
      return { success: true, message: 'MediaPipe initialized with fallback processing' };
    }
  } catch (error) {
    log('Error in initializeWithVideoElement:', error); // Log top-level errors
    context.detectionStatus = `Error: ${error.message}`;
    return { success: false, message: error.message };
  }
}
