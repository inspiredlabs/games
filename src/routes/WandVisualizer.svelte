<script>
// src/routes/WandVisualizer.svelte
  import { onMount, onDestroy } from 'svelte';
  import { tweened } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  import { calculateHandCenter, calculateDistance } from '$lib/handGestureUtils';
  import * as THREE from 'three';

  // Hand Accesory imports
  import Wand from './Wand.svelte';
  import Sword from './Sword.svelte';

  // Hand Accesories Register
  const handAccessories = [
    { component: Wand, name: 'Wand' },
    { component: Sword, name: 'Sword' }
  ];
  let HandAccessory = $state(handAccessories[0].component);

  // Props
  let {
    videoElement = null,
    handCanvas = null,
    handLandmarks = [],
    dividerPosition = 0,
    debugInfo = $bindable(''),
    wandVisible = $bindable(false)
  } = $props();

  // Configuration state
  let fistThreshold = $state(0.15);
  let zScaleFactor = $state(1);
  let depthRange = $state({ min: 0, max: 1 });

  // Tweened stores for smooth motion
  const tweenDuration = 300; // milliseconds
  const wandPosition = tweened({ x: 0, y: 0, z: 0 }, { duration: tweenDuration, easing: cubicOut });
  const wandQuaternion = tweened(
    { x: 0, y: 0, z: 0, w: 1 },
    { duration: tweenDuration, easing: cubicOut }
  );
  const wandScale = tweened(1, { duration: tweenDuration, easing: cubicOut });

  // Hand state tracking
  let handState = $state('unknown');
  let stableHandState = $state('unknown');
  let stateCounter = $state(0);
  const STABILITY_THRESHOLD = 20;

  // Three.js objects
  let scene;
  let camera;
  let renderer;
  let threeContainer;
  let animationId;
  let isInitialized = $state(false);
  let sceneReady = $state(false);

  // Previous palm normal for stabilization
  let previousPalmNormal = $state(new THREE.Vector3(0, 0, 1));

  // Lifecycle hooks
  onMount(() => {
    setTimeout(initThreeJs, 1000);
  });

  onDestroy(() => {
    if (animationId) cancelAnimationFrame(animationId);
    if (renderer) renderer.dispose();
    window.removeEventListener('resize', handleResize);
  });

  // Initialize Three.js
  async function initThreeJs() {
    if (!threeContainer) return;

    scene = new THREE.Scene();

    // Add lights (moved from createWand)
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    scene.add(ambientLight);
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
    directionalLight.position.set(1, 1, 2);
    scene.add(directionalLight);

    camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.01, 1000);
    camera.position.z = 6; // Center of scene at approximate arm's length when player is 1.5m away
    camera.position.y = -0.5; // Slight downward adjustment

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: false });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);

    threeContainer.appendChild(renderer.domElement);
    Object.assign(renderer.domElement.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100%',
      height: '100%',
      zIndex: '6',
      pointerEvents: 'none',
      transform: 'scaleX(1)'
    });

    window.addEventListener('resize', handleResize);

    animate();
    isInitialized = true;
    sceneReady = true;
  }

  // Handle resize
  function handleResize() {
    if (!camera || !renderer) return;
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  // Animation loop
  function animate() {
    animationId = requestAnimationFrame(animate);
    updateWand();
    renderer.render(scene, camera);
  }

  // Update wand
  function updateWand() {
    if (!handLandmarks.length || !isInitialized) {
      hideWand();
      updateStableHandState('unknown');
      return;
    }

    handState = getHandStateWithThreshold(handLandmarks[0], fistThreshold);
    updateStableHandState(handState);

    if (stableHandState === 'fist') {
      showWand(handLandmarks[0]);
    } else {
      hideWand();
    }
  }

  // Update stable hand state
  function updateStableHandState(newState) {
    if (newState === stableHandState) {
      stateCounter = 0;
    } else {
      stateCounter++;
      if (stateCounter >= STABILITY_THRESHOLD) {
        stableHandState = newState;
        stateCounter = 0;
      }
    }
  }

  // Detect hand state
  function getHandStateWithThreshold(landmarks, threshold) {
    if (!landmarks || landmarks.length < 21) return 'unknown';

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
    if (avgDistance < threshold) return 'fist';
    if (avgDistance > threshold * 2) return 'palm';
    return 'unknown';
  }

  // Show wand with palm normal logic
  function showWand(landmarks) {
    const handCenter = calculateHandCenter(landmarks);

    const width = 10;
    const height = 10;

    // Position calculation
    const rawZ = handCenter.z;
    let scaledZ;
    if (rawZ >= 0) {
      scaledZ = Math.log(rawZ + 1) * zScaleFactor;
    } else {
      scaledZ = -Math.log(Math.abs(rawZ) + 1) * zScaleFactor;
    }

    const clampedZ = Math.max(depthRange.min, Math.min(depthRange.max, scaledZ));
    const targetX = (handCenter.x - 0.5) * width;
    const targetY = (0.5 - handCenter.y) * height;

    wandPosition.set({ x: targetX, y: targetY, z: clampedZ });

    // Map landmarks to 3D space
    function mapLandmarkTo3D(landmark) {
      const x = (landmark.x - 0.5) * width;
      const y = (0.5 - landmark.y) * height;
      const z = landmark.z * zScaleFactor; // Linear scaling for simplicity
      return new THREE.Vector3(x, y, z);
    }

    // Get 3D positions
    const wrist = landmarks[0];
    const indexMCP = landmarks[5];
    const pinkyMCP = landmarks[17];
    const middleTip = landmarks[12];

    const wrist3D = mapLandmarkTo3D(wrist);
    const indexMCP3D = mapLandmarkTo3D(indexMCP);
    const pinkyMCP3D = mapLandmarkTo3D(pinkyMCP);
    const middleTip3D = mapLandmarkTo3D(middleTip);

    // Calculate palm normal
    const v1 = indexMCP3D.clone().sub(wrist3D);
    const v2 = pinkyMCP3D.clone().sub(wrist3D);
    const palmNormalRaw = new THREE.Vector3().crossVectors(v1, v2);

    // Stabilize palm normal
    const threshold = 0.0001;
    let palmNormal;
    if (palmNormalRaw.lengthSq() < threshold) {
      palmNormal = previousPalmNormal.clone();
    } else {
      palmNormal = palmNormalRaw.normalize();
      if (previousPalmNormal.dot(palmNormal) < 0) {
        palmNormal.negate();
      }
    }
    previousPalmNormal = palmNormal.clone();

    // Calculate direction
    const dir = middleTip3D.clone().sub(wrist3D).normalize();

    // Calculate rotation
    const zAxis = palmNormal.clone().sub(dir.clone().multiplyScalar(palmNormal.dot(dir))).normalize();
    const xAxis = new THREE.Vector3().crossVectors(dir, zAxis).normalize();
    const rotationMatrix = new THREE.Matrix4().makeBasis(xAxis, dir, zAxis);
    const targetQuaternion = new THREE.Quaternion().setFromRotationMatrix(rotationMatrix);

    wandQuaternion.set({
      x: targetQuaternion.x,
      y: targetQuaternion.y,
      z: targetQuaternion.z,
      w: targetQuaternion.w
    });

    // Scale calculation
    const indexKnuckle = landmarks[5];
    const pinkyKnuckle = landmarks[17];
    const handWidth = calculateDistance(indexKnuckle, pinkyKnuckle);
    const scaleFactor = handWidth * 5.0 / (rawZ + 0.5);
    const clampedScale = Math.max(0.5, Math.min(3.0, scaleFactor));
    wandScale.set(clampedScale);

    // Show accessory
    wandVisible = true;

    // Debug info
    const handInfo = `
      Hand State: ${handState} (Stable: ${stableHandState})
      Position: (${targetX.toFixed(2)}, ${targetY.toFixed(2)}, ${clampedZ.toFixed(2)})
      Hand Width: ${handWidth.toFixed(4)}
      Scale: ${clampedScale.toFixed(2)}
    `.trim();
    debugInfo = handInfo;
  }

  // Hide wand
  function hideWand() {
    wandVisible = false;
  }

  // Handle accessory selection
  const selectHandAccessory = (e) => {
    const index = parseInt(e.target.value);
    HandAccessory = handAccessories[index].component;
  };
</script>

<div bind:this={threeContainer} class="threejs-container absolute top-0 left-0 w-100 vh-100 z-3"></div>

<!-- Previous syntax depricated, use this: -->
{#if sceneReady}
  {#key HandAccessory}
    <HandAccessory
      {scene}
      visible={wandVisible}
      position={$wandPosition}
      quaternion={$wandQuaternion}
      scale={$wandScale}
    />
  {/key}
{/if}


<select onchange={selectHandAccessory} class="select">
  {#each handAccessories as accessory, i}
    <option value={i} selected={HandAccessory === accessory.component}>
      {accessory.name}
    </option>
  {/each}
</select>

<style>
  .threejs-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  z-index: 3;
}

.select {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 999999;
}
</style>

<!-- usage: claude.ai/chat/a9eefa96-0418-4ed7-8033-fad561c69db1 -->
<!-- the struggle!: stackoverflow.com/questions/76538176/how-to-use-three-js-with-mediapipe-to-make-an-ar-web-app -->