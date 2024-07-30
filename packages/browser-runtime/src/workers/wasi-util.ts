////////////////////////////////////////////////////////////
import { wasi } from '@bjorn3/browser_wasi_shim';
//
// event-related classes adopted from the on-going discussion
// towards poll_oneoff support in browser_wasi_sim project.
// Ref: https://github.com/bjorn3/browser_wasi_shim/issues/14#issuecomment-1450351935
//
////////////////////////////////////////////////////////////

export class WASIEventType {
  /*:: variant: "clock" | "fd_read" | "fd_write"*/
  variant: 'clock' | 'fd_read' | 'fd_write';

  constructor(variant: 'clock' | 'fd_read' | 'fd_write') {
    this.variant = variant;
  }

  static from_u8(data: number) /*: EventType*/ {
    switch (data) {
      case wasi.EVENTTYPE_CLOCK:
        return new WASIEventType('clock');
      case wasi.EVENTTYPE_FD_READ:
        return new WASIEventType('fd_read');
      case wasi.EVENTTYPE_FD_WRITE:
        return new WASIEventType('fd_write');
      default:
        throw 'Invalid event type ' + String(data);
    }
  }

  to_u8() /*: number*/ {
    switch (this.variant) {
      case 'clock':
        return wasi.EVENTTYPE_CLOCK;
      case 'fd_read':
        return wasi.EVENTTYPE_FD_READ;
      case 'fd_write':
        return wasi.EVENTTYPE_FD_WRITE;
      default:
        throw 'unreachable';
    }
  }
}

export class WASIEvent {
  /*:: userdata: UserData*/
  /*:: error: number*/
  /*:: type: EventType*/
  /*:: fd_readwrite: EventFdReadWrite | null*/
  userdata?: bigint;
  error?: number;
  type?: WASIEventType;
  //   fd_readwrite: EventFdReadWrite | null;

  write_bytes(view: DataView, ptr: number) {
    view.setBigUint64(ptr, this.userdata!, true);
    view.setUint8(ptr + 8, this.error!);
    view.setUint8(ptr + 9, 0);
    view.setUint8(ptr + 10, this.type!.to_u8());
    // if (this.fd_readwrite) {
    //     this.fd_readwrite.write_bytes(view, ptr + 16);
    // }
  }

  static write_bytes_array(
    view: DataView,
    ptr: number,
    events: Array<WASIEvent>,
  ) {
    for (let i = 0; i < events.length; i++) {
      events[i].write_bytes(view, ptr + 32 * i);
    }
  }
}

export class WASISubscriptionClock {
  timeout?: number;

  static read_bytes(view: DataView, ptr: number): WASISubscriptionClock {
    const self = new WASISubscriptionClock();
    self.timeout = Number(view.getBigUint64(ptr + 8, true));
    return self;
  }
}

export class WASISubscriptionFdReadWrite {
  /*:: fd: number*/
  fd?: number;

  static read_bytes(view: DataView, ptr: number): WASISubscriptionFdReadWrite {
    const self = new WASISubscriptionFdReadWrite();
    self.fd = view.getUint32(ptr, true);
    return self;
  }
}

export class WASISubscriptionU {
  tag?: WASIEventType;
  data?: WASISubscriptionClock | WASISubscriptionFdReadWrite;

  static read_bytes(view: DataView, ptr: number): WASISubscriptionU {
    const self = new WASISubscriptionU();
    self.tag = WASIEventType.from_u8(view.getUint8(ptr));
    switch (self.tag.variant) {
      case 'clock':
        self.data = WASISubscriptionClock.read_bytes(view, ptr + 8);
        break;
      case 'fd_read':
      case 'fd_write':
        self.data = WASISubscriptionFdReadWrite.read_bytes(view, ptr + 8);
        break;
      default:
        throw 'unreachable';
    }
    return self;
  }
}

export class WASISubscription {
  userdata?: bigint;
  u?: WASISubscriptionU;

  static read_bytes(view: DataView, ptr: number): WASISubscription {
    const subscription = new WASISubscription();
    subscription.userdata = view.getBigUint64(ptr, true);
    subscription.u = WASISubscriptionU.read_bytes(view, ptr + 8);
    return subscription;
  }

  static read_bytes_array(
    view: DataView,
    ptr: number,
    len: number,
  ): Array<WASISubscription> {
    const subscriptions = [];
    for (let i = 0; i < len; i++) {
      subscriptions.push(WASISubscription.read_bytes(view, ptr + 48 * i));
    }
    return subscriptions;
  }
}
