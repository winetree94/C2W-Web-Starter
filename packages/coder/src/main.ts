import 'xterm/css/xterm.css';
import './style.css'
import { Terminal } from 'xterm';
import { Flags, openpty, Termios, TtyServer } from 'xterm-pty';
import { delegate } from './ws-delegate';
import { newStack } from './stack';
import chunks from './chunks.json';
import { InitMessage, NETWORK_MODE, NetworkMode } from './types';

const xterm = new Terminal();
xterm.open(document.getElementById("terminal")!);

const { master, slave } = openpty();

const termios = slave.ioctl("TCGETS");
// typescript hack
const termiosAny = termios as any;

termiosAny.iflag &= ~(
  /*IGNBRK | BRKINT | PARMRK |*/
  Flags.ISTRIP |
  Flags.INLCR |
  Flags.IGNCR |
  Flags.ICRNL |
  Flags.IXON
);

termiosAny.oflag &= ~(
  Flags.OPOST
);

termiosAny.lflag &= ~(
  Flags.ECHO |
  Flags.ECHONL |
  Flags.ICANON |
  Flags.ISIG |
  Flags.IEXTEN
);

slave.ioctl("TCSETS", new Termios(
  termios.iflag,
  termios.oflag,
  termios.cflag,
  termios.lflag,
  termios.cc
));

xterm.loadAddon(master);

const worker = new Worker(
  new URL("./worker.ts" + location.search, import.meta.url),
  {
    type: 'module'
  }
);

var nwStack: (e: MessageEvent) => void;
var networkMode = getNetParam();
var image = chunks.ubuntu;

switch (networkMode) {
  case NETWORK_MODE.DELEGATE:
    nwStack = delegate(
      worker,
      image.wasmName,
      image.chunkCount,
      networkMode
    );
    break;
  case NETWORK_MODE.BROWSER:
    nwStack = newStack(
      worker,
      image.wasmName,
      image.chunkCount,
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
    break;
  default:
    worker.postMessage(<InitMessage>{
      type: "init",
      imagename: image.wasmName,
      chunkCount: image.chunkCount
    });
    nwStack = () => void 0;
    break;
}

new TtyServer(slave).start(worker, nwStack);

function getNetParam() {
  const net = new URLSearchParams(location.search).get('net')?.toLowerCase() as NetworkMode;
  return Object.values(NETWORK_MODE).includes(net) ? net : NETWORK_MODE.NONE;
}
