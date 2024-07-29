import '@xterm/xterm/css/xterm.css';
import './style.css'
import { Terminal } from '@xterm/xterm';
import { openpty } from './xterm-pty/src';
import { Termios, Flags } from './xterm-pty/src/termios';
import { delegate } from './ws-delegate';
import { newStack } from './stack';
import { TtyServer } from './xterm-pty/src/client-server/ttyServer';

const xterm = new Terminal();
xterm.open(document.getElementById("terminal")!);

const { master, slave } = openpty();

const termios = slave.ioctl("TCGETS");
termios.iflag &= ~(/*IGNBRK | BRKINT | PARMRK |*/ Flags.ISTRIP | Flags.INLCR | Flags.IGNCR | Flags.ICRNL | Flags.IXON);
termios.oflag &= ~(Flags.OPOST);
termios.lflag &= ~(Flags.ECHO | Flags.ECHONL | Flags.ICANON | Flags.ISIG | Flags.IEXTEN);
//termios.cflag &= ~(CSIZE | PARENB);
//termios.cflag |= CS8;
slave.ioctl("TCSETS", new Termios(termios.iflag, termios.oflag, termios.cflag, termios.lflag, termios.cc));
xterm.loadAddon(master as any);
const worker = new Worker(
  new URL("./worker.js" + location.search, import.meta.url),
);

var nwStack;
var netParam = getNetParam();
var workerImage = location.origin + "/wasms/out.wasm";
if (netParam) {
  if (netParam.mode == 'delegate') {
    nwStack = delegate(worker, workerImage, netParam.param);
  } else if (netParam.mode == 'browser') {
    nwStack = newStack(
      worker,
      workerImage,
      new Worker(
        new URL(
          "./stack-worker.js" + location.search,
          import.meta.url
        )
      ),
      location.origin + "/wasms/c2w-net-proxy.wasm"
    );
  }
}
if (!nwStack) {
  worker.postMessage({ type: "init", imagename: workerImage });
}
new TtyServer(slave).start(worker, nwStack);

function getNetParam() {
  var vars = location.search.substring(1).split('&');
  for (var i = 0; i < vars.length; i++) {
    var kv = vars[i].split('=');
    if (decodeURIComponent(kv[0]) == 'net') {
      return {
        mode: kv[1],
        param: kv[2],
      };
    }
  }
  return null;
}
