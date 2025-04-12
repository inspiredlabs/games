<script>
// src/routes/Sword.svelte
import * as THREE from 'three';

// Define props
let { scene, visible, position, quaternion, scale } = $props();

let sword;

// Create and manage the sword mesh
$effect(() => {
  if (!scene) return;

  // Sword blade (box)
  
  const bladeGeometry = new THREE.CylinderGeometry(0.1, 0.1, 6.0, 16);
  bladeGeometry.translate(0, 2, 0);

  const bladeMaterial = new THREE.MeshStandardMaterial({ color: 0xAAAAAA });
  sword = new THREE.Mesh(bladeGeometry, bladeMaterial);

  /* Optional: Add a hilt
  const hiltGeometry = new THREE.BoxGeometry(0.2, 0.05, 0.3);
  const hiltMaterial = new THREE.MeshStandardMaterial({ color: 0x666666 });
  const hilt = new THREE.Mesh(hiltGeometry, hiltMaterial);
  hilt.position.z = -1.15; // Position hilt at the bottom of the blade
  sword.add(hilt);*/

  scene.add(sword);

  // Cleanup function
  return () => {
    if (sword) {
      scene.remove(sword);
      sword.geometry.dispose();
      sword.material.dispose();
    }
  };
});

// Reactively update sword properties
$effect(() => {
  if (sword) {
    sword.visible = visible;
    if (position) {
      sword.position.set(position.x, position.y, position.z);
    }
    if (quaternion) {
      sword.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
    }
    if (scale) {
      sword.scale.set(scale, scale, scale);
    }
  }
});
</script>