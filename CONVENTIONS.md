---

Cursor: AI context
- @Codebase // has the knowledge of your "entire codebase"?
- @src  // has the knowledge of your entire project
- @Stripe-payment  // click `+ new doument` to add external documentation into the chat window, and paste URL https://docs.sripe.com/payments
- from: https://www.youtube.com/shorts/Kr4MGyPXS_0


---

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
