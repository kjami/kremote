# Features

A React Native + TypeScript universal TV remote that runs on iOS and Android.

## Supported devices

| Type | Protocol | Port(s) | Auth |
|------|----------|---------|------|
| **Sony BRAVIA / Google TV** (legacy IRCC API) | HTTP + SOAP IRCC | 80 | 4-digit PIN, cached cookie |
| **Samsung Tizen** | WebSocket | 8001 | First-time pairing, on-screen accept |
| **Amazon Firestick / Fire TV** | ADB over TCP | 5555 | RSA cert, on-screen "Allow ADB" prompt |
| **Android TV Remote v2 (Polo)** | TLS sockets, protobuf | 6466 / 6467 | RSA cert + 6-character hex pairing code |

Adding new device types is a matter of implementing the `IDeviceService` interface in `src/services/devices/`.

## Top-level UI

A single phone-shaped "remote card" with four tabs at the bottom:

### 1. Remote tab (default)
- **Power** button (animated pulse)
- **Mic / Home / Back** quick row
- **Circular D-pad** with OK button in the center
- 4×2 grid of labelled controls: `VOL +/-`, `CH +/-`, `MUTE`, `PLAY/PAUSE`, `REW`, `FWD`
- **Favorites grid** — apps you starred in the Apps tab show up here as launch shortcuts
- Real-time **toast** confirms every key press / surfaces errors

### 2. Apps tab
- Pulls the **installed app list from the active device** (Sony's `getApplicationList`)
- Each row: app icon (or letter fallback), name, launch on tap
- **⭐ star toggle** at the right of each row marks app as favorite (persists per device)
- Pull-to-refresh
- Empty / loading states
- Cache: 5-minute TTL on the fetched list

### 3. Keyboard tab
- On-screen QWERTY for typing into TV search fields
- Shift toggle, backspace, space, "GO" (commit)
- Sends each character via the active device's text-input mechanism

### 4. OTT tab
- Curated South Indian streaming shortcuts (aha, JioHotstar, Sun NXT, ZEE5, Manorama Max, etc.)
- One-tap launch via the active device

## Device management

- **Multi-device**: add as many TVs/streamers as you like; tap one to make it active
- **Add device** modal with type picker (Google TV / Sony / Samsung / Fire TV), name, IP, optional PSK
- **IP validation** — only RFC1918 / link-local addresses accepted (no public hosts)
- **Persistent active device** — your selection survives reload
- **Remove (X)** — delete the device entry
- **Forget (long-press)** — wipe ALL persistent state for that device: record, auth key, Sony auth cookie, Polo paired flag, pinned TLS cert
- Per-device connection status pill (green dot = connected)

## Pairing flows

### Sony BRAVIA — PIN
1. App POSTs `actRegister` to `/sony/accessControl`
2. TV displays a 4-digit PIN
3. **PinModal** opens on phone (4-cell numeric input)
4. App POSTs again with `Authorization: Basic Base64(":<PIN>")`
5. TV returns `Set-Cookie: auth=…` — saved to SecureStore for re-use
6. Subsequent IRCC calls just send the cookie

### Android TV Remote v2 — hex pairing
1. App opens TLS to `:6467` with a self-signed client cert
2. `PairingRequest` → `Options` → `Configuration` exchange (protobuf)
3. TV displays a 6-character hex code
4. **PairingModal** opens on phone (hex input)
5. App computes `SHA-256(client_modulus || client_exponent || server_modulus || server_exponent || code_bytes[1..])`
6. Sends `Secret`, gets `SecretAck`
7. Server's TLS cert fingerprint is **pinned** to SecureStore for MITM detection on future connects

### Firestick — ADB
1. App opens TCP to `:5555`, sends ADB `CNXN` packet
2. TV returns `AUTH TOKEN` (RSA challenge)
3. App signs with cached private key (or generates one on first run)
4. If first time: TV shows "Allow ADB debugging from this computer?" — user accepts
5. Cert stays trusted; future commands just work

## Security model

| Concern | Mitigation |
|---------|-----------|
| MITM on Polo pairing | TLS cert fingerprint pinned post-pairing; mismatch aborts with clear error |
| Cleartext to public hosts | iOS uses `NSAllowsLocalNetworking` only; IP validator rejects non-private IPs at form-submit time |
| PIN brute-force | 3 wrong PINs → 60-second cooldown |
| PIN in memory | Cleared from React state immediately after submit |
| Secret storage | Sony cookie, Polo cert + private key, ADB RSA key, device authKey → all in SecureStore (not AsyncStorage) |
| Device list (non-secret) | AsyncStorage with `authKey` field stripped before serialization |

## Visual / UX

- Dark navy radial-gradient background (`#1a2235` → `#05070d`)
- Amber accent (`#ff9933`) for primary actions and active tab
- Custom **app icon + splash screen** featuring Mario/Luigi pixel art with a stylized remote
- **Dev-time hot reload** for JS/TS changes; native rebuild only needed when adding native modules
- **EAS Build** for cable-free dev builds (Android `.apk` install via QR / link)

## Known limitations

- Samsung & Firestick `listApps()` return empty (TODO: thread Samsung WS token; implement ADB shell stdout capture)
- Polo `launchAppLink()` works but apps list isn't enumerable via the protocol
- Sony Google TVs that have deprecated the legacy IRCC API entirely don't work via the Sony service (use the Polo path instead)
- 1024-bit RSA used for Polo client cert (forge keygen at 2048 was too slow on Hermes); acceptable for LAN-only pairing
