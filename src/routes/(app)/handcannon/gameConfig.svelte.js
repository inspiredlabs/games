// Example: src/routes/camera/config.svelte.js

/*
* About `$lib/controllerOneHandGun.svelte.js`
* Examples: `Rifle`, `RamboKnife`.
* Essential for defining behavior and non-serializable configuration for a specific game route.
* This is where you'd configure which controller to use and its options.
*/

import { createOneHandController } from '$lib/controllerOneHandGun.svelte.js';
// --- Import Accessory Components Directly --- 
import GunComponent from './Gun.svelte';
//import RamboKnifeComponent from './RamboKnife.svelte';

export const gameConfig = {
    title: "Camera Sandbox", // Could also come from JSON
    controllers: [
        { type: 'oneHand',
          factory: createOneHandController,
          options: { fistThreshold: 0.31 }
        }
    ],
    accessories: [ // Mapping names to components for this specific game
      { name: 'Rifle', component: GunComponent,
        //name: 'RamboKnife', component: RamboKnifeComponent
       },
    ],
    initialAccessory: 'Rifle',
    gestureMap: { // Game-specific mapping
        'fist': 'HOLD_ACCESSORY',
        'shake_X': 'RELOAD_ACCESSORY',
        'shake_Y': 'SWAP_ACCESSORY',
        'shake_Z': 'SHOOT_ACCESSORY',
        'palm': 'RELEASE_ACCESSORY' // Example
    }
};