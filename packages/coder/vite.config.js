import tsconfigPaths from 'vite-tsconfig-paths'

export default {
  plugins: [
    tsconfigPaths(),
    (() => ({
      name: 'configure-server',
      configureServer(server) {
        server.middlewares.use((_req, res, next) => {
          res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
          res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
          next();
        });
      }
    }))(),
  ]
}
