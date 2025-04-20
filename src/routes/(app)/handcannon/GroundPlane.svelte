<script>
  // src/routes/(app)/camera/GroundPlane.svelte
  // A simple ground plane mesh for the 3D scene
  import * as THREE from 'three';
  
  // Define props with default values using the $props rune
  let { 
    scene,                              // THREE.Scene to add the plane to
    size = 10,                         // Size of the ground plane (width and depth)
    color = 0xf1f1f1,                   // Color of the ground plane
    receiveShadow = true,               // Whether the plane receives shadows
    position = [0, 0, 0],            // Position of the plane
    rotation = [-Math.PI / 2, 0, 0],    // Make it horizontal
    visible = true                      // Visibility flag
  } = $props();
  
  // Reference to the mesh object
  let groundPlane;
  
  // Create and add the ground plane to the scene
  $effect(() => {
    if (!scene) return;
    
    console.log("[GroundPlane] Creating ground plane...");
    
    // Create a plane geometry (width, height, widthSegments, heightSegments)
    const geometry = new THREE.PlaneGeometry(size, size, 1, 1);
    
    // Create a material (use MeshStandardMaterial for better lighting)
    const material = new THREE.MeshStandardMaterial({
      color: color,
      roughness: 0.8,
      metalness: 0.2,
      transparent: true,
      opacity: 0.8
    });
    
    // Create the mesh
    groundPlane = new THREE.Mesh(geometry, material);
    
    // Apply properties
    groundPlane.receiveShadow = receiveShadow;
    groundPlane.position.set(...position);
    groundPlane.rotation.set(...rotation);
    groundPlane.visible = visible;
    
    // Add to scene
    scene.add(groundPlane);
    console.log("[GroundPlane] Added to scene");
    
    // Return cleanup function
    return () => {
      if (groundPlane) {
        console.log("[GroundPlane] Removing from scene");
        scene.remove(groundPlane);
        geometry.dispose();
        material.dispose();
        groundPlane = null;
      }
    };
  });
  
  // Update properties when they change
  $effect(() => {
    if (!groundPlane) return;
    
    // Update position if it changes
    groundPlane.position.set(...position);
    
    // Update rotation if it changes
    groundPlane.rotation.set(...rotation);
    
    // Update visibility
    groundPlane.visible = visible;
  });
  </script>