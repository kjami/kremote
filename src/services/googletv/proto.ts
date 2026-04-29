// Minimal hand-coded protobuf encoder/decoder for Android TV Remote v2.
// Wire format: each message on the socket is a varint length prefix
// followed by the protobuf bytes.

export const WIRE = { VARINT: 0, BYTES: 2 } as const;

// ---------------- low-level varint / wire helpers ----------------

export function encodeVarint(n: number): number[] {
  const out: number[] = [];
  let v = n >>> 0;
  while (v >= 0x80) {
    out.push((v & 0x7f) | 0x80);
    v >>>= 7;
  }
  out.push(v & 0x7f);
  return out;
}

export function decodeVarint(buf: Uint8Array, offset: number): { value: number; next: number } {
  let value = 0;
  let shift = 0;
  let i = offset;
  while (i < buf.length) {
    const b = buf[i++];
    value |= (b & 0x7f) << shift;
    if ((b & 0x80) === 0) return { value: value >>> 0, next: i };
    shift += 7;
  }
  throw new Error('varint truncated');
}

function tag(field: number, wire: number) {
  return (field << 3) | wire;
}

// ---------------- builders ----------------

export type Field =
  | { f: number; t: 'varint';  v: number }
  | { f: number; t: 'bytes';   v: Uint8Array }
  | { f: number; t: 'string';  v: string }
  | { f: number; t: 'message'; v: Uint8Array }
  | { f: number; t: 'enum';    v: number };

export function encode(fields: Field[]): Uint8Array {
  const bytes: number[] = [];
  for (const fd of fields) {
    if (fd.t === 'varint' || fd.t === 'enum') {
      bytes.push(...encodeVarint(tag(fd.f, WIRE.VARINT)));
      bytes.push(...encodeVarint(fd.v));
    } else if (fd.t === 'string') {
      const data = new TextEncoder().encode(fd.v);
      bytes.push(...encodeVarint(tag(fd.f, WIRE.BYTES)));
      bytes.push(...encodeVarint(data.length));
      for (let i = 0; i < data.length; i++) bytes.push(data[i]);
    } else {
      const data = fd.v;
      bytes.push(...encodeVarint(tag(fd.f, WIRE.BYTES)));
      bytes.push(...encodeVarint(data.length));
      for (let i = 0; i < data.length; i++) bytes.push(data[i]);
    }
  }
  return new Uint8Array(bytes);
}

// Wrap a message body in a varint length-prefix (for socket transport)
export function frame(msg: Uint8Array): Uint8Array {
  const lenBytes = encodeVarint(msg.length);
  const out = new Uint8Array(lenBytes.length + msg.length);
  for (let i = 0; i < lenBytes.length; i++) out[i] = lenBytes[i];
  out.set(msg, lenBytes.length);
  return out;
}

// ---------------- decoder ----------------

export type DecodedField = { wire: number; value: number | Uint8Array };
export type DecodedMessage = Map<number, DecodedField[]>;

export function decode(buf: Uint8Array): DecodedMessage {
  const out = new Map<number, DecodedField[]>();
  let i = 0;
  while (i < buf.length) {
    const t = decodeVarint(buf, i); i = t.next;
    const field = t.value >>> 3;
    const wire = t.value & 0x7;
    let value: number | Uint8Array;
    if (wire === WIRE.VARINT) {
      const v = decodeVarint(buf, i); i = v.next;
      value = v.value;
    } else if (wire === WIRE.BYTES) {
      const len = decodeVarint(buf, i); i = len.next;
      value = buf.slice(i, i + len.value);
      i += len.value;
    } else {
      throw new Error(`unsupported wire type ${wire}`);
    }
    const arr = out.get(field) ?? [];
    arr.push({ wire, value });
    out.set(field, arr);
  }
  return out;
}

export function getVarint(msg: DecodedMessage, field: number): number | undefined {
  const v = msg.get(field)?.[0];
  return v && typeof v.value === 'number' ? v.value : undefined;
}

export function getBytes(msg: DecodedMessage, field: number): Uint8Array | undefined {
  const v = msg.get(field)?.[0];
  return v && v.value instanceof Uint8Array ? v.value : undefined;
}

export function getString(msg: DecodedMessage, field: number): string | undefined {
  const b = getBytes(msg, field);
  return b ? new TextDecoder().decode(b) : undefined;
}

// ---------------- protocol enums ----------------

// PairingMessage MessageType
export const PMT = {
  PAIRING_REQUEST:        10,
  PAIRING_REQUEST_ACK:    11,
  OPTIONS:                20,
  CONFIGURATION:          30,
  CONFIGURATION_ACK:      31,
  SECRET:                 40,
  SECRET_ACK:             41,
} as const;

export const PAIR_STATUS_OK = 200;

// Encoding type
export const ENC_HEXADECIMAL = 3;

// Role type
export const ROLE_INPUT = 1;

// RemoteKeyInject direction
export const DIR_SHORT = 3;
