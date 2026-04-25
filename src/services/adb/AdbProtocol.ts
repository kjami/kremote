// ADB binary protocol implementation
// Reference: https://android.googlesource.com/platform/packages/modules/adb/+/refs/heads/master/protocol.txt

export const CMD = {
  CNXN: 0x4e584e43,
  AUTH: 0x48545541,
  OPEN: 0x4e45504f,
  OKAY: 0x59414b4f,
  CLSE: 0x45534c43,
  WRTE: 0x45545257,
} as const;

export const AUTH_TYPE = {
  TOKEN: 1,
  SIGNATURE: 2,
  RSAPUBLICKEY: 3,
} as const;

export const A_VERSION = 0x01000000;
export const MAX_PAYLOAD = 256 * 1024;

// Precomputed CRC32 lookup table
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    t[i] = c;
  }
  return t;
})();

export function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc = CRC_TABLE[(crc ^ data[i]) & 0xff] ^ (crc >>> 8);
  }
  return ((crc ^ 0xffffffff) >>> 0);
}

export interface AdbMessage {
  command: number;
  arg0: number;
  arg1: number;
  data: Uint8Array;
}

export function encodeMessage(msg: AdbMessage): Uint8Array {
  const header = new Uint8Array(24);
  const view = new DataView(header.buffer);
  const dataLen = msg.data.length;
  const dataCrc = dataLen > 0 ? crc32(msg.data) : 0;

  view.setUint32(0,  msg.command, true);
  view.setUint32(4,  msg.arg0,    true);
  view.setUint32(8,  msg.arg1,    true);
  view.setUint32(12, dataLen,     true);
  view.setUint32(16, dataCrc,     true);
  view.setUint32(20, (msg.command ^ 0xffffffff) >>> 0, true);

  const out = new Uint8Array(24 + dataLen);
  out.set(header, 0);
  if (dataLen > 0) out.set(msg.data, 24);
  return out;
}

export interface AdbHeader {
  command: number;
  arg0: number;
  arg1: number;
  dataLen: number;
}

export function decodeHeader(buf: Uint8Array): AdbHeader {
  const view = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
  return {
    command: view.getUint32(0,  true),
    arg0:    view.getUint32(4,  true),
    arg1:    view.getUint32(8,  true),
    dataLen: view.getUint32(12, true),
  };
}

export function cnxnPacket(): Uint8Array {
  const systemStr = 'host::features=cmd,shell_v2,stat_v2,abb_exec';
  const data = new TextEncoder().encode(systemStr + '\0');
  return encodeMessage({ command: CMD.CNXN, arg0: A_VERSION, arg1: MAX_PAYLOAD, data });
}

export function openPacket(localId: number, service: string): Uint8Array {
  const data = new TextEncoder().encode(service + '\0');
  return encodeMessage({ command: CMD.OPEN, arg0: localId, arg1: 0, data });
}

export function writePacket(localId: number, remoteId: number, payload: string): Uint8Array {
  const data = new TextEncoder().encode(payload);
  return encodeMessage({ command: CMD.WRTE, arg0: localId, arg1: remoteId, data });
}

export function okayPacket(localId: number, remoteId: number): Uint8Array {
  return encodeMessage({ command: CMD.OKAY, arg0: localId, arg1: remoteId, data: new Uint8Array(0) });
}

export function closePacket(localId: number, remoteId: number): Uint8Array {
  return encodeMessage({ command: CMD.CLSE, arg0: localId, arg1: remoteId, data: new Uint8Array(0) });
}
