# Memory

Persistent context that survives across sessions. Facts, observations, and project-specific knowledge worth recalling.

## File map

```
src/types/index.ts                     ← DeviceType, RemoteKey, DeviceApp
src/constants/commands.ts              ← per-brand key code tables
src/services/devices/IDeviceService.ts ← interface every brand implements
src/services/DeviceManager.ts          ← singleton, registers prompt callbacks
src/hooks/useDevice.ts                 ← React boundary, expose new methods here
App.tsx                                ← wires hooks → screens, registers prompts, top-level toast
src/screens/RemoteScreen.tsx           ← the main grid
src/screens/AppsScreen.tsx             ← installed-apps list with star toggles
src/components/DeviceSelector.tsx      ← add/edit/forget device modal
```

If a feature touches a TV's protocol, the work is almost always in `src/services/devices/<Brand>Service.ts` plus `src/services/<protocol>/...` (e.g. `googletv/` for Polo, `adb/` for Fire TV).

## What works, what's flaky

- **Sony BRAVIA via PIN** — works end-to-end with a real TV. IRCC codes for `left`/`right`/`ok`/`mic`/`menu` were fixed in 0.2.0; if a key reports "Cannot accept the IRCC Code" it's a bad code in `SONY_IRCC` — verify against [Sony BRAVIA dev docs](https://pro-bravia.sony.net/develop/integrate/ircc-ip/).
- **Google TV (Polo)** — implementation is correct but only works on TVs that haven't deprecated the legacy IRCC API. Modern Sony Google TVs may not display the pairing code despite the protocol succeeding (TV returns `status 400` after `ConfigurationAck`). For those TVs, point users at the Sony PIN path instead.
- **Samsung & Firestick** — connection works but `listApps()` returns `[]`. Real implementations are a known TODO.
- **Hermes + node-forge RSA-2048** — synchronous keygen blocks the JS thread for 20+ seconds on slower phones. We dropped to 1024-bit for Polo. Don't bump back to 2048 without a UX freeze indicator.

## Bugs we've hit and how we fixed them

| Symptom | Root cause | Fix |
|---|---|---|
| `Could not get unknown property 'release'` during EAS Android build | `react-native-rsa-native` build.gradle uses old AGP API | Removed; replaced with `node-forge` (pure JS) |
| `Property 'Buffer' doesn't exist` at runtime | RN doesn't expose Buffer globally; libs assume it does | Polyfilled at top of `App.tsx`: `(globalThis as any).Buffer = Buffer` |
| TLS handshake to TV times out silently with `react-native-tcp-socket` | Cert was PKCS#1 from forge; Android needs PKCS#8 | `forge.pki.wrapRsaPrivateKey(...)` then `privateKeyInfoToPem()` |
| Polo pairing rejected with status 400 after Configuration | Wrong protocol_version | Changed `protocol_version` from 1 → 2 |
| `Expected type 11, got undefined` after Polo PairingRequest | TV doesn't always set the explicit `type` field (3) | Accept either matching type OR presence of typed sub-message at expected field number |
| Sony IRCC returns 500 "Cannot accept the IRCC Code" | Wrong base64 codes for left/right/ok | Replaced with canonical Sony values (e.g. `left = 0x34`, `right = 0x33`) |
| Mass parallel pairing flows from button-mashing | No connect-coalescing | Added in-flight promise guard in `connect()` |
| Errors swallowed silently | `.catch(() => {})` everywhere | Surface to toast via `App.tsx` wrappers |
| Forge async keygen never completes on Hermes | `workers: 0/-1` doesn't reliably yield | Use synchronous `forge.pki.rsa.generateKeyPair({ bits: 1024 })` (1024 to keep freeze tolerable) |

## User preferences

- **One-line commit messages**. No multi-paragraph bodies. No `Co-Authored-By:` trailers.
- **Direct, terse explanations**. Confirm one fact at a time. Avoid recapping things they already saw.
- **Real diagnostics over speculation**. If something is timing out, add a logged step or a `curl`-from-Mac probe before guessing.
- **Explicit reload instructions** when a code change requires action on the phone — they won't always know.
- Their dev setup: macOS, no Android Studio installed locally. Use **EAS Build for Android dev builds**, not `expo run:android`.

## Useful commands

```bash
# Verify everything builds
npx tsc --noEmit
npx expo-doctor
npx expo export --platform android --output-dir /tmp/check && rm -rf /tmp/check

# Cable-free dev cycle
eas build --profile development --platform android   # one-time per native-change
npx expo start --dev-client                          # JS hot-reload thereafter

# Probe a TV from the Mac to confirm what protocols it speaks
echo | openssl s_client -connect <ip>:6467 2>&1 | head -20  # Polo TLS
nc -zv <ip> 6466 6467 80 8001 5555                          # port reachability
curl -i -X POST http://<ip>/sony/accessControl ...          # Sony API

# Push a remote reload to all dev clients
curl -s -X POST http://localhost:8081/reload

# Reset state on a misbehaving phone
# (run from the phone — Settings → Apps → TV Remote → Storage → Clear data)
```

## Glossary

- **Polo / Android TV Remote v2** — Google's TLS+protobuf protocol on `:6466` (control) + `:6467` (pairing). Replaces the legacy IRCC API on newer Google TVs.
- **IRCC** — Sony's Infrared Compatible Control Code. Base64-encoded byte sequences sent in a SOAP envelope to `/sony/IRCC`.
- **PSK** — Pre-Shared Key. Sony's older auth method; we don't use it (PIN flow is cleaner).
- **DIAL** — Discovery and Launch protocol on `:8008`. Used by Chromecast / Fire TV for app launching. We don't currently implement it.
- **Tizen** — Samsung's TV OS. Uses a WebSocket on `:8001` for remote control, with first-time on-screen approval.
- **Hermes** — React Native's default JS engine. Slower than V8 for crypto-heavy pure-JS work (relevant: forge keygen).
