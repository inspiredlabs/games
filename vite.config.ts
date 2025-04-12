// ./vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  plugins: [sveltekit()],
  
  // Configure MediaPipe dependencies
  optimizeDeps: {
    include: [
      '@mediapipe/hands',
      '@mediapipe/camera_utils',
      '@mediapipe/drawing_utils'
    ],
    esbuildOptions: {
      // Fix WebGL-related issues by properly handling MediaPipe's wasm files
      target: 'es2020',
    }
  },
  
  // Ensure MediaPipe assets are properly handled
  assetsInclude: ['**/*.wasm', '**/*.tflite'],
  
  // Correctly resolve MediaPipe module paths
  resolve: {
    alias: {
      '@mediapipe': resolve(__dirname, 'node_modules/@mediapipe')
    }
  },
  
  // Enable working with WebGL and Web Workers
  worker: {
    format: 'es'
  },
  
  // Configure server to work with MediaPipe
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin'
    }
  },
  
  // Improve build performance with MediaPipe
  build: {
    target: 'es2020',
    commonjsOptions: {
      transformMixedEsModules: true
    }
  }
});