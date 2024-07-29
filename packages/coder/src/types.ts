export interface InitMessage {
  type: "init";
  buf?: SharedArrayBuffer;
  imagename: string;
  chunkCount: number;
}

export const NETWORK_MODE = {
  DELEGATE: "delegate",
  BROWSER: "browser",
  NONE: "none",
} as const;

export type NetworkMode = typeof NETWORK_MODE[keyof typeof NETWORK_MODE];
