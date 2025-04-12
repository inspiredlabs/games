// lib/handGestureUtils.js
// Utility functions for hand gesture detection

import { log } from './mediapipeService';

/**
 * Calculate the Euclidean distance between two 3D points
 * @param {Object} point1 - First point with x, y, z coordinates
 * @param {Object} point2 - Second point with x, y, z coordinates
 * @returns {number} The distance between the two points
 */
export function calculateDistance(point1, point2) {
  return Math.sqrt(
    Math.pow(point2.x - point1.x, 2) +
    Math.pow(point2.y - point1.y, 2) +
    Math.pow(point2.z - point1.z, 2)
  );
}

/**
 * Determine the hand gesture state based on landmarks
 * @param {Array} landmarks - Array of hand landmarks from MediaPipe
 * @returns {string} The hand state: 'fist', 'palm', or 'unknown'
 */
export function getHandState(landmarks) {
  if (!landmarks || landmarks.length < 21) {
    return 'unknown';
  }
  
  const wrist = landmarks[0];
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  
  const distances = [
    calculateDistance(wrist, thumbTip),
    calculateDistance(wrist, indexTip),
    calculateDistance(wrist, middleTip),
    calculateDistance(wrist, ringTip),
    calculateDistance(wrist, pinkyTip)
  ];
  
  const avgDistance = distances.reduce((a, b) => a + b, 0) / distances.length;
  
  log(`Average fingertip distance: ${avgDistance.toFixed(3)}`);
  
  // These thresholds may need adjustment based on testing
  if (avgDistance < 0.15) return 'fist';
  if (avgDistance > 0.25) return 'palm';
  return 'unknown';
}

/**
 * Calculate the center point of a hand from landmarks
 * @param {Array} landmarks - Array of hand landmarks from MediaPipe
 * @returns {Object} The hand center point with x, y, z coordinates
 */
export function calculateHandCenter(landmarks) {
  let sumX = 0, sumY = 0, sumZ = 0;
  landmarks.forEach(lm => {
    sumX += lm.x;
    sumY += lm.y;
    sumZ += lm.z;
  });
  const count = landmarks.length;
  return { 
    x: sumX / count, 
    y: sumY / count, 
    z: sumZ / count 
  };
}

/**
 * Check if fingers are curled (useful for detailed gesture detection)
 * @param {Array} landmarks - Array of hand landmarks from MediaPipe
 * @returns {Object} Object with boolean values for each finger curl state
 */
export function checkFingerCurl(landmarks) {
  // Return early if we don't have enough landmarks
  if (!landmarks || landmarks.length < 21) {
    return {
      thumb: false,
      index: false,
      middle: false,
      ring: false,
      pinky: false
    };
  }
  
  // Get fingertips and joints
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const middleTip = landmarks[12];
  const ringTip = landmarks[16];
  const pinkyTip = landmarks[20];
  
  // Get base knuckles
  const thumbBase = landmarks[2];
  const indexBase = landmarks[5];
  const middleBase = landmarks[9];
  const ringBase = landmarks[13];
  const pinkyBase = landmarks[17];
  
  // Check curl by comparing distance from tip to base vs. expected distance when extended
  const thumbCurl = calculateDistance(thumbTip, thumbBase) < 0.08;
  const indexCurl = calculateDistance(indexTip, indexBase) < 0.12;
  const middleCurl = calculateDistance(middleTip, middleBase) < 0.12;
  const ringCurl = calculateDistance(ringTip, ringBase) < 0.12;
  const pinkyCurl = calculateDistance(pinkyTip, pinkyBase) < 0.12;
  
  return {
    thumb: thumbCurl,
    index: indexCurl,
    middle: middleCurl,
    ring: ringCurl,
    pinky: pinkyCurl
  };
}

/**
 * Get a more detailed description of the hand pose
 * @param {Array} landmarks - Array of hand landmarks from MediaPipe
 * @returns {string} Detailed hand pose description
 */
export function getDetailedHandPose(landmarks) {
  const fingerCurl = checkFingerCurl(landmarks);
  const allFingersCurled = Object.values(fingerCurl).every(curl => curl);
  const allFingersExtended = Object.values(fingerCurl).every(curl => !curl);
  
  if (allFingersCurled) return 'fist';
  if (allFingersExtended) return 'open_palm';
  
  // Pointing gesture (index extended, others curled)
  if (!fingerCurl.index && 
      fingerCurl.middle && 
      fingerCurl.ring && 
      fingerCurl.pinky) {
    return 'pointing';
  }
  
  // Peace sign (index and middle extended, others curled)
  if (!fingerCurl.index && 
      !fingerCurl.middle && 
      fingerCurl.ring && 
      fingerCurl.pinky) {
    return 'peace';
  }
  
  // Default to basic hand state
  return getHandState(landmarks);
}