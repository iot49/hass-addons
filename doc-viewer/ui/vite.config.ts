import { defineConfig, loadEnv } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import { viteSingleFile } from 'vite-plugin-singlefile';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '../', '');

  return {
    base: './', // Use relative paths for single-file bundle
    define: {
      'import.meta.env.VITE_TITLE': JSON.stringify(env.TITLE),
      'import.meta.env.VITE_SUPER_USER_EMAIL': JSON.stringify(env.SUPER_USER_EMAIL),
    },
    plugins: [
      viteSingleFile(), // Plugin to create a single HTML file with everything inlined
      /*
      visualizer({ open: true }), // Automatically opens the visualizer in your browser
      */
    ],
    build: {
      outDir: '../html/ux',
      emptyOutDir: true,
      /* */
      minify: true,
      terserOptions: {
        compress: false,
        mangle: false,
      },
      /* */
      // Configure for single-file bundle
      rollupOptions: {
        input: {
          main: 'index.html',
        },
        output: {
          // Inline all assets into the HTML file
          inlineDynamicImports: true,
          manualChunks: undefined,
        },
      },
      // Inline all CSS and assets
      cssCodeSplit: false,
      assetsInlineLimit: 100000000, // 100MB - inline everything
    },
  };
});
