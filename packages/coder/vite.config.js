
console.log("Hello from ws-delegate.js");

export default {
  plugins: [
    // other plugins...
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