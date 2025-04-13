<script>
// src/routes/camera/Axe.svelte - Revised with explicit debugging
import * as THREE from 'three';

// Define props with default values
let { 
  scene,
  visible = false,
  position = { x: 0, y: 0, z: 0 },
  quaternion = { x: 0, y: 0, z: 0, w: 1 },
  scale = 1
} = $props();

// mesh reference
let accessory;

// --- Effect to Create/Destroy Mesh ---
$effect(() => {
  if (!scene) return;
  
  // Use a more descriptive log specific to this component instance
  console.log("[Axe Component] $effect: Creating mesh"); 
  
  // Axe handle (cylinder)
  const handleGeometry = new THREE.CylinderGeometry(0.05, 0.07, 3.5, 12);
  handleGeometry.translate(0, 1.5, 0); // Move pivot point to bottom of cylinder
  
  const handleMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B4513, // Brown color
    roughness: 0.9,
    metalness: 0.1
  });
  
  // Create the accessory mesh with handle
  accessory = new THREE.Mesh(handleGeometry, handleMaterial);
  
  // Create a simple accessory blade using a box with custom scaling
  const bladeGeometry = new THREE.BoxGeometry(1.2, 0.7, 0.1);
  const bladeMaterial = new THREE.MeshStandardMaterial({
    color: 0xCCCCCC, // Silver color
    roughness: 0.3,
    metalness: 0.9
  });
  
  const blade = new THREE.Mesh(bladeGeometry, bladeMaterial);
  blade.position.set(0, 3.0, 0); // Position at the top of the handle
  accessory.add(blade);
  
  // Set initial visibility
  accessory.visible = visible;

  
  // Initial visibility/position is handled by the update effect
  scene.add(accessory);
  console.log("[Axe Component] Added to scene");
  
  // Cleanup
  return () => {
    if (accessory) {
      console.log("[Axe Component] $effect cleanup: Removing from scene");
      scene.remove(accessory);
      
      // Dispose geometries and materials
      handleGeometry.dispose();
      handleMaterial.dispose();
      bladeGeometry.dispose();
      bladeMaterial.dispose();
      
      accessory = null;
    }
  };
});



// --- Combined Effect for All Properties ---
$effect(() => {
  if (!accessory) return;
  
  // Update visibility
  accessory.visible = visible;
  
  // Update position if provided
  if (position) {
    accessory.position.set(
      position.x || 0,
      position.y || 0,
      position.z || 0
    );
  }
  
  // Update quaternion if provided
  if (quaternion) {
    accessory.quaternion.set(
      quaternion.x || 0,
      quaternion.y || 0,
      quaternion.z || 0,
      quaternion.w !== undefined ? quaternion.w : 1
    );
  }
  
  // Update scale if provided
  if (scale !== null && scale !== undefined) {
    const scaleValue = typeof scale === 'number' ? scale : 1;
    accessory.scale.set(scaleValue, scaleValue, scaleValue);
  }
});
</script>