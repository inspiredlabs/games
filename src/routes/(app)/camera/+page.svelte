<script>
  // src/routes/(app)/camera/+page.svelte
  import { browser } from '$app/environment';
  import { useSharedContext } from '$lib/useSharedContext.svelte.js';
  import ThreeScene from '$lib/ThreeScene.svelte';
  import { gameConfig } from './gameConfig.svelte.js'; // Keep for initial accessory name

  // --- Import Controller Factory ---
  // Use the import directly to avoid "unused import" warning
  import { createOneHandController } from '$lib/controllerOneHand.svelte.js';

  // --- Import Accessory Components Directly --- 
  import WandComponent from './Wand.svelte';
  import SwordComponent from './Sword.svelte';
  import AxeComponent from './Axe.svelte';

  // --- Define Accessory List Statically (Locally) ---
  const HAND_ACCESSORIES_LIST = [
    { name: 'Axe', component: AxeComponent },
    { name: 'Wand', component: WandComponent },
    { name: 'Sword', component: SwordComponent }
  ];

  // Get the shared context (provided by layout)
  const context = useSharedContext();
  
  // State for scene and initialization
  let sceneReady = $state(false);
  let initializationError = $state(null);
  let debugInfo = $state({ status: 'Page Initializing' });

  // --- Controller Initialization (Direct usage of createOneHandController) ---
  const oneHandConfig = gameConfig.controllers.find(c => c.type === 'oneHand');
  let handController = createOneHandController(oneHandConfig?.options || {});
  debugInfo.status = 'Controller created';

  // --- Populate Context Accessories and Set Initial Accessory (using $effect.pre) ---
  $effect.pre(() => {
    if (browser) {
      // Populate accessories in context ONLY IF EMPTY
      if (context.currentGameAccessories.length === 0) {
        console.log('[Camera Page Effect - Context List] Populating context.gameAccessories');
        context.setGameAccessories(HAND_ACCESSORIES_LIST);

        // Determine and set the initial accessory index *once* after populating
        const initialAccName = gameConfig.initialAccessory;
        let initialIndex = -1;
        if (initialAccName) {
          initialIndex = HAND_ACCESSORIES_LIST.findIndex(acc => acc.name === initialAccName);
          if (initialIndex < 0) {
            console.warn(`[Camera Page Init] Initial accessory '${initialAccName}' not found in local list. Defaulting to first.`);
            initialIndex = 0;
          }
        } else {
          initialIndex = 0;
          console.log("[Camera Page Init] No initial accessory specified. Defaulting to first.");
        }

        // Set the index in the context *only during this initial population*
        if (context.selectedAccessoryIndex === -1) { // Check if not already set
            context.selectedAccessoryIndex = initialIndex;
            debugInfo.status = 'Initial accessory set';
            console.log(`[Camera Page Init] Set selectedAccessoryIndex to: ${initialIndex} (${HAND_ACCESSORIES_LIST[initialIndex]?.name})`);
        }
      }
      // Removed the problematic 'if (context.selectedAccessoryIndex !== initialIndex)' block
      // that was resetting the selection on every update.
    }
  });

  // Three.js scene ready/destroy handlers
  function handleThreeSceneReady(payload) {
    if (!payload || !payload.scene) return;
    
    context.threeJsScene = payload.scene;
    context.threeJsCamera = payload.camera;
    context.threeJsRenderer = payload.renderer;
    sceneReady = true;
    context.threeJsReady = true;
    
    // Add this line to update layout's loader state
    if (context.setSceneReady) {
      context.setSceneReady(true);
    } else {
      console.warn("[Camera Page] context.setSceneReady function not available from layout.");
    }
    
    debugInfo.status = 'Scene ready';
  }
  
  function handleThreeSceneDestroy() {
    context.threeJsScene = null;
    context.threeJsCamera = null;
    context.threeJsRenderer = null;
    sceneReady = false;
    context.threeJsReady = false;
    
    // Update layout's loader state
    if (context.setSceneReady) {
      context.setSceneReady(false);
    }
    
    debugInfo.status = 'Scene destroyed';
  }

  // Derived state to check if essential DOM elements from layout are ready
  const layoutDomReady = $derived(context.layoutInitialized && !!context.leftPane && !!context.canvas);

  // Log when layoutDomReady changes
  $effect(() => {
    console.log(`[Camera Page Effect] layoutDomReady changed to: ${layoutDomReady}`);
    if (layoutDomReady) {
      debugInfo.status = 'Layout Ready, waiting for Scene';
    }
  });

  // Set active controller in an effect.pre to ensure it's available early
  $effect.pre(() => {
    if (handController && context.activeController !== handController) {
      console.log('[Camera Page Effect - Controller] Setting activeController in context.');
      context.activeController = handController;
      debugInfo.status = 'Controller Set';
      
      // Cleanup function to remove the controller when the component unmounts
      return () => {
        if (context.activeController === handController) {
          console.log('[Camera Page Effect Cleanup - Controller] Clearing activeController from context.');
          context.activeController = null;
        }
      };
    }
  });

  // Derived values for accessory rendering
  const accessoryVisible = $derived(context.activeController?.visible ?? false);
  const accessoryPosition = $derived(context.activeController?.position);
  const accessoryQuaternion = $derived(context.activeController?.quaternion);
  const accessoryScale = $derived(context.activeController?.scale);

  // --- Derive the specific component locally using the context index and local list --- 
  const SelectedAccessoryComponent = $derived(HAND_ACCESSORIES_LIST[context.selectedAccessoryIndex]?.component);

  // --- Boolean for rendering --- 
  const shouldRenderAccessory = $derived(
    sceneReady &&
    !!context.threeJsScene &&
    !!SelectedAccessoryComponent && 
    !!context.activeController
  );
</script>

<!-- Debug panel -->
<div class="fixed top-0 left-0 z-max p-2 bg-black-50 white code">
  <div>Status: {debugInfo.status}</div>
  <div>LayoutDOM: {layoutDomReady ? 'Ready' : 'Waiting'}</div>
  <div>SceneReady: {sceneReady ? 'Yes' : 'No'}</div>
  <div>MP Ready: {context.mediaPipeLoaded ? 'Ready' : 'Not Ready'}</div>
  <div>Controller: {context.activeController ? 'Set' : 'Not Set'}</div>
  <div>Selected: {context.selectedAccessory?.name || 'None'}</div>
  <div>Render: {shouldRenderAccessory ? 'Yes' : 'No'}</div>
</div>

<!-- Explicit check for layout DOM readiness -->
{#if layoutDomReady}
  <ThreeScene
    leftPane={context.leftPane} 
    onReady={handleThreeSceneReady}
    onDestroy={handleThreeSceneDestroy}
  />
{:else}
  <div class="fixed top-16 left-0 z-max p-2 bg-red white">
    [Camera Page] Layout DOM elements (leftPane/canvas) not available yet.
  </div>
{/if}

<!-- Render the selected accessory -->
{#if shouldRenderAccessory}
  {@const Accessory = SelectedAccessoryComponent}
  {#key Accessory} 
    <Accessory
      scene={context.threeJsScene}
      visible={accessoryVisible}      
      position={accessoryPosition}   
      quaternion={accessoryQuaternion}
      scale={accessoryScale}      
    />
  {/key}
{:else if sceneReady && context.threeJsScene && context.selectedAccessoryIndex !== -1 && !SelectedAccessoryComponent}
  <div class="fixed top-32 left-0 z-max p-2 bg-yellow black">
    [Camera Page] Warning: Should render but selected accessory (Index: {context.selectedAccessoryIndex}) has no component.
  </div>
{/if}

{#if initializationError}
  <div class="fixed z-max bottom-8 left-1 bg-red white pa2 br3 code">
    Page Error: {initializationError}
  </div>
{/if}
{#if context.detectionStatus && context.detectionStatus.startsWith('Error')}
  <div class="fixed z-max bottom-1 left-1 bg-orange white pa2 br3 code">
    Layout/MP Error: {context.detectionStatus}
  </div>
{/if}