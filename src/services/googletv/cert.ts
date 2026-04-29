import forge from 'node-forge';
import * as SecureStore from 'expo-secure-store';

// v3 forces a fresh identity so the TV sees us as a brand-new client.
const CERT_KEY = 'gtv_client_cert_pem_v3';
const PRIV_KEY = 'gtv_client_key_pem_v3';
const PAIRED_PREFIX = 'gtv_paired_v3_';

export function pairedKey(host: string): string {
  return PAIRED_PREFIX + host.replace(/[^a-zA-Z0-9]/g, '_');
}

export interface ClientIdentity {
  certPem: string;
  keyPem: string;
}

export async function loadOrCreateIdentity(): Promise<ClientIdentity> {
  try {
    const cert = await SecureStore.getItemAsync(CERT_KEY);
    const key  = await SecureStore.getItemAsync(PRIV_KEY);
    if (cert && key) {
      console.log('[GoogleTV] reusing cached identity');
      return { certPem: cert, keyPem: key };
    }
    console.log('[GoogleTV] no cached identity — will generate fresh one');
  } catch (e) {
    console.warn('[GoogleTV] SecureStore read failed:', (e as Error).message);
  }

  try {
    const id = await generateIdentity();
    await SecureStore.setItemAsync(CERT_KEY, id.certPem);
    await SecureStore.setItemAsync(PRIV_KEY, id.keyPem);
    console.log('[GoogleTV] identity stored to SecureStore');
    return id;
  } catch (e) {
    console.error('[GoogleTV] identity generation FAILED:', (e as Error).message, e);
    throw e;
  }
}

async function generateIdentity(): Promise<ClientIdentity> {
  // 1024-bit RSA is ~5-10x faster than 2048 in pure-JS forge on Hermes.
  // The Polo pairing protocol works fine with it; security is fine for
  // a LAN-only remote.
  console.log('[GoogleTV] generating RSA-1024 keypair (synchronous, ~1-3s freeze, one-time)…');
  await new Promise(r => setTimeout(r, 50));
  const t0 = Date.now();
  const keypair = forge.pki.rsa.generateKeyPair({ bits: 1024 });
  console.log(`[GoogleTV] keypair generated in ${Date.now() - t0}ms, building cert…`);

  const cert = forge.pki.createCertificate();
  cert.publicKey = keypair.publicKey;
  cert.serialNumber = '01';
  cert.validity.notBefore = new Date();
  cert.validity.notAfter  = new Date();
  cert.validity.notAfter.setFullYear(cert.validity.notAfter.getFullYear() + 10);

  const attrs = [
    { name: 'commonName',  value: 'tv-remote' },
    { name: 'countryName', value: 'US' },
    { name: 'organizationName', value: 'TV Remote' },
  ];
  cert.setSubject(attrs);
  cert.setIssuer(attrs);
  cert.sign(keypair.privateKey, forge.md.sha256.create());

  // Android's PKCS8EncodedKeySpec requires PKCS#8, not the PKCS#1 default.
  const pkcs8Asn1 = forge.pki.wrapRsaPrivateKey(forge.pki.privateKeyToAsn1(keypair.privateKey));
  const keyPem = forge.pki.privateKeyInfoToPem(pkcs8Asn1);
  console.log('[GoogleTV] cert + PKCS#8 key ready');

  return {
    certPem: forge.pki.certificateToPem(cert),
    keyPem,
  };
}

// Extract modulus and exponent as Uint8Array from PEM cert (for pairing hash)
export function getRsaParts(certPem: string): { modulus: Uint8Array; exponent: Uint8Array } {
  const cert = forge.pki.certificateFromPem(certPem);
  const pub = cert.publicKey as forge.pki.rsa.PublicKey;
  return { modulus: bigIntToBytes(pub.n), exponent: bigIntToBytes(pub.e) };
}

// Same for an X.509 DER blob (server cert from TLS handshake)
export function getRsaPartsFromDer(der: Uint8Array): { modulus: Uint8Array; exponent: Uint8Array } {
  const asn1 = forge.asn1.fromDer(forge.util.createBuffer(uint8ToBinary(der)));
  const cert = forge.pki.certificateFromAsn1(asn1);
  const pub = cert.publicKey as forge.pki.rsa.PublicKey;
  return { modulus: bigIntToBytes(pub.n), exponent: bigIntToBytes(pub.e) };
}

function bigIntToBytes(bn: forge.jsbn.BigInteger): Uint8Array {
  // forge BigInteger -> hex -> bytes, stripping the leading 00 sign byte if present
  let hex = bn.toString(16);
  if (hex.length % 2) hex = '0' + hex;
  if (hex.length > 2 && hex.startsWith('00')) hex = hex.slice(2);
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}

function uint8ToBinary(arr: Uint8Array): string {
  let s = '';
  for (let i = 0; i < arr.length; i++) s += String.fromCharCode(arr[i]);
  return s;
}
