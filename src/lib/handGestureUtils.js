// lib/handGestureUtils.js
// Utility functions for hand gesture detection.
// CONVENTION: Functions in this file should be pure and stateless,
// focusing on calculations and instantaneous detection based on inputs.

import { log } from './mediapipeService.svelte.js'; 

// --- Exportable Default Values ---
// Define and export the globally preferred default thresholds.
// Game routes can override these via their gameConfig if needed.
export const DEFAULT_SHAKE_THRESHOLDS = { x: 0.15, y: 0.12, z: 0.11 }; 
export const DEFAULT_QUICK_MOVE_THRESHOLD = 0.01;

/**
 * Calculate the Euclidean distance between two 3D points
 * @param {Object} point1 - First point with x, y, z coordinates
 * @param {Object} point2 - Second point with x, y, z coordinates
 * @returns {number} The distance between the two points
 */
export function calculateDistance(point1, point2) {
  if (!point1 || !point2) return 0; 
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) +
    Math.pow(point2.y - point1.y, 2) +
    Math.pow(point2.z - point1.z, 2)
  );
}

/**
  * Calculate the average distance from wrist to fingertips
  * @param {Array} landmarks - Array of hand landmarks from MediaPipe
  * @returns {number} The average distance
  */
export function calculateAvgFingerTipDistance(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return 0;
  }
  const wrist = landmarks[0];
  const tipIndices = [4, 8, 12, 16, 20]; 
  let totalDistance = 0;
  let validCount = 0;

  for (const index of tipIndices) {
    if (landmarks[index]) {
      totalDistance += calculateDistance(wrist, landmarks[index]);
      validCount++;
    }
  }

  return validCount > 0 ? totalDistance / validCount : 0;
}


/**
 * Determine a basic hand gesture state (fist/palm/unknown) based on average fingertip distance.
 * @param {Array} landmarks - Array of hand landmarks from MediaPipe
 * @returns {string} The hand state: 'fist', 'palm', or 'unknown'
 */
export function getHandState(landmarks) {
  const avgDistance = calculateAvgFingerTipDistance(landmarks);
  if (avgDistance === 0) return 'unknown'; 
  
  const FIST_THRESHOLD = 0.15; 
  const PALM_THRESHOLD_MULTIPLIER = 1.8; 

  if (avgDistance < FIST_THRESHOLD) return 'fist';
  if (avgDistance > FIST_THRESHOLD * PALM_THRESHOLD_MULTIPLIER) return 'palm'; 
  return 'unknown'; 
}

/**
 * Calculate the center point of a hand from landmarks
 * @param {Array} landmarks - Array of hand landmarks from MediaPipe
 * @returns {Object | null} The hand center point {x, y, z} or null if invalid
 */
export function calculateHandCenter(landmarks) {
  if (!landmarks || landmarks.length === 0) return null;
  let sumX = 0, sumY = 0, sumZ = 0;
  let validCount = 0;
  landmarks.forEach(lm => {
    if (lm && typeof lm.x === 'number' && typeof lm.y === 'number' && typeof lm.z === 'number') {
      sumX += lm.x;
      sumY += lm.y;
      sumZ += lm.z;
      validCount++;
    }
  });
  if (validCount === 0) return null;
  return { 
    x: sumX / validCount, 
    y: sumY / validCount, 
    z: sumZ / validCount 
  };
}

/**
 * Check if fingers are curled based on distance between tip and base knuckles.
 * @param {Array} landmarks - Array of hand landmarks from MediaPipe
 * @returns {Object} Object with boolean values for each finger curl state. Returns all false if invalid landmarks.
 */
export function checkFingerCurl(landmarks) {
  const defaultCurlState = {
    thumb: false, index: false, middle: false, ring: false, pinky: false
  };
  
  if (!landmarks || landmarks.length < 21) {
    return defaultCurlState;
  }
  
  const tipIndices = [4, 8, 12, 16, 20];
  const baseIndices = [2, 5, 9, 13, 17]; 
  const fingerNames = ['thumb', 'index', 'middle', 'ring', 'pinky'];
  
  const curlThresholds = {
    thumb: 0.08,
    index: 0.12,
    middle: 0.12,
    ring: 0.12,
    pinky: 0.12
  };

  const curlState = { ...defaultCurlState };

  for (let i = 0; i < fingerNames.length; i++) {
    const tip = landmarks[tipIndices[i]];
    const base = landmarks[baseIndices[i]];
    const fingerName = fingerNames[i];
    
    if (tip && base) {
      const distance = calculateDistance(tip, base);
      curlState[fingerName] = distance < curlThresholds[fingerName];
    }
  }
  
  return curlState;
}

/**
 * Get a more detailed description of the hand pose based on finger curls.
 * @param {Array} landmarks - Array of hand landmarks from MediaPipe
 * @returns {string} Detailed hand pose description (e.g., 'fist', 'open_palm', 'pointing', 'peace', 'unknown').
 */
export function getDetailedHandPose(landmarks) {
  if (!landmarks || landmarks.length < 21) return 'unknown';

  const fingerCurl = checkFingerCurl(landmarks);
  const numCurled = Object.values(fingerCurl).filter(Boolean).length;
  
  if (numCurled >= 4) return 'fist'; 
  if (numCurled === 0) return 'open_palm';
  
  if (!fingerCurl.index && fingerCurl.middle && fingerCurl.ring && fingerCurl.pinky) {
    return 'pointing';
  }
  
  if (!fingerCurl.index && !fingerCurl.middle && fingerCurl.ring && fingerCurl.pinky) {
    return 'peace';
  }

  if (!fingerCurl.thumb && fingerCurl.index && fingerCurl.middle && fingerCurl.ring && fingerCurl.pinky) {
      return 'thumbs_up';
  }
  
  return getHandState(landmarks); 
}

// --- Movement Detection Utilities (Stateless Detection) --- 

/**
 * Calculates velocity between two hand positions over a time delta.
 * @param {Object | null} currentCenter - Current hand center {x,y,z} or null.
 * @param {Object | null} previousCenter - Previous hand center {x,y,z} or null.
 * @param {number} deltaTime - Time elapsed in milliseconds.
 * @return {Object} Velocity vector {x,y,z}. Returns {0,0,0} if inputs are invalid or deltaTime <= 0.
 */
export function calculateHandVelocity(currentCenter, previousCenter, deltaTime) {
  if (!currentCenter || !previousCenter || !deltaTime || deltaTime <= 0) {
    return { x: 0, y: 0, z: 0 };
  }
  
  return {
    x: (currentCenter.x - previousCenter.x) / deltaTime,
    y: (currentCenter.y - previousCenter.y) / deltaTime,
    z: (currentCenter.z - previousCenter.z) / deltaTime
  };
}

/**
 * Detects if hand velocity exceeds thresholds on specific axes (shake).
 * @param {Object} velocity - Velocity vector {x,y,z}.
 * @param {Object} thresholds - Threshold values {x,y,z}. 
 * @return {Object} Detected shakes {x: boolean, y: boolean, z: boolean}.
 */
export function detectShakeGesture(velocity, thresholds = { ...DEFAULT_SHAKE_THRESHOLDS }) {
  // Use the exported constant as the default if no thresholds are passed
  return {
    x: Math.abs(velocity.x) > thresholds.x,
    y: Math.abs(velocity.y) > thresholds.y,
    z: Math.abs(velocity.z) > thresholds.z
  };
}

/**
 * Detects various movement-based hand gestures (shake, quick move).
 * Pure function: Output depends only on input, no internal state (like cooldowns).
 * @param {Object | null} currentCenter - Current hand center {x,y,z} or null.
 * @param {Object | null} previousCenter - Previous hand center {x,y,z} or null.
 * @param {number} deltaTime - Time elapsed in milliseconds.
 * @param {Object} [options={}] - Detection options. 
 *   Example: { shakeThresholds: {x, y, z}, quickMoveThreshold: number }
 * @return {Object} Detected gestures. 
 *   Example: { shake: { x: boolean, y: boolean, z: boolean }, quickMove: boolean }
 */
export function detectMovementGestures(currentCenter, previousCenter, deltaTime, options = {}) {
  const gestures = {
    shake: { x: false, y: false, z: false },
    quickMove: false,
  };

  if (!currentCenter || !previousCenter || !deltaTime || deltaTime <= 0) {
    return gestures;
  }

  // 1. Calculate Velocity
  const velocity = calculateHandVelocity(currentCenter, previousCenter, deltaTime);

  // 2. Detect Shakes using provided or default thresholds
  // Use the exported constant as the fallback default if options.shakeThresholds isn't provided.
  const shakeThresholds = options.shakeThresholds || DEFAULT_SHAKE_THRESHOLDS;
  gestures.shake = detectShakeGesture(velocity, shakeThresholds);

  // 3. Detect Quick Move (Overall Speed)
  const speed = Math.sqrt(
    velocity.x * velocity.x +
    velocity.y * velocity.y +
    velocity.z * velocity.z
  );
  // Use provided or exported constant default for quick move
  gestures.quickMove = speed > (options.quickMoveThreshold || DEFAULT_QUICK_MOVE_THRESHOLD);
  
  return gestures;
}
