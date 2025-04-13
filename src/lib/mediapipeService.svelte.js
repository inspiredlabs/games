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
export async function initializeWithVideoElement(videoElement, canvas = null) {
  const context = useSharedContext();
  
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
      // Use provided canvas
      ctx = canvas.getContext('2d');
      context.canvas = canvas;
      context.canvasContext = ctx;
    } else if (context.canvas && context.canvasContext) {
      // Get from context if already set
      canvas = context.canvas;
      ctx = context.canvasContext;
    } else {
      // Create new canvas with full window dimensions
      canvas = document.createElement('canvas');
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      
      // Full viewport styling
      canvas.style.position = 'fixed';
      canvas.style.top = '0';
      canvas.style.left = '0';
      canvas.style.width = '100vw';
      canvas.style.height = '100vh';
      canvas.style.zIndex = '5';
      canvas.style.pointerEvents = 'none';
      canvas.style.border = '3px solid gold';
      
      // Apply initial clip path based on divider position
      canvas.style.clipPath = `polygon(${context.dividerPosition}px 0, 100% 0, 100% 100%, ${context.dividerPosition}px 100%)`;
      
      // Create context and store references
      ctx = canvas.getContext('2d');
      context.canvas = canvas;
      context.canvasContext = ctx;
      
      // Setup divider position watcher
      const dividerWatcher = () => {
        requestAnimationFrame(() => {
          if (canvas && context.dividerPosition) {
            canvas.style.clipPath = `polygon(${context.dividerPosition}px 0, 100% 0, 100% 100%, ${context.dividerPosition}px 100%)`;
          }
        });
      };
      
      // Watch for context updates
      const originalUpdateLayout = context.updateLayout;
      context.updateLayout = (pos) => {
        const result = originalUpdateLayout(pos);
        dividerWatcher();
        return result;
      };
      
      // Handle window resize
      const handleResize = () => {
        requestAnimationFrame(() => {
          if (canvas) {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
            log(`Canvas resized to ${canvas.width}x${canvas.height}`);
          }
        });
      };
      window.addEventListener('resize', handleResize);
      
      // Initial call to set clip path
      dividerWatcher();
    }
    
    // Append canvas to document if not already added
    if (canvas && !canvas.parentNode) {
      document.body.appendChild(canvas);
      log('Canvas appended to document body');
    }
    
    // Initialize smoothing stores
    const { smoothedHandLandmarksForDisplay, smoothedHandCenterForDisplay } = initSmoothingStores();
    
    // Configure hand detection callback
    hands.onResults((results) => {
      if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {

        // Update context with hand data
        const landmarks = results.multiHandLandmarks[0]; // Use the first hand's landmarks

        context.handLandmarks = results.multiHandLandmarks;
        context.handState = getDetailedHandPose(landmarks);
        context.handCenter = calculateHandCenter(landmarks);
        context.handFound = true;

        context.handFound = true;
        context.detectionStatus = `Hand detected: ${context.handState}`;
        
        // Update smoothed values
        const { centerStore } = updateSmoothedValues(
          results.multiHandLandmarks, 
          context.handCenter
        );
        
        // Store smoothed value in context
        centerStore.subscribe(value => {
          context.handCenterSmoothed = value;
        });
        
        // Draw landmarks if canvas is available
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
        // Reset when no hand detected
        if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        context.handLandmarks = [];
        context.handState = 'unknown';
        context.handCenter = null;
        context.handCenterSmoothed = null;
        context.handFound = false;
        context.detectionStatus = 'No hand detected';
        updateSmoothedValues([], null); // Reset smoothing
      }

      // --- ESSENTIAL ADDITION: UPDATE CONTROLLER ---
      // Always call update, passing landmarks or empty array if none detected
      if (context.activeController) {
        // Pass the multiHandLandmarks array, controller decides which hand(s) to use
        context.activeController.update(results.multiHandLandmarks);
      }
      // --- END ESSENTIAL ADDITION ---
      
      // Update frame counter
      context.renderCount = (context.renderCount || 0) + 1;
    });
    
    try {
      // Initialize camera with MediaPipe processing
      context.detectionStatus = 'Starting camera with hand detection...';
      await initCamera(Camera, videoElement, async () => {
        try {
          await hands.send({image: videoElement});
        } catch (error) {
          log('Error processing frame:', error);
        }
      });
      
      // Update context state
      context.mediaPipeLoaded = true;
      context.handDetectionReady = true;
      context.detectionStatus = 'MediaPipe ready and running';
      
      return { success: true, message: 'MediaPipe initialized successfully' };
    } catch (cameraError) {
      // Fallback to manual processing if camera fails
      log('Using fallback processing');
      context.detectionStatus = 'Using fallback processing...';
      
      // Inline the manual processing
      context.animationId = requestAnimationFrame(function process() {
        if (videoElement.readyState >= 2) {
          hands.send({image: videoElement}).catch(e => log('Process error:', e));
        }
        context.animationId = requestAnimationFrame(process);
      });
      
      context.mediaPipeLoaded = true;
      context.handDetectionReady = true;
      context.detectionStatus = 'MediaPipe running (fallback mode)';
      
      return { success: true, message: 'MediaPipe initialized with fallback processing' };
    }
  } catch (error) {
    context.detectionStatus = `Error: ${error.message}`;
    return { success: false, message: error.message };
  }
}
