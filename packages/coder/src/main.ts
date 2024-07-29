import 'xterm/css/xterm.css';
import './style.css'
import { Terminal } from 'xterm';
import { openpty, Termios, TtyServer } from 'xterm-pty';
import { delegate } from './ws-delegate';
import { newStack } from './stack';
import { Flags } from './flags';

const xterm = new Terminal();
xterm.open(document.getElementById("terminal")!);

const { master, slave } = openpty();

const termios = slave.ioctl("TCGETS");

const termiosAny = termios as any;

// typescript hack
termiosAny.iflag &= ~(/*IGNBRK | BRKINT | PARMRK |*/ Flags.ISTRIP | Flags.INLCR | Flags.IGNCR | Flags.ICRNL | Flags.IXON);
termiosAny.oflag &= ~(Flags.OPOST);
termiosAny.lflag &= ~(Flags.ECHO | Flags.ECHONL | Flags.ICANON | Flags.ISIG | Flags.IEXTEN);

//termios.cflag &= ~(CSIZE | PARENB);
//termios.cflag |= CS8;
slave.ioctl("TCSETS", new Termios(termios.iflag, termios.oflag, termios.cflag, termios.lflag, termios.cc));
xterm.loadAddon(master);
// const worker = new Worker(
// "/worker.js" + location.search
// );
const worker = new Worker(
  new URL("./worker.ts" + location.search, import.meta.url),
  {
    type: 'module'
  }
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
      // new Worker(
      //     "/stack-worker.js" + location.search
      // ),
      new Worker(
        new URL(
          "./stack-worker.ts" + location.search,
          import.meta.url
        ),
        {
          type: 'module'
        }
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
