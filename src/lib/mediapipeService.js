// lib/mediapipeService.js
// Centralizes MediaPipe initialization and logic

// Debug utility - set to false for production
const DEBUG = true;

// Logger utility
export function log(...args) {
  if (DEBUG) console.log(...args);
}

// Error handler utility
export function safeExecute(fn, errorMessage) {
  try {
    return fn();
  } catch (e) {
    console.error(errorMessage, e);
    return { error: `${errorMessage}: ${e.message}` };
  }
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
    
    log('MediaPipe modules loaded');
    
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
  const hands = new Hands({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`
  });
  
  hands.setOptions({
    maxNumHands: 1,
    modelComplexity: 1,
    minDetectionConfidence: 0.3,
    minTrackingConfidence: 0.3,
    selfieMode: true // fix
  });
  
  return hands;
}

// Initialize camera with MediaPipe
export async function initCamera(Camera, videoElement, onFrame) {
  try {
    log('Requesting camera access...');
    
    const stream = await navigator.mediaDevices.getUserMedia({ 
      video: { 
        facingMode: 'user', 
        width: { ideal: 640 },
        height: { ideal: 480 },
        frameRate: { ideal: 30 }
      } 
    });
    
    if (!videoElement) throw new Error('Video element not available');
    
    videoElement.srcObject = stream;
    
    return new Promise((resolve, reject) => {
      videoElement.onloadedmetadata = () => {
        try {
          log('Camera initialized, creating Camera instance');
          const camera = new Camera(videoElement, { onFrame });
          camera.start()
            .then(() => {
              log('MediaPipe camera started');
              resolve(camera);
            })
            .catch(reject);
        } catch (error) {
          reject(error);
        }
      };
      
      videoElement.onerror = reject;
    });
  } catch (error) {
    console.error('Camera initialization failed:', error);
    throw error;
  }
}

// Manual processing fallback
export function startManualProcessing(videoElement, processFrame) {
  log('Starting manual frame processing');
  let animationId = requestAnimationFrame(function process() {
    if (videoElement.readyState >= 2) {
      processFrame();
    }
    animationId = requestAnimationFrame(process);
  });
  
  return animationId;
}

// Draw hand landmarks with canvas clipping 
export function drawHandLandmarks(ctx, canvas, landmarks, connections, dividerPos) {
  if (!ctx || !canvas || !landmarks.length) return;
  
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  const screenWidth = window.innerWidth;
  const scaleFactor = canvasWidth / screenWidth;
  const intrinsicDividerX = dividerPos * scaleFactor;
  const rightWidth = canvasWidth - intrinsicDividerX;
  
  ctx.save();
  
  // Clip to right side of divider
  ctx.beginPath();
  ctx.rect(intrinsicDividerX, 0, rightWidth, canvasHeight);
  ctx.clip();
  
  // Draw hand landmarks
  for (const landmark of landmarks) {
    try {
      window.drawConnectors(ctx, landmark, connections, {
        color: '#00FF00',
        lineWidth: 4
      });
      window.drawLandmarks(ctx, landmark, {
        color: '#FF0000',
        lineWidth: 2,
        radius: 6
      });
    } catch (error) {
      console.error('Error drawing landmarks:', error);
    }
  }
  
  ctx.restore();
  
  return {
    canvasWidth,
    canvasHeight,
    dividerPos,
    intrinsicDividerX: intrinsicDividerX.toFixed(0),
    rightWidth: rightWidth.toFixed(0)
  };
}