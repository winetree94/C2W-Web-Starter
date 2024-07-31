import StarlightTailwindPlugin from '@astrojs/starlight-tailwind';

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {},
  plugins: [StarlightTailwindPlugin()],
};
