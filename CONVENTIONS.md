---

Cursor: AI context
- @Codebase // has the knowledge of your "entire codebase"?
- @src  // has the knowledge of your entire project
- @Stripe-payment  // click `+ new doument` to add external documentation into the chat window, and paste URL https://docs.sripe.com/payments
- from: https://www.youtube.com/shorts/Kr4MGyPXS_0

use:
- meshtron github

games using `mediapipe`: perplexity.ai/search/what-games-have-people-made-wi-VXuPWH9TQmOv4CNG708LQA

---


This guide emphasizes syntax, performance, and best practices to provide a high-performant 3D user experience using Svelte 5 (runes syntax) with Threlte 8. The current date is March 10, 2025, and this guide assumes up-to-date libraries.

* * *

Core Concepts: Svelte 5 Runes + Threlte 8


### 1\. $props Rune: Defining Component Inputs

In Svelte 5, the $props rune replaces export let for explicit prop declaration. This is particularly useful in Threlte for passing Three.js-related data (e.g., positions, materials).

**Syntax Example:**

`<script lang="svelte"> let { position = [0, 0, 0], material, scale = 1 } = $props(); </script> <T.Mesh {position} {scale}> <T.BoxGeometry /> {#if material} {material} {:else} <T.MeshStandardMaterial color="hotpink" /> {/if} </T.Mesh>`

**Key Notes:**

*   Default values (e.g., \[0, 0, 0\]) ensure props are optional.
*   {position} shorthand passes the prop directly to Threlte components.
*   Use TypeScript for better type inference: let { position = \[0, 0, 0\] } = $props<{ position?: \[number, number, number\] }>();.

* * *

### 2\. $state: Managing State Efficiently

$state declares reactive state in Svelte 5, but for 3D apps, overusing it can harm performance, especially in animation loops.

**Anti-Pattern (Avoid):**

`<script lang="svelte"> let rotation = $state(0); useFrame(() => { rotation += 0.01; // Triggers re-render every frame (60fps) }); </script> <T.Mesh rotation={[rotation, 0, 0]} />`

**Best Practice (Direct Mutation):**

`<script lang="svelte"> import { useFrame } from '@threlte/core'; const mesh = $state<THREE.Mesh | undefined>(undefined); useFrame(() => { if (mesh) mesh.rotation.x += 0.01; // Direct Three.js mutation }); </script> <T.Mesh bind:this={mesh}> <T.BoxGeometry /> <T.MeshStandardMaterial /> </T.Mesh>`

**Key Notes:**

*   Use $state for Three.js object references (e.g., mesh), not for frame-by-frame values.
*   bind:this={mesh} links the Threlte component to a variable for direct manipulation.
*   Avoid reactive updates in useFrame to prevent unnecessary DOM reconciliations.

* * *

# @threlte/core

useTask
=======

Tasks are part of Threlte’s _Task Scheduling System_. For details on how to use stages and tasks, see the [scheduling tasks](/docs/learn/basics/scheduling-tasks) page.

The hook `useTask` is used to create a [task](/docs/learn/basics/scheduling-tasks#tasks) that is used to run code on every frame.

Creating an Anonymous Task
--------------------------

In its most basic form, `useTask` takes a callback function as its argument. This function will be executed on every frame, starting on the next frame. It receives a `delta`, representing the time since the last frame as its argument. By default, the created task is added to [Threlte’s `mainStage`](#default-stages) in an arbitrary order (i.e. without dependencies).

```javascript
const { start, stop, started, task } = useTask((delta) => {
  // This function will be executed on every frame
})```


It returns an object with the following properties:

*   `start`: A function that starts the task. It will be executed on the next frame. Note that by default a task is started automatically.
*   `stop`: A function that stops the task. It will not be executed on the next frame.
*   `started`: A boolean Svelte `Readable` store indicating whether the task is started or not.
*   `task`: The task itself. You can use it to indicate a dependency to this task on another task.

Creating a Keyed Task
---------------------

You can _key_ a task by passing it as the first argument to `useTask`. This makes referencing this task easier across your app. The key can be any `string` or `symbol` value that is unique across all tasks in the stage it is added to.

```javascript
const {
  start,
  stop,
  started,
  task: someTask
} = useTask('some-task', (delta) => {
  // This function will be executed on every frame
})```

Creating a Task in a Stage
--------------------------

You can pass a stage that the task should be added to as an option to `useTask`, the stage can be passed by value or key. If no stage is passed, the task will be added to [Threlte’s `mainStage`](/docs/learn/basics/scheduling-tasks#default-stages).

```javascript
    useTask(
      (delta) => {
        // This function will be executed on every frame as a
        // task in the stage `afterRenderStage`.
      },
      { stage: afterRenderStage }
    )
```

Task Dependencies
-----------------

A common use case for tasks is to run code after another task has been executed. Imagine a game where an object is transformed by user input in one task and a camera follows that object in another task. The camera task should be executed after the object has been transformed.

To control the order in which tasks are executed in a stage, you can pass a `before` and `after` option to `useTask`. The tasks passed to these options are called **dependencies** and can be a task itself, the key of a task or an array of tasks or keys. The referenced tasks must be in the same stage as the task you are creating.

Task dependencies **can be created in any order** if they are passed by key. This means that you can declare a dependency (with `before` or `after`) on a task that is created later in your code. The declared dependencies will be taken into account when they are created later on.

If a task is passed by reference to the `before` or `after` option, the task created by `useTask` will automatically be added to the same stage as the task it depends on. If you pass a key instead and the task you want to reference is **not** in [Threlte’s `mainStage`](/docs/learn/basics/scheduling-tasks#default-stages), you will also need to pass the stage, either by value or key.

Examples
--------

# Starting and Stopping Tasks

By default, a task is started automatically. You can set it to not start automatically by passing `autoStart: false` as an option to `useTask`. You can then start and stop the task manually using the `start` and `stop` functions:


```javascript
const { start, stop, started } = useTask(
  (delta) => {
    // do something
  },
  { autoStart: false }
)

// start the task
start()

// stop the task
stop()

// check if the task is started
$inspect($started)
```

# `useTask` and On-Demand Rendering

By default, `useTask` will automatically invalidate the current frame and thereby request a re-render on the next frame. Most of the times, this is what you want. However, if you want more control over when things are re-rendered, you can pass `autoInvalidate: false` as an option to `useTask`. This will prevent the task from automatically invalidating the current frame. You can then invalidate the frame manually using the `invalidate` function returned by `useThrelte`:

```javascript
const { invalidate } = useThrelte()

const { start, stop, started } = useTask(
  (delta) => {
    // do something
    // invalidate the current frame
    if (someCondition) {
      invalidate()
    }
  },
  { autoInvalidate: false }
)
```


# Update Objects

To update objects in your scene, you can use the `useTask` hook to create a task that is executed on every frame. The delta time is passed as the first argument to make animations frame rate independent.

```<script>
  import { T, useTask } from '@threlte/core'
  import { Mesh } from 'svelte-three'

  let mesh

  useTask((delta) => {
    if (!mesh) return
    mesh.rotation.y += delta * 0.5
  })
</script>

<T.Mesh bind:ref={mesh}>
  <T.BoxGeometry />
</T.Mesh>
```

* * *

### 3\. $effect: Side Effects and Cleanup

$effect replaces onMount for reactive side effects, with built-in cleanup support. Use it for one-time setup, not animations.

**Syntax Example:**


```
<script lang="svelte">
import * as THREE from 'three';
let scene = $state<THREE.Scene>();
$effect.pre(() => {
  const light = new THREE.DirectionalLight(0xffffff, 1);
  if (scene) scene.add(light);
  return () => light.dispose(); // Cleanup on unmount });
</script>
<T.Scene bind:this={scene} />
```

**Key Notes:**

*   $effect.pre runs before DOM updates, ideal for Three.js object initialization.
*   Avoid $effect for animation logic—use useFrame instead.
*   Cleanup (e.g., light.dispose()) prevents memory leaks.

Best practice conventions to follow when using the `$effect`:

1.  USE $effect SPARINGLY, MAINLY FOR DOM MANIPULATION AND SIDE EFFECTS: `$effect` is best used for tasks that require direct DOM manipulation or handling side effects like analytics. It should not be used frequently for state synchronization.

2.  PREFER $derived FOR COMPUTED VALUES: Ensure predictable and reliable behavior with `$derived` for computed values

3.  ENSURE SYNCHRONOUS ACCESS OF DEPENDENCIES: Dependencies are automatically tracked by Svelte when reactive values are accessed within `$effect`. Ensure that all dependencies are accessed synchronously to avoid using outdated values, see: `https://www.thisdot.co/blog/svelte-5-is-here)[6](https://codehints.io/svelte/runes`

4.  RETURN CLEANUP FUNCTIONS WHEN NECESSARY: when you need to handle resources like intervals or event listeners to ensure proper cleanup updating or unmounting components.

5.  USE A SINGLE `$effect` FOR COHESIVE SIDE EFFECTS WITH SAME DEPENDENCIES: Use a single `$effect` when you need to manage a cohesive set of side effects that depend on the same set of reactive values. This simplifies dependency tracking and cleanup.

6.  USE MULTIPLE $effect FOR DISTINCT SIDE EFFECTS WITH DIFFERENT DEPENDENCIES: Use multiple `$effect` instances when you have distinct sets of side effects with different dependencies or cleanup needs. This helps maintain clarity and avoids unnecessary re-runs of unrelated effects.

7. KEEP $effect FUNCTIONS CONCISE AND FOCUSED: aim to improve code readability and maintainability.

8. USE $effect.root ONLY WHEN ABSOLUTELY NECESSARY: For nested effects that require manual control, consider using `$effect.root`, this is VERY advanced and should be avoided for cleaner and simpler approaches.


* * *

### 4\. $derived: Computed Values

$derived memoizes computed values, reducing redundant calculations. It’s great for Three.js vectors or derived properties.

**Syntax Example:**

```
<script lang="svelte">
  let x = $state(0);
  let y = $state(0);
  let z = $state(0);
  const position = $derived(() => new THREE.Vector3(x, y, z));
</script>
<T.Mesh position={position}>
  <T.BoxGeometry />
  <T.MeshStandardMaterial />
</T.Mesh>
```

**Key Notes:**

*   $derived only recalculates when dependencies (e.g., x, y, z) change.
*   Use for static or infrequently updated Three.js objects, not animation-driven properties.

* * *

Performance Optimization


### 1\. Reactive Granularity

*   **Bad:** Using $state for properties updated every frame (e.g., rotation, position).
*   **Good:** Mutate Three.js objects directly in useFrame.

**Example:**

`<script lang="svelte"> import { useFrame } from '@threlte/core'; let mesh = $state<THREE.Mesh>(); useFrame(({ delta }) => { if (mesh) mesh.rotation.y += delta; // ✅ No reactivity }); </script> <T.Mesh bind:this={mesh}> <T.BoxGeometry /> <T.MeshStandardMaterial /> </T.Mesh>`

### 2\. Context Management

Svelte 5’s setContext and getContext replace Threlte’s older context APIs for sharing data (e.g., scene settings).

**Parent Component:**

`<script lang="svelte"> import { setContext } from 'svelte'; const sceneContext = { debug: true, ambientLight: true }; setContext('threlte-scene', sceneContext); </script> <T.Scene> <slot /> </T.Scene>`

**Child Component:**

`<script lang="svelte"> import { getContext } from 'svelte'; const { debug } = getContext('threlte-scene'); </script> {#if debug} <T.GridHelper /> {/if}`

* * *

Threlte-Specific Best Practices
---

### 1\. Animation Pattern

Use useFrame for high-performance animations, avoiding reactive state.

**Example:**

`<script lang="svelte"> import { useFrame } from '@threlte/core'; let cube = $state<THREE.Mesh>(); useFrame(({ delta }) => { if (cube) { cube.rotation.x += delta * 0.5; cube.rotation.y += delta * 0.3; } }); </script> <T.Mesh bind:this={cube}> <T.BoxGeometry args={[1, 1, 1]} /> <T.MeshStandardMaterial color="cyan" /> </T.Mesh>`

### 2\. Event Handling

Threlte integrates Svelte’s event system for intuitive interaction.

**Example:**

`<script lang="svelte"> let hovered = $state(false); </script> <T.Mesh on:pointerenter={() => (hovered = true)} on:pointerleave={() => (hovered = false)} > <T.BoxGeometry /> <T.MeshStandardMaterial color={hovered ? 'red' : 'blue'} /> </T.Mesh>`

* * *

Migration Guide: Three.js to Threlte 8
--

### 1\. Declarative Structure

Replace imperative Three.js code with Threlte’s component-based syntax.

**Three.js:**

javascript



`const scene = new THREE.Scene(); const mesh = new THREE.Mesh( new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 'hotpink' }) ); scene.add(mesh);`

**Threlte:**

svelte



`<T.Scene> <T.Mesh> <T.BoxGeometry args={[1, 1, 1]} /> <T.MeshStandardMaterial color="hotpink" /> </T.Mesh> </T.Scene>`

### 2\. Reactivity

Leverage Svelte’s reactivity for non-animation properties.

**Example:**

`<script lang="svelte"> let color = $state('hotpink'); </script> <T.Mesh> <T.BoxGeometry /> <T.MeshStandardMaterial color={color} /> </T.Mesh> <button on:click={() => (color = 'cyan')}>Change Color</button>`

### 3\. Object Lifecycle

Threlte handles disposal automatically unless overridden.

**Example:**

`<script lang="svelte"> let mesh = $state<THREE.Mesh>(); </script> <T.Mesh bind:this={mesh} autoDispose={false}> <T.BoxGeometry /> <T.MeshStandardMaterial /> </T.Mesh>`

### 4\. TypeScript Integration

Use Threlte’s types for better safety.

**Example:**

svelte



`<script lang="ts"> import type { Mesh } from '@threlte/core'; let mesh = $state<Mesh>(); </script> <T.Mesh bind:this={mesh} />`

### 5\. Animation Loop

Replace requestAnimationFrame with useFrame.

**Three.js:**

javascript



`function animate() { requestAnimationFrame(animate); mesh.rotation.x += 0.01; } animate();`

**Threlte:**

`<script lang="svelte"> import { useFrame } from '@threlte/core'; let mesh = $state<THREE.Mesh>(); useFrame(() => { if (mesh) mesh.rotation.x += 0.01; }); </script> <T.Mesh bind:this={mesh} />`

### 6\. Camera Setup

Threlte simplifies renderer and camera setup.

**Example:**

svelte



`<T.Canvas shadows> <T.PerspectiveCamera makeDefault position={[0, 5, 10]} fov={75} /> <T.Scene> <T.Mesh> <T.BoxGeometry /> <T.MeshStandardMaterial /> </T.Mesh> </T.Scene> </T.Canvas>`



* * *





```javascript
<script>
  // Standard Component Interface Pattern for Svelte 5 with Context
  // 1. Import statements
  import { getContext } from 'svelte';

  // 2. Get shared context
  const sharedContext = getContext('sharedContext');

  // 3. Explicit props definition with $props rune
  let {
    // Only include props that need direct binding or DOM references
    elementRef = null,
    // Include any component-specific props
    specialOption = false
  } = $props();

  // 4. Component internal state with $state rune
  let componentState = $state(initialValue);
  let isActive = $state(false);

  // 5. Derived values with $derived rune
  const computedValue = $derived(() => {
    // Calculate derived value from context or props
    return sharedContext.someValue * 2;
  });

  // 6. Effects with $effect rune
  $effect(() => {
    // React to context or state changes
    if (sharedContext.someValue) {
      // Update component state
      componentState = sharedContext.someValue;
    }

    // Make component properties available to parent (when using bind:this)
    this.exposedValue = componentState;

    // Update shared context when needed
    sharedContext.componentValue = componentState;
  });

  // 7. Lifecycle management with $effect or onMount
  $effect(() => {
    // Setup code

    // Return cleanup function
    return () => {
      // Cleanup resources
    };
  });

  // 8. Component methods
  function handleEvent() {
    isActive = !isActive;
    // Update context directly
    sharedContext.someFlag = isActive;
  }
</script>

<!-- Component Template -->
<div bind:this={elementRef} class="component-wrapper">
  <button on:click={handleEvent}>
    {isActive ? 'Active' : 'Inactive'}
  </button>

  <div>Computed: {computedValue}</div>

  <!-- Conditional content -->
  {#if sharedContext.someCondition}
    <p>Conditional content based on context</p>
  {/if}
</div>

<style>
  /* Component styles */
  .component-wrapper {
    /* styles */
  }
</style>
```


<br/><br/><br/><br/><br/><br/>
<br/><br/><br/><br/><br/><br/>
<br/><br/><br/><br/><br/><br/>
<br/><br/><br/><br/><br/><br/>
# DELETE WHEN THREE.JS USES `+layout.svelte` TO SET CONTEXT
<br/><br/><br/><br/><br/><br/>
<br/><br/><br/><br/><br/><br/>
<br/><br/><br/><br/><br/><br/>
<br/><br/><br/><br/><br/><br/>



<!-- CONVENTIONS.md -->

# Coding Conventions

## Claude.ai preferences (BETA)

Using XML in `Claude.ai`, `Settings`:

```xml
<preferences>
	<priority>Take an incremental approach to add new logic, aim to preserve existing functionality without breaking anything</priority>
	<computingPlatform>macOS 15</computingPlatform>
	<serverEnvironment>Vercel</serverEnvironment>
	<environment>Vite Sveltekit</environment>
	<syntax>Svelte 5</syntax>
	<syntaxReference>https://svelte.dev/blog/runes</syntaxReference>
	<cssFramework>tachyons.css</cssFramework>
	<cssFrameworkCapabilities>.grid, light and dark modes, vertical height media queries</cssFrameworkCapabilities>
<cssFrameworkURL>https://www.instantwebapp.com/css/tachyon.shower.css</cssFrameworkURL>
	<markdownPreprocessor>mdsvex</markdownPreprocessor>
	<componentStructure>- $routes/+page.svelte - $lib/helper.js *</componentStructure>
	<consoleLogging>use console.log and suggest reading output</consoleLogging>
	<comments>terse notes for a junior developer</comments>
	<passingData>explain using `JSON.stringify()`</passingData>
	<languages>In order of preference: CSS, Javascript in Svelte syntax, Python, other</languages>
</preferences>
```
