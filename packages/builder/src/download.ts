import fs from 'fs';
import path from 'path';
import axios from 'axios';
import * as tar from 'tar';
const __dirname = path.resolve();
const BIN_DIR = path.resolve(__dirname, 'bin');
const TMP_DIR = path.resolve(__dirname, 'tmp');

const BASE_URL = 'https://github.com/ktock/container2wasm/releases/download';
const VERSION = 'v0.6.4';
const C2W_NET_PROXY_DOWNLOAD_URL = `${BASE_URL}/${VERSION}/c2w-net-proxy.wasm`;
const C2W_DOWNLOAD_URL = `${BASE_URL}/${VERSION}/container2wasm-${VERSION}-linux-amd64.tar.gz`

axios({
  url: C2W_DOWNLOAD_URL,
  method: 'GET',
  responseType: 'stream',
}).then((response) => new Promise<void>((resolve, reject) => {
  const writer = fs.createWriteStream(`${TMP_DIR}/c2w.tar.gz`);
  response.data.pipe(writer);
  writer.on('finish', () => {
    console.log('File downloaded successfully');
    writer.close();
    resolve();
  });
  writer.on('error', (err) => {
    console.error('Error writing file', err);
    writer.close();
    reject();
  });
})).then(() => {
  return tar.x({
    file: `${TMP_DIR}/c2w.tar.gz`,
    cwd: `${TMP_DIR}/`
  });
}).then(() => {
  fs.copyFileSync(`${TMP_DIR}/c2w`, `${BIN_DIR}/c2w`);
  fs.copyFileSync(`${TMP_DIR}/c2w-net`, `${BIN_DIR}/c2w-net`);
  fs.chmodSync(`${BIN_DIR}/c2w`, 0o755);
  fs.chmodSync(`${BIN_DIR}/c2w-net`, 0o755);
});

axios({
  url: C2W_NET_PROXY_DOWNLOAD_URL,
  method: 'GET',
  responseType: 'stream',
}).then((response) => {
  const writer = fs.createWriteStream(`${TMP_DIR}/c2w-net-proxy.wasm`);
  response.data.pipe(writer);
  writer.on('finish', () => {
    console.log('File downloaded successfully');
    writer.close();
  });
  writer.on('error', (err) => {
    console.error('Error writing file', err);
    writer.close();
  });
});

