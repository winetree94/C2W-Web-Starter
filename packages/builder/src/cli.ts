import { program } from 'commander';
import { readFileSync } from 'fs';
import path from 'path';
import { downloadBinary } from './install-binaries';
import { buildImages } from './build-images';

program
  .name('@c2w/builder')
  .description('CLI to some JavaScript string utilities')
  .version('0.0.0');

program.command('build')
  .description('build script')
  .argument('<string>', 'input json path')
  .action(async (str, options) => {
    const inputPath = path.resolve(process.cwd(), str);
    const input = JSON.parse(readFileSync(inputPath, 'utf8'));
    await downloadBinary(input.c2wVersion);
    await buildImages(input.images, input.wasmMaxChunkSize, input.wasmOutput, input.resultJsonOutput);
  });

program.parse();
