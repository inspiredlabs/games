import adapter from "@sveltejs/adapter-vercel";
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';
import path from 'path';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	// Consult https://svelte.dev/docs/kit/integrations
	// for more information about preprocessors
	preprocess: vitePreprocess(),

	kit: {
		//adapter: vercel(),
		adapter: adapter(),
		alias: {
			$routes: path.resolve('./src/routes'),
			$lib: path.resolve('./src/lib'),
			$src: path.resolve('./src/')
    }
	},

	// Three.JS: perplexity.ai/search/i-have-this-statement-in-my-sv-gHilVBvSQjiaDjm848gYGA
	vite: {
		ssr: {
			noExternal: ['three'] // Prevent Three.js from being externalized
		}
	},
};

export default config;
