# Changelog

All notable changes to this project. Format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [Unreleased]

### Added
- `features.md`, `rules.md`, `changelog.md`, `claude.md` documentation.

---

## 0.4.0 — 2026-04-29

### Added
- **Custom app icon and splash screen** — Mario/Luigi pixel art design replacing the placeholder solid-color PNGs.

Commit: `118485b`

---

## 0.3.0 — 2026-04-29

### Added — Security hardening
- **IP validation** in `DeviceSelector`: rejects any address outside RFC1918 / link-local before saving (prevents accidentally sending PIN to a public host).
- **`Device.authKey` moved to SecureStore**: stripped from the AsyncStorage record on save, rehydrated on load.
- **`forgetDevice()` action**: long-press a device row → confirmation dialog → wipes record + authKey + Sony cookie + Polo paired flag + pinned TLS cert.
- **TLS cert pinning** for Android TV Remote v2: server cert fingerprint is captured after first successful pairing; subsequent connects abort with a clear MITM warning if it changes.
- **PIN rate-limiting** for Sony: 3 wrong PINs → 60-second cooldown.
- **PIN cleared from React state** in `PinModal` immediately after submit/cancel.

### Changed
- iOS ATS: dropped `NSAllowsArbitraryLoads`, kept only `NSAllowsLocalNetworking`.

Commit: `2cf5350`

---

## 0.2.0 — 2026-04-29

### Added
- **Sony BRAVIA PIN auth** — `actRegister` flow on `/sony/accessControl`. Replaces the old (and broken on Google TVs) PSK-based path.
- **PinModal** component for 4-digit numeric entry.
- **Apps tab redesigned**: fetches the real installed-app list from the active device (Sony's `getApplicationList`), 5-minute cache, pull-to-refresh, ⭐ star toggle for favorites.
- **Favorites system**: per-device starred apps persist in AsyncStorage; the Remote tab's shortcut grid is now driven by these favorites instead of a hardcoded list.
- **Active device persistence**: your selection survives app reload (`active_device_id` in AsyncStorage).
- **Multi-port reachability probe** as a connection diagnostic for Google TV setup.
- **Google TV (Polo / Android TV Remote v2)** end-to-end implementation:
  - Hand-coded protobuf encoder/decoder (`googletv/proto.ts`)
  - Self-signed PKCS#8 client cert generation (`googletv/cert.ts`)
  - TLS pairing flow on `:6467`, control flow on `:6466`
  - 6-character hex pairing modal with code submission
- **Remote reachability fixes**: lower-cased `Buffer` polyfill, fixed RSA key format (PKCS#1 → PKCS#8), corrected pairing handshake field semantics (TV omits the explicit `type` field 3 — accept the typed sub-message presence as discriminator), fixed Sony IRCC code constants for `left`/`right` (`0x33`/`0x34`, not `0x77`/`0x76`).

### Fixed
- **Multiple Sony IRCC codes were wrong** — `left`, `right`, `ok`, `mic`, `menu` all had incorrect base64 codes that caused `Cannot accept the IRCC Code` errors. Replaced with canonical Sony BRAVIA values.
- **Connection error visibility**: replaced silent `.catch(() => {})` swallowing with toasts that show the actual error message.
- **Concurrent connection storm**: button-mashing during a slow handshake used to spawn parallel auth flows; services now coalesce concurrent `connect()` calls into one in-flight promise.

Commit: `b2af241`

---

## 0.1.1 — 2026-04-25

### Fixed
- **EAS Android build**: replaced `react-native-rsa-native` (broken with AGP 8 — `Could not get unknown property 'release'`) with pure-JS `node-forge`. ADB's RSA signing path now runs entirely in JS.
- Aligned `async-storage`, `expo-asset`, `expo-system-ui`, `react-native` to the SDK 52-recommended versions.
- Removed `@types/react-native` (RN ships its own types).
- Disabled the New Architecture (`newArchEnabled: false`) — `react-native-tcp-socket` isn't certified for Fabric/TurboModules.
- Added expo-doctor `reactNativeDirectoryCheck.exclude` for `react-native-tcp-socket` and `node-forge`.
- Untracked `node_modules/` from git history.

Commit: `248976a`

---

## 0.1.0 — 2026-04-25

### Added
- **Initial scaffold** — React Native + TypeScript + Expo SDK 52 universal TV remote.
- **Four-tab UI**: Remote, Apps, Keyboard, OTT — wrapped in a single phone-shaped "remote card" with dark navy radial-gradient background and amber accent.
- **D-pad + power + media controls + volume/channel** on the Remote screen.
- **Three TV brand services** (initial implementations):
  - `SonyBraviaService` — IRCC SOAP via PSK auth (later replaced with PIN auth)
  - `SamsungTizenService` — WebSocket on port 8001 with token caching
  - `AmazonFirestickService` — ADB over TCP with RSA key auth
- **Device picker modal** — add / select / remove devices, status pill, settings button.
- **Custom hand-coded ADB client** (`AdbProtocol.ts`, `AdbClient.ts`) with binary CRC32 framing.
- **EAS Build configured** for cable-free Android dev builds.
- `.gitignore` for Expo + RN, Expo project ID wired up.

Commits: `2534da2`, `30d8b7c`, `41fe35e`
