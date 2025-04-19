<script>
  // src/routes/camera/Wand.svelte - Resized for better proportions
  import * as THREE from 'three';
  
  // Define props with default values
  let { 
    scene,
    visible = false,
    position = { x: 0, y: 0, z: 0 },
    quaternion = { x: 0, y: 0, z: 0, w: 1 },
    scale = 1
  } = $props();
  
  // Wand mesh reference
  let accessory;
  
  // --- Effect to Create/Destroy Mesh ---
  $effect(() => {
    if (!scene) return;
    
    console.log("[Wand] Creating mesh"); 
    
    // Reduced dimensions for better proportions
    const geometry = new THREE.CylinderGeometry(0.012, 0.012, 0.7, 16);
    geometry.translate(0, 0.35, 0); 
    const material = new THREE.MeshStandardMaterial({ 
      color: 0x8B4513, roughness: 0.7, metalness: 0.2 
    });
    accessory = new THREE.Mesh(geometry, material);
    
    // Reduced tip size as well
    const tipGeometry = new THREE.SphereGeometry(0.02, 16, 16);
    const tipMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700, emissive: 0xFFD700, emissiveIntensity: 0.5,
      roughness: 0.3, metalness: 0.8
    });
    const tip = new THREE.Mesh(tipGeometry, tipMaterial);
    tip.position.set(0, 0.7, 0); 
    accessory.add(tip);
    
    // Add to scene
    scene.add(accessory);
    console.log("[Wand] Added to scene");
    
    // Cleanup
    return () => {
      if (accessory) {
        console.log("[Wand] Removing from scene");
        scene.remove(accessory);
        geometry.dispose();
        material.dispose();
        tipGeometry.dispose();
        tipMaterial.dispose();
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