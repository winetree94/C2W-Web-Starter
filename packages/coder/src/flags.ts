export const enum Flags {
  // c_iflag
  ISTRIP = 0x0020,
  INLCR = 0x0040,
  IGNCR = 0x0080,
  ICRNL = 0x0100,
  IUCLC = 0x0200,
  IXON = 0x0400,
  IXANY = 0x0800,
  IMAXBEL = 0x2000,
  IUTF8 = 0x4000,

  // c_oflag
  OPOST = 0x0001,
  OLCUC = 0x0002,
  ONLCR = 0x0004,
  OCRNL = 0x0008,
  ONOCR = 0x0010,
  ONLRET = 0x0020,
  TABDLY = 0x1800,
  XTABS = 0x1800,

  // c_lflag
  ISIG = 0x0001,
  ICANON = 0x0002,
  ECHO = 0x0008,
  ECHOE = 0x0010,
  ECHOK = 0x0020,
  ECHONL = 0x0040,
  NOFLSH = 0x0080,
  ECHOCTL = 0x0200,
  ECHOPRT = 0x0400,
  ECHOKE = 0x0800,
  IEXTEN = 0x8000,

  // c_cc
  VINTR = 0,
  VQUIT = 1,
  VERASE = 2,
  VKILL = 3,
  VEOF = 4,
  VTIME = 5,
  VMIN = 6,
  VSWTCH = 7,
  VSTART = 8,
  VSTOP = 9,
  VSUSP = 10,
  VEOL = 11,
  VREPRINT = 12,
  VDISCARD = 13,
  VWERASE = 14,
  VLNEXT = 15,
  VEOL2 = 16
}
