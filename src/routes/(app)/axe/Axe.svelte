<script>
  // src/routes/Axe.svelte
  import * as THREE from 'three';
  
  // Define props with defaults
  let { 
    scene,
    visible = false,
    position = null,
    quaternion = null,
    scale = 1
  } = $props();
  
  // Axe mesh reference
  let axe;
  
  // Create and manage the axe mesh
  $effect(() => {
    if (!scene) return;
    
    console.log("[Axe] Creating axe mesh");
    
    // Axe handle (cylinder)
    const handleGeometry = new THREE.CylinderGeometry(0.05, 0.07, 3.5, 12);
    handleGeometry.translate(0, 1.5, 0); // Move pivot point to bottom of cylinder
    
    const handleMaterial = new THREE.MeshStandardMaterial({
      color: 0x8B4513, // Brown color
      roughness: 0.9,
      metalness: 0.1
    });
    
    // Create the axe mesh with handle
    axe = new THREE.Mesh(handleGeometry, handleMaterial);
    
    // Create a simple axe blade using a box with custom scaling
    const bladeGeometry = new THREE.BoxGeometry(1.2, 0.7, 0.1);
    const bladeMaterial = new THREE.MeshStandardMaterial({
      color: 0xCCCCCC, // Silver color
      roughness: 0.3,
      metalness: 0.9
    });
    
    const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
    blade.position.set(0, 3.0, 0); // Position at the top of the handle
    axe.add(blade);
    
    // Set initial visibility
    axe.visible = visible;
    
    // Add to scene
    scene.add(axe);
    console.log("[Axe] Added to scene");
    
    // Cleanup function
    return () => {
      if (axe) {
        console.log("[Axe] Removing from scene");
        scene.remove(axe);
        
        // Dispose geometries and materials
        handleGeometry.dispose();
        handleMaterial.dispose();
        bladeGeometry.dispose();
        bladeMaterial.dispose();
        
        axe = null;
      }
    };
  });
  
  // Reactively update axe properties
  $effect(() => {
    if (!axe) return;
    
    // Update visibility
    axe.visible = visible;
    
    // Update position if provided
    if (position) {
      axe.position.set(
        position.x || 0, 
        position.y || 0, 
        position.z || 0
      );
    }
    
    // Update rotation if quaternion provided
    if (quaternion) {
      axe.quaternion.set(
        quaternion.x || 0, 
        quaternion.y || 0, 
        quaternion.z || 0, 
        quaternion.w !== undefined ? quaternion.w : 1
      );
    }
    
    // Update scale (uniform scaling)
    const scaleValue = typeof scale === 'number' ? scale : 1;
    axe.scale.set(scaleValue, scaleValue, scaleValue);
  });
</script>