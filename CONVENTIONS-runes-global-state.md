---

url: mainmatter.com/blog/2025/03/11/global-state-in-svelte-5/
community assistance: reddit.com/r/sveltejs/comments/1j9j43i/comment/mhdjv25/?context=3

---

















```
My project is written in `Svelte 5 runes syntax` and it works well. Read `repomix-output.text` to understand my project. wait. Do not use deprecated syntax. There's a few issues I want to work through. 1. DebugAccessoryVisualizer, doesn't load 'Avg Fingertip Distance' it says N/A, but the console returns: ```Average fingertip distance: 0.317
mediapipeService.svelte.js:24
[MediaPipe 17:16:29]
Average fingertip distance: 0.316
mediapipeService.svelte.js:24
[MediaPipe 17:16:29]
Average fingertip distance: 0.284```, wait. Do NOT rewrite large parts of my application. ONLY help by suggesting a minimal code correction, THAT MEANS AS FEW LOC change as possible, then where to remove Average fingertip distance in the console. wait. 2. I will write the next issue, don't elaborate or create new functionality. do NOT use deprecated syntax:
- no: <svelte:component this={HandAccessory}>
- no: on:change, etc
- no: onMount, onDestroy
- no: $: reactiveVar
```

Runes and Global state: do's and don'ts
=======================================

Do not use `onMount` use `$effect.pre` because [on the 20th of September of 2023 Runes were introduced to the Svelte ecosystem](https://svelte.dev/blog/runes). This brand new paradigm was a complete rewrite of the underlying structure of Svelte, moving from a _compile-only_ to a _compile-enhanced_ reactivity system, with a very small and extremely performant runtime footprint.

One of the greatest advantages of this brand new paradigm is what was introduced as ["Universal Reactivity"](https://svelte.dev/tutorial/svelte/universal-reactivity).

[#anchor](#previously-on-svelte-4)Previously on Svelte 4
--------------------------------------------------------

Before the release of runes, Svelte lived in two worlds: the magical and fantastical world inside a Svelte component and the harsher reality of a Javascript file. Inside a `.svelte` file, variables were automatically reactive and the [labeled statement](https://svelte.dev/docs/svelte/legacy-reactive-assignments) (`$:`) allowed you to react to changes. In a `.js` file however Svelte had no power and you had to use stores to interact reactively with data.

### [#anchor](#stores)Stores

A store in Svelte was an observable: an object with a `subscribe()` method (that returned an `unsubscribe()` function) and potentially a `set()` and an `update()` methods. You could `subscribe()` to a store passing as an argument a callback function that would be invoked whenever a new value was `set()` on the store.

Even stores were enhanced inside a Svelte component: accessing a variable with the `$` prefix would instruct svelte to automatically subscribe to the store and keep the `$`\-prefixed variable in sync with the value of the store.

So stores were **THE** way to have global reactive state in your application. You could've just do this

    import { writable } from "svelte";

    export const count = writable(0);

from a javascript file and use this throughout your application

    <script>
      import { count } from "./my-count";
    </script>

    <button on:click={()=>{
    	$count++;
    }}>{$count}</button>

inside a svelte component or

    import { count } from "./my-count";

    count.update($count => $count + 1);

inside a javascript file.

[#anchor](#what-about-svelte-5)What about Svelte 5?
---------------------------------------------------

Well, firstly let's make it clear: stores are not deprecated and you continue to use them in Svelte 5 just like we just explained.

That said there's a reason why you are here: you want to know how to do this with the new and performant signal based reactivity system.

### [#anchor](#a-quick-look-at-runes)A quick look at runes

Before we begin let's take a brief look at how runes work: runes are magical symbols that instruct the compiler that we want something special. They work inside `.svelte` files but also inside `.svelte.js` files. The simplest rune is `$state` which, as you might have guessed, is used to declare a stateful variable.

    let count = $state(0);

    // use the variable in the template

    count++; // this will update the template

as you can see, you don't need to `import` anything: runes are just part of Svelte, the language.

If you need to derive a value from another value you can use the `$derived` rune (or the functional counterpart `$derived.by`). You just need to pass an expression to it for it to be reactive.

    let count = $state(0);
    let double = $derived(count * 2);
    let triple = $derived.by(() => count * 3);

    count++;
    console.log(double, triple); // this will log 2 and 3

the third piece of the puzzle is `$effect`...this is used to sync your state with something that is not reactive by nature (Svelte for example uses `effects` to sync your state with the DOM).

**N.b. using `$effect` is considered an escape hatch...most of the time you don't need to use it**

`$effect` automatically tracks every stateful variable read inside the function you pass to it

    let count = $state(0);
    $effect(() => {
      console.log(count);
    });

    count++; // this will log 1 within the effect

One very relevant piece of information is how reactivity can cross module or function boundaries. Why? Because for the stateful variable to be "live" and react to changes cross module/function it needs to be enclosed in a closure. I know, these are a lot of complicated words but the gist of it is that if you export a stateful variable as is from a module the value will be "frozen" at the moment you import it.

If you do this

    let count = $state(0);

    export { count };

the moment you import `count` in another file only the current value of count will be imported (this is a JS limitation unfortunately).

And I'm ready to bet that this is exactly the reason you searched for this article. So let's dive right into it...

[#anchor](#runic-global-state)Runic Global State
------------------------------------------------

As I've said

> for the stateful variable to be "live" and react to changes cross module/function it needs to be enclosed in a closure

but what does this mean? It's very simple: you need a function!

    let count = $state(0);

    export function get() {
      return count;
    }

    export function set(new_count) {
      count = new_count;
    }

just by doing this, our `count` variable will now be fully reactive

    <script>
      import { get, set } from "./count.svelte.js";
    </script>

    <button onclick={()=>{
    	set(get()+1);
    }}>
    	{get()}
    </button>

Here's a [svelte repl](https://svelte.dev/playground/a54adf9ebd2e41eb8e44886d67768077?version=5.19.8) you can play around with. Thanks for reading, bye!

...

I know, I know, this is not the best API. Let's try to do it better: instead of exporting a function that return our `count` we can export an object with a _getter_ and a _setter_!

    let count = $state(0);

    export const counter = {
      get value() {
        return count;
      },
      set value(new_count) {
        count = new_count;
      },
    };

and you can use it like this

    <script>
      import { counter } from "./count.svelte.js";
    </script>

    <button onclick={()=>{
    	counter.value++;
    }}>
    	{counter.value}
    </button>

And here's the obligatory [repl](https://svelte.dev/playground/911996cc305d4794b3e2b2e10e2faa60?version=5.19.8) to play around with.

Much nicer right? We can do even better...when you pass an object to `$state` svelte cleverly wrap that object in a Proxy (you can read more about proxies on the official [MDN documentation](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Proxy)...they are a fascinating feature of the language). To make it short: with proxies, we wrap every property of the object with a _getter_ and a _setter_ for you. So our declaration file becomes even shorter (relevant [repl](https://svelte.dev/playground/352c991f203d4feebb3c371e6166b9c3?version=5.19.8)).

    export const counter = $state({ value: 0 });

With the only gotcha that you can't directly reassign it (basically you can't do `count = { value: 2 })`).

Another interesting way to have global state is with ES6 classes: you can use `$state` on class properties and they are also much more performant than POJOs (`v8`, the Javascript engine that runs your Javascript optimize classes a lot).

Here's a global counter implementation with classes:

    class Counter {
      value = $state(0);
    }

    export const counter = new Counter();

and yes, you can use this in the same way as you can see in [this repl](https://svelte.dev/playground/c3006274ed734e2eadb64b8b2f094717?version=5.19.8).

[#anchor](#the-perils-of-global-state)The perils of Global State
----------------------------------------------------------------

Ok, you have your answer, and I know you might be tempted to close this page and run to your editor of choice to implement it, but please bear with me just another second because what I'm about to explain is **VERY IMPORTANT**.

Global state in general may seem pretty innocent but it's generally discouraged even for medium sized apps. Things get even more dangerous when your app is what we call an Isomorphic Application. Isomorphic is just a fancy word to say that your app runs in different environments: most apps nowadays run in two phases: a _server-side_ and a _client-side_.

When a request hits our server, a Node process accepts the request and proceeds to render the right page, this means importing svelte components, executing them, agglomerate all the results and craft a valid HTML page that includes a script tag that, when on the client, will "hydrate" our application by attaching listeners, effects and such.

This is very important because our global state is technically alive in both environments. On the server there's a global `count` variable that gets recreated on the client. But both live on two separate computers! The server one lives on our server which serves all our requests. The client one lives in our users' browsers.

What does this mean? It means that if we have an actual global state we need to be very attentive to where we update it: if at any moment we update `count` in an imported JS module or in the `<script>` tag of a rendered component we will increment the value of `count` on the server which means that the subsequent request the value will not be `0` anymore but `1` (and so on for the next requests).

This is probably fine for a counter but imagine if instead this was our user profile?

_"But if i reassign it every time it's fine right?"_

Well, still not: it might be good as long as you don't have asynchronous code, but as soon as you do a `fetch` request (which is almost a guarantee), here's what could happen:

![a diagram showing how multiple async request could mutate global state causing the read of the wrong value](/assets/images/posts/2025-03-11-global-state-in-svelte-5/global-state-diagram@775.png)

That's obviously wrong and very dangerous! But I would not be here blabbering if I didn't have a solution to this problem!

### [#anchor](#the-solution)The solution

Before we begin diving in the solution a small disclaimer: what I'm about to explain make things way safer (eliminating the problems we talked in the above paragraph) but does make things a bit more complex. But don't worry we will go in details about how it works and everything will be clear by the end of this blog post.

The first thing to know is that if you need to access state inside a `load` function there's a tool appositely made for that: the [`locals`](https://svelte.dev/docs/kit/hooks#Server-hooks-locals) object. Every time a new request is handled by Svelte Kit you can access the `event` which will be unique for the duration of the request. On the `event` you can read or write to `event.locals` to share context throughout the various `load` function.

Let's make an example to make this clearer: let's say you want to have a `user` object that will contain the currently logged in user info. The first thing you would do (if you are using Typescript...but let's be honest who doesn't) is update [`app.d.ts`](https://svelte.dev/docs/kit/types#app.d.ts) which is a global declaration files that Svelte Kit uses to allow you to specify four kind of types: by default it will look like this

    declare global {
      namespace App {
        // interface Error {}
        // interface Locals {}
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
      }
    }

    export {};

As you might have guessed the line we are interested in is `interface Locals`...by uncommenting and modifying that line we can specify the shape for `event.locals`

    declare global {
      namespace App {
        // interface Error {}
        interface Locals {
          user?: { name: string; last_name: string };
        }
        // interface PageData {}
        // interface PageState {}
        // interface Platform {}
      }
    }

    export {};

then we can proceed with the second piece of the puzzle: [the hooks file](https://svelte.dev/docs/kit/hooks#Server-hooks).

You can create a file name `hooks.server.ts` in the `src` folder and define a `handle` function there. This will act as a sort of middleware, being invoked on each request. And inside the function we can fetch the current user and update the `locals` object.

    export function handle({ event, resolve }) {
      const user_cookie = event.cookies.get("user");
      if (user_cookie) {
        // update the locals object
        event.locals.user = await fetch_user(user_cookie);
      }
      return resolve(event);
    }

Now we have our `event.locals.user` everywhere in our `load` functions! But what about the client side?

For that we need a bit more work. We can create a root layout in `/src/routes` and we can return the user from our locals

    export function load({ locals }) {
      return {
        user: locals.user,
      };
    }

this will make `user` accessible through `page.data`

    <script>
    	import { page } from '$app/state';
    </script>

and since states from `$app/state` are managed by sveltekit they are already safe against cross request leakage.

But what if you have some stateful variable that is not coming from the server? And maybe you want to be able to also set that and have the new value be reflected in the whole app? We've got a solution for that too!

We can utilize the same technique that Svelte Kit uses to make their state unique per request by making use of another svelte primitive: contexts. If we create a context in the root layout our whole app will have access to that context and since the root layout will be instantiated anew for every request it will also be safe to use. Let's see how we can do it.

### [#anchor](#using-contexts)Using contexts

Let's imagine that we want to have a global notifications state so that we can push new notifications to it from everywhere and show all the notifications from the root of our application.

You can technically just use context from the root layout and be done with it but that's error prone and not really type safe so a much better alternative is to create a module where we instantiate out context and export a couple of type-safe functions to access it.

    import { getContext, setContext } from "svelte";

    // we can use this as the key of the context to prevent conflicts
    const CONTEXT_KEY = Symbol();

    type Notifications = string[];

    export function set_notifications(notifications: Notifications) {
      return setContext<Notifications>(CONTEXT_KEY, notifications);
    }

    export function get_notifications() {
      return getContext<Notifications>(CONTEXT_KEY);
    }

by doing this we can then update our root layout to initialize a new stateful variable and add it to the context.

    <script lang="ts">
    	import { set_notifications } from '$lib/notification-context.ts';
    	const { children } = $props();

    	const notifications = $state<string[]>([]);

    	set_notifications(notifications);
    </script>

    {@render children()}

    <aside>
    	{#each notifications as notification}
    		<article>{notification}</article>
    	{/each}
    </aside>

now to show a new notification we can just retrieve the notifications and push to the array

    <script lang="ts">
    	import { get_notifications } from '$lib/notification-context.ts';

    	const notifications = set_notifications(notifications);
    </script>

    <button onclick={()=>{
    	notifications.push("New notification!");
    }}>send notification</button>

and voilà! Now we have global state that is safe and easy to use!


* * *

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
