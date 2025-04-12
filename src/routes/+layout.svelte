<script>
// src/routes/+layout.svelte
// This component provides the global layout and styles
</script>

<slot />

<style>
  /* Global reset and base styles */
  :global(body) {
    margin: 0;
    overflow: hidden;
    height: 100vh;
    width: 100vw;
  }

  :global(*, *::before, *::after) {
    box-sizing: border-box;
  }

  /* Common utility classes */
  :global(.absolute) { position: absolute; }
  :global(.relative) { position: relative; }
  :global(.flex) { display: flex; }
  :global(.items-center) { align-items: center; }
  :global(.justify-center) { justify-content: center; }
  :global(.top-0) { top: 0; }
  :global(.left-0) { left: 0; }
  :global(.vh-100) { height: 100vh; }
  :global(.w-100) { width: 100%; }
  :global(.h-100) { height: 100%; }
  :global(.z-2) { z-index: 2; }
  :global(.z-3) { z-index: 3; }
  :global(.bg-white-60) { background-color: rgba(255, 255, 255, 0.6); }
  
  /* Common component styles */
  :global(.video-container) {
    overflow: hidden;
  }
  
  :global(.object-cover) {
    object-fit: cover;
  }
  
  :global(.grayscale-overlay) {
    background: transparent;
    backdrop-filter: grayscale(1) brightness(1) contrast(0.8) saturate(0);
    -webkit-backdrop-filter: grayscale(1) brightness(1) contrast(0.8) saturate(0);
  }
  
  :global(.col-resize) {
    cursor: col-resize;
  }
</style>