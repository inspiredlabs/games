<script>
  // src/routes/camera/Gun.svelte - Adapted from former Axe.svelte
  import * as THREE from 'three';
  import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
  import { Tween } from 'svelte/motion';
  import { cubicOut } from 'svelte/easing';
  
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
  let gunModel;
  
  // resize the resource
  const SCALE = 50;

  /** IMPORTANT: Two critical reasons to tween the quaternion:
   *  1. Quaternions can represent the same orientation in two different ways (a rotation and 
   *     its negative), which can cause the model to suddenly flip direction when crossing 
   *     certain boundaries (e.g., when moving from left to right of the screen).
   *  2. The Tween provides smooth interpolation between orientations, following the shortest
   *     path between quaternions, which prevents jarring visual flips and creates more
   *     natural-looking movement.
   *  Without tweening, the model would be more responsive but could suddenly change orientation
   *  when crossing the center of the screen or other quaternion boundaries.
   * */
  const tweenedQuaternion = new Tween(
    { x: 0, y: 0, z: 0, w: 1 }, 
    { duration: 300, easing: cubicOut }
  );
  
  // Track when the gun crosses the center line
  let lastPositionX = 0;
  let crossedCenterLine = false;
  
  // --- Effect to Create/Destroy Mesh ---
  $effect(() => {
    if (!scene) return;
    
    console.log("[Gun Component] Creating mesh");
    
    // Create a group to hold the gun model
    accessory = new THREE.Group();
    
    // Load the gun model
    const loader = new GLTFLoader();
    
    // Create a temporary placeholder while loading
    const placeholderGeometry = new THREE.BoxGeometry(0.1, 0.1, 0.3);
    const placeholderMaterial = new THREE.MeshStandardMaterial({
      color: 0x555555,
      roughness: 0.5,
      metalness: 0.7
    });
    
    const placeholder = new THREE.Mesh(placeholderGeometry, placeholderMaterial);
    accessory.add(placeholder);
    
    // Attempt to load the gun model
    // Note: You'll need to adapt this path to where you store the model
    loader.load(
      'resources/rifle/scene.gltf', // Update this path to your actual model path
      (gltf) => {
        console.log("[Gun Component] Model loaded successfully");
        
        // Remove placeholder
        if (placeholder) {
          accessory.remove(placeholder);
          placeholderGeometry.dispose();
          placeholderMaterial.dispose();
        }
        
        // Add the loaded model to our group
        gunModel = gltf.scene;
        
        // Apply similar positioning/scaling
        gunModel.scale.set(SCALE, SCALE, -SCALE); // Adjust SCALE and flip the Z-plane so the gun faces into the scene
        
        // Apply the positioning from gun-controller.js
        // Original position was: e.SetPosition(new THREE.Vector3(0.1, -0.25, -0.1));
        gunModel.position.set(0, 0, 0); // We'll handle this with the group
        
        // Rotate the gun to face forward rather than upward
        // Rotate -90 degrees around X-axis to point forward instead of up
        gunModel.rotation.x = -Math.PI / 2;
        // You might need additional rotation to align correctly
        gunModel.rotation.z = Math.PI; // 180 degree rotation around Z
        
        // Add to our accessory group
        accessory.add(gunModel);
        
        // Apply any material modifications if needed
        gunModel.traverse((child) => {
          if (child.isMesh) {
            // Apply standardized material properties
            if (child.material) {
              child.material.roughness = 0.5;
              child.material.metalness = 0.7;
              
              // Enable shadows
              child.castShadow = true;
              child.receiveShadow = true;
            }
          }
        });
      },
      (progress) => {
        console.log(`[Gun Component] Loading progress: ${Math.round(progress.loaded / progress.total * 100)}%`);
      },
      (error) => {
        console.error('[Gun Component] Error loading model:', error);
        
        // If loading fails, create a simple gun shape as fallback
        console.log("[Gun Component] Creating fallback gun model");
        
        // Gun barrel (cylinder)
        const barrelGeometry = new THREE.CylinderGeometry(0.02, 0.02, 0.5, 12);
        barrelGeometry.rotateX(Math.PI / 2); // Rotate to point forward
        
        const barrelMaterial = new THREE.MeshStandardMaterial({
          color: 0x333333, 
          roughness: 0.3,
          metalness: 0.9
        });
        
        const barrel = new THREE.Mesh(barrelGeometry, barrelMaterial);
        barrel.position.set(0, 0, 0.1);
        accessory.add(barrel);
        
        // Apply rotation to the entire accessory group for the fallback model
        accessory.rotation.x = -Math.PI / 2; // Point forward instead of up
        
        // Gun handle (box)
        const handleGeometry = new THREE.BoxGeometry(0.04, 0.12, 0.04);
        const handleMaterial = new THREE.MeshStandardMaterial({
          color: 0x8B4513, // Brown
          roughness: 0.9,
          metalness: 0.1
        });
        
        const handle = new THREE.Mesh(handleGeometry, handleMaterial);
        handle.position.set(0, -0.08, 0);
        accessory.add(handle);
        
        // Gun body
        const bodyGeometry = new THREE.BoxGeometry(0.06, 0.06, 0.25);
        const bodyMaterial = new THREE.MeshStandardMaterial({
          color: 0x555555,
          roughness: 0.5,
          metalness: 0.7
        });
        
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.set(0, 0, 0);
        accessory.add(body);
      }
    );
    
    // Position the gun similar to how it was in the original project
    // The gun was positioned at (0.1, -0.25, -0.1) in the original project
    accessory.position.set(0, 0, 0); // We'll update this with the prop
    
    // Set initial visibility
    accessory.visible = visible;
    
    // Initial visibility/position is handled by the update effect
    scene.add(accessory);
    console.log("[Gun Component] Added to scene");
    
    // Cleanup
    return () => {
      if (accessory) {
        console.log("[Gun Component] Cleaning up");
        scene.remove(accessory);
        
        // Dispose geometries and materials from any fallback models
        accessory.traverse((child) => {
          if (child.isMesh) {
            if (child.geometry) child.geometry.dispose();
            if (child.material) {
              if (Array.isArray(child.material)) {
                child.material.forEach(material => material.dispose());
              } else {
                child.material.dispose();
              }
            }
          }
        });
        
        accessory = null;
        gunModel = null;
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
        (position.z + 3) || 0
      );
      
      // Detect center line crossing (assuming center is at x=0)
      const hasCrossedCenter = 
        (lastPositionX < 0 && position.x >= 0) || 
        (lastPositionX > 0 && position.x <= 0);
      
      if (hasCrossedCenter) {
        crossedCenterLine = !crossedCenterLine;
      }
      
      lastPositionX = position.x;
    }
    
    // Update quaternion if provided
    if (quaternion) {
      // Save the initial correction rotation we applied to the model
      // by creating a quaternion that represents our correction
      const correctionQuaternion = new THREE.Quaternion();
      correctionQuaternion.setFromEuler(new THREE.Euler(-Math.PI / 2, 0, Math.PI));
      
      // Create quaternion from the input
      const inputQuaternion = new THREE.Quaternion(
        quaternion.x || 0,
        quaternion.y || 0,
        quaternion.z || 0,
        quaternion.w !== undefined ? quaternion.w : 1
      );
      
      // Apply the correction to the input quaternion
      // This will combine the rotations
      const finalQuaternion = new THREE.Quaternion().multiplyQuaternions(
        inputQuaternion,
        correctionQuaternion
      );
      
      // Convert THREE.Quaternion to plain object for tweening
      const quatObj = {
        x: finalQuaternion.x,
        y: finalQuaternion.y,
        z: finalQuaternion.z,
        w: finalQuaternion.w
      };
      
      // Update the tween target
      tweenedQuaternion.target = quatObj;
    }
    
    // Apply the tweened quaternion to the accessory
    accessory.quaternion.set(
      tweenedQuaternion.current.x,
      tweenedQuaternion.current.y,
      tweenedQuaternion.current.z,
      tweenedQuaternion.current.w
    );
    
    // Update scale if provided
    if (scale !== null && scale !== undefined) {
      const scaleValue = typeof scale === 'number' ? scale : 1;
      accessory.scale.set(scaleValue, scaleValue, scaleValue);
    }
  });





  // Update the event handler in Gun.svelte for better visual feedback

$effect(() => {
  // Listen for shoot events
  const handleShoot = (event) => {
    console.log("Shooting!");
    
    // Enhanced flash effect
    if (accessory) {
      // Create larger, brighter muzzle flash for better visibility
      const flashGeometry = new THREE.SphereGeometry(2, 32, 2); // Much larger sphere
      const flashMaterial = new THREE.MeshBasicMaterial({ 
        color: 0xffff00,  // Bright yellow
        //transparent: true,
        opacity: 1      // Higher opacity
      });
      
      const flash = new THREE.Mesh(flashGeometry, flashMaterial);
      
      // Position at gun barrel end - far enough to be clearly visible
      flash.position.set(0, -16, 3); 
      accessory.add(flash);
      
      // Add a point light for additional effect
      const flashLight = new THREE.PointLight(0xffff00, 50, 10);
      flashLight.position.set(0, -16, 3);
      accessory.add(flashLight);
      
      // Animate flash - grow and fade
      let size = 0.5;
      let opacity = 1.0;
      const animateFlash = () => {
        size += 0.1;
        opacity -= 0.1;
        
        if (opacity <= 0) {
          // Remove flash and light when animation completes
          accessory.remove(flash);
          accessory.remove(flashLight);
          flashGeometry.dispose();
          flashMaterial.dispose();
          return;
        }
        
        // Update flash size and opacity
        flash.scale.set(size, size, size);
        flashMaterial.opacity = opacity;
        
        // Continue animation
        requestAnimationFrame(animateFlash);
      };
      
      // Start animation
      animateFlash();
    }
  };
  
  window.addEventListener('gun-shoot', handleShoot);
  
  return () => {
    window.removeEventListener('gun-shoot', handleShoot);
  };
});
</script>