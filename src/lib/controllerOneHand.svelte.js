/* HOW TO USE THIS COMPONENT:
	// In your main app or parent component
	import { setContext } from 'svelte';
	// Assuming you have a controller instance
	const controller = createOneHandController();
	// Set the controller in context
	setContext('controller', controller);
	// In your debug component
	import { getContext } from 'svelte';
	// Get the controller from context
	const controller = getContext('controller');
	// Access debug state
	console.log(controller.debugState);
*/

/* HOW TO CLONE AND START A NEW CONTROLLER
* Add an overview description
* consider both hand states when determining derived properties
* Processing both hands and their relationship to each other:
* const leftHandLandmarks = landmarks[0];
* const rightHandLandmarks = landmarks[1];

function calculateTransformForHand(landmarks, handSide) {
	// Similar to original but 
	// adapted for each hand
	// and their relationship to each other
	// like distance apart for bike handle bars
	// perplexity.ai/search/i-want-to-annotate-a-javascrip-iL7ymk5PTN.Sjf8z5dYNIg
} */

/*
* About `$lib/controllerOneHand.svelte.js`

* @typedef {Object} DebugState
* @property {string} controllerType
* @property {string} stableState
* @property {number} avgDistance
* @property {boolean} isTracking
* @property {{x: number, y: number, z: number}} targetPosition
* @property {number} currentScale
* @property {string} message

* In terms of HID (human interface device), this is only for a single object with a handle and only works with one hand.
* Examples: `Wand`, `Sword`, `Axe`.

* It is a stateful module factory. It uses functions from handGestureUtils.js but adds the crucial layers of:
* 	State Management: Tracking stableHandState, stateCounter.
* 	Configuration: fistThreshold, zScaleFactor, depthRange, stabilityThreshold.
* 	Smoothing/Interpolation: Using Tween for position, quaternion, scale.
* 	Derived Logic: Determining visible based on stableHandState.
* 	Encapsulated Logic: Bundling the specific steps to calculate accessory transforms based on the one-handed fist interaction model.
* Integration:
* 	This component uses context to make the active controller instance itself available globally.
* 	The debug component will then read the reactive debug state directly from the controller instance found in the context.
*/

// src/lib/controllerOneHand.svelte.js
// src/lib/controllerOneHand.svelte.js
// Based on the improved logic from WandVisualizer.svelte test case
// FIX: Convert THREE.Quaternion to plain object for tweening
// src/lib/controllerOneHand.svelte.js
// REVERTED: Controller calculates TARGET values and exposes them via $state.

// src/lib/controllerOneHand.svelte.js
import {
	calculateHandCenter,
	calculateDistance
} from '$lib/handGestureUtils.js';
import * as THREE from 'three';

// Default configurations
const DEFAULT_FIST_THRESHOLD = 0.15;
const DEFAULT_Z_SCALE_FACTOR = 1;
const DEFAULT_DEPTH_RANGE = { min: -5, max: 5 };
const DEFAULT_STABILITY_THRESHOLD = 5;
const MAP_WIDTH = 10;
const MAP_HEIGHT = 10;
const SCALE_FACTOR_MULTIPLIER = 5.0;
const SCALE_OFFSET = 0.5;
const MIN_SCALE = 0.5;
const MAX_SCALE = 3.0;
const PALM_NORMAL_STABILIZATION_THRESHOLD = 0.0001;

export function createOneHandController(options = {}) {
  console.log('[Controller] Creating controller with options:', options);

  // --- Configuration ---
  let fistThreshold = $state(options.fistThreshold ?? DEFAULT_FIST_THRESHOLD);
  let zScaleFactor = $state(options.zScaleFactor ?? DEFAULT_Z_SCALE_FACTOR);
  let depthRange = $state(options.depthRange ?? DEFAULT_DEPTH_RANGE);
  let stabilityThreshold = $state(options.stabilityThreshold ?? DEFAULT_STABILITY_THRESHOLD);

  // --- Reactive Outputs as plain $state ---
  let position = $state({ x: 0, y: 1, z: 0 });
  let quaternion = $state({ x: 0, y: 0, z: 0, w: 1 });
  let scale = $state(1);
  let visible = $state(false);

  // --- Debug State ---
  let debugState = $state({
    controllerType: 'OneHandController',
    stableState: 'unknown',
    avgDistance: 0,
    isTracking: false,
    targetPosition: { x: 0, y: 1, z: 0 },
    targetScale: 1,
    message: 'Initializing...'
  });

  // --- Internal State ---
  let currentHandState = 'unknown';
  let stateCounter = 0;
  let previousPalmNormal = new THREE.Vector3(0, 0, 1);

  // --- THREE Helpers ---
  const _vec1 = new THREE.Vector3(), _vec2 = new THREE.Vector3(), _vec3 = new THREE.Vector3();
  const _palmNormalRaw = new THREE.Vector3(), _palmNormal = new THREE.Vector3();
  const _dir = new THREE.Vector3(), _xAxis = new THREE.Vector3(), _zAxis = new THREE.Vector3();
  const _mat4 = new THREE.Matrix4(), _quat = new THREE.Quaternion();

  // --- Core Logic ---
  let stableHandState = $derived(debugState.stableState);

  function updateStableState(newState) {
    if (newState === debugState.stableState) stateCounter = 0;
    else {
      stateCounter++;
      if (stateCounter >= stabilityThreshold) {
        debugState.stableState = newState;
        stateCounter = 0;
      }
    }
  }

  function getHandStateBasedOnDistance(landmarks, threshold) {
    if (!landmarks || landmarks.length < 21) return 'unknown';
    const wrist = landmarks[0];
    const tipIndices = [4, 8, 12, 16, 20];
    let totalDistance = 0, validCount = 0;
    
    for (const index of tipIndices) {
      if (landmarks[index]) {
        if (wrist && landmarks[index]) {
          totalDistance += calculateDistance(wrist, landmarks[index]);
          validCount++;
        }
      }
    }
    
    if (validCount === 0) return 'unknown';
    const avgDistance = totalDistance / validCount;
    
    debugState.avgDistance = avgDistance;
    
    if (avgDistance < threshold) return 'fist';
    if (avgDistance > threshold * 1.8) return 'palm';
    return 'unknown';
  }

  function mapLandmarkToInternal3D(landmark, target = new THREE.Vector3()) {
    if (!landmark) return target.set(0, 0, 0);
    target.x = (landmark.x - 0.5) * MAP_WIDTH;
    target.y = (0.5 - landmark.y) * MAP_HEIGHT;
    target.z = landmark.z * 1;
    return target;
  }

  // --- Calculate Transform (Updates internal $state values) ---
  function calculateTransform(landmarks) {
    const handCenter = calculateHandCenter(landmarks);
    
    if (!handCenter || landmarks.length < 21 || !landmarks[0] || !landmarks[5] || !landmarks[17] || !landmarks[12]) return;
    
    const rawZ = handCenter.z;
    let scaledZ;
    const epsilon = 1e-6;
    
    if (rawZ >= 0) 
      scaledZ = Math.log(rawZ + 1 + epsilon) * zScaleFactor;
    else 
      scaledZ = -Math.log(Math.abs(rawZ) + 1 + epsilon) * zScaleFactor;
    
    const targetZ = Math.max(depthRange.min, Math.min(depthRange.max, scaledZ));
    const targetX = (handCenter.x - 0.5) * MAP_WIDTH;
    const targetY = (0.5 - handCenter.y) * MAP_HEIGHT;
    
    const finalPos = {
      x: !isNaN(targetX) ? targetX : 0,
      y: !isNaN(targetY) ? targetY : 0,
      z: !isNaN(targetZ) ? targetZ : 0
    };
    
    // Update position $state
    position = finalPos;
    debugState.targetPosition = finalPos;
    
    // Calculate orientation
    const wrist3D = mapLandmarkToInternal3D(landmarks[0], _vec1);
    const indexMCP3D = mapLandmarkToInternal3D(landmarks[5], _vec2);
    const pinkyMCP3D = mapLandmarkToInternal3D(landmarks[17], _vec3);
    const middleTip3D = mapLandmarkToInternal3D(landmarks[12], _dir);
    
    _vec1.subVectors(indexMCP3D, wrist3D);
    _vec2.subVectors(pinkyMCP3D, wrist3D);
    _palmNormalRaw.crossVectors(_vec1, _vec2);
    
    if (_palmNormalRaw.lengthSq() < PALM_NORMAL_STABILIZATION_THRESHOLD) {
      _palmNormal.copy(previousPalmNormal);
    } else {
      _palmNormal.copy(_palmNormalRaw).normalize();
      if (previousPalmNormal.dot(_palmNormal) < 0) _palmNormal.negate();
    }
    previousPalmNormal.copy(_palmNormal);
    
    _dir.subVectors(middleTip3D, wrist3D).normalize();
    _zAxis.copy(_palmNormal).projectOnPlane(_dir).normalize();
    _xAxis.crossVectors(_dir, _zAxis).normalize();
    
    if (_xAxis.lengthSq() > 0.1 && _dir.lengthSq() > 0.1 && _zAxis.lengthSq() > 0.1) {
      _mat4.makeBasis(_xAxis, _dir, _zAxis);
      _quat.setFromRotationMatrix(_mat4);

			 // -- TEMPORARY FIX --
			 // Flip the accessory by rotating 180 degrees around X axis
			const flipQuat = new THREE.Quaternion().setFromAxisAngle(
				new THREE.Vector3(1, 0, 0), // X axis
				Math.PI // 180 degrees in radians
			);
			_quat.multiply(flipQuat);
			// -- TEMPORARY FIX --
      
      // Update quaternion $state
      quaternion = {
        x: _quat.x,
        y: _quat.y,
        z: _quat.z,
        w: _quat.w
      };
    }
    
    // Calculate scale
    const handWidth = calculateDistance(landmarks[5], landmarks[17]);
    const scaleDenominator = Math.max(0.01, rawZ + SCALE_OFFSET);
    const scaleFactor = (handWidth * SCALE_FACTOR_MULTIPLIER) / scaleDenominator;
    const clampedScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, scaleFactor));
    
    // Update scale $state
    scale = clampedScale;
    debugState.targetScale = clampedScale;
  }

  // --- Public Update Method ---
  function update(multiHandLandmarks) {
    const currentLandmarks = multiHandLandmarks?.[0];
    if (!currentLandmarks || currentLandmarks.length < 21) {
      if (visible) visible = false;
      updateStableState('unknown');
      debugState.isTracking = false;
      debugState.avgDistance = 0;
      debugState.message = 'No hand detected';
      return;
    }
    
    const currentState = getHandStateBasedOnDistance(currentLandmarks, fistThreshold);
    updateStableState(currentState);
    
    if (stableHandState === 'fist') {
      calculateTransform(currentLandmarks);
      if (!visible) visible = true;
      if (!debugState.isTracking) debugState.isTracking = true;
      debugState.message = 'Tracking (Fist)';
    } else {
      if (visible) visible = false;
      if (debugState.isTracking) debugState.isTracking = false;
      debugState.message = `Not Tracking State: ${stableHandState}`;
    }
  }

  // --- Return Controller API ---
  console.log('[Controller] Initialization complete');
  
  return {
    // Direct access to state variables with getters
    get position() { return position; },
    get quaternion() { return quaternion; },
    get scale() { return scale; },
    get visible() { return visible; },
    get stableHandState() { return stableHandState; },
    get debugState() { return debugState; },
    update,
    setFistThreshold: (val) => { if (typeof val === 'number') fistThreshold = val; },
    setZScaleFactor: (val) => { if (typeof val === 'number') zScaleFactor = val; },
    setDepthRange: (val) => { if (val && typeof val.min === 'number' && typeof val.max === 'number') depthRange = val; },
    setStabilityThreshold: (val) => { if (typeof val === 'number' && val > 0) stabilityThreshold = val; },
  };
}