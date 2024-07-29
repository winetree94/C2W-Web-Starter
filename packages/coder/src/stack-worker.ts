import { Fd, WASI, wasi as wasiOrigin } from "@bjorn3/browser_wasi_shim";
import { appendData, errStatus, getImagename, sendCert, serveIfInitMsg, sockWaitForReadable, streamCtrl, streamData, streamLen, streamStatus, wasiHackSocket } from "./worker-util";
import { Event, EventType, Subscription } from "./wasi-util";

onmessage = (msg) => {
    console.log('init')
    serveIfInitMsg(msg);
    var fds: Fd[] = [
        //@ts-ignore
        undefined, // 0: stdin
        //@ts-ignore
        undefined, // 1: stdout
        //@ts-ignore
        undefined, // 2: stderr
        //@ts-ignore
        undefined, // 3: receive certificates
        //@ts-ignore
        undefined, // 4: socket listenfd
        //@ts-ignore
        undefined, // 5: accepted socket fd (multi-connection is unsupported)
        // 6...: used by wasi shim
    ];
    var certfd = 3;
    var listenfd = 4;
    var args = ['arg0', '--certfd=' + certfd, '--net-listenfd=' + listenfd, '--debug'];
    var env: string[] = [];
    var wasi = new WASI(args, env, fds);
    wasiHack(wasi, certfd, 5);
    wasiHackSocket(wasi, listenfd, 5);
    fetch(getImagename(), { credentials: 'same-origin' }).then((resp) => {
        resp['arrayBuffer']().then((wasm) => {
            WebAssembly.instantiate(wasm, {
                "wasi_snapshot_preview1": wasi.wasiImport,
                "env": envHack(wasi),
            }).then((inst) => {
                /**
                 * @todo type missmatching
                 */
                wasi.start(inst.instance as {
                    exports: { memory: WebAssembly.Memory; _start: () => unknown };
                });
            });
        })
    });
};

// definition from wasi-libc https://github.com/WebAssembly/wasi-libc/blob/wasi-sdk-19/expected/wasm32-wasi/predefined-macros.txt
const ERRNO_INVAL = 28;
const ERRNO_AGAIN = 6;

function wasiHack(
    wasi: WASI,
    certfd: number,
    connfd: number
) {
    var certbuf = new Uint8Array(0);
    var _fd_close = wasi.wasiImport.fd_close;
    wasi.wasiImport.fd_close = (fd) => {
        if (fd == certfd) {
            sendCert(certbuf);
            return 0;
        }
        return _fd_close.apply(wasi.wasiImport, [fd]);
    }
    var _fd_fdstat_get = wasi.wasiImport.fd_fdstat_get;
    wasi.wasiImport.fd_fdstat_get = (fd, fdstat_ptr) => {
        if (fd == certfd) {
            return 0;
        }
        return _fd_fdstat_get.apply(wasi.wasiImport, [fd, fdstat_ptr]);
    }
    wasi.wasiImport.fd_fdstat_set_flags = (fd, fdflags) => {
        // TODO
        return 0;
    }
    var _fd_write = wasi.wasiImport.fd_write;
    wasi.wasiImport.fd_write = (fd, iovs_ptr, iovs_len, nwritten_ptr) => {
        if ((fd == 1) || (fd == 2) || (fd == certfd)) {
            var buffer = new DataView(wasi.inst.exports.memory.buffer);
            var buffer8 = new Uint8Array(wasi.inst.exports.memory.buffer);
            var iovecs = wasiOrigin.Ciovec.read_bytes_array(buffer, iovs_ptr, iovs_len);
            var wtotal = 0
            for (let i = 0; i < iovecs.length; i++) {
                var iovec = iovecs[i];
                var buf = buffer8.slice(iovec.buf, iovec.buf + iovec.buf_len);
                if (buf.length == 0) {
                    continue;
                }
                console.log(new TextDecoder().decode(buf));
                if (fd == certfd) {
                    certbuf = appendData(certbuf, buf);
                }
                wtotal += buf.length;
            }
            buffer.setUint32(nwritten_ptr, wtotal, true);
            return 0;
        }
        console.log("fd_write: unknown fd " + fd);
        return _fd_write.apply(wasi.wasiImport, [fd, iovs_ptr, iovs_len, nwritten_ptr]);
    }
    wasi.wasiImport.poll_oneoff = (in_ptr, out_ptr, nsubscriptions, nevents_ptr) => {
        if (nsubscriptions == 0) {
            return ERRNO_INVAL;
        }
        let buffer = new DataView(wasi.inst.exports.memory.buffer);
        let in_ = Subscription.read_bytes_array(buffer, in_ptr, nsubscriptions);
        let isReadPollStdin = false;
        let isReadPollConn = false;
        let isClockPoll = false;
        let pollSubStdin;
        let pollSubConn;
        let clockSub;
        let timeout = Number.MAX_VALUE;
        for (let sub of in_) {
            //@ts-ignore
            if (sub.u.tag.variant == "fd_read") {
                //@ts-ignore
                if ((sub.u.data.fd != 0) && (sub.u.data.fd != connfd)) {
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
            } else if (sub.u.tag.variant == "clock") {
                //@ts-ignore
                if (sub.u.data.timeout < timeout) {
                    //@ts-ignore
                    timeout = sub.u.data.timeout
                    isClockPoll = true;
                    clockSub = sub;
                }
            } else {
                return ERRNO_INVAL; // FIXME
            }
        }
        let events = [];
        if (isReadPollStdin || isReadPollConn || isClockPoll) {
            var sockreadable = sockWaitForReadable(timeout / 1000000000);
            if (isReadPollConn) {
                if (sockreadable == errStatus) {
                    return ERRNO_INVAL;
                } else if (sockreadable == true) {
                    let event = new Event();
                    event.userdata = pollSubConn?.userdata;
                    event.error = 0;
                    event.type = new EventType("fd_read");
                    events.push(event);
                }
            }
            if (isClockPoll) {
                let event = new Event();
                event.userdata = clockSub?.userdata;
                event.error = 0;
                event.type = new EventType("clock");
                events.push(event);
            }
        }
        var len = events.length;
        Event.write_bytes_array(buffer, out_ptr, events);
        buffer.setUint32(nevents_ptr, len, true);
        return 0;
    }
}

function envHack(wasi: WASI) {
    return {
        http_send: function (
            addressP: number,
            addresslen: number,
            reqP: number,
            reqlen: number,
            idP: number
        ) {
            var buffer = new DataView(wasi.inst.exports.memory.buffer);
            var address = new Uint8Array(wasi.inst.exports.memory.buffer, addressP, addresslen);
            var req = new Uint8Array(wasi.inst.exports.memory.buffer, reqP, reqlen);
            streamCtrl[0] = 0;
            postMessage({
                type: "http_send",
                address: address,
                req: req,
            });
            Atomics.wait(streamCtrl, 0, 0);
            if (streamStatus[0] < 0) {
                return ERRNO_INVAL;
            }
            var id = streamStatus[0];
            buffer.setUint32(idP, id, true);
            return 0;
        },
        http_writebody: function (
            id: number,
            bodyP: number,
            bodylen: number,
            nwrittenP: number,
            isEOF: number
        ) {
            var buffer = new DataView(wasi.inst.exports.memory.buffer);
            var body = new Uint8Array(wasi.inst.exports.memory.buffer, bodyP, bodylen);
            streamCtrl[0] = 0;
            postMessage({
                type: "http_writebody",
                id: id,
                body: body,
                isEOF: isEOF,
            });
            Atomics.wait(streamCtrl, 0, 0);
            if (streamStatus[0] < 0) {
                return ERRNO_INVAL;
            }
            buffer.setUint32(nwrittenP, bodylen, true);
            return 0;
        },
        http_isreadable: function (
            id: number,
            isOKP: number
        ) {
            var buffer = new DataView(wasi.inst.exports.memory.buffer);
            streamCtrl[0] = 0;
            postMessage({ type: "http_isreadable", id: id });
            Atomics.wait(streamCtrl, 0, 0);
            if (streamStatus[0] < 0) {
                return ERRNO_INVAL;
            }
            var readable = 0;
            if (streamData[0] == 1) {
                readable = 1;
            }
            buffer.setUint32(isOKP, readable, true);
            return 0;
        },
        http_recv: function (
            id: number,
            respP: number,
            bufsize: number,
            respsizeP: number,
            isEOFP: number
        ) {
            var buffer = new DataView(wasi.inst.exports.memory.buffer);
            var buffer8 = new Uint8Array(wasi.inst.exports.memory.buffer);

            streamCtrl[0] = 0;
            postMessage({ type: "http_recv", id: id, len: bufsize });
            Atomics.wait(streamCtrl, 0, 0);
            if (streamStatus[0] < 0) {
                return ERRNO_INVAL;
            }
            var ddlen = streamLen[0];
            var resp = streamData.slice(0, ddlen);
            buffer8.set(resp, respP);
            buffer.setUint32(respsizeP, ddlen, true);
            if (streamStatus[0] == 1) {
                buffer.setUint32(isEOFP, 1, true);
            } else {
                buffer.setUint32(isEOFP, 0, true);
            }
            return 0;
        },
        http_readbody: function (
            id: number,
            bodyP: number,
            bufsize: number,
            bodysizeP: number,
            isEOFP: number
        ) {
            var buffer = new DataView(wasi.inst.exports.memory.buffer);
            var buffer8 = new Uint8Array(wasi.inst.exports.memory.buffer);

            streamCtrl[0] = 0;
            postMessage({ type: "http_readbody", id: id, len: bufsize });
            Atomics.wait(streamCtrl, 0, 0);
            if (streamStatus[0] < 0) {
                return ERRNO_INVAL;
            }
            var ddlen = streamLen[0];
            var body = streamData.slice(0, ddlen);
            buffer8.set(body, bodyP);
            buffer.setUint32(bodysizeP, ddlen, true);
            if (streamStatus[0] == 1) {
                buffer.setUint32(isEOFP, 1, true);
            } else {
                buffer.setUint32(isEOFP, 0, true);
            }
            return 0;
        }
    };
}
