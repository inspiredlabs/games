---



Singleton pattern (to streamline data sharing):
- Single Instance for Shared Resources
- highly beneficial for sharing data in a consistent way
- global state management and resource efficiency are critical
- provides a centralized access point for critical game components
- consistency:
  - avoid discrepancies between players
  - all parts of the system interact with the same instance
  - prevent conflict or a race condition
  - sync progress (such as position data) and game events
  - unified logger mechanism for debugging and event tracking
ConfigManager:
  - game params
  - room_UUID
  - server URL
GameManager: coordinates logic across modules
  - timer
  - 3 particles
  - p1 particleCollisions
  - p2 particleCollisions
  - winner
  - NOTE: a common pattern is a switch statement: https://youtu.be/HnpvpWTcaVI?t=3991
NetworkManager:
  - handle network requests
  - consistent, simplified data flow
  - no need to pass instances manually between components
Challenges and Considerations:
- Tight Coupling, thread safety (double-checked locking).
  - from: Use `partykit`, and pass the data using `devalue` as a singleton pattern: https://www.perplexity.ai/search/i-am-writing-an-architecture-o-mZU5Cbt8T8i5m.uQ96ziqw


// Hierachical orchestration pattern:

// `(app)/+layout.svelte` is to instantiate common components such as `mediapipeService`, `DebugComponents` and the common UI including the resizer and `RightMenu`. The shared modular approach enforces clean separation of concerns which is maintainable.

// `(app)/camera/+page.svelte` is a decoupled child route with no dependencies on parent or sibling routes, Meaning child routes come with get/set state handling implications. The child route has a modular layout that contains assets and components only belonging to this route. A child route can instantiate upstream dependencies such as `lib/files`, and manages it's own `state` such as `controller`. A child route is trivial to add/delete.


---

Okay, let's devise a clear integration plan based on your **new codebase structure** (`routes/(app)/...`) and the **working controller pattern** (controller holds state, page derives, accessory receives plain props).

This plan focuses on moving the logic currently in `src/routes/[slug]/+page.svelte` into the appropriate `(app)` layout and page files, specifically targeting the `/camera` route first as the example.

**Integration Plan:**

*   **Modify src/lib/useSharedContext.svelte.js:**
    *   **Export Key:** Ensure CONTEXT\_KEY is exported: export const CONTEXT\_KEY = Symbol('sharedContext');.
    <!-- AVOID MONOLITHIC CODE -->
    *   **Update Imports:** Change accessory component imports to point within the (app) group:

        ```javascript
        import WandComponent from '$routes/(app)/camera/Wand.svelte';
        import SwordComponent from '$routes/(app)/camera/Sword.svelte';
        import AxeComponent from '$routes/(app)/camera/Axe.svelte';
        ```
    <!-- AVOID MONOLITHIC CODE -->
    *   **Verify activeController:** Confirm the `_activeController = null;` line and the getter/setter for `activeController` exist.


*   **Refactor `src/routes/(app)/+layout.svelte` (App Shell & Shared Init):**
    *   **Purpose:** This is the main application shell, shared by `/axe`, `/camera`, etc. It handles MediaPipe initialization and provides shared UI called `RightMenu.svelte`.
    *   **Context:** Call `createSharedContext(CONTEXT_KEY)` and `setContext(CONTEXT_KEY, sharedContext)`.
    <!-- WARN -->
    *   **DOM Refs:** Keep `bind:this` for `videoElement`, `leftPane`, `container`, `resizer`, etc. on `+layout.svelte`.
    *   **Register Video:** Keep `$effect` to call `registerVideoElement(videoElement)` when `videoElement` is bound on `+layout.svelte`.
    <!-- WARN -->
    *   **MediaPipe Init:**
        *   Add state: `let mediaPipeInitialized = $state(false)`, `let mediaPipeError = $state(null)`, `let videoElementForInit = $state<HTMLVideoElement | null>(null)`.
        *   Add the `registerVideoElement` function and set it in context (`setContext('registerVideoElement', registerVideoElement)`).
        *   Add the `$effect.pre` block that waits for `videoElementForInit` and calls `mediaService.initializeWithVideoElement`. Update `mediaPipeInitialized`, `mediaPipeError`, and context status (`sharedContext.detectionStatus`, `sharedContext.mediaPipeLoaded`) based on the result.

    *   **Markup:** Include `<RightMenu />` and `<main>{@render children()}</main>`. Add error display for `mediaPipeError`.
    <!-- WARN -->
    *   **KEEP** the video background, main section, resizer, etc. – these belong on every page.
    <!-- WARN -->
    <!-- MOVED -->
    *   **Include UI:** Add the `<div class="video-background">...</div>`, `<section bind:this={container}...>`, `<div bind:this={resizer}...>` markup previously in `[slug]/+page.svelte`. Ensure the resizer uses context pointer handlers (`context.pointerstart`, etc.).
    <!-- MOVED -->
    *   **Styles:** Keep styles relevant only to the layout structure (like main padding/margins) and necessary global styles not already in `src/routes/+layout.svelte`.

*   **Refactor `src/routes/(app)/camera/+page.svelte` (Specific Game Page):**

    <!-- CORRECT -->
    *   **Purpose:** Contains everything needed to run the `/camera` game/experience within the `(app)` layout.
    *   **Get Context:** Use `useSharedContext(CONTEXT_KEY)` and `getContext('registerVideoElement')`.
    *   **Instantiate Controller:** `const handController = createOneHandController(...)`. Load specific configuration maybe from `config.svelte.js`.
    *   **Set Active Controller:** Use `$effect` to set `context.activeController = handController` and cleanup.
    <!-- WARN -->
    *   **DOM Refs:** performed in `+layout.svelte`, but share state.
    *   **Register Video:** performed in `+layout.svelte`, but share state.
    <!-- WARN -->
    <!-- AVOID MONOLITHIC CODE -->
    *   **ThreeScene:** Include `<ThreeScene {leftPane} onReady={handleThreeSceneReady} ... />`. Get scene ref via callback and store it in shared context: `context.threeJsScene = payload.scene`.
    <!-- AVOID MONOLITHIC CODE -->
    *   **Derive Props:** Use `$derived` to get `accessoryVisible`, `currentPosition`, etc., directly from `handController` state (`const currentPosition = $derived(handController.position);`).
    *   **DO NOT Include UI:** The `<div class="video-background">...</div>`, `<section bind:this={container}...>`, `<div bind:this={resizer}...>` markup previously in `[slug]/+page.svelte` performed in `+layout.svelte`, but share state.
    <!-- CORRECT -->
    <!-- AVOID MONOLITHIC CODE -->
    *   **Load/Select Accessory:** Determine which accessory component to render (e.g., based on `context.selectedAccessory` or data specific to this page). You can use `context.selectedAccessory.component`.
    <!-- AVOID MONOLITHIC CODE -->
    <!-- AVOID DEPRECATED SYNTAX -->
    *   **Render Accessory:** Use `<svelte:component this={...} ... />` passing the derived plain values (`visible={accessoryVisible}`, `position={currentPosition}`, etc.) as props.
    <!-- AVOID DEPRECATED SYNTAX -->



*   **Verify Accessory Components (src/routes/(app)/camera/Axe.svelte, etc.):**
    *   Ensure they accept plain props (visible, position, quaternion, scale).
    *   Ensure their `$effect` correctly updates the `THREE.Mesh` from these props. (The version from the codebase dump seems correct).


*   **Verify mediapipeService.svelte.js:**

    *   Confirm it uses useSharedContext() and calls context.activeController.update(...) in onResults. (Should be correct from previous steps).

*   **Refactor `src/routes/(app)/axe/+page.svelte`:**
    *   LOW PRIORITY.
    *   Follow the same pattern (perhaps with different options), etc.



*   **Cleanup:**

    *   Delete the entire src/routes/\[slug\]/ directory.

    *   Delete src/routes/axe/Axe.svelte and src/routes/axe/data.json (since logic moves to src/routes/(app)/axe/+page.svelte).

    *   Delete src/routes/camera/config.svelte.js, data.json, Axe.svelte, Sword.svelte, Wand.svelte (as components are now imported directly, and page-specific config/logic lives in src/routes/(app)/camera/+page.svelte). Correction: Keep the accessory components (Axe.svelte, Wand.svelte, Sword.svelte) inside src/routes/(app)/camera/ if that's where they logically belong for the camera route, or move them to a shared $lib location if used by multiple app routes. Delete the config/data files if their logic is moved into the page script.



**Summary of Changes:**

*   The (app)/+layout.svelte becomes the central point for shared app setup (context, MediaPipe init, RightMenu).

*   Each specific game page (e.g., (app)/camera/+page.svelte) becomes responsible for:

    *   Providing the necessary DOM elements (like videoElement) to the layout via context.

    *   Instantiating its specific controller.

    *   Setting itself as the activeController in context.

    *   Setting up its ThreeScene.

    *   Deriving state from the controller.

    *   Rendering the correct accessory with the derived state.


*   This aligns with SvelteKit's layout philosophy and the working controller pattern, separating shared concerns (layout) from route-specific concerns (page).


This plan provides a clear path to integrate your working controller logic into the correct SvelteKit routing structure.
