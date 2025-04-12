// src/routes/[slug]/+page.server.js
import { error } from '@sveltejs/kit';
const potentialDataFiles = import.meta.glob('/src/routes/*/data.json');

export async function load({ params }) {
  const { slug } = params;

  // {slug} is NOT valid
  const dataPath = `/src/routes/${slug}/data.json`;
  if (!potentialDataFiles[dataPath]) {
    console.error(`🥊 Invalid route: ${slug}`);
    throw error(404, `Route '${slug}' not found`);
  }

  // {slug} is valid:
  console.log("🔍 `routes/[slug]/+page.server.js`, is:", slug);
  
  try {
    // Try to import the data file
    const dataModule = await import(`../${slug}/data.json`);
    
    // If import succeeds, return the data
    return {
      data: {
        ...dataModule.default,
        debug: true,
        slug,
        message: "It's Working!",
        serverTimestamp: new Date().toISOString()
      }
    };
  } catch (error) {
    console.error(`Error loading data for slug: ${slug}`, error);
  }
}