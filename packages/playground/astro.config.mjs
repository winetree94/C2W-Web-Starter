import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
	output: "static",
  devToolbar: {
    enabled: false,
  },
	server: {
		headers: {
			'Cross-Origin-Opener-Policy': 'same-origin',
			'Cross-Origin-Embedder-Policy': 'require-corp'
		},
	},
});
