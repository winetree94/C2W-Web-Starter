import { spawnSync } from 'child_process';
import { copyFileSync, readFileSync, statSync } from 'fs';
import { createJson, resetDirectory, splitFile } from './utils';
import buildInfo from '../images.json';

const PROJECT_ROOT = process.cwd();

const runner = async () => {
  await resetDirectory('./dist');
  let sizes: number[] = [];
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
      './tmp/' + info.name + '.wasm',
    ], {
      stdio: 'inherit',
      cwd: PROJECT_ROOT,
    });
    console.log('copying: ', info.containerName);


    //'./tmp/' + info.name + '.wasm' size
    sizes.push(
      statSync('./tmp/' + info.name + '.wasm').size
    );

    const chunkCount = await splitFile(
      './tmp/' + info.name + '.wasm',
      './dist/' + info.name + '.wasm',
      1024 * 1024 * 20
    );
    chunkCounts.push(chunkCount);
  }

  copyFileSync(
    './tmp/c2w-net-proxy.wasm',
    './dist/c2w-net-proxy.wasm'
  );

  const resultJson = buildInfo.reduce<{
    [key: string]: {
      name: string,
      chunks: string[],
      image: string;
      size: number;
    }
  }>((result, info, index) => {
    result[info.name] = {
      name: buildInfo[index].name,
      chunks: Array.from({ length: chunkCounts[index] })
        .map((_, i) => `${info.name}.wasm.part${i}`),
      image: buildInfo[index].dockerfile
        ? readFileSync(buildInfo[index].dockerfile, 'utf8')
        : buildInfo[index].containerName,
      size: sizes[index],
    };
    return result;
  }, {});

  createJson('./dist/chunks.json', resultJson);
}

runner();
