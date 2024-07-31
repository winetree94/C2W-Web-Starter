import { c2wTerminal, type C2WTerminalConfigs } from "@c2w/browser_runtime";
import chunks from './chunks.json';

function getNetParam() {
  const net = new URLSearchParams(location.search)
    .get('net')
    ?.toLowerCase() as string;
  return ['delegate', 'browser'].includes(net) ? net : 'none';
}

export const createTerminal = (
  element: HTMLDivElement,
  imageName: string,
) => {
  const image = chunks[imageName as keyof typeof chunks];

  const imageWorker = new Worker(
    new URL("@c2w/browser_runtime/workers/worker.js", import.meta.url),
    {
      type: "module",
    }
  );

  const networkMode = getNetParam();

  const imageWasmPaths = image.chunks.map((chunk) => `/wasms/${chunk}`)

  if (networkMode !== "browser") {
    c2wTerminal({
      parentElement: element,
      networkMode: "none",
      imageWorker: imageWorker,
      imageWasmPaths: imageWasmPaths,
    });
    return;
  }

  const networkWorker = new Worker(
    new URL(
      "@c2w/browser_runtime/workers/stack-worker.js",
      import.meta.url
    ),
    {
      type: "module",
    }
  );

  c2wTerminal({
    parentElement: element,
    networkMode: networkMode,
    imageWorker: imageWorker,
    imageWasmPaths: imageWasmPaths,
    networkWorker: networkWorker,
    networkWasmPaths: ["/wasms/c2w-net-proxy.wasm"],
  })
}
