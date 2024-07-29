import { spawnSync } from 'child_process';
import { copyFileSync } from 'fs';
import { createJson, resetDirectory, splitFile } from './utils';

const PROJECT_ROOT = process.cwd();

const buildInfo: {
  name: string,
  dockerfile?: string,
  containerName: string,
  wasmName: string,
}[] = [{
  name: 'ubuntu',
  dockerfile: './dockerfiles/Jammy.Dockerfile',
  containerName: 'winetree94:ubuntu22.04',
  wasmName: 'ubuntu.wasm',
}, {
  name: 'node',
  containerName: 'node:22-alpine3.19',
  wasmName: 'node.wasm',
}];

const runner = async () => {
  await resetDirectory('./dist');
  let chunkCounts: number[] = [];
  for await (const info of buildInfo) {
    if (info.dockerfile) {
      console.log('docker building: ', info.containerName);
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
    console.log('c2w building: ', info.containerName);
    spawnSync('./bin/c2w', [
      info.containerName,
      './tmp/' + info.wasmName,
    ], {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
    });
    console.log('copying: ', info.containerName);
    const chunkCount = await splitFile(
      './tmp/' + info.wasmName,
      './dist/' + info.wasmName,
      1024 * 1024 * 20
    );
    chunkCounts.push(chunkCount);
  }
  console.log(chunkCounts);
  copyFileSync('./tmp/c2w-net-proxy.wasm', './dist/c2w-net-proxy.wasm');
  const resultJson = buildInfo.reduce<{
    [key: string]: {
      wasmName: string,
      chunkCount: number,
    }
  }>((result, info, index) => {
    result[info.name] = {
      wasmName: buildInfo[index].wasmName.split('.')[0],
      chunkCount: chunkCounts[index],
    };
    return result;
  }, {})
  createJson('./dist/chunks.json', resultJson);
}

runner();
