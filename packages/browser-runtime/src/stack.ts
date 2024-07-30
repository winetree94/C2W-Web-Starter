/* eslint-disable no-var */
import { InitMessage, NetworkMode } from './types';

export function newStack(
  worker: Worker,
  workerImageName: string,
  chunkCount: number,
  networkMode: NetworkMode,
  stackWorker: Worker,
  stackImageName: string,
) {
  const p2vbuf = {
    buf: new Uint8Array(0), // proxy => vm
  };
  const v2pbuf = {
    buf: new Uint8Array(0), // vm => proxy
  };
  const proxyConn = {
    sendbuf: p2vbuf,
    recvbuf: v2pbuf,
  };
  const vmConn = {
    sendbuf: v2pbuf,
    recvbuf: p2vbuf,
  };
  const proxyShared = new SharedArrayBuffer(12 + 4096);
  const certbuf = {
    buf: new Uint8Array(0),
    done: false,
  };
  stackWorker.onmessage = connect('proxy', proxyShared, proxyConn, certbuf);
  stackWorker.postMessage(<InitMessage>{
    type: 'init',
    buf: proxyShared,
    networkMode,
    imagename: stackImageName,
  });

  const vmShared = new SharedArrayBuffer(12 + 4096);
  worker.postMessage(<InitMessage>{
    type: 'init',
    buf: vmShared,
    imagename: workerImageName,
    networkMode,
    chunkCount,
  });

  return connect('vm', vmShared, vmConn, certbuf);
}

export function connect(
  name: 'proxy' | 'vm',
  shared: SharedArrayBuffer,
  conn: {
    sendbuf: { buf: Uint8Array };
    recvbuf: { buf: Uint8Array };
  },
  certbuf: { buf: Uint8Array; done: boolean },
) {
  const streamCtrl = new Int32Array(shared, 0, 1);
  const streamStatus = new Int32Array(shared, 4, 1);
  const streamLen = new Int32Array(shared, 8, 1);
  const streamData = new Uint8Array(shared, 12);
  const sendbuf = conn.sendbuf;
  const recvbuf = conn.recvbuf;
  let accepted = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const httpConnections: any = {};
  let curID = 0;
  const maxID = 0x7fffffff; // storable in streamStatus(signed 32bits)
  function getID() {
    const startID = curID;
    while (true) {
      if (httpConnections[curID] == undefined) {
        return curID;
      }
      if (curID >= maxID) {
        curID = 0;
      } else {
        curID++;
      }
      if (curID == startID) {
        return -1; // exhausted
      }
    }
    return curID;
  }
  function serveData(data: Uint8Array, len: number) {
    let length = len;
    if (length > streamData.byteLength) length = streamData.byteLength;
    if (length > data.byteLength) length = data.byteLength;
    const buf = data.slice(0, length);
    const remain = data.slice(length, data.byteLength);
    streamLen[0] = buf.byteLength;
    streamData.set(buf, 0);
    return remain;
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let timeoutHandler: any;
  return function (msg: MessageEvent) {
    const req_ = msg.data;
    if (typeof req_ == 'object' && req_.type) {
      switch (req_.type) {
        case 'accept':
          accepted = true;
          streamData[0] = 1; // opened
          streamStatus[0] = 0;
          break;
        case 'send':
          if (!accepted) {
            console.log(name + ':' + 'cannot send to unaccepted socket');
            streamStatus[0] = -1;
            break;
          }
          sendbuf.buf = appendData(sendbuf.buf, req_.buf);
          streamStatus[0] = 0;
          break;
        case 'recv':
          if (!accepted) {
            console.log(name + ':' + 'cannot recv from unaccepted socket');
            streamStatus[0] = -1;
            break;
          }
          recvbuf.buf = serveData(recvbuf.buf, req_.len);
          streamStatus[0] = 0;
          break;
        case 'recv-is-readable':
          var recvbufP = recvbuf.buf;
          if (recvbufP.byteLength > 0) {
            streamData[0] = 1; // ready for reading
          } else {
            if (req_.timeout != undefined && req_.timeout > 0) {
              if (timeoutHandler) {
                clearTimeout(timeoutHandler);
                timeoutHandler = null;
              }
              timeoutHandler = setTimeout(() => {
                if (timeoutHandler) {
                  clearTimeout(timeoutHandler);
                  timeoutHandler = null;
                }
                if (recvbuf.buf.byteLength > 0) {
                  streamData[0] = 1; // ready for reading
                } else {
                  streamData[0] = 0; // timeout
                }
                streamStatus[0] = 0;
                Atomics.store(streamCtrl, 0, 1);
                Atomics.notify(streamCtrl, 0);
              }, req_.timeout * 1000);
              return;
            }
            streamData[0] = 0; // timeout
          }
          streamStatus[0] = 0;
          break;
        case 'http_send':
          var reqObj = JSON.parse(new TextDecoder().decode(req_.req));
          reqObj.mode = 'cors';
          reqObj.credentials = 'omit';
          if (reqObj.headers && reqObj.headers['User-Agent'] != '') {
            delete reqObj.headers['User-Agent']; // Browser will add its own value.
          }
          var reqID = getID();
          if (reqID < 0) {
            console.log(name + ':' + 'failed to get id');
            streamStatus[0] = -1;
            break;
          }
          var connObj = {
            address: new TextDecoder().decode(req_.address),
            request: reqObj,
            requestSent: false,
            reqBodybuf: new Uint8Array(0),
            reqBodyEOF: false,
          };
          httpConnections[reqID] = connObj;
          streamStatus[0] = reqID;
          break;
        case 'http_writebody':
          httpConnections[req_.id].reqBodybuf = appendData(
            httpConnections[req_.id].reqBodybuf,
            req_.body,
          );
          httpConnections[req_.id].reqBodyEOF = req_.isEOF;
          streamStatus[0] = 0;

          if (req_.isEOF && !httpConnections[req_.id].requestSent) {
            httpConnections[req_.id].requestSent = true;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const connObj: any = httpConnections[req_.id];
            if (
              connObj.request.method != 'HEAD' &&
              connObj.request.method != 'GET'
            ) {
              connObj.request.body = connObj.reqBodybuf;
            }
            fetch(connObj.address, connObj.request)
              .then((resp) => {
                (connObj.response = new TextEncoder().encode(
                  JSON.stringify({
                    bodyUsed: resp.bodyUsed,
                    headers: resp.headers,
                    redirected: resp.redirected,
                    status: resp.status,
                    statusText: resp.statusText,
                    type: resp.type,
                    url: resp.url,
                  }),
                )),
                  (connObj.done = false);
                connObj.respBodybuf = new Uint8Array(0);
                if (resp.ok) {
                  resp
                    .arrayBuffer()
                    .then((data) => {
                      connObj.respBodybuf = new Uint8Array(data);
                      connObj.done = true;
                    })
                    .catch((error) => {
                      connObj.respBodybuf = new Uint8Array(0);
                      connObj.done = true;
                      console.log('failed to fetch body: ' + error);
                    });
                } else {
                  connObj.done = true;
                }
              })
              .catch(() => {
                connObj.response = new TextEncoder().encode(
                  JSON.stringify({
                    status: 503,
                    statusText: 'Service Unavailable',
                  }),
                );
                connObj.respBodybuf = new Uint8Array(0);
                connObj.done = true;
              });
          }
          break;
        case 'http_isreadable':
          if (
            httpConnections[req_.id] != undefined &&
            httpConnections[req_.id].response != undefined
          ) {
            streamData[0] = 1; // ready for reading
          } else {
            streamData[0] = 0; // nothing to read
          }
          streamStatus[0] = 0;
          break;
        case 'http_recv':
          if (
            httpConnections[req_.id] == undefined ||
            httpConnections[req_.id].response == undefined
          ) {
            console.log(name + ':' + 'response is not available');
            streamStatus[0] = -1;
            break;
          }
          httpConnections[req_.id].response = serveData(
            httpConnections[req_.id].response,
            req_.len,
          );
          streamStatus[0] = 0;
          if (httpConnections[req_.id].response.byteLength == 0) {
            streamStatus[0] = 1; // isEOF
          }
          break;
        case 'http_readbody':
          if (
            httpConnections[req_.id] == undefined ||
            httpConnections[req_.id].response == undefined
          ) {
            console.log(name + ':' + 'response body is not available');
            streamStatus[0] = -1;
            break;
          }
          httpConnections[req_.id].respBodybuf = serveData(
            httpConnections[req_.id].respBodybuf,
            req_.len,
          );
          streamStatus[0] = 0;
          if (
            httpConnections[req_.id].done &&
            httpConnections[req_.id].respBodybuf.byteLength == 0
          ) {
            streamStatus[0] = 1;
            delete httpConnections[req_.id]; // connection done
          }
          break;
        case 'send_cert':
          certbuf.buf = appendData(certbuf.buf, req_.buf);
          certbuf.done = true;
          streamStatus[0] = 0;
          break;
        case 'recv_cert':
          if (!certbuf.done) {
            streamStatus[0] = -1;
            break;
          }
          certbuf.buf = serveData(certbuf.buf, req_.len);
          streamStatus[0] = 0;
          if (certbuf.buf.byteLength == 0) {
            streamStatus[0] = 1; // isEOF
          }
          break;
        default:
          console.log(name + ':' + 'unknown request: ' + req_.type);
          return;
      }
      Atomics.store(streamCtrl, 0, 1);
      Atomics.notify(streamCtrl, 0);
    } else {
      console.log('UNKNOWN MSG ' + msg);
    }
  };
}

export function appendData(data1: Uint8Array, data2: Uint8Array) {
  const buf2 = new Uint8Array(data1.byteLength + data2.byteLength);
  buf2.set(new Uint8Array(data1), 0);
  buf2.set(new Uint8Array(data2), data1.byteLength);
  return buf2;
}
