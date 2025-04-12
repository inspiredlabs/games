<script>
  // Draggable.svelte
  import { onMount } from 'svelte';

  // State variables
  let isGrabbed = false;
  let dragElement = null;
  let offsetX = 0;
  let offsetY = 0;
  let currentX = 0;
  let currentY = 0;
  let rafId = null;

  // Store reference to the element
  let asideElement;

  function handleMouseDown(event) {
    // Store the element reference
    dragElement = asideElement;
    isGrabbed = true;

    // Calculate offset within the element
    const rect = dragElement.getBoundingClientRect();
    offsetX = event.clientX - rect.left;
    offsetY = event.clientY - rect.top;

    // Set initial position
    dragElement.style.position = 'absolute';
    dragElement.style.top = `${rect.top}px`;
    dragElement.style.left = `${rect.left}px`;

    // Update initial tracking position
    currentX = event.clientX;
    currentY = event.clientY;

    // Start animation frame
    requestAnimationFrame(updatePosition);

    // Add document-level event listeners
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(event) {
    if (!isGrabbed) return;
    
    // Update tracking position
    currentX = event.clientX;
    currentY = event.clientY;
  }

  function updatePosition() {
    if (isGrabbed && dragElement) {
      // Update element position
      dragElement.style.top = `${currentY - offsetY}px`;
      dragElement.style.left = `${currentX - offsetX}px`;
      
      // Continue animation loop
      rafId = requestAnimationFrame(updatePosition);
    }
  }

  function handleMouseUp() {
    isGrabbed = false;
    
    // Cancel animation frame
    if (rafId) {
      cancelAnimationFrame(rafId);
      rafId = null;
    }
    
    // Clean up event listeners
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);
  }

  // Clean up on component destroy
  onMount(() => {
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  });
</script>

<aside 
  bind:this={asideElement}
  role="button" 
  aria-grabbed={isGrabbed} 
  class="move"
  on:mousedown={handleMouseDown}
>
  <slot/>
</aside>

<style>
  .move {
    cursor: move;
    background: gainsboro;
    width: 200px;
    padding: 1rem;
    position: relative; /* Start with relative positioning */
    user-select: none; /* Prevent text selection during drag */
  }
</style>
<!-- usage: claude.ai/chat/07438711-6d16-415a-8933-cd05e18428e3 -->