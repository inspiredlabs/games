<script>
// src/routes/Wand.svelte
import { onMount, onDestroy } from 'svelte';
import * as THREE from 'three';

// Define props
let { scene, visible, position, quaternion, scale } = $props();

let wand;
let greenSphere; // Reference to green sphere
let collisionManager = null; // Collision manager

// Red particles system
const ENEMY_COUNT = 50; // Reduced particle count for better performance
let redParticles = null;
let redParticleVelocities = [];
let animationFrameId = null;

// Create wand geometry on mount
onMount(() => {
  createWandGeometry();
  
  // Initialize collision manager
  collisionManager = new CollisionManager();
  collisionManager.addCollider(greenSphere);
  
  // Create red particles
  createRedParticles();
  
  // Start animation loop
  startAnimation();
});

// Clean up when component is destroyed
onDestroy(() => {
  // Stop animation
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }
  
  // Clean up resources
  if (redParticles && scene) {
    if (redParticles.geometry) redParticles.geometry.dispose();
    if (redParticles.material) redParticles.material.dispose();
    scene.remove(redParticles);
  }
  
  if (wand && scene) {
    scene.remove(wand);
  }
});

// Collision Manager Class from App.svelte
class CollisionManager {
  constructor() {
    this.staticObjects = [];
    this.currentParticleIndex = 0;
    this.particlesPerFrame = 100; // Check more particles per frame
    this.tempVector = new THREE.Vector3();
    this.tempSphere = new THREE.Sphere(new THREE.Vector3(), 0.5); // Updated radius to match new sphere size
  }
  
  // Add a new static collider to check against
  addCollider(mesh) {
    // Store whether it's a sphere for optimized collision checking
    const isSphere = mesh.geometry instanceof THREE.SphereGeometry;
    
    // Create a bounding volume for the mesh
    const boundingBox = new THREE.Box3().setFromObject(mesh);
    
    this.staticObjects.push({
      mesh: mesh,
      bounds: boundingBox,
      isSphere: isSphere,
      radius: isSphere ? mesh.geometry.parameters.radius : 0
    });
    
    return boundingBox;
  }
  
  // Check for collisions between particles and static objects
  checkCollisions(particleSystem) {
    if (!particleSystem || !particleSystem.geometry) return;
    
    const positions = particleSystem.geometry.attributes.position;
    const colors = particleSystem.geometry.attributes.color;
    const hasCollided = particleSystem.geometry.attributes.hasCollided;
    
    if (!positions || !colors || !hasCollided) return;
    
    const count = positions.count;
    
    // Only check a subset of particles each frame for performance
    for (let i = 0; i < this.particlesPerFrame; i++) {
      // Wrap around to beginning when we reach the end
      if (this.currentParticleIndex >= count) {
        this.currentParticleIndex = 0;
      }
      
      // Skip particles that have already collided
      if (hasCollided.array[this.currentParticleIndex] > 0) {
        this.currentParticleIndex++;
        continue;
      }
      
      // Get particle position
      const px = positions.array[this.currentParticleIndex * 3];
      const py = positions.array[this.currentParticleIndex * 3 + 1];
      const pz = positions.array[this.currentParticleIndex * 3 + 2];
      
      // Reuse vector object to avoid garbage collection
      this.tempVector.set(px, py, pz);
      
      // Check against all static objects
      for (let j = 0; j < this.staticObjects.length; j++) {
        const obj = this.staticObjects[j];
        
        // Different collision check based on object type
        let collision = false;
        
        if (obj.isSphere) {
          // For spheres, use sphere-point distance check
          // We need to get the world position of the sphere
          const sphereWorldPos = new THREE.Vector3();
          obj.mesh.getWorldPosition(sphereWorldPos);
          this.tempSphere.center.copy(sphereWorldPos);
          this.tempSphere.radius = obj.radius;
          
          // Check if point is inside sphere
          collision = this.tempSphere.containsPoint(this.tempVector);
        } else {
          // For other objects, use bounding box
          collision = obj.bounds.containsPoint(this.tempVector);
        }
        
        if (collision) {
          // Mark as having collided
          hasCollided.array[this.currentParticleIndex] = 1.0;
          
          // Change color to green
          colors.array[this.currentParticleIndex * 3] = 0.2;     // R
          colors.array[this.currentParticleIndex * 3 + 1] = 0.8; // G
          colors.array[this.currentParticleIndex * 3 + 2] = 0.2; // B
          
          // Mark attributes as needing update
          hasCollided.needsUpdate = true;
          colors.needsUpdate = true;
          break;
        }
      }
      
      this.currentParticleIndex++;
    }
  }
  
  // Update collider bounds (when objects move)
  updateColliders() {
    for (let i = 0; i < this.staticObjects.length; i++) {
      const obj = this.staticObjects[i];
      obj.bounds.setFromObject(obj.mesh);
    }
  }
}

function createWandGeometry() {
  const geometry = new THREE.CylinderGeometry(0.05, 0.05, 3.0, 16);
  geometry.translate(0, 1, 0);
  const material = new THREE.MeshStandardMaterial({ color: 0x8B4513, roughness: 0.7, metalness: 0.2 });
  wand = new THREE.Mesh(geometry, material);

  // Create debug material: 
  const greenSphereGeometry = new THREE.SphereGeometry(0.5, 8, 8);
  const greenSphereMaterial = new THREE.MeshPhongMaterial({ 
    color: 0x00ff00,
    visible: false  // HIDE
    // depthWrite: false  // Prevent alpha
    // transparent: true,
    // opacity: 1.0  // VISIBLE
  });
  greenSphere = new THREE.Mesh(
    greenSphereGeometry,
    greenSphereMaterial // debug material
  );
  greenSphere.position.set(0, 2.5, 0); // Wand tip position

  // Or, match wand size
  // greenSphere.scale.set(0.2, 2.5, 0.2);
  
  // Add green sphere
  wand.add(greenSphere);

  scene.add(wand);
}

// Create red particles (from App.svelte)
function createRedParticles() {
  const particleCount = ENEMY_COUNT;
  const geometry = new THREE.BufferGeometry();
  const positions = new Float32Array(particleCount * 3);
  const colors = new Float32Array(particleCount * 3);
  const sizes = new Float32Array(particleCount);
  const hasCollided = new Float32Array(particleCount); // Track collisions
  
  // Clear previous velocities
  redParticleVelocities = [];
  
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    
    // Positions - spread them across the scene
    positions[i3] = (Math.random() - 0.5) * 20;     // x: -10 to 10

    positions[i3 + 1] = Math.random() * 5 - 2;  // y: -2 to 3
    positions[i3 + 2] = (Math.random() - 0.5) * 20; // z: -10 to 10
    
    // Store velocities for animation
    redParticleVelocities.push({
      x: (Math.random() - 0.5) * 0.1,  // slower = 0.05
      y: (Math.random() - 0.5) * 0.05, // slower = 0.025
      z: (Math.random() - 0.5) * 0.1   // slower = 0.05
    });
    
    // Initial red color (will be overridden by shader)
    colors[i3] = 1.0;     // R
    colors[i3 + 1] = 0.0; // G
    colors[i3 + 2] = 0.0; // B
    
    // Vary particle sizes
    sizes[i] = 10.0 + Math.random() * 0.5; // 6.0? // Smaller size: `0.1 + Math.random() * 0.2`
    
    // Initialize collision flag
    hasCollided[i] = 0; // 0 = no collision
  }
  
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('hasCollided', new THREE.BufferAttribute(hasCollided, 1));
  
// Distance-color shader for improved UX
const material = new THREE.ShaderMaterial({
  uniforms: {
    time: { value: 0 },
    spherePosition: { value: new THREE.Vector3(0, 0, 0) }
  },
  vertexShader: `
    attribute float size;
    attribute vec3 color;
    attribute float hasCollided;
    varying vec3 vColor;
    varying float vHasCollided;
    varying float vDistance;
    varying vec3 vPosition;
    
    void main() {
      vColor = color;
      vHasCollided = hasCollided;
      vPosition = position;
      
      // Calculate position in view space
      vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
      
      // Calculate distance from camera (negative because view space Z is negative in front of camera)
      vDistance = -mvPosition.z;
      
      // Reduce size to 25% when collided
      float adjustedSize = hasCollided > 0.0 ? size * 0.25 : size;
      
      gl_PointSize = adjustedSize * (300.0 / -mvPosition.z);
      gl_Position = projectionMatrix * mvPosition;
    }
  `,
  fragmentShader: `
    uniform float time;
    uniform vec3 spherePosition;
    varying vec3 vColor;
    varying float vHasCollided;
    varying float vDistance;
    varying vec3 vPosition;
    
    void main() {
      // Circular particles
      vec2 uv = gl_PointCoord - vec2(0.5);
      float r = length(uv);
      if(r > 0.5) discard;
      
      // Base soft edge alpha (for particle shape)
      float softEdgeAlpha = smoothstep(0.5, 0.4, r);
      
      // Calculate distance to sphere
      float distToSphere = distance(vPosition, spherePosition);
      float proximity = 1.0 - clamp(distToSphere / 3.0, 0.0, 1.0);
      
      // Add "about to collide" state
      float almostColliding = proximity > 0.4 ? 1.0 : 0.0; // Very close to sphere
      
      // Determine color and transparency based on distance and collision state
      vec3 finalColor;
      float alpha;
      
      if (vHasCollided > 0.0) {
        // Green pulsing for collided particles
        float pulse = 0.8 + 0.2 * sin(time * 5.0);
        finalColor = vec3(0.2, 0.8 * pulse, 0.2);
        // Collided particles are always visible
        alpha = softEdgeAlpha;
      } else if (almostColliding > 0.0) {
        // ENHANCED: Super intense multi-color flashing for about-to-collide state
        // Use multiple sine waves at different frequencies for complex flashing pattern
        float fastStrobe1 = sin(time * 25.0); // Very fast primary strobe
        float fastStrobe2 = sin(time * 18.0 + 1.5); // Second frequency, phase-shifted
        float fastStrobe3 = sin(time * 30.0 + 0.8); // Third even faster frequency
        
        // Create a complex combined flashing effect
        float combinedStrobe = (fastStrobe1 + fastStrobe2 + fastStrobe3) / 3.0;
        
        // Dramatically shift between vibrant contrasting colors
        vec3 color1 = vec3(1.0, 0.0, 0.0);    // Bright red
        vec3 color2 = vec3(0.0, 0.3, 1.0);    // Deep blue
        vec3 color3 = vec3(1.0, 0.0, 1.0);    // Magenta
        vec3 color4 = vec3(1.0, 0.8, 0.0);    // Gold
        
        // Complex color cycling between 4 colors
        float colorCycle = (sin(time * 15.0) + 1.0) / 2.0; // 0 to 1 cycle
        
        if (colorCycle < 0.25) {
            finalColor = mix(color1, color2, colorCycle * 4.0);
        } else if (colorCycle < 0.5) {
            finalColor = mix(color2, color3, (colorCycle - 0.25) * 4.0);
        } else if (colorCycle < 0.75) {
            finalColor = mix(color3, color4, (colorCycle - 0.5) * 4.0);
        } else {
            finalColor = mix(color4, color1, (colorCycle - 0.75) * 4.0);
        }
        
        // Add brightness pulses for extra emphasis
        finalColor += vec3(combinedStrobe * 0.3);
        
        // Make sure it's always fully visible with slight size pulsing
        float sizeScale = 1.0 + abs(combinedStrobe) * 0.2;
        alpha = softEdgeAlpha * sizeScale;
      } else if (proximity > 0.15) { // Lowered from 0.2 to 0.15
        // Strobe between pink and red        
        float strobe = 0.5 + 0.5 * sin(time * 8.0); // Faster strobing effect
        finalColor = mix(vec3(1.0, 0.0, 0.0), vec3(1.0, 0.3, 0.7), strobe); // Red to pink
        alpha = softEdgeAlpha;
      } else {
        // Distance-based color gradient
        float normDist = clamp(vDistance / 6.0, 0.0, 1.0);
        
        // Create a smooth color transition based on distance
        if (normDist > 0.85) {
          // Make far particles completely transparent instead of blue
          finalColor = vec3(0.2, 0.2, 1.0); // Color doesn't matter since they'll be invisible
          alpha = 0.0; // Completely transparent

        } else if (normDist > 0.5) {
          // Mid-distance particles: make these fade in gradually
          float t = (normDist - 0.5) / 0.35;
          finalColor = vec3(0.8, 0.2, 0.8); // Pure purple
          alpha = softEdgeAlpha * (1.0 - t); // Fade in as they get closer
          
        } else if (normDist > 0.25) {
          // Medium-close particles: red to purple gradient
          float t = (normDist - 0.25) / 0.25;
          finalColor = mix(vec3(1.0, 0.1, 0.1), vec3(0.8, 0.2, 0.8), t);
          alpha = softEdgeAlpha;
        } else {
          // Closest particles: yellow to red gradient
          float t = normDist / 0.25;
          finalColor = mix(vec3(1.0, 0.9, 0.2), vec3(1.0, 0.1, 0.1), t);
          alpha = softEdgeAlpha;
        }
      }
      
      // Final color with calculated alpha
      gl_FragColor = vec4(finalColor, alpha);
    }
  `,
  transparent: true,
  blending: THREE.AdditiveBlending,
  depthWrite: false
});


// Update sphere position uniform
if (redParticles && redParticles.material && redParticles.material.uniforms) {
  // Get world position of green sphere
  if (greenSphere) {
    const sphereWorldPos = new THREE.Vector3();
    greenSphere.getWorldPosition(sphereWorldPos);
    redParticles.material.uniforms.spherePosition.value.copy(sphereWorldPos);
  }
}
  // Create and store reference to particles for animation
  redParticles = new THREE.Points(geometry, material);
  scene.add(redParticles);
}

// Update red particles in animation loop
function updateRedParticles(delta = 0.016) {
  // Safety checks
  if (!redParticles || !redParticles.geometry || 
      !redParticles.geometry.attributes || 
      !redParticles.geometry.attributes.position) {
    return;
  }
  
  // Get position attribute from particles
  const positions = redParticles.geometry.attributes.position;
  const colors = redParticles.geometry.attributes.color;
  const hasCollided = redParticles.geometry.attributes.hasCollided;
  
  // Safety check for velocities array length
  if (!redParticleVelocities || redParticleVelocities.length === 0) {
    return;
  }
  
  const particleCount = Math.min(
    redParticleVelocities.length, 
    positions.array.length / 3
  );
  
  // Apply velocity cap for stability (prevents extreme values)
  const maxDelta = Math.min(delta, 0.1);
  
  for (let i = 0; i < particleCount; i++) {
    const i3 = i * 3;
    
    // Make sure we don't access outside the array bounds
    if (i3 + 2 >= positions.array.length) break;
    
    // Update positions based on velocities
    positions.array[i3]     += redParticleVelocities[i].x * maxDelta * 60;
    positions.array[i3 + 1] += redParticleVelocities[i].y * maxDelta * 60;
    positions.array[i3 + 2] += redParticleVelocities[i].z * maxDelta * 60;
    
    // Boundary checks - wrap around when particles go out of bounds
    // This creates an endless floating effect
    if (positions.array[i3] < -10) positions.array[i3] = 10;
    else if (positions.array[i3] > 10) positions.array[i3] = -10;
    
    if (positions.array[i3 + 1] < 0) positions.array[i3 + 1] = 10;
    else if (positions.array[i3 + 1] > 10) positions.array[i3 + 1] = 0;
    
    if (positions.array[i3 + 2] < -10) positions.array[i3 + 2] = 10;
    else if (positions.array[i3 + 2] > 10) positions.array[i3 + 2] = -10;
  }
  
  // Check for collided particles to recycle
  const recycleChance = 0.01; // 1% chance per frame to check each particle
  
  for (let i = 0; i < positions.count; i++) {
    // Only process some particles each frame
    if (Math.random() > recycleChance) continue;
    
    // If this particle has been collided for a while, respawn it
    if (hasCollided.array[i] > 0) {
      // Count frames since collision with a small counter in the hasCollided value
      hasCollided.array[i] += 0.01;
      
      // After ~5 seconds (0.01 * 500 frames), respawn the particle
      if (hasCollided.array[i] > 5.0) {
        // Reset collision state
        hasCollided.array[i] = 0;
        
        // Reset color to red
        const i3 = i * 3;
        colors.array[i3] = 1.0;     // R
        colors.array[i3 + 1] = 0.0; // G
        colors.array[i3 + 2] = 0.0; // B
        
        // Move to a new position on the edge
        const side = Math.floor(Math.random() * 4);
        if (side === 0) { // Top
          positions.array[i3] = (Math.random() - 0.5) * 20;
          positions.array[i3 + 1] = 10;
          positions.array[i3 + 2] = (Math.random() - 0.5) * 20;
        } else if (side === 1) { // Right
          positions.array[i3] = 10;
          positions.array[i3 + 1] = Math.random() * 10;
          positions.array[i3 + 2] = (Math.random() - 0.5) * 20;
        } else if (side === 2) { // Bottom
          positions.array[i3] = (Math.random() - 0.5) * 20;
          positions.array[i3 + 1] = 0;
          positions.array[i3 + 2] = (Math.random() - 0.5) * 20;
        } else { // Left
          positions.array[i3] = -10;
          positions.array[i3 + 1] = Math.random() * 10;
          positions.array[i3 + 2] = (Math.random() - 0.5) * 20;
        }
        
        // Reset velocity - aim toward camera/player position
        const targetX = 0; // Center of scene
        const targetY = -0.5; // Slightly above center, assuming camera is here
        const targetZ = 6; // Center of scene at approximate arm's length when player is 1.5m away

        // Calculate direction vector from particle position to target
        const dirX = targetX - positions.array[i3];
        const dirY = targetY - positions.array[i3 + 1];
        const dirZ = targetZ - positions.array[i3 + 2];

        // Normalize the direction vector
        const length = Math.sqrt(dirX * dirX + dirY * dirY + dirZ * dirZ);
        const normalizedDirX = dirX / length;
        const normalizedDirY = dirY / length;
        const normalizedDirZ = dirZ / length;

        // Add some randomness to the direction
        const randomFactor = 0.6; // 0 = perfect aim, 1 = completely random
        redParticleVelocities[i] = {
          x: normalizedDirX * 0.05 * (1 - randomFactor) + (Math.random() - 0.5) * 0.05 * randomFactor,
          y: normalizedDirY * 0.05 * (1 - randomFactor) + (Math.random() - 0.5) * 0.025 * randomFactor,
          z: normalizedDirZ * 0.05 * (1 - randomFactor) + (Math.random() - 0.5) * 0.05 * randomFactor
        };
        
        // Mark attributes as needing update
        colors.needsUpdate = true;
        hasCollided.needsUpdate = true;
      }
    }
  }
  
  // Tell three.js to update the particle positions
  positions.needsUpdate = true;
  
  // Update time uniform for shader animations
  if (redParticles.material.uniforms && redParticles.material.uniforms.time) {
    redParticles.material.uniforms.time.value += delta;
  }
  
  // Update sphere position uniform
  if (redParticles && redParticles.material && redParticles.material.uniforms) {
    // Get world position of green sphere
    if (greenSphere) {
      const sphereWorldPos = new THREE.Vector3();
      greenSphere.getWorldPosition(sphereWorldPos);
      redParticles.material.uniforms.spherePosition.value.copy(sphereWorldPos);
    }
  }
}

// Start animation loop
function startAnimation() {
  // Don't start animation if scene isn't ready
  if (!scene || !redParticles) {
    console.log("Cannot start animation - scene or particles not ready");
    return;
  }
  
  // Stop any existing animation
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
  }
  
  let lastTime = 0;
  
  // Animation function
  function animate(time) {
    time *= 0.001; // Convert to seconds
    const delta = time - lastTime;
    lastTime = time;
    
    // Update particles
    updateRedParticles(delta);
    
    // Check for collisions
    if (collisionManager && redParticles) {
      collisionManager.checkCollisions(redParticles);
    }
    
    // Continue animation loop
    animationFrameId = requestAnimationFrame(animate);
  }
  
  // Start animation
  animationFrameId = requestAnimationFrame(animate);
  console.log("Wand particles animation started");
}

// Reactively update wand properties when props change
$effect(() => {
  if (wand) {
    wand.visible = visible;
    
    if (position) {
      wand.position.set(position.x, position.y, position.z);
    }
    
    if (quaternion) {
      // Make sure quaternion is normalized to prevent deformation
      const normalizedQuaternion = new THREE.Quaternion(
        quaternion.x, quaternion.y, quaternion.z, quaternion.w
      ).normalize();
      
      // Apply the normalized quaternion
      wand.quaternion.copy(normalizedQuaternion);
    }
    
    if (scale) {
      // Always use uniform scaling to prevent deformation
      const uniformScale = typeof scale === 'number' ? scale : 1;
      wand.scale.set(uniformScale, uniformScale, uniformScale);
    }
    
    // Update colliders when wand position/rotation changes
    if (collisionManager) {
      collisionManager.updateColliders();
    }
  }
  
  if (redParticles) {
    redParticles.visible = visible;
  }
});
</script>