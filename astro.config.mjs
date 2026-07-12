import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
// Deployed at the apex user-site repo saifulislamsalim.github.io — root base,
// no path prefix (the path() helper is a no-op when base is '/').
export default defineConfig({
  site: 'https://saifulislamsalim.github.io',
  integrations: [sitemap()],
  // Emit a cacheable shared stylesheet across all pages instead of inlining
  // global.css into every page's <style>. Aligns with the plan's verify
  // (tokens present in dist/_astro/*.css) and the multi-page build.
  build: { inlineStylesheets: 'never' },
});
