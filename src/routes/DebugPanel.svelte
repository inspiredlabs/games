<script>
// src/routes/DebugPanel.svelte
import { log } from '$lib/mediapipeService';

let {
  showDebug = $bindable(false),
  debugInfo = '',
  handDetectionStatus = '',
  handLandmarks = [],
  dividerPosition = 0,
  wandVisible = false,
  wandDebugInfo = ''
} = $props();

// Simplified status items
const debugItems = $derived([
  { 
    label: 'Status', 
    value: handDetectionStatus, 
    highlight: handLandmarks.length > 0 
  },
  { 
    label: 'Wand', 
    value: wandVisible ? 'Visible' : 'Hidden',
    highlight: wandVisible 
  },
  { 
    label: 'Wand Info', 
    value: wandDebugInfo || 'N/A' 
  },
  { 
    label: 'Divider Position', 
    value: `${dividerPosition}px` 
  },
  { 
    label: 'Hand Info', 
    value: debugInfo 
  }
]);

function closeDebug() {
  showDebug = false;
  log('Debug panel closed');
}

function formatFingerPosition(landmark) {
  if (!landmark) return 'N/A';
  return `(${(landmark.x * 100).toFixed(0)}%, ${(landmark.y * 100).toFixed(0)}%)`;
}
</script>

{#if showDebug}
  <div class="debug-panel">
    <div class="debug-header">
      <h3>Hand & Wand Detection Debug</h3>
      <button class="close-button" type="button" on:click={closeDebug}>×</button>
    </div>

    <div class="debug-content">
      {#each debugItems as item}
        <div class="debug-item">
          <div class="label">{item.label}:</div>
          <div class="value" class:highlight={item.highlight}>{item.value}</div>
        </div>
      {/each}

      <div class="debug-item" style="display:block; height: 3rem">
        {#if handLandmarks.length > 0}
          <div class="label">Finger Tips:</div>
          <div class="value small">
            {#if handLandmarks[0]}
              Thumb: {formatFingerPosition(handLandmarks[0][4])}<br>
              Index: {formatFingerPosition(handLandmarks[0][8])}<br>
              Middle: {formatFingerPosition(handLandmarks[0][12])}<br>
            {/if}
          </div>
        {:else}
          <div class="value small">No hand data available</div>
        {/if}
      </div>
    </div>
  </div>
{/if}

<style>
  .debug-panel {
    position: fixed;
    bottom: 80px;
    right: 20px;
    width: 300px;
    background-color: rgba(0, 0, 0, 0.8);
    color: white;
    border-radius: 10px;
    padding: 15px;
    z-index: 100;
    font-family: sans-serif;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.3);
    max-height: 80vh;
    overflow-y: auto;
  }

  .debug-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 15px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
    padding-bottom: 10px;
  }

  .debug-header h3 {
    margin: 0;
    font-size: 16px;
    font-weight: 500;
  }

  .close-button {
    background: none;
    border: none;
    color: white;
    font-size: 24px;
    cursor: pointer;
    padding: 0;
    margin: 0;
  }

  .debug-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .debug-item {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .label {
    font-size: 12px;
    color: rgba(255, 255, 255, 0.7);
  }

  .value {
    font-size: 14px;
    background-color: rgba(255, 255, 255, 0.1);
    padding: 8px 10px;
    border-radius: 4px;
    word-break: break-word;
  }

  .value.small {
    font-size: 12px;
    line-height: 1.4;
  }

  .highlight {
    background-color: rgba(0, 128, 0, 0.5);
  }
</style>