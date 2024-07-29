import { spawn, spawnSync } from 'child_process';
import { copyFileSync } from 'fs';

const PROJECT_ROOT = process.cwd();

const buildInfo: {
  dockerfile?: string,
  containerName: string,
  wasmName: string,
}[] = [{
  dockerfile: './dockerfiles/Jammy.Dockerfile',
  containerName: 'winetree94:ubuntu22.04',
  wasmName: './dist/out.wasm',
}, {
  containerName: 'node:22-alpine3.19',
  wasmName: './dist/node.wasm',
}];

const runner = async () => {
  for await (const info of buildInfo) {
    if (info.dockerfile) {
      spawnSync('docker', [
        'build',
        '-t',
        info.containerName,
        '-f',
        info.dockerfile,
        '.'
      ], {
        stdio: 'inherit',
        cwd: PROJECT_ROOT,
      });
    }
    spawnSync('./bin/c2w', [
      info.containerName,
      info.wasmName,
    ], {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
    });
  }
  copyFileSync('./tmp/c2w-net-proxy.wasm', './dist/c2w-net-proxy.wasm');
}

runner();
