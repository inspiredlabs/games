<script>
  // src/routes/Resizer.svelte
  import { onMount } from 'svelte';
  import { log } from '$lib/mediapipeService';
  
  export let onResize;
  
  let container;
  let leftPane;
  let rightPane;
  let resizer;
  
  let dragging = false;
  let startX;
  let paneWidths = {
    left: 0,
    right: 0
  };
  
  onMount(() => {
    // Set initial widths
    const containerWidth = container.offsetWidth;
    const initialLeftWidth = Math.floor(containerWidth / 2);
    
    // Apply styles
    leftPane.style.width = `${initialLeftWidth}px`;
    rightPane.style.width = `${containerWidth - initialLeftWidth}px`;
    resizer.style.left = `${initialLeftWidth - 5}px`;
    
    // Store pane widths
    paneWidths = {
      left: initialLeftWidth,
      right: containerWidth - initialLeftWidth
    };
    
    // Notify parent
    onResize?.({ detail: { dividerPosition: initialLeftWidth } });
    log(`Resizer initialized: ${initialLeftWidth}px`);
  });
  
  // Touch/mouse handlers as single functions
  function pointerstart(e) {
    startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    dragging = true;
    
    paneWidths = {
      left: leftPane.offsetWidth,
      right: rightPane.offsetWidth
    };
    
    document.body.style.cursor = 'col-resize';
    
    // Add global event listeners
    window.addEventListener('mousemove', pointermove);
    window.addEventListener('mouseup', pointerend);
    window.addEventListener('touchmove', pointermove, { passive: false });
    window.addEventListener('touchend', pointerend);
    
    e.preventDefault();
  }
  
  function pointermove(e) {
    if (!dragging) return;
    
    const clientX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
    const dx = clientX - startX;
    
    // Calculate new widths with min size constraint
    const newLeftWidth = Math.max(50, paneWidths.left + dx);
    const containerWidth = container.offsetWidth;
    const newRightWidth = Math.max(50, containerWidth - newLeftWidth);
    
    // Apply new dimensions
    leftPane.style.width = `${newLeftWidth}px`;
    rightPane.style.width = `${newRightWidth}px`;
    resizer.style.left = `${newLeftWidth - 5}px`;
    
    // Notify parent
    onResize?.({ detail: { dividerPosition: newLeftWidth } });
  }
  
  function pointerend() {
    dragging = false;
    document.body.style.cursor = 'default';
    
    // Remove global event listeners
    window.removeEventListener('mousemove', pointermove);
    window.removeEventListener('mouseup', pointerend);
    window.removeEventListener('touchmove', pointermove);
    window.removeEventListener('touchend', pointerend);
  }
  </script>
  
  <section bind:this={container} class="relative flex vh100">
    <div bind:this={leftPane} class="relative"></div>
    
    <div
      bind:this={resizer}
      class="resize-handle"
      role="slider"
      tabindex="0"
      aria-label="Column Resizer"
      aria-orientation="vertical"
      on:mousedown={pointerstart}
      on:touchstart={pointerstart}
    >
      <div class="resize-icon">
        <div style="transform: rotate(90deg)">⋮</div>
      </div>
    </div>
    
    <div bind:this={rightPane} class="relative"></div>
  </section>

<style>

.flex {display: flex;}
.vh100 {height: 100vh;}
.relative {position: relative;}

.resize-icon {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 24px;
  height: 24px;
  background-color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  z-index: 1000;
}

.resize-handle {
  position: absolute;
  background-color: rgba(255, 255, 255, 0.6);
  height: 100%;
  width: 20px; 
  z-index: 999;
  cursor: col-resize;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>