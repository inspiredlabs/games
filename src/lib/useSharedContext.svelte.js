// $lib/useSharedContext.svelte.js
import { getContext, setContext } from 'svelte';
// Import accessory components needed for the list definition
import WandComponent from '$routes/camera/Wand.svelte';
import SwordComponent from '$routes/camera/Sword.svelte';
import AxeComponent from '$routes/camera/Axe.svelte';

// Symbol used as context key to prevent collisions
const CONTEXT_KEY = Symbol('sharedContext');

// Define accessories list statically (assuming it doesn't change)
const HAND_ACCESSORIES_LIST = [
  { name: 'Axe', component: AxeComponent },
  { name: 'Wand', component: WandComponent },
  { name: 'Sword', component: SwordComponent }
];

const DEFAULT_VALUES = {
  // Layout and video properties
  layout: {
    videoWidth: 0,
    videoHeight: 0,
    dividerPosition: typeof window !== 'undefined' ? window.innerWidth * 0.5 : 500,
    videoReady: false,
    dragging: false,
    startX: 0,
    paneDimensions: { leftWidth: 0, rightWidth: 0 },
    layoutInitialized: false, // Added flag based on +page usage
  },

  // MediaPipe properties
  hand: {
    landmarks: [],
    state: 'unknown',
    center: null,
    centerSmoothed: null,
    found: false,
    detectionReady: false,
    status: 'Initializing...',
    loaded: false
  },

  // Three.js properties
  three: {
    ready: false,
    renderCount: 0,
    particleCount: 0,
    lastRenderTime: 0
  },

  // Accessory properties
  accessory: {
      selectedIndex: 0 // Default to the first accessory
  }
};

/**
 * Create and initialize shared context to be called once
 */
export function createSharedContext() {
  // Create reactive state object
  const state = $state({
    // Flattened state structure for easier access
    videoWidth: DEFAULT_VALUES.layout.videoWidth,
    videoHeight: DEFAULT_VALUES.layout.videoHeight,
    dividerPosition: DEFAULT_VALUES.layout.dividerPosition,
    videoReady: DEFAULT_VALUES.layout.videoReady,
    dragging: DEFAULT_VALUES.layout.dragging,
    startX: DEFAULT_VALUES.layout.startX,
    paneDimensions: DEFAULT_VALUES.layout.paneDimensions,
    layoutInitialized: DEFAULT_VALUES.layout.layoutInitialized, // Initialize flag

    handLandmarks: DEFAULT_VALUES.hand.landmarks,
    handState: DEFAULT_VALUES.hand.state,
    handCenter: DEFAULT_VALUES.hand.center,
    handCenterSmoothed: DEFAULT_VALUES.hand.centerSmoothed,
    avgFingerTipDistance: DEFAULT_VALUES.hand.avgFingerTipDistance,
    handFound: DEFAULT_VALUES.hand.found,
    handDetectionReady: DEFAULT_VALUES.hand.detectionReady,
    detectionStatus: DEFAULT_VALUES.hand.status,
    mediaPipeLoaded: DEFAULT_VALUES.hand.loaded,

    threeJsReady: DEFAULT_VALUES.three.ready,
    renderCount: DEFAULT_VALUES.three.renderCount,
    particleCount: DEFAULT_VALUES.three.particleCount,
    lastRenderTime: DEFAULT_VALUES.three.lastRenderTime,

    // Accessory reactive state
    selectedAccessoryIndex: DEFAULT_VALUES.accessory.selectedIndex,

    ready: true // General readiness flag
  });

  // Derived state
  const _aspectRatio = $derived(
    state.videoWidth && state.videoHeight
      ? state.videoWidth / state.videoHeight
      : 16/9
  );

  // Non-reactive references
  let _videoElement = null;
  let _container = null;
  let _leftPane = null;
  let _rightPane = null;
  let _resizer = null;
  let _videoOverlayGray = null;
  let _canvas = null;
  let _canvasContext = null;
  let _threeJsScene = null;
  let _threeJsRenderer = null;
  let _threeJsCamera = null;
  let _activeController = null; // Reference to the currently active controller instance
  let _resizeRAF = null;
  let _lastContainerWidth = 0;
  let _resizeCleanup = () => {}; // Store the cleanup function for the resize listener

  // Create the context API with property getters/setters
  const context = {
    // Layout and video properties
    get videoWidth() { return state.videoWidth; },
    set videoWidth(v) { state.videoWidth = v; },
    get videoHeight() { return state.videoHeight; },
    set videoHeight(v) { state.videoHeight = v; },
    get dividerPosition() { return state.dividerPosition; },
    // dividerPosition is updated via updateLayout method
    get videoReady() { return state.videoReady; },
    set videoReady(v) { state.videoReady = v; },
    get dragging() { return state.dragging; },
    // dragging is updated via pointer methods
    get layoutInitialized() { return state.layoutInitialized; }, // Getter for flag
    set layoutInitialized(v) { state.layoutInitialized = v; }, // Setter for flag

    // MediaPipe properties
    get handLandmarks() { return state.handLandmarks; },
    set handLandmarks(v) { state.handLandmarks = v; },
    get handState() { return state.handState; },
    set handState(v) { state.handState = v; },
    get handCenter() { return state.handCenter; },
    set handCenter(v) { state.handCenter = v; },
    get handCenterSmoothed() { return state.handCenterSmoothed; },
    set handCenterSmoothed(v) { state.handCenterSmoothed = v; },
    
    // log grip
    get avgFingerTipDistance() { return state.avgFingerTipDistance; },
    set avgFingerTipDistance(v) { state.avgFingerTipDistance = v; },

    // --- Active Controller (ESSENTIAL) ---
    get activeController() { return _activeController; },
    set activeController(controllerInstance) {
        // Check if the instance actually changed to avoid unnecessary logs/updates
        if (_activeController !== controllerInstance) {
            _activeController = controllerInstance;
            // Optional: Log when the controller changes
            // console.log('[Context] Active controller updated:', controllerInstance ? controllerInstance.debugState?.controllerType : 'None');
        }
    },
    // --- End Active Controller ---

    get handFound() { return state.handFound; },
    set handFound(v) { state.handFound = v; },
    get handDetectionReady() { return state.handDetectionReady; },
    set handDetectionReady(v) { state.handDetectionReady = v; },
    get detectionStatus() { return state.detectionStatus; },
    set detectionStatus(v) { state.detectionStatus = v; },
    get mediaPipeLoaded() { return state.mediaPipeLoaded; },
    set mediaPipeLoaded(v) { state.mediaPipeLoaded = v; },

    // Three.js properties
    get threeJsReady() { return state.threeJsReady; },
    set threeJsReady(v) { state.threeJsReady = v; },
    get renderCount() { return state.renderCount; },
    set renderCount(v) { state.renderCount = v; },
    get particleCount() { return state.particleCount; },
    set particleCount(v) { state.particleCount = v; },
    get lastRenderTime() { return state.lastRenderTime; },
    set lastRenderTime(v) { state.lastRenderTime = v; },

    // --- Accessory Getters/Setters ---
    get handAccessories() { return HAND_ACCESSORIES_LIST; },
    get selectedAccessoryIndex() { return state.selectedAccessoryIndex; },
    set selectedAccessoryIndex(index) {
        const idx = parseInt(index, 10);
        if (!isNaN(idx) && idx >= 0 && idx < HAND_ACCESSORIES_LIST.length) {
            if (state.selectedAccessoryIndex !== idx) {
                state.selectedAccessoryIndex = idx;
                // console.log(`[Context] Accessory index updated to: ${idx} (${this.selectedAccessory?.name})`);
            }
        } else {
            console.warn(`[Context] Invalid accessory index set attempt: ${index}`);
        }
    },
    get selectedAccessory() {
        return HAND_ACCESSORIES_LIST[state.selectedAccessoryIndex] || null;
    },
    // --- End Accessory ---

    // Resource references
    get canvas() { return _canvas; },
    set canvas(v) { _canvas = v; },
    get canvasContext() { return _canvasContext; },
    set canvasContext(v) { _canvasContext = v; },
    get threeJsScene() { return _threeJsScene; },
    set threeJsScene(v) { _threeJsScene = v; },
    get threeJsRenderer() { return _threeJsRenderer; },
    set threeJsRenderer(v) { _threeJsRenderer = v; },
    get threeJsCamera() { return _threeJsCamera; },
    set threeJsCamera(v) { _threeJsCamera = v; },

    // Derived values
    get aspectRatio() { return _aspectRatio; },

    // Utility methods
    getSafe(key, defaultValue = null) {
      return key in state ? state[key] : defaultValue;
    },
    isReady() {
      return state.ready;
    },
    getVideoElement() {
      return _videoElement;
    },

    // Set DOM references
    setElements(elements) {
      // Keep original implementation - ensure all refs are included
      const { container, leftPane, rightPane, resizer, videoElement, videoOverlayGray, handCanvas } = elements;

      if (container) _container = container;
      if (leftPane) _leftPane = leftPane;
      if (rightPane) _rightPane = rightPane;
      if (resizer) _resizer = resizer;
      if (videoElement) _videoElement = videoElement;
      if (videoOverlayGray) _videoOverlayGray = videoOverlayGray;
      // If handCanvas is passed separately, handle it here or via direct setter
      if (handCanvas) _canvas = handCanvas;

      if (_container && !_lastContainerWidth) {
        _lastContainerWidth = _container.offsetWidth;
      }
    },

    // Layout management - Keep original implementation
    updateLayout(newDividerPos) {
      if (!_container) {
          // console.warn("[Context] updateLayout called before container element is set.");
          return state.dividerPosition; // Return current state if no container
      }

      const containerWidth = _container.offsetWidth;
      // Ensure divider stays within reasonable bounds (e.g., 50px from each edge)
      const boundedPos = Math.max(50, Math.min(containerWidth - 50, newDividerPos));

      // Update DOM elements directly using refs
      if (_leftPane) _leftPane.style.width = `${boundedPos}px`;
      if (_rightPane) _rightPane.style.width = `${containerWidth - boundedPos}px`;
      if (_resizer) _resizer.style.left = `${boundedPos}px`; // Position based on left edge of right pane/end of left pane

      // Update clip path for grayscale overlay based on the *divider position*
      if (_videoOverlayGray) {
        // Clip everything to the *right* of the divider position
        _videoOverlayGray.style.clipPath = `inset(0 0 0 ${boundedPos}px)`;
      }

      // Update reactive state only if the bounded position actually changed
      if (state.dividerPosition !== boundedPos) {
        state.dividerPosition = boundedPos;
      }

      // Update stored pane dimensions after layout change
       if (_leftPane && _rightPane) {
           state.paneDimensions = {
               leftWidth: _leftPane.offsetWidth,
               rightWidth: _rightPane.offsetWidth
           };
       }


      return boundedPos; // Return the final applied position
    },


    // Window resize handler - Keep original implementation
    handleResize() {
      if (typeof window === 'undefined') return;
      if (_resizeRAF) cancelAnimationFrame(_resizeRAF);
    
      _resizeRAF = requestAnimationFrame(() => {
        if (!_container) return;
        
        const containerWidth = _container.offsetWidth;
        if (containerWidth === _lastContainerWidth) return;
        
        // CRITICAL FIX: Calculate divider position as a proportion of container width
        const ratio = state.dividerPosition / _lastContainerWidth;
        const newPosition = Math.round(containerWidth * ratio);
        
        // Update last width AFTER using it for calculation
        _lastContainerWidth = containerWidth;
        
        // Update layout with the new position
        context.updateLayout(newPosition);
      });
    },


    // Pointer event handlers - Keep original implementations
    pointermove(e) {
      if (!state.dragging) return;
      // Use clientX consistently
      const currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      
      // New potential position based on initial pane width + delta
      const containerRect = _container.getBoundingClientRect();
      const newPos = currentX - containerRect.left;
      
      context.updateLayout(newPos); // updateLayout handles bounding
    },

    pointerend() {
      if (!state.dragging || !_container) return; // Ensure container exists

      state.dragging = false;
      if (document) document.body.style.cursor = 'default';
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousemove', context.pointermove);
        window.removeEventListener('mouseup', context.pointerend);
        window.removeEventListener('touchmove', context.pointermove);
        window.removeEventListener('touchend', context.pointerend);
      }
      console.log("[Context] Dragging ended.");
    },

    

    pointerstart(e) {
      state.startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      state.dragging = true;
      
      if (_leftPane && _rightPane) {
        state.paneDimensions = {
          leftWidth: _leftPane.offsetWidth,
          rightWidth: _rightPane.offsetWidth
        };
      }
      
      if (document) document.body.style.cursor = 'col-resize';
      
      // Add all event listeners
      if (typeof window !== 'undefined') {
        window.addEventListener('mousemove', context.pointermove);
        window.addEventListener('mouseup', context.pointerend);
        window.addEventListener('touchmove', context.pointermove, { passive: false });
        window.addEventListener('touchend', context.pointerend);
      }
      
      if (e?.preventDefault) e.preventDefault();
    },

    // Camera initialization - Keep original implementation
    async initCamera() {
      if (typeof window === 'undefined' || !_videoElement) return;
      if (state.videoReady) return; // Avoid re-init

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        _videoElement.srcObject = stream;
        await new Promise((resolve, reject) => {
            _videoElement.onloadedmetadata = () => {
              state.videoReady = true;
              state.videoWidth = _videoElement.videoWidth;
              state.videoHeight = _videoElement.videoHeight;
              resolve();
            };
             _videoElement.onerror = reject;
        });
      } catch (error) {
        console.error('Camera access error:', error.name, error.message);
        state.videoReady = false;
      }
    },

    // Cleanup function - Keep original implementation
    cleanup() {
      // Use the stored cleanup function from setupResizeListener
      _resizeCleanup();
      _resizeCleanup = () => {}; // Clear stored cleanup after calling

      if (_resizeRAF) { cancelAnimationFrame(_resizeRAF); _resizeRAF = null; }
      // Ensure pointer listeners are removed if cleanup happens mid-drag
      if (state.dragging) { context.pointerend(); }

      // Clear controller reference on full cleanup
      _activeController = null; // <--- ESSENTIAL: Ensure controller reference is cleared on full cleanup
        // console.log("[Context] Cleanup executed.");

      console.log("[Context] Cleanup executed.");
       // Reset layout initialized flag on full cleanup maybe?
       // state.layoutInitialized = false; // Consider if needed
    },

    // Setup resize listener - Store cleanup function
    setupResizeListener() {
      if (typeof window !== 'undefined') {
        // Clean up previous listener before adding new one
        _resizeCleanup();

        const handler = context.handleResize; // Reference the handler
        window.addEventListener('resize', handler, { passive: true });
        console.log("[Context] Resize listener added.");
        // Store the specific cleanup for this listener
        _resizeCleanup = () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', handler);
                console.log("[Context] Resize listener removed via stored cleanup.");
            }
             if (_resizeRAF) { cancelAnimationFrame(_resizeRAF); _resizeRAF = null;} // Also clear RAF on cleanup
        };
        // Return the stored cleanup function so caller's $effect can use it
        return _resizeCleanup;
      }
      return () => {}; // Return no-op if no window
    }
  };

  // Set the context
  setContext(CONTEXT_KEY, context);
  return context;
}

/**
 * Create a dummy context for safety (Update with accessory defaults)
 */
function createDummyContext() {
  // Keep previous dummy implementation, ensure accessory defaults are included
  return {
    ready: false, videoWidth: 0, videoHeight: 0, dividerPosition: 500, videoReady: false, dragging: false, layoutInitialized: false,
    handLandmarks: [], handState: 'unknown', handCenter: null, handCenterSmoothed: null, handFound: false,
    handDetectionReady: false, detectionStatus: 'Initializing...', mediaPipeLoaded: false,
    threeJsReady: false, renderCount: 0, particleCount: 0, lastRenderTime: 0, aspectRatio: 16/9,
    handAccessories: [], selectedAccessoryIndex: -1, selectedAccessory: null,
    
    activeController: null, // <--- ESSENTIAL: Include in dummy context

    canvas: null, canvasContext: null, threeJsScene: null, threeJsRenderer: null, threeJsCamera: null,
    getSafe: (key, defaultValue = null) => defaultValue, isReady: () => false, updateLayout: () => {},
    handleResize: () => {}, pointermove: () => {}, pointerend: () => {}, pointerstart: () => {},
    initCamera: () => Promise.resolve(), cleanup: () => {}, setupResizeListener: () => () => {},
    setElements: () => {}, getVideoElement: () => null
  };
}

/**
 * Retrieves shared context, called during component init (Keep as is)
 */
export function useSharedContext() {
  try {
    const ctx = getContext(CONTEXT_KEY);
    if (!ctx) {
        console.warn("useSharedContext called before createSharedContext. Using dummy context.");
        return createDummyContext();
    }
    return ctx;
  } catch (e) {
    console.error('useSharedContext error (likely called outside component init):', e);
    return createDummyContext();
  }
}