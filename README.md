# C2W Web Starter

This project explores how to use [container2wasm](https://github.com/ktock/container2wasm) in modern web projects. The main goals are:

- Provide an example of automating the image generation process using c2w in a Node environment
- Offer a Chrome extension to facilitate network communication for containers
- Provide examples of usage in a bundler and TypeScript environment
- Offer more container demos

# Project Structure

- `packages/browser_runtime`: A package that uses xterm-pty to run containers in the browser
- `packages/proxy`: A Chrome extension to solve network communication issues for containers
- `packages/builder`: A builder that automates image generation using c2w
- `packages/playground`: A demo page using browser_runtime and builder
