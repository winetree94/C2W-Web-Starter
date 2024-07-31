import { defineConfig } from 'tsup';

export default defineConfig({
  target: 'es2018',
  entry: [
    'src/cli.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  outDir: 'dist',
  clean: true,
});
