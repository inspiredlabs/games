<script>
// src/routes/+page.svelte
import { onMount } from 'svelte';
import { log } from '$lib/mediapipeService';
import VideoDisplay from './VideoDisplay.svelte';
import HandTracker from './HandTracker.svelte';
import FpsCounter from '$lib/FpsCounter.svelte';
import Resizer from './Resizer.svelte';
import DebugPanel from './DebugPanel.svelte';
import WandVisualizer from './WandVisualizer.svelte'; 

// Use $state for reactive state in Svelte 5
let videoElement = $state(null);
let handCanvas = $state(null);
let canvasCtx = $state(null);
let handLandmarks = $state([]);
let dividerPosition = $state(0);
let showDebug = $state(false);
let debugInfo = $state('');
let handDetectionStatus = $state('');
let handFound = $state(false);
let videoWidth = $state(0);
let videoHeight = $state(0);
let appReady = $state(false);
let wandVisible = $state(false);
let wandDebugInfo = $state('');
let videoDisplay = $state(null);
let handTracker = $state(null);
let wandVisualizer = $state(null);


onMount(() => {
  setTimeout(() => {
    appReady = true;
    log("App ready");
  }, 1000);
});

$effect(() => {
  if (videoElement?.videoWidth) {
    videoWidth = videoElement.videoWidth;
    videoHeight = videoElement.videoHeight;
    log(`Video dimensions: ${videoWidth}x${videoHeight}`);
  }
});

function toggleDebug() {
  showDebug = !showDebug;
  log(`Debug panel ${showDebug ? 'shown' : 'hidden'}`);
}

function handleResize(event) {
  dividerPosition = event.detail.dividerPosition;
  log(`Divider position: ${dividerPosition}px`);
}
</script>

{#if appReady}
  <VideoDisplay 
    bind:this={videoDisplay} 
    bind:videoElement 
    bind:handCanvas 
    bind:canvasCtx 
    {dividerPosition} 
  />
  <!-- see: REPL  -->
  <FpsCounter />
  
  <Resizer onResize={handleResize} />
  
  <HandTracker
    bind:this={handTracker}
    {videoElement}
    {handCanvas}
    {canvasCtx}
    {dividerPosition}
    bind:handLandmarks
    bind:debugInfo
    bind:handDetectionStatus
    bind:handFound
  />
  
  <WandVisualizer
    bind:this={wandVisualizer}
    videoElement={videoElement}
    handCanvas={handCanvas}
    handLandmarks={handLandmarks}
    dividerPosition={dividerPosition}
    bind:debugInfo={wandDebugInfo}
    bind:wandVisible={wandVisible}
  />
  
  <button class="status-button" type="button" on:click={toggleDebug}>
    <span>
      {
        handFound ? 
          wandVisible ? '✨' : '👋'
        : '🔍'
      }
    </span>
  </button>
  
  {#if showDebug}
    <DebugPanel
      showDebug={showDebug}
      debugInfo={debugInfo}
      handDetectionStatus={handDetectionStatus}
      handLandmarks={handLandmarks}
      dividerPosition={dividerPosition}
      videoWidth={videoWidth}
      videoHeight={videoHeight}
      wandVisible={wandVisible}
      wandDebugInfo={wandDebugInfo}
    />
  {/if}
{:else}
  <div class="loading-screen">
    <div class="loading-spinner"></div>
    <div class="loading-text">Loading camera and hand tracking...</div>
  </div>
{/if}

<style>
  .status-button {
    position: fixed;
    bottom: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    border-radius: 50%;
    background-color: rgba(0, 0, 0, 0.7);
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 24px;
    cursor: pointer;
    z-index: 100;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3);
    user-select: none;
    border: none;
  }

  .status-button:hover {
    background-color: rgba(0, 0, 0, 0.9);
  }

  .loading-screen {
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    background-color: #f5f5f5;
    z-index: 1000;
  }

  .loading-spinner {
    width: 50px;
    height: 50px;
    border: 5px solid rgba(0, 0, 0, 0.1);
    border-radius: 50%;
    border-top-color: #3498db;
    animation: spin 1s ease-in-out infinite;
    margin-bottom: 20px;
  }

  .loading-text {
    font-family: sans-serif;
    font-size: 18px;
    color: #333;
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }
</style>