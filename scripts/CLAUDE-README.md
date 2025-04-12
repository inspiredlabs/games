---

url: https://claude.ai/chat/db176aeb-f3be-4dff-9086-08ed8a4149f8
runes mode: https://www.perplexity.ai/search/explain-svelte-5-runes-mode-an-brvDxgz8QGG7I9pcWW9JwA

---

# Magic Wand Hand Tracking

This SvelteKit application uses MediaPipe hand tracking and Three.js to visualize a 3D wand that appears when you make a fist.

## Features

- Real-time hand tracking with MediaPipe
- 3D wand visualization with Three.js
- Wand appears when the hand forms a fist gesture
- Split view with grayscale/color sections
- Resizable interface with a draggable divider
- Debug panel for monitoring hand tracking and wand status

## Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
# Also install the required libraries:
npm install three@0.159.0 @mediapipe/hands@0.4.1675469240 @mediapipe/drawing_utils@0.3.1675466934 @mediapipe/camera_utils@0.3.1675466862
```

3. Start the development server:

```bash
npm run dev
```

## How to Use

1. Allow camera access when prompted
2. Make a fist with your hand to make the magic wand appear
3. Open your hand to make the wand disappear
4. Click the status button (👋/🔍) in the bottom right to toggle the debug panel
5. Drag the center divider to resize the color/grayscale areas

## Project Structure

- `+page.svelte` - Main application component
- `HandTracker.svelte` - Handles MediaPipe hand tracking
- `WandVisualizer.svelte` - Three.js wand rendering
- `VideoDisplay.svelte` - Camera feed display
- `Resizer.svelte` - Draggable divider component
- `DebugPanel.svelte` - Debug information display
- `lib/mediapipeService.js` - MediaPipe initialization utilities
- `lib/handGestureUtils.js` - Hand gesture detection utilities

## Svelte 5 Notes

This project uses Svelte 5's runes for state management:

- `$state()` for reactive variables
- `$props()` for component props
- `$bindable()` for two-way bindable props
- `$derived()` for computed values
- `$effect()` for side effects

Example:
```js
// Define props with destructuring syntax
let {
  videoElement = null,
  handLandmarks = [],
  // Mark bindable props for two-way binding
  debugInfo = $bindable(''),
  wandVisible = $bindable(false)
} = $props();

// Create local state
let isInitialized = $state(false);

// Computed values
const handCount = $derived(handLandmarks.length);

// Side effects
$effect(() => {
  if (handLandmarks.length > 0) {
    console.log("Hand detected!");
  }
});
```

To use binding with Svelte 5 components:
```svelte
<!-- Parent -->
<WandVisualizer bind:debugInfo={wandDebugInfo} bind:wandVisible={wandVisible} />
```

Note: The Svelte 5 runes API has evolved during the beta period. Make sure to check the [official documentation](https://svelte.dev/blog/runes) for the most up-to-date syntax.

## Requirements

- Modern browser with WebGL support
- Camera access
- JavaScript enabled

## Technical Details

The application uses:

- SvelteKit for the application framework
- MediaPipe Hands for hand tracking
- Three.js for 3D rendering
- Svelte 5 with the new runes ($state, $effect) for reactivity

## Troubleshooting

If the hand tracking is not working well:
1. Ensure you have good lighting
2. Hold your hand clearly in front of the camera
3. Try using the "Reload" button in the debug panel
4. Make sure your browser permissions allow camera access

For rendering issues:
1. Check if WebGL is enabled in your browser
2. Make sure Three.js is properly loaded
3. Try refreshing the page
