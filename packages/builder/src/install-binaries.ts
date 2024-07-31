import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as tar from 'tar';

const C2W_DIR = path.resolve(__dirname, '../c2w');
const TMP_DIR = path.resolve(__dirname, '../tmp');
const BASE_URL = 'https://github.com/ktock/container2wasm/releases/download';

export const downloadBinary = async (
  version: string = '0.6.4',
) => {
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR);
  }
  if (!fs.existsSync(C2W_DIR)) {
    fs.mkdirSync(C2W_DIR);
  }

  const C2W_NET_PROXY_DOWNLOAD_URL = `${BASE_URL}/v${version}/c2w-net-proxy.wasm`;
  const C2W_DOWNLOAD_URL = `${BASE_URL}/v${version}/container2wasm-v${version}-linux-amd64.tar.gz`

  console.log('Downloading c2w binaries');

  await axios({
    url: C2W_DOWNLOAD_URL,
    method: 'GET',
    responseType: 'stream',
  }).then((response) => new Promise<void>((resolve, reject) => {
    const writer = fs.createWriteStream(`${TMP_DIR}/c2w.tar.gz`);
    response.data.pipe(writer);
    writer.on('finish', () => {
      writer.close();
      resolve();
    });
    writer.on('error', (err) => {
      writer.close();
      reject();
    });
  })).then(() => {
    return tar.x({
      file: `${TMP_DIR}/c2w.tar.gz`,
      cwd: `${TMP_DIR}/`
    });
  }).then(() => {
    fs.copyFileSync(`${TMP_DIR}/c2w`, `${C2W_DIR}/c2w`);
    fs.copyFileSync(`${TMP_DIR}/c2w-net`, `${C2W_DIR}/c2w-net`);
    fs.chmodSync(`${C2W_DIR}/c2w`, 0o755);
    fs.chmodSync(`${C2W_DIR}/c2w-net`, 0o755);
  });

  console.log('Downloading c2w net proxy...');

  await axios({
    url: C2W_NET_PROXY_DOWNLOAD_URL,
    method: 'GET',
    responseType: 'stream',
  }).then((response) => {
    return new Promise<void>((resolve, reject) => {
      const writer = fs.createWriteStream(`${TMP_DIR}/c2w-net-proxy.wasm`);
      response.data.pipe(writer);
      writer.on('finish', () => {
        writer.close();
        resolve();
      });
      writer.on('error', (err) => {
        writer.close();
        reject(err);
      });
    })
  });

}


