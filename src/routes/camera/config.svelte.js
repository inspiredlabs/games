// Example: src/routes/camera/config.svelte.js

/*
* About `$lib/controllerOneHand.svelte.js`
* Examples: `Wand`, `Sword`, `Axe`.
* Essential for defining behavior and non-serializable configuration for a specific game route.
* This is where you'd configure which controller to use and its options.
*/

import { createOneHandController } from '$lib/controllerOneHand.svelte.js';
import Wand from './Wand.svelte';
import Sword from './Sword.svelte';
import Axe from './Axe.svelte';

export const gameConfig = {
    title: "Camera Sandbox", // Could also come from JSON
    controllers: [
        { type: 'oneHand',
          factory: createOneHandController,
          options: { fistThreshold: 0.16 }
        }
        /* Future concept:
        * ideal for flying like superman, a bike or a boxing game:
        {
          type: 'twoHand',
          factory: createTwoHandController,
          options: { ... }
          * each leftHand AND rightHand: { position, quaternion, scale, visible, stableState }
          * combined property for things like handlebar orientation
          * update might take multiHandLandmarks
        } */
    ],
    accessories: [ // Mapping names to components for this specific game
        { name: 'Wand', component: Wand },
        { name: 'Sword', component: Sword },
        { name: 'Axe', component: Axe },
    ],
    initialAccessory: 'Wand',
    gestureMap: { // Game-specific mapping
        'fist': 'HOLD_ACCESSORY',
        'palm': 'RELEASE_ACCESSORY' // Example
    }
};