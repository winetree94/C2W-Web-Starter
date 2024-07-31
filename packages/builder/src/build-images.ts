import { spawn, spawnSync } from 'child_process';
import { copyFileSync, readFileSync, statSync } from 'fs';
import { copyDirectoryContents, createJson, resetDirectory, splitFile } from './utils';
import path from 'path';

export interface DockerfileBuildInfo {
  type: 'dockerfile';
  name: string;
  dockerfilePath: string;
}

export interface ContainerBuildInfo {
  type: 'image';
  name: string;
  imageName: string;
}

export type BuildInfo = DockerfileBuildInfo | ContainerBuildInfo;

export const buildImages = async (
  buildInfo: BuildInfo[],
  wasmMaxChunkSize: number,
  outDir: string,
  resultJsonPath: string
) => {
  await resetDirectory(path.resolve(__dirname, '../out'));
  await resetDirectory(path.resolve(process.cwd(), outDir));

  let sizes: number[] = [];
  let chunkCounts: number[] = [];

  for await (const info of buildInfo) {
    if (info.type === 'dockerfile') {
      spawnSync('docker', [
        'build',
        '-t',
        `local_${info.name}`,
        '-f',
        path.resolve(process.cwd(), info.dockerfilePath),
        '.'
      ], {
        stdio: 'inherit',
        cwd: path.resolve(process.cwd(), path.dirname(info.dockerfilePath)),
      });
    }

    spawnSync(path.resolve(__dirname, '../c2w/c2w'), [
      info.type === 'image' ? info.imageName : `local_${info.name}`,
      path.resolve(__dirname, `../tmp/${info.name}.wasm`)
    ], {
      stdio: 'inherit',
      cwd: process.cwd(),
    });

    sizes.push(
      statSync(path.resolve(__dirname, `../tmp/${info.name}.wasm`)).size
    );

    const chunkCount = await splitFile(
      path.resolve(__dirname, `../tmp/${info.name}.wasm`),
      path.resolve(__dirname, `../out/${info.name}.wasm`),
      1024 * 1024 * wasmMaxChunkSize
    );
    chunkCounts.push(chunkCount);
  }

  copyFileSync(
    path.resolve(__dirname, '../tmp/c2w-net-proxy.wasm'),
    path.resolve(__dirname, '../out/c2w-net-proxy.wasm')
  );

  copyDirectoryContents(
    path.resolve(__dirname, '../out'),
    path.resolve(process.cwd(), outDir),
  );

  const resultJson = buildInfo.reduce<{
    [key: string]: {
      name: string,
      chunks: string[],
      image: string;
      size: number;
    }
  }>((result, info, index) => {

    if (info.type === 'image') {
      result[info.name] = {
        name: info.name,
        chunks: Array.from({ length: chunkCounts[index] })
          .map((_, i) => `${info.name}.wasm.part${i}`),
        image: info.imageName,
        size: sizes[index],
      };
      return result;
    }

    result[info.name] = {
      name: buildInfo[index].name,
      chunks: Array.from({ length: chunkCounts[index] })
        .map((_, i) => `${info.name}.wasm.part${i}`),
      image: readFileSync(path.resolve(process.cwd(), info.dockerfilePath), 'utf8'),
      size: sizes[index],
    };
    return result;
  }, {});

  createJson(path.resolve(process.cwd(), resultJsonPath), resultJson);
}
