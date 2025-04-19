// Example: src/routes/camera/config.svelte.js

/*
* About `$lib/controllerOneHand.svelte.js`
* Examples: `Wand`, `Sword`, `Axe`.
* Essential for defining behavior and non-serializable configuration for a specific game route.
* This is where you'd configure which controller to use and its options.
*/

import { createOneHandController } from '$lib/controllerOneHandGun.svelte.js';
// --- Import Accessory Components Directly --- 
import GunComponent from './Gun.svelte';

export const gameConfig = {
    title: "Camera Sandbox", // Could also come from JSON
    controllers: [
        { type: 'oneHand',
          factory: createOneHandController,
          options: { fistThreshold: 0.91 }
        }
    ],
    accessories: [ // Mapping names to components for this specific game
      { name: 'Rifle', component: GunComponent },
    ],
    initialAccessory: 'Rifle',
    gestureMap: { // Game-specific mapping
        'fist': 'HOLD_ACCESSORY',
        'shake': 'SHOOT_ACCESSORY',
        'palm': 'RELEASE_ACCESSORY' // Example
    }
};