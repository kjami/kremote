# Notes for Claude Code

You're working on **kremote** — a React Native + TypeScript universal TV remote app. Read [features.md](./features.md) for what it does and [rules.md](./rules.md) for hard rules. This file gives you the *operating tips* that go beyond rules.

## Getting oriented

When the user asks you to add a feature, the file map you'll most often need:

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

- **Sony BRAVIA via PIN** — works end-to-end with a real TV. IRCC codes for `left`/`right`/`ok`/`mic`/`menu` were fixed in 0.2.0; if the user reports "Cannot accept the IRCC Code" on a different key, it's a bad code in `SONY_IRCC` — verify against [Sony BRAVIA dev docs](https://pro-bravia.sony.net/develop/integrate/ircc-ip/).
- **Google TV (Polo)** — implementation is correct but only works on TVs that haven't deprecated the legacy IRCC API. Modern Sony Google TVs may not display the pairing code despite the protocol succeeding (we get `status 400` from the TV after `ConfigurationAck`). For those TVs, point users at the Sony PIN path instead.
- **Samsung & Firestick** — connection works but `listApps()` returns `[]`. Adding real implementations is a known TODO.
- **Hermes + node-forge RSA-2048** — synchronous keygen blocks the JS thread for 20+ seconds on slower phones. We dropped to 1024-bit for Polo. Don't bump back to 2048 without a UX freeze indicator.

## When tests fail / build breaks

Common stumbling blocks:

1. **`Property 'Buffer' doesn't exist`** — something imported a service before `App.tsx`'s `(globalThis as any).Buffer = Buffer` line ran. Don't reorder the imports at the top of `App.tsx`.
2. **TLS handshake hangs silently** — first thing to check: did the user's phone go to sleep, or move to a different network? Use the existing `multiPortProbe()` in `GoogleTvClient` as a diagnostic. If TCP probes succeed but TLS hangs, suspect cert format (Android needs PKCS#8) or an unlisted ALPN/cipher.
3. **EAS build fails with `Could not get unknown property 'release'`** — that's `react-native-rsa-native` again. Removed in 0.1.1; if it sneaks back into deps via a transitive, pin to `node-forge`.
4. **`expo-doctor` failing** — version drift. Run `npx expo install --fix`. Don't `npm install <expo-pkg>` directly.
5. **Hot reload not picking up changes to `services/`** — Fast Refresh sometimes misses non-component files. Tell the user to fully reload (shake → Reload).

## When you have to monitor a long-running session

Pattern that works well:
- Start `npx expo start --dev-client` as a background Bash task
- Tail the task's output file with `Monitor`, grepping for `LOG`, `WARN`, `ERROR`, brand prefixes (`\[Sony\]`, `\[GoogleTV\]`, `\[ADB\]`), and your milestone markers
- Each `step N/4 ✓` log is a checkpoint — when you add new flows, follow the same pattern (`step 1/N — sending Foo`, `step 1/N ✓ got FooAck`)

When the user is the one driving the phone, *describe the next state to expect* before they tap (e.g. "the TV should display a 4-character hex code; the modal should pop up on phone"). This dramatically improves debug velocity.

## Communication

The user prefers:

- **One-line commit messages** (`git commit -m "..."`). No multi-paragraph bodies. No `Co-Authored-By:` trailers.
- **Direct, terse explanations**. Confirm one fact at a time. Avoid recapping things they already saw.
- **Real diagnostics over speculation**. If something is timing out, add a logged step or a curl-from-Mac probe before guessing. The `bash + curl + nc + openssl` toolkit on the user's Mac is your friend.
- **Explicit reload instructions** when a code change requires the user to do something on their phone. They won't always know.

## What to avoid

- Don't add new dependencies casually. The current dep set is finely tuned around what works on Hermes + Android TLS + EAS Build.
- Don't change the New Architecture flag. It's off because `react-native-tcp-socket` isn't ready.
- Don't introduce a bundler / state library / logger framework. The app is small enough to live without them.
- Don't write to `node_modules/`, `ios/`, `android/`, `.expo/` — they're regenerated.
- Don't leave `.catch(() => {})` anywhere. The user lost an evening to swallowed errors during 0.2.0 development; surface everything.
- Don't suggest the user run `npx expo run:android` if they don't have Android SDK installed (we hit this — `ANDROID_HOME` was set to a non-existent path). EAS Build is the cable-free path.

## Useful commands cheat-sheet

```bash
# Verify everything builds
npx tsc --noEmit
npx expo-doctor
npx expo export --platform android --output-dir /tmp/check && rm -rf /tmp/check

# Cable-free dev cycle
eas build --profile development --platform android   # one-time per native-change
npx expo start --dev-client                          # JS hot-reload thereafter

# Reset state on a misbehaving phone
# (run from the phone — Settings → Apps → TV Remote → Storage → Clear data)

# Probe a TV from the Mac to confirm what protocols it speaks
echo | openssl s_client -connect <ip>:6467 2>&1 | head -20  # Polo TLS
nc -zv <ip> 6466 6467 80 8001 5555                          # port reachability
curl -i -X POST http://<ip>/sony/accessControl ...          # Sony API

# Push a remote reload to all dev clients
curl -s -X POST http://localhost:8081/reload
```

## Glossary

- **Polo / Android TV Remote v2** — Google's TLS+protobuf protocol on `:6466` (control) + `:6467` (pairing). Replaces the legacy IRCC API on newer Google TVs.
- **IRCC** — Sony's Infrared Compatible Control Code. Base64-encoded byte sequences sent in a SOAP envelope to `/sony/IRCC`.
- **PSK** — Pre-Shared Key. Sony's older auth method; we don't use it (PIN flow is cleaner).
- **DIAL** — Discovery and Launch protocol on `:8008`. Used by Chromecast / Fire TV for app launching. We don't currently implement it.
- **Tizen** — Samsung's TV OS. Uses a WebSocket on `:8001` for remote control, with first-time on-screen approval.
