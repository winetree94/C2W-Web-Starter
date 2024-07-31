import { defineConfig } from 'tsup';

export default defineConfig({
  target: 'es2018',
  entry: [
    'src/index.ts',
    'src/workers/worker.ts',
    'src/workers/stack-worker.ts',
  ],
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  outDir: 'build',
  clean: true,
});
