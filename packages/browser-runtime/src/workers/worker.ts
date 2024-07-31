/* eslint-disable @typescript-eslint/ban-ts-comment */
import { Fd, WASI, wasi } from '@bjorn3/browser_wasi_shim';
import {
  errStatus,
  fetchChunks,
  getCertDir,
  getNetworkMode,
  recvCert,
  serveIfInitMsg,
  sockWaitForReadable,
  wasiHackSocket,
} from './worker-util';
import { TtyClient } from 'xterm-pty';
import { WASIEvent, WASIEventType, WASISubscription } from './wasi-util';
import { NETWORK_MODE } from '../types';

self.addEventListener('message', async (msg: MessageEvent) => {
  if (serveIfInitMsg(msg)) {
    return;
  }
  const ttyClient = new TtyClient(msg.data);
  let args: string[] = [];
  let env: string[] = [];
  let fds: Fd[] = [];
  const networkMode = getNetworkMode();
  let listenfd = 3;

  const wasm = await fetchChunks();
  if (networkMode) {
    if (networkMode == NETWORK_MODE.DELEGATE) {
      args = ['arg0', '--net=socket', '--mac', genmac()];
    } else if (networkMode == NETWORK_MODE.BROWSER) {
      recvCert().then((cert) => {
        const certDir = getCertDir(cert);
        fds = [
          //@ts-ignore
          undefined, // 0: stdin
          //@ts-ignore
          undefined, // 1: stdout
          //@ts-ignore
          undefined, // 2: stderr
          certDir, // 3: certificates dir
          //@ts-ignore
          undefined, // 4: socket listenfd
          //@ts-ignore
          undefined, // 5: accepted socket fd (multi-connection is unsupported)
          // 6...: used by wasi shim
        ];
        args = ['arg0', '--net=socket=listenfd=4', '--mac', genmac()];
        env = [
          'SSL_CERT_FILE=/.wasmenv/proxy.crt',
          'https_proxy=http://192.168.127.253:80',
          'http_proxy=http://192.168.127.253:80',
          'HTTPS_PROXY=http://192.168.127.253:80',
          'HTTP_PROXY=http://192.168.127.253:80',
        ];
        listenfd = 4;
        startWasi(wasm, ttyClient, args, env, fds, listenfd, 5);
      });
      return;
    }
  }
  startWasi(wasm, ttyClient, args, env, fds, listenfd, 5);
});

function startWasi(
  wasm: BufferSource,
  ttyClient: TtyClient,
  args: string[],
  env: string[],
  fds: Fd[],
  listenfd: number,
  connfd: number,
) {
  const wasiInstance = new WASI(args, env, fds);
  wasiHack(wasiInstance, ttyClient, connfd);
  wasiHackSocket(wasiInstance, listenfd, connfd);
  WebAssembly.instantiate(wasm, {
    wasi_snapshot_preview1: wasiInstance.wasiImport,
  }).then((inst) => {
    wasiInstance.start(
      inst.instance as {
        // type missmatching
        exports: { memory: WebAssembly.Memory; _start: () => unknown };
      },
    );
  });
}

// wasiHack patches wasi object for integrating it to xterm-pty.
function wasiHack(wasiInstance: WASI, ttyClient: TtyClient, connfd: number) {
  // definition from wasi-libc https://github.com/WebAssembly/wasi-libc/blob/wasi-sdk-19/expected/wasm32-wasi/predefined-macros.txt
  const ERRNO_INVAL = 28;
  const _fd_read = wasiInstance.wasiImport.fd_read;
  wasiInstance.wasiImport.fd_read = (fd, iovs_ptr, iovs_len, nread_ptr) => {
    if (fd == 0) {
      const buffer = new DataView(wasiInstance.inst.exports.memory.buffer);
      const buffer8 = new Uint8Array(wasiInstance.inst.exports.memory.buffer);
      const iovecs = wasi.Iovec.read_bytes_array(buffer, iovs_ptr, iovs_len);
      let nread = 0;
      for (let i = 0; i < iovecs.length; i++) {
        const iovec = iovecs[i];
        if (iovec.buf_len == 0) {
          continue;
        }
        const data = ttyClient.onRead(iovec.buf_len);
        buffer8.set(data, iovec.buf);
        nread += data.length;
      }
      buffer.setUint32(nread_ptr, nread, true);
      return 0;
    } else {
      console.log('fd_read: unknown fd ' + fd);
      return _fd_read.apply(wasiInstance.wasiImport, [
        fd,
        iovs_ptr,
        iovs_len,
        nread_ptr,
      ]);
    }
    return ERRNO_INVAL;
  };
  const _fd_write = wasiInstance.wasiImport.fd_write;
  wasiInstance.wasiImport.fd_write = (fd, iovs_ptr, iovs_len, nwritten_ptr) => {
    if (fd == 1 || fd == 2) {
      const buffer = new DataView(wasiInstance.inst.exports.memory.buffer);
      const buffer8 = new Uint8Array(wasiInstance.inst.exports.memory.buffer);
      const iovecs = wasi.Ciovec.read_bytes_array(buffer, iovs_ptr, iovs_len);
      let wtotal = 0;
      for (let i = 0; i < iovecs.length; i++) {
        const iovec = iovecs[i];
        const buf = buffer8.slice(iovec.buf, iovec.buf + iovec.buf_len);
        if (buf.length == 0) {
          continue;
        }
        ttyClient.onWrite(Array.from(buf));
        wtotal += buf.length;
      }
      buffer.setUint32(nwritten_ptr, wtotal, true);
      return 0;
    } else {
      console.log('fd_write: unknown fd ' + fd);
      return _fd_write.apply(wasiInstance.wasiImport, [
        fd,
        iovs_ptr,
        iovs_len,
        nwritten_ptr,
      ]);
    }
    return ERRNO_INVAL;
  };
  wasiInstance.wasiImport.poll_oneoff = (
    in_ptr,
    out_ptr,
    nsubscriptions,
    nevents_ptr,
  ) => {
    if (nsubscriptions == 0) {
      return ERRNO_INVAL;
    }
    const buffer = new DataView(wasiInstance.inst.exports.memory.buffer);
    const in_ = WASISubscription.read_bytes_array(
      buffer,
      in_ptr,
      nsubscriptions,
    );
    let isReadPollStdin = false;
    let isReadPollConn = false;
    let isClockPoll = false;
    let pollSubStdin;
    let pollSubConn;
    let clockSub;
    let timeout = Number.MAX_VALUE;
    for (const sub of in_) {
      //@ts-ignore
      if (sub.u.tag.variant == 'fd_read') {
        //@ts-ignore
        if (sub.u.data.fd != 0 && sub.u.data.fd != connfd) {
          //@ts-ignore
          console.log('poll_oneoff: unknown fd ' + sub.u!.data!.fd);
          return ERRNO_INVAL; // only fd=0 and connfd is supported as of now (FIXME)
        }
        //@ts-ignore
        if (sub.u.data.fd == 0) {
          isReadPollStdin = true;
          pollSubStdin = sub;
        } else {
          isReadPollConn = true;
          pollSubConn = sub;
        }
        //@ts-ignore
      } else if (sub.u.tag.variant == 'clock') {
        //@ts-ignore
        if (sub.u.data.timeout < timeout) {
          //@ts-ignore
          timeout = sub.u.data.timeout;
          isClockPoll = true;
          clockSub = sub;
        }
      } else {
        console.log('poll_oneoff: unknown variant ' + sub.u!.tag!.variant);
        return ERRNO_INVAL; // FIXME
      }
    }
    const events = [];
    if (isReadPollStdin || isReadPollConn || isClockPoll) {
      let readable = false;
      if (isReadPollStdin || (isClockPoll && timeout > 0)) {
        readable = ttyClient.onWaitForReadable(timeout / 1000000000);
      }
      if (readable && isReadPollStdin) {
        const event = new WASIEvent();
        event.userdata = pollSubStdin!.userdata;
        event.error = 0;
        event.type = new WASIEventType('fd_read');
        events.push(event);
      }
      if (isReadPollConn) {
        const sockreadable = sockWaitForReadable();
        if (sockreadable == errStatus) {
          return ERRNO_INVAL;
        } else if (sockreadable == true) {
          const event = new WASIEvent();
          event.userdata = pollSubConn!.userdata;
          event.error = 0;
          event.type = new WASIEventType('fd_read');
          events.push(event);
        }
      }
      if (isClockPoll) {
        const event = new WASIEvent();
        event.userdata = clockSub!.userdata;
        event.error = 0;
        event.type = new WASIEventType('clock');
        events.push(event);
      }
    }
    const len = events.length;
    WASIEvent.write_bytes_array(buffer, out_ptr, events);
    buffer.setUint32(nevents_ptr, len, true);
    return 0;
  };
}

function genmac() {
  return '02:XX:XX:XX:XX:XX'.replace(/X/g, function () {
    return '0123456789ABCDEF'.charAt(Math.floor(Math.random() * 16));
  });
}
