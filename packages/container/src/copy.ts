import { copyFileSync } from "fs";

copyFileSync(
  "dist/out.wasm",
  "../coder/public/wasms/out.wasm"
);

copyFileSync(
  "dist/c2w-net-proxy.wasm",
  "../coder/public/wasms/c2w-net-proxy.wasm"
);
