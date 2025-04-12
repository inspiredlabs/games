// $lib/wireframeHandDrawing.js
// Utilities for drawing hand wireframes and landmarks on canvas

import { tweened } from 'svelte/motion';
import { circOut } from 'svelte/easing';

// Configuration constants
export const DRAWING_CONFIG = {
  wireframe: {
    color: '#555',
    lineWidth: 1
  },
  landmarks: {
    color: '#003330',
    lineWidth: 1,
    radius: 1
  }
};

// Motion smoothing configuration
export const SMOOTHING_CONFIG = {
  landmarks: {
    duration: 200,
    easing: circOut
  },
  handCenter: {
    duration: 180,
    easing: circOut
  }
};

// Tweened stores for smoothing hand motion
let smoothedHandLandmarksForDisplay;
let smoothedHandCenterForDisplay;

// Initialize tweened stores
export function initSmoothingStores() {
  smoothedHandLandmarksForDisplay = tweened([], SMOOTHING_CONFIG.landmarks);
  smoothedHandCenterForDisplay = tweened(null, SMOOTHING_CONFIG.handCenter);
  return { smoothedHandLandmarksForDisplay, smoothedHandCenterForDisplay };
}

// Update smoothed values with new data
export function updateSmoothedValues(landmarks, handCenter) {
  if (smoothedHandLandmarksForDisplay && landmarks) {
    smoothedHandLandmarksForDisplay.set(landmarks);
  }
  
  if (smoothedHandCenterForDisplay && handCenter) {
    smoothedHandCenterForDisplay.set(handCenter);
  }
  
  return { 
    landmarksStore: smoothedHandLandmarksForDisplay, 
    centerStore: smoothedHandCenterForDisplay 
  };
}

/**
 * Draw hand landmarks without canvas clipping (using CSS for clipping)
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {HTMLCanvasElement} canvas - Canvas element
 * @param {Array} landmarks - Array of hand landmarks from MediaPipe
 * @param {Array} connections - Hand connections from MediaPipe
 * @param {number} dividerPos - Position of the screen divider (now only used for info)
 * @param {Object} drawingUtils - Drawing utilities from MediaPipe (drawConnectors, drawLandmarks)
 * @returns {Object} Drawing information
 */
export function drawHandLandmarks(ctx, canvas, landmarks, connections, dividerPos, drawingUtils) {
  // Return early if missing required parameters
  if (!ctx || !canvas || !landmarks.length || !drawingUtils) {
    return null;
  }
  
  const { drawConnectors, drawLandmarks } = drawingUtils;
  
  // Clear the canvas
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw hand landmarks - no canvas clipping needed (CSS handles that)
  for (const landmark of landmarks) {
    try {
      // Draw connections (wireframe)
      if (drawConnectors && connections) {
        drawConnectors(ctx, landmark, connections, {
          color: DRAWING_CONFIG.wireframe.color,
          lineWidth: DRAWING_CONFIG.wireframe.lineWidth
        });
      }
      
      // Draw landmark points
      if (drawLandmarks) {
        drawLandmarks(ctx, landmark, {
          color: DRAWING_CONFIG.landmarks.color,
          lineWidth: DRAWING_CONFIG.landmarks.lineWidth,
          radius: DRAWING_CONFIG.landmarks.radius
        });
      }
    } catch (error) {
      console.error('Error drawing landmarks:', error);
    }
  }
  
  return {
    canvasWidth: canvas.width,
    canvasHeight: canvas.height,
    dividerPos
  };
}

// DEBUGGING: https://claude.ai/chat/f9d9b446-0229-41b7-a832-8ebf1b61a74b