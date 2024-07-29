import { spawnSync } from 'child_process';
import { copyFileSync } from 'fs';
import { createJson, resetDirectory, splitFile } from './utils';
import buildInfo from '../images.json';

const PROJECT_ROOT = process.cwd();

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
