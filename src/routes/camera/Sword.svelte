<script>
// src/routes/camera/Sword.svelte - Revised with explicit debugging
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
  console.log("[Sword Component] $effect: Creating mesh"); 
  
  // Create accessory blade (metallic cylinder)
  const bladeGeometry = new THREE.CylinderGeometry(0.075, 0.03, 4.0, 16);
  bladeGeometry.translate(0, 2, 0); // Move pivot point to bottom of cylinder
  
  const bladeMaterial = new THREE.MeshStandardMaterial({ 
    color: 0xCCCCCC, // Silver color
    roughness: 0.3, 
    metalness: 0.9
  });
  
  // Create the accessory mesh
  accessory = new THREE.Mesh(bladeGeometry, bladeMaterial);
  
  // Add a guard (cross guard)
  const guardGeometry = new THREE.BoxGeometry(0.8, 0.1, 0.1);
  const guardMaterial = new THREE.MeshStandardMaterial({
    color: 0x8B4513, // Brown color
    roughness: 0.7,
    metalness: 0.3
  });
  
  const guard = new THREE.Mesh(guardGeometry, guardMaterial);
  guard.position.set(0, 0.1, 0); // Position at the bottom of the blade
  accessory.add(guard);
  
  // Add a handle
  const handleGeometry = new THREE.CylinderGeometry(0.06, 0.08, 0.8, 16);
  handleGeometry.translate(0, -0.4, 0); // Position below the guard
  
  const handleMaterial = new THREE.MeshStandardMaterial({
    color: 0x5D4037, // Dark brown
    roughness: 0.9,
    metalness: 0.1
  });
  
  const handle = new THREE.Mesh(handleGeometry, handleMaterial);
  accessory.add(handle);
  
  // Add a pommel (bottom of handle)
  const pommelGeometry = new THREE.SphereGeometry(0.1, 16, 16);
  const pommelMaterial = new THREE.MeshStandardMaterial({
    color: 0xB5A642, // Brass color
    roughness: 0.3,
    metalness: 0.8
  });
  
  const pommel = new THREE.Mesh(pommelGeometry, pommelMaterial);
  pommel.position.set(0, -0.8, 0); // Position at bottom of handle
  accessory.add(pommel);
  
  // Set initial visibility
  accessory.visible = visible;
  
  // Initial visibility/position is handled by the update effect
  scene.add(accessory);
  console.log("[Sword Component] Added to scene");
  
  // Cleanup
  return () => {
    if (accessory) {
      console.log("[Sword Component] $effect cleanup: Removing from scene");
      scene.remove(accessory);

      // Dispose geometries and materials
      bladeGeometry.dispose();
      bladeMaterial.dispose();
      guardGeometry.dispose();
      guardMaterial.dispose();
      handleGeometry.dispose();
      handleMaterial.dispose();
      pommelGeometry.dispose();
      pommelMaterial.dispose();

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