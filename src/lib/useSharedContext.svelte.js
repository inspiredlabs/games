// $lib/useSharedContext.svelte.js
import { getContext, setContext } from 'svelte';
// Import accessory components needed for the list definition
import WandComponent from '$routes/(app)/camera/Wand.svelte';
import SwordComponent from '$routes/(app)/camera/Sword.svelte';
import AxeComponent from '$routes/(app)/camera/Axe.svelte';

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
    layoutInitialized: false, 
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
      selectedIndex: 0 
  }
};

/**
 * Create and initialize shared context to be called once
 */
export function createSharedContext() {
  // Create reactive state object for primitive values
  const state = $state({
    // Layout and video properties
    videoWidth: DEFAULT_VALUES.layout.videoWidth,
    videoHeight: DEFAULT_VALUES.layout.videoHeight,
    dividerPosition: DEFAULT_VALUES.layout.dividerPosition,
    videoReady: DEFAULT_VALUES.layout.videoReady,
    dragging: DEFAULT_VALUES.layout.dragging,
    startX: DEFAULT_VALUES.layout.startX,
    paneDimensions: DEFAULT_VALUES.layout.paneDimensions,
    layoutInitialized: DEFAULT_VALUES.layout.layoutInitialized,

    // MediaPipe properties
    handLandmarks: DEFAULT_VALUES.hand.landmarks,
    handState: DEFAULT_VALUES.hand.state,
    handCenter: DEFAULT_VALUES.hand.center,
    handCenterSmoothed: DEFAULT_VALUES.hand.centerSmoothed,
    avgFingerTipDistance: DEFAULT_VALUES.hand.avgFingerTipDistance,
    handFound: DEFAULT_VALUES.hand.found,
    handDetectionReady: DEFAULT_VALUES.hand.detectionReady,
    detectionStatus: DEFAULT_VALUES.hand.status,
    mediaPipeLoaded: DEFAULT_VALUES.hand.loaded,

    // Three.js properties
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

  // --- Use $state for element references that need reactivity --- 
  let _videoElement = $state(null);
  let _container = $state(null);
  let _leftPane = $state(null);
  let _rightPane = $state(null);
  let _resizer = $state(null);
  let _videoOverlayGray = $state(null);
  let _canvas = $state(null);
  // --- End reactive element references ---

  // Non-reactive references (can remain as let)
  let _canvasContext = null;
  let _threeJsScene = null;
  let _threeJsRenderer = null;
  let _threeJsCamera = null;
  let _activeController = null; // Controller instance itself doesn't need to be reactive
  let _resizeRAF = null;
  let _lastContainerWidth = 0;
  let _resizeCleanup = () => {};

  // Create the context API with property getters/setters
  const context = {
    // Layout and video properties (Access primitive state)
    get videoWidth() { return state.videoWidth; },
    set videoWidth(v) { state.videoWidth = v; },
    get videoHeight() { return state.videoHeight; },
    set videoHeight(v) { state.videoHeight = v; },
    get dividerPosition() { return state.dividerPosition; },
    get videoReady() { return state.videoReady; },
    set videoReady(v) { state.videoReady = v; },
    get dragging() { return state.dragging; },
    get layoutInitialized() { return state.layoutInitialized; }, 
    set layoutInitialized(v) { state.layoutInitialized = v; }, 

    // MediaPipe properties (Access primitive state)
    get handLandmarks() { return state.handLandmarks; },
    set handLandmarks(v) { state.handLandmarks = v; },
    get handState() { return state.handState; },
    set handState(v) { state.handState = v; },
    get handCenter() { return state.handCenter; },
    set handCenter(v) { state.handCenter = v; },
    get handCenterSmoothed() { return state.handCenterSmoothed; },
    set handCenterSmoothed(v) { state.handCenterSmoothed = v; },
    get avgFingerTipDistance() { return state.avgFingerTipDistance; },
    set avgFingerTipDistance(v) { state.avgFingerTipDistance = v; },
    get handFound() { return state.handFound; },
    set handFound(v) { state.handFound = v; },
    get handDetectionReady() { return state.handDetectionReady; },
    set handDetectionReady(v) { state.handDetectionReady = v; },
    get detectionStatus() { return state.detectionStatus; },
    set detectionStatus(v) { state.detectionStatus = v; },
    get mediaPipeLoaded() { return state.mediaPipeLoaded; },
    set mediaPipeLoaded(v) { state.mediaPipeLoaded = v; },

    // --- Active Controller (Remains non-reactive reference) ---
    get activeController() { return _activeController; },
    set activeController(controllerInstance) {
        if (_activeController !== controllerInstance) {
            _activeController = controllerInstance;
        }
    },
    // --- End Active Controller ---

    // Three.js properties (Access primitive state)
    get threeJsReady() { return state.threeJsReady; },
    set threeJsReady(v) { state.threeJsReady = v; },
    get renderCount() { return state.renderCount; },
    set renderCount(v) { state.renderCount = v; },
    get particleCount() { return state.particleCount; },
    set particleCount(v) { state.particleCount = v; },
    get lastRenderTime() { return state.lastRenderTime; },
    set lastRenderTime(v) { state.lastRenderTime = v; },

    // Accessory Getters/Setters (Access primitive state)
    get handAccessories() { return HAND_ACCESSORIES_LIST; },
    get selectedAccessoryIndex() { return state.selectedAccessoryIndex; },
    set selectedAccessoryIndex(index) {
        const idx = parseInt(index, 10);
        if (!isNaN(idx) && idx >= 0 && idx < HAND_ACCESSORIES_LIST.length) {
            if (state.selectedAccessoryIndex !== idx) {
                state.selectedAccessoryIndex = idx;
            }
        } else {
            console.warn(`[Context] Invalid accessory index set attempt: ${index}`);
        }
    },
    get selectedAccessory() {
        return HAND_ACCESSORIES_LIST[state.selectedAccessoryIndex] || null;
    },

    // --- Resource references: Use reactive getters/setters for DOM elements --- 
    get canvas() { return _canvas; }, // Return reactive state
    // No setter needed externally? Layout uses setElements
    get leftPane() { return _leftPane; }, // Return reactive state
    // No setter needed externally?
    get container() { return _container; }, // Return reactive state
     // No setter needed externally?
    get rightPane() { return _rightPane; }, // Return reactive state
     // No setter needed externally?
    get resizer() { return _resizer; }, // Return reactive state
     // No setter needed externally?
    get videoOverlayGray() { return _videoOverlayGray; }, // Return reactive state
     // No setter needed externally?
    getVideoElement() { return _videoElement; }, // Return reactive state via method
    // --- End reactive element getters/setters ---

    // Non-reactive getters/setters (remain as before)
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
    // getVideoElement handled above

    // Set DOM references (Now assigns to reactive state variables)
    setElements(elements) {
      const { container, leftPane, rightPane, resizer, videoElement, videoOverlayGray, handCanvas } = elements;

      // Assign to the reactive $state variables
      if (container) _container = container;
      if (leftPane) _leftPane = leftPane;
      if (rightPane) _rightPane = rightPane;
      if (resizer) _resizer = resizer;
      if (videoElement) _videoElement = videoElement;
      if (videoOverlayGray) _videoOverlayGray = videoOverlayGray;
      if (handCanvas) _canvas = handCanvas;

      // Keep the logic for initial container width
      if (_container && !_lastContainerWidth) {
        _lastContainerWidth = _container.offsetWidth;
      }
    },

    // Layout management (Needs to access reactive refs now)
    updateLayout(newDividerPos) {
      if (!_container) {
          return state.dividerPosition;
      }

      const containerWidth = _container.offsetWidth;
      const boundedPos = Math.max(50, Math.min(containerWidth - 50, newDividerPos));

      // Update DOM elements directly using reactive refs
      if (_leftPane) _leftPane.style.width = `${boundedPos}px`;
      if (_rightPane) _rightPane.style.width = `${containerWidth - boundedPos}px`;
      if (_resizer) _resizer.style.left = `${boundedPos}px`;

      if (_videoOverlayGray) {
        _videoOverlayGray.style.clipPath = `inset(0 0 0 ${boundedPos}px)`;
      }

      if (state.dividerPosition !== boundedPos) {
        state.dividerPosition = boundedPos;
      }

       if (_leftPane && _rightPane) {
           state.paneDimensions = {
               leftWidth: _leftPane.offsetWidth,
               rightWidth: _rightPane.offsetWidth
           };
       }

      return boundedPos;
    },

    // Window resize handler (Needs to access reactive container ref)
    handleResize() {
      if (typeof window === 'undefined') return;
      if (_resizeRAF) cancelAnimationFrame(_resizeRAF);

      _resizeRAF = requestAnimationFrame(() => {
        if (!_container) return;

        const containerWidth = _container.offsetWidth;
        if (containerWidth === _lastContainerWidth) return;

        const ratio = state.dividerPosition / _lastContainerWidth;
        const newPosition = Math.round(containerWidth * ratio);

        _lastContainerWidth = containerWidth;

        context.updateLayout(newPosition);
      });
    },

    // Pointer event handlers (Needs to access reactive container ref)
    pointermove(e) {
      if (!state.dragging || !_container) return;
      const currentX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      const containerRect = _container.getBoundingClientRect();
      const newPos = currentX - containerRect.left;
      context.updateLayout(newPos);
    },

    pointerend() {
      if (!state.dragging || !_container) return;
      state.dragging = false;
      if (document) document.body.style.cursor = 'default';
      if (typeof window !== 'undefined') {
        window.removeEventListener('mousemove', context.pointermove);
        window.removeEventListener('mouseup', context.pointerend);
        window.removeEventListener('touchmove', context.pointermove);
        window.removeEventListener('touchend', context.pointerend);
      }
    },

    pointerstart(e) {
      if(!_container) return; // Ensure container exists before starting drag
      state.startX = e.type.includes('touch') ? e.touches[0].clientX : e.clientX;
      state.dragging = true;

      if (_leftPane && _rightPane) {
        state.paneDimensions = {
          leftWidth: _leftPane.offsetWidth,
          rightWidth: _rightPane.offsetWidth
        };
      }

      if (document) document.body.style.cursor = 'col-resize';

      if (typeof window !== 'undefined') {
        window.addEventListener('mousemove', context.pointermove);
        window.addEventListener('mouseup', context.pointerend);
        window.addEventListener('touchmove', context.pointermove, { passive: false });
        window.addEventListener('touchend', context.pointerend);
      }

      if (e?.preventDefault) e.preventDefault();
    },

    // Camera initialization (Needs to access reactive videoElement ref)
    async initCamera() {
      // Check reactive _videoElement directly
      if (typeof window === 'undefined' || !_videoElement) {
          console.warn('[Context initCamera] No video element ref yet.');
          return; // Wait for element
      }
      if (state.videoReady) return; // Avoid re-init

      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } }
        });
        // Assign stream only if element exists (redundant check, but safe)
        if (_videoElement) {
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
         } else {
            throw new Error("Video element reference became null during initCamera.");
         }
      } catch (error) {
        console.error('[Context] Camera access error:', error.name, error.message);
        state.videoReady = false;
        throw error; // Re-throw error
      }
    },

    // Cleanup function
    cleanup() {
      _resizeCleanup();
      _resizeCleanup = () => {};
      if (_resizeRAF) { cancelAnimationFrame(_resizeRAF); _resizeRAF = null; }
      if (state.dragging) { context.pointerend(); }
      _activeController = null;

      // Reset reactive element refs
      _videoElement = null;
      _container = null;
      _leftPane = null;
      _rightPane = null;
      _resizer = null;
      _videoOverlayGray = null;
      _canvas = null;

      console.log("[Context] Cleanup executed.");
    },

    // Setup resize listener
    setupResizeListener() {
      if (typeof window !== 'undefined') {
        _resizeCleanup();
        const handler = context.handleResize;
        window.addEventListener('resize', handler, { passive: true });
        _resizeCleanup = () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('resize', handler);
            }
             if (_resizeRAF) { cancelAnimationFrame(_resizeRAF); _resizeRAF = null;}
        };
        return _resizeCleanup;
      }
      return () => {};
    }
  };

  // Set the context
  setContext(CONTEXT_KEY, context);
  return context;
}

/**
 * Create a dummy context for safety
 */
function createDummyContext() {
  // Reflect the structure, including reactive elements being null initially
  return {
    ready: false, videoWidth: 0, videoHeight: 0, dividerPosition: 500, videoReady: false, dragging: false, layoutInitialized: false,
    handLandmarks: [], handState: 'unknown', handCenter: null, handCenterSmoothed: null, handFound: false,
    handDetectionReady: false, detectionStatus: 'Initializing...', mediaPipeLoaded: false,
    threeJsReady: false, renderCount: 0, particleCount: 0, lastRenderTime: 0, aspectRatio: 16/9,
    handAccessories: [], selectedAccessoryIndex: -1, selectedAccessory: null,
    activeController: null,
    // Provide null for elements that are now reactive in the real context
    canvas: null, leftPane: null, container: null, rightPane: null, resizer: null, videoOverlayGray: null, 
    // Non-reactive elements
    canvasContext: null, threeJsScene: null, threeJsRenderer: null, threeJsCamera: null,
    getSafe: (key, defaultValue = null) => defaultValue, isReady: () => false, updateLayout: () => {},
    handleResize: () => {}, pointermove: () => {}, pointerend: () => {}, pointerstart: () => {},
    initCamera: () => Promise.resolve(), cleanup: () => {}, setupResizeListener: () => () => {},
    setElements: () => {}, 
    getVideoElement: () => null // Method still returns null in dummy
  };
}

/**
 * Retrieves shared context, called during component init
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