import { Terminal } from 'xterm';
import { Flags, openpty, Termios, TtyServer } from 'xterm-pty';
import { delegate } from './ws-delegate';
import { newStack } from './stack';
import { NETWORK_MODE } from './types';
import type { InitMessage } from './types';

export { NETWORK_MODE, NetworkMode } from './types';

export interface C2WImage {
  path: string;
  wasmName: string;
  chunkCount?: number;
}

export interface C2WBaseConfigs {
  parentElement: HTMLDivElement;
  imageWorker: Worker;
  imageWasmPaths: string[];
}

export interface C2WNoNetworkTerminalConfigs extends C2WBaseConfigs {
  networkMode: typeof NETWORK_MODE.NONE;
}

export interface C2WDelegateNetworkTerminalConfigs extends C2WBaseConfigs {
  networkMode: typeof NETWORK_MODE.DELEGATE;
}

export interface C2WBrowserNetworkTerminalConfigs extends C2WBaseConfigs {
  networkMode: typeof NETWORK_MODE.BROWSER;
  networkWorker: Worker;
  networkWasmPaths: string[];
}

export type C2WTerminalConfigs =
  | C2WNoNetworkTerminalConfigs
  | C2WDelegateNetworkTerminalConfigs
  | C2WBrowserNetworkTerminalConfigs;

export const c2wTerminal = (configs: C2WTerminalConfigs) => {
  const xterm = new Terminal();
  xterm.open(configs.parentElement);
  const { master, slave } = openpty();

  const termios = slave.ioctl('TCGETS');
  // typescript hack
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const termiosAny = termios as any;

  termiosAny.iflag &= ~(
    /*IGNBRK | BRKINT | PARMRK |*/
    (Flags.ISTRIP | Flags.INLCR | Flags.IGNCR | Flags.ICRNL | Flags.IXON)
  );

  termiosAny.oflag &= ~Flags.OPOST;

  termiosAny.lflag &= ~(
    Flags.ECHO |
    Flags.ECHONL |
    Flags.ICANON |
    Flags.ISIG |
    Flags.IEXTEN
  );

  slave.ioctl(
    'TCSETS',
    new Termios(
      termios.iflag,
      termios.oflag,
      termios.cflag,
      termios.lflag,
      termios.cc,
    ),
  );

  xterm.loadAddon(master);

  const worker = configs.imageWorker;

  let nwStack: (e: MessageEvent) => void;
  // const image = chunks.alpine;

  switch (configs.networkMode) {
    case NETWORK_MODE.DELEGATE:
      nwStack = delegate(worker, configs.imageWasmPaths, configs.networkMode);
      break;
    case NETWORK_MODE.BROWSER:
      nwStack = newStack(
        worker,
        configs.imageWasmPaths,
        configs.networkMode,
        configs.networkWorker,
        configs.networkWasmPaths,
      );
      break;
    default:
      worker.postMessage(<InitMessage>{
        type: 'init',
        wasmChunks: configs.imageWasmPaths,
      });
      nwStack = () => void 0;
      break;
  }

  const ttsServer = new TtyServer(slave);
  ttsServer.start(worker, nwStack);
};
