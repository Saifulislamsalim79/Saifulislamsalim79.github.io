import { defineConfig } from 'astro/config';
// site/base are updated in Task 20 once the GitHub repo URL is known.
export default defineConfig({
  site: 'https://USERNAME.github.io',
  base: '/portfolio',
  // Emit a cacheable shared stylesheet across all pages instead of inlining
  // global.css into every page's <style>. Aligns with the plan's verify
  // (tokens present in dist/_astro/*.css) and the multi-page build.
  build: { inlineStylesheets: 'never' },
});