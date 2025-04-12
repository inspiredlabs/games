<script>
  // $lib/RightMenu.svelte
  import DebugMediaPipe from '$lib/DebugMediaPipe.svelte';
  import DebugSceneInfo from '$lib/DebugSceneInfo.svelte';
  import DebugController from '$lib/DebugController.svelte';
  import DebugHandAccessory from '$lib/DebugHandAccessory.svelte';
  import { useSharedContext } from '$lib/useSharedContext.svelte.js';

  // Get shared context
  const context = useSharedContext();

  // User state with $state rune
  let user = $state({ showMenu: true });

  // Menu toggle function
  function toggle() {
    user.showMenu = !user.showMenu;
  }

  // Menu open function
  function open() {
    user.showMenu = true;
  }
</script>

<button
  onkeydown={e => e.key === 'Escape' && toggle()}
  class="
    input-reset
    z-max fixed pointer mb5
    bottom-0 right-0 fr
    ba bw2
    b--dark-gray
    bg-light-gray
    black
    hover-bg-white
    mr0 ml0 pa2 pt1 pb1 tc
    bg-transition"
  onclick={toggle}>
  <div class="no-select">
    <svg viewBox="0 0 32 32" class="db h2 w2 mt1 mb1 mr-auto ml-auto ">
      <use xlink:href="#icon-menu"></use>
    </svg>
    <span class="dib dib-ns dn-m dib-l f8 tracked ttu mb2 b ">Menu</span>
  </div>
</button>

<div
  role="presentation"
  style="cursor: context-menu"
  class="dn-ns dn-m dn-l fixed bg-black-30 left-0 right-0 btm-0 vh-100 vw-100 h-100 w-100 o-transition"
  onclick={toggle}
  class:open={!user.showMenu}
  onkeydown={e => e.key === 'Escape' && toggle()}
></div>


<div
  role="menu"
  tabindex=0
  onkeydown={e => e.key === 'Escape' && toggle()}
  class:toggle={user.showMenu}
  class="nav backface-hidden
  w-two-thirds w-third-ns w-third-m w-25-l
  h-100 vh-100 top-0 right-0 fixed z-9999 bl b--black bg-black-70 touch-scrolling caribbean
  f5 f6-ns f6-m f4-l">

<h1 class="pa2 pa3-l">Slash AR</h1>

<aside class="pa2 pa3-l">
  <h3>Hand Accessory</h3>
  <DebugHandAccessory />
  <h3>Contoller</h3>
  <DebugController />
  <h3>Hand Detection</h3>
  <DebugMediaPipe />
  <!-- <hr class="o-30 mv4 ba bw1 b--inherit"/> -->
  <h3>Scene Information</h3>
  <DebugSceneInfo />
</aside>
</div>


<style>
/* repomix-ignore-start */

.nav {
  will-change: transform;
  transform: translateX(100%);
  transition: transform .28s cubic-bezier(.3, 0, .02, 1);
  -webkit-transition: transform .28s cubic-bezier(.3, 0, .02, 1);
}

.toggle {
  transform: translateX(0);
}

.open {
  visibility: hidden;
  opacity: 0;
}

/* repomix-ignore-end */</style>


<svg class="spirites" style="display: none;">
	<defs>
    <path id="icon-menu" stroke="currentcolor" stroke-width="6" d="M0 5h32M0 16h32M0 27h32"/>
  </defs>
</svg>

<!-- usage: https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/menu_role -->