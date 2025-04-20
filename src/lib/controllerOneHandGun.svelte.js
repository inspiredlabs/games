// src/lib/controllerOneHandGun.svelte.js
import {
	calculateHandCenter,
	calculateDistance
} from '$lib/handGestureUtils.js';
import * as THREE from 'three';

// Default configurations
// Depth variation explained: 
const SIZE = 25;
const DEFAULT_FIST_THRESHOLD = 0.31;  // Detection threshold
const DEFAULT_Z_SCALE_FACTOR = SIZE;     // Increased for better depth mapping
const DEFAULT_DEPTH_RANGE = { min: -(SIZE*2), max: (SIZE*2) };  // Map large world
const DEFAULT_STABILITY_THRESHOLD = 30;  // Slightly more responsive
const MAP_WIDTH = (SIZE * 0.25);    // Increased to match ground scale
const MAP_HEIGHT = (SIZE * 0.25);   // Increased to match ground scale
const SCALE_FACTOR_MULTIPLIER = 1.0;  // Keep consistent scale
const SCALE_OFFSET = 1.0;  // Prevent excessive scaling at distance
const MIN_SCALE = 0.05;    // Smaller for minimum scale
const MAX_SCALE = SIZE;    // Maximum (5x) for close objects
const PALM_NORMAL_STABILIZATION_THRESHOLD = 0.1;  // Better stabilization

// Gun Shooting Mechanism:
let previousHandCenterPosition = { x: 0, y: 0, z: 0 };
let currentVelocity = { x: 0, y: 0, z: 0 };
let lastShootTime = 0;
const SHOOT_COOLDOWN = 300; // ms between shots
const SHAKE_THRESHOLD = 0.02; // Adjust based on testing


export function createOneHandController(options = {}) {
  // console.log('[Controller] Creating controller with options:', options); // Suppress log

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
    target.z = landmark.z * 1.0;
    return target;
  }

  // --- Calculate Transform (Updates internal $state values) ---
  function calculateTransform(landmarks) {
    const handCenter = calculateHandCenter(landmarks);
    
    if (!handCenter || landmarks.length < 21 || !landmarks[0] || !landmarks[5] || !landmarks[17] || !landmarks[12]) return;

    

    // Turn the hand accessory:    
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
    // console.log('>>> [Controller] update() called', multiHandLandmarks); // REMOVED LOG
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
  // console.log('[Controller] Initialization complete'); // Suppress log
  
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
