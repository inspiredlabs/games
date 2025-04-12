<script>
  // lib/ThreeScene.svelte
  import * as THREE from 'three';
  import { browser } from '$app/environment'; // Import browser check

  // --- Props ---
  let {
    leftPane, // DOM element where canvas will be appended
    onReady = (payload) => {}, // Callback when scene is ready
    onDestroy = () => {} // Callback when scene is destroyed - fixed naming
  } = $props();

  // --- Internal State ---
  let localScene;
  let localCamera;
  let localRenderer;
  let animationFrameId;
  let cleanup = () => {}; // Cleanup function
  
  // Initialize Three.js when mounted (browser-only)
  $effect.pre(() => {
    if (!browser || !leftPane) return;
    
    console.log("[ThreeScene] Initializing in $effect.pre");
    
    // Create scene
    localScene = new THREE.Scene();
    
    // Add a grid for visibility debugging
    const gridHelper = new THREE.GridHelper(10, 10, 0xffffff, 0x444444);
    localScene.add(gridHelper);
    
    // Add lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    localScene.add(ambientLight);
    
    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 10, 7.5);
    localScene.add(directionalLight);

    // Create a debug cube that will animate
    const cubeGeometry = new THREE.BoxGeometry(1, 1, 1);
    const cubeMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x00ff00, // Bright green
      roughness: 0.7,
      metalness: 0.3
    });
    const cube = new THREE.Mesh(cubeGeometry, cubeMaterial);
    cube.position.set(-0.81, -1.50, -0.13); // I can see this, so why can't I see the hand?
    localScene.add(cube);
    
    // Create camera
    localCamera = new THREE.PerspectiveCamera(
      75, 
      leftPane.offsetWidth / leftPane.offsetHeight, 
      0.1, 
      1000
    );
    localCamera.position.set(0, 1.6, 5);
    localCamera.lookAt(0, 0, 0);
    
    // Create renderer with magenta background for debugging
    localRenderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true 
    });
    localRenderer.setSize(leftPane.offsetWidth, leftPane.offsetHeight);
    localRenderer.setClearColor(0xFF00FF, 0.6); // Brighter magenta with higher opacity
    
    // Clear leftPane
    leftPane.innerHTML = '';
    
    // Style and append canvas
    const canvas = localRenderer.domElement;
    
    // ** CRITICAL STYLE CHANGES to `leftPane` **
    Object.assign(canvas.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      width: '100vw',      // Use viewport width
      height: '100vh',     // Use viewport height
      pointerEvents: 'none',
      // Remove background color if you want transparency
      backgroundColor: 'rgba(255, 0, 255, 0.2)', // Remove when we add an environment
    });
    
    // Append to DOM
    leftPane.appendChild(canvas);
    
    // Notify parent component
    onReady({
      scene: localScene,
      camera: localCamera,
      renderer: localRenderer
    });
    
    // Animation variables
    let lastTime = 0;
    
    // Animation function
    function animate(time) {
      if (!localScene || !localCamera || !localRenderer) return;
      
      // Calculate delta time
      const delta = (time - lastTime) / 1000;
      lastTime = time;
      
      // Animate cube
      const cube = localScene.getObjectByProperty('type', 'Mesh');
      if (cube) {
        cube.rotation.x += 0.5 * delta;
        cube.rotation.y += 0.7 * delta;
      }
      
      // Render scene
      localRenderer.render(localScene, localCamera);
      
      // Continue animation
      animationFrameId = requestAnimationFrame(animate);
    }
    
    // Start animation
    animationFrameId = requestAnimationFrame(animate);
    
    // Handle resize
    function handleResize() {
      if (!leftPane || !localCamera || !localRenderer) return;
      
      // Update camera
      localCamera.aspect = window.innerWidth / window.innerHeight;
      localCamera.updateProjectionMatrix();
      
      // Update renderer
      localRenderer.setSize(window.innerWidth, window.innerHeight);
    }
    
    
    // Add resize listener
    window.addEventListener('resize', handleResize);
    
    // Assign cleanup function
    cleanup = () => {
      console.log("[ThreeScene] Cleaning up");
      
      // Stop animation
      if (animationFrameId) {
        cancelAnimationFrame(animationFrameId);
        animationFrameId = null;
      }
      
      // Remove resize listener
      window.removeEventListener('resize', handleResize);
      
      // Notify parent component - FIXED: use onDestroy instead of destroyCallback
      onDestroy();
      
      // Cleanup scene
      if (localScene) {
        localScene.traverse((object) => {
          if (object.geometry) object.geometry.dispose();
          
          if (object.material) {
            if (Array.isArray(object.material)) {
              object.material.forEach((material) => material.dispose());
            } else {
              object.material.dispose();
            }
          }
        });
      }
      
      // Dispose renderer
      if (localRenderer) {
        localRenderer.dispose();
      }
      
      // Clear references
      localScene = null;
      localCamera = null;
      localRenderer = null;
    };
  });
</script>