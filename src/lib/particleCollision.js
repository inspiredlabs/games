// $lib/particleCollision.js
// Optimized Particle System with Collision Detection for Low-End Mobile
import * as THREE from 'three';

// Create particle system using BufferGeometry and Points
export function createParticleSystem(count = 1000) {  // Default to 1000 particles
  // Use BufferGeometry for memory efficiency
  const geometry = new THREE.BufferGeometry();
  
  // Create typed arrays for particle attributes
  const positions = new Float32Array(count * 3);
  const velocities = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const sizes = new Float32Array(count);
  const collisionData = new Float32Array(count);
  const hasCollided = new Float32Array(count); // Track if particle has ever collided
  
  // Initialize with random positions, velocities
  for (let i = 0; i < count; i++) {
    positions[i*3] = (Math.random() - 0.5) * 10;  // Wider spread
    positions[i*3+1] = Math.random() * 5 + 3;     // Start higher
    positions[i*3+2] = (Math.random() - 0.5) * 10; // Wider spread
    
    velocities[i*3] = (Math.random() - 0.5) * 0.02;
    velocities[i*3+1] = Math.random() * 0.01 - 0.02; // Start falling
    velocities[i*3+2] = (Math.random() - 0.5) * 0.02;
    
    colors[i*3] = colors[i*3+1] = colors[i*3+2] = 1.0;
    sizes[i] = 0.1 + Math.random() * 0.2;
    collisionData[i] = 0; // 0 = no collision
    hasCollided[i] = 0; // 0 = never collided
  }
  
  // Add attributes to buffer geometry
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));
  geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geometry.setAttribute('size', new THREE.BufferAttribute(sizes, 1));
  geometry.setAttribute('collision', new THREE.BufferAttribute(collisionData, 1));
  geometry.setAttribute('hasCollided', new THREE.BufferAttribute(hasCollided, 1));
  
  // Create shader material
  const material = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 }
    },
    vertexShader: `
      attribute float size;
      attribute float collision;
      attribute float hasCollided;
      varying float vCollision;
      varying float vHasCollided;
      
      void main() {
        vCollision = collision;
        vHasCollided = hasCollided;
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        
        // Particles get slightly larger during collision
        float sizeMultiplier = 1.0 + collision * 0.5;
        gl_PointSize = size * sizeMultiplier * (300.0 / -mvPosition.z);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform float time;
      varying float vCollision;
      varying float vHasCollided;
      
      void main() {
        // Circular particles
        vec2 uv = gl_PointCoord - vec2(0.5);
        float r = length(uv);
        if(r > 0.5) discard;
        
        // Base particle color - white
        vec3 baseColor = vec3(1.0);
        
        // Active collision - red glow
        if (vCollision > 0.0) {
          float pulse = 0.8 + 0.2 * sin(time * 10.0);
          baseColor = mix(baseColor, vec3(1.0, 0.3, 0.3), vCollision * pulse);
        } 
        // Has collided before but not actively colliding - green
        else if (vHasCollided > 0.0) {
          baseColor = vec3(0.2, 0.8, 0.2); // Green color
        }
        
        // Soft edge
        float alpha = smoothstep(0.5, 0.4, r);
        gl_FragColor = vec4(baseColor, alpha);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });
  
  return new THREE.Points(geometry, material);
}

// Static object colliders
export class CollisionManager {
  constructor() {
    this.staticObjects = [];
    this.currentParticleIndex = 0;
    this.particlesPerFrame = 50; // Increased for better collision detection
    this.tempVector = new THREE.Vector3();
    this.lastUpdateTime = 0;
    
    // For sphere collision detection
    this.tempSphere = new THREE.Sphere(new THREE.Vector3(), 0.5);
  }
  
  // Add static collision object
  addStaticCollider(mesh, color) {
    // Store mesh type to optimize collision checks
    const isSphere = mesh.geometry instanceof THREE.SphereGeometry;
    
    const bounds = new THREE.Box3().setFromObject(mesh);
    this.staticObjects.push({
      mesh,
      bounds,
      color: color || new THREE.Color(0xffffff),
      isSphere: isSphere,
      radius: isSphere ? mesh.geometry.parameters.radius : 0
    });
  }
  
  // Update particle positions and handle collisions
  update(particleSystem, time) {
    const deltaTime = this.lastUpdateTime ? time - this.lastUpdateTime : 16;
    this.lastUpdateTime = time;
    
    // Skip if delta is too large (tab was inactive)
    if (deltaTime > 100) return;
    
    // Get particle attributes
    const positions = particleSystem.geometry.attributes.position;
    const velocities = particleSystem.geometry.attributes.velocity;
    const collisions = particleSystem.geometry.attributes.collision;
    
    // 1. Update particle positions
    for (let i = 0; i < positions.count; i++) {
      // Update positions based on velocity
      positions.array[i*3] += velocities.array[i*3] * deltaTime;
      positions.array[i*3+1] += velocities.array[i*3+1] * deltaTime;
      positions.array[i*3+2] += velocities.array[i*3+2] * deltaTime;
      
      // Simple gravity
      velocities.array[i*3+1] -= 0.0001 * deltaTime;
      
      // Boundary check - bounce off ground
      if (positions.array[i*3+1] < 0) {
        positions.array[i*3+1] = 0;
        velocities.array[i*3+1] *= -0.5; // Bounce with dampening
      }
      
      // Boundary check - keep particles within reasonable bounds
      const bound = 15;
      if (Math.abs(positions.array[i*3]) > bound) {
        positions.array[i*3] = Math.sign(positions.array[i*3]) * bound;
        velocities.array[i*3] *= -0.5;
      }
      
      if (Math.abs(positions.array[i*3+2]) > bound) {
        positions.array[i*3+2] = Math.sign(positions.array[i*3+2]) * bound;
        velocities.array[i*3+2] *= -0.5;
      }
      
      // Decay collision effect
      if (collisions.array[i] > 0) {
        collisions.array[i] -= 0.01 * deltaTime;
        if (collisions.array[i] < 0) collisions.array[i] = 0;
      }
    }
    
    // Mark attributes as needing update
    positions.needsUpdate = true;
    collisions.needsUpdate = true;
    
    // 2. Check subset of particles for collisions
    this.checkCollisions(particleSystem);
    
    // 3. Update material time uniform
    particleSystem.material.uniforms.time.value = time * 0.001;
  }
  
  // Check collisions for a subset of particles each frame
  checkCollisions(particleSystem) {
    const positions = particleSystem.geometry.attributes.position;
    const collisionAttr = particleSystem.geometry.attributes.collision;
    const hasCollidedAttr = particleSystem.geometry.attributes.hasCollided;
    const velocities = particleSystem.geometry.attributes.velocity;
    const count = positions.count;
    
    // Only check a subset of particles each frame
    for (let i = 0; i < this.particlesPerFrame; i++) {
      // Wrap around when we reach the end
      if (this.currentParticleIndex >= count) {
        this.currentParticleIndex = 0;
      }
      
      // Skip particles with active collision
      if (collisionAttr.array[this.currentParticleIndex] > 0) {
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
          // For spheres, use sphere-point distance check (more accurate than bounding box)
          this.tempSphere.center.copy(obj.mesh.position);
          this.tempSphere.radius = obj.radius;
          
          // Check if point is inside sphere
          collision = this.tempSphere.containsPoint(this.tempVector);
        } else {
          // For other objects, use bounding box
          collision = obj.bounds.containsPoint(this.tempVector);
        }
        
        if (collision) {
          // Set active collision
          collisionAttr.array[this.currentParticleIndex] = 1.0;
          
          // Mark as having collided permanently
          hasCollidedAttr.array[this.currentParticleIndex] = 1.0;
          
          // Simple bounce effect for spheres
          if (obj.isSphere) {
            // Calculate normal from sphere center to particle
            const normal = this.tempVector.clone().sub(obj.mesh.position).normalize();
            
            // Reflect velocity vector
            const vx = velocities.array[this.currentParticleIndex * 3];
            const vy = velocities.array[this.currentParticleIndex * 3 + 1];
            const vz = velocities.array[this.currentParticleIndex * 3 + 2];
            
            const velocityVec = new THREE.Vector3(vx, vy, vz);
            velocityVec.reflect(normal);
            velocityVec.multiplyScalar(0.7); // Dampen the bounce
            
            // Update velocity
            velocities.array[this.currentParticleIndex * 3] = velocityVec.x;
            velocities.array[this.currentParticleIndex * 3 + 1] = velocityVec.y;
            velocities.array[this.currentParticleIndex * 3 + 2] = velocityVec.z;
            velocities.needsUpdate = true;
            
            // Move particle outside sphere to prevent getting stuck
            const pushDist = obj.radius * 1.05;
            normal.multiplyScalar(pushDist);
            normal.add(obj.mesh.position);
            
            positions.array[this.currentParticleIndex * 3] = normal.x;
            positions.array[this.currentParticleIndex * 3 + 1] = normal.y;
            positions.array[this.currentParticleIndex * 3 + 2] = normal.z;
            positions.needsUpdate = true;
          }
          
          // Mark attributes as needing update
          collisionAttr.needsUpdate = true;
          hasCollidedAttr.needsUpdate = true;
          break;
        }
      }
      
      this.currentParticleIndex++;
    }
  }
}

// Device-aware initialization
export function initOptimizedScene(container) {
  // Detect device capabilities
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  const isLowEnd = isMobile && window.devicePixelRatio < 2;
  
  // Adjust particle count based on device
  const particleCount = isLowEnd ? 200 : (isMobile ? 500 : 1000);
  console.log(`Creating ${particleCount} particles`);
  
  // Create renderer with optimized settings
  const renderer = new THREE.WebGLRenderer({ 
    antialias: false,
    powerPreference: 'low-power'
  });
  
  // Limit render resolution
  const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
  renderer.setPixelRatio(pixelRatio);
  
  // Create scene
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x111133);
  
  // Camera
  const camera = new THREE.PerspectiveCamera(
    60,
    window.innerWidth / window.innerHeight,
    0.1,
    100
  );
  camera.position.set(0, 5, 10); // Position camera back to see more of the scene
  camera.lookAt(0, 0, 0);
  
  // Use simpler lighting for better performance
  scene.add(new THREE.AmbientLight(0x404040));
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.position.set(1, 1, 1);
  scene.add(light);
  
  // Skip shadows on low-end devices
  if (!isLowEnd) {
    light.castShadow = true;
  }

  // Add renderer to container
  container.appendChild(renderer.domElement);
  
  // Handle resize
  const handleResize = () => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    
    // Cap resolution for performance
    const maxWidth = isLowEnd ? 640 : 1280;
    const maxHeight = isLowEnd ? 480 : 720;
    
    renderer.setSize(
      Math.min(width, maxWidth),
      Math.min(height, maxHeight)
    );
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  
  window.addEventListener('resize', handleResize);
  handleResize();
  
  // Create particle system
  const particleSystem = createParticleSystem(particleCount);
  scene.add(particleSystem);
  
  // Create collision manager
  const collisionManager = new CollisionManager();
  
  // Configure collision checking based on device
  if (isLowEnd) {
    collisionManager.particlesPerFrame = 20;
  } else if (isMobile) {
    collisionManager.particlesPerFrame = 40;
  } else {
    collisionManager.particlesPerFrame = 100;
  }
  
  return {
    scene,
    camera,
    renderer,
    particleSystem,
    collisionManager,
    handleResize,
    dispose: () => {
      window.removeEventListener('resize', handleResize);
      renderer.dispose();
      particleSystem.geometry.dispose();
      particleSystem.material.dispose();
    }
  };
}