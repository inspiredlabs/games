<script>
// src/routes/+page.svelte
const URL = 'images/punch.webp'
</script>

<main class="flex flex-column w-100 vh-100 overflow-y-scroll">
  <header class="code">
    <div class="cover bg-left bg-center-l" style="background-image: url({URL})">
      <div class="bg-black-80 pb5 pb6-m pb5-l">
        <nav class="dt w-100 mw8 center"> 
          <div class="dtc w2 v-mid pa3">
            <a href="/" class="dib w2 h2 pa1 ba b--white-90 grow-large border-box">
              <svg viewBox="0 0 32 32" class="link white-90 hover-white">
                <title>MixedReadlityGam.es</title>
                <use xlink:href="#icon-menu"></use>
              </svg>
            </a>
          </div>
          <div class="dtc v-mid tr pa3">
            <a class="f6 fw4 hover-white no-underline white-70 dn dib-ns pv2 ph3" href="/camera" >/camera</a> 
            <a class="f6 fw4 hover-white no-underline white-70 dn dib-ns pv2 ph3" href="/axe" >/axe</a> 
          </div>
        </nav> 
        <div class="tc-l mt4 mt5-m mt6-l ph3">
          <h1 class="f2 f1-l fw2 white-90 mb0 lh-title">MixedRealityGam.es</h1>
          <h2 class="fw1 f3 white-80 mt3 mb4">Vibe Together</h2>
          <a class="f6 no-underline grow dib v-mid bg-blue white ba b--blue ph3 pv2 mb3" href="/camera">/camera</a>
          <!-- <span class="dib v-mid ph3 white-70 mb3">or</span> -->
          <a class="f6 no-underline grow dib v-mid white ba b--white ph3 pv2 mb3" href="/axe">/axe</a>
        </div>
      </div>
    </div> 
  </header>

  <section class="flex flex-column ba bw1 b--gray">
    <ul class="list dt mw6 center pv4 pv5-m pv6-ns">
      <li>
        <div class="dtc v-mid">
          <img src={URL} alt="Placeholder" class="mw5" />
        </div>
        <div class="dtc v-mid pl3">
          <p class="lh-copy">
            This text is vertically aligned middle, no matter what the height of the image is.
          </p>
        </div>
      </li>
      <li>
        <div class="dtc v-mid">
          <img src={URL} alt="Placeholder" class="mw5" />
        </div>
        <div class="dtc v-mid pl3">
          <p class="lh-copy">
            This text is vertically aligned middle, no matter what the height of the image is.
          </p>
        </div>
      </li>
    </ul>
  </section>
</main>

<style>
</style>