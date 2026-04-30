# Notes for Claude Code

You're working on **kremote** — a React Native + TypeScript universal TV remote app.

## Read these first

- [features.md](./features.md) — what the app does
- [rules.md](./rules.md) — hard rules (architecture, storage, networking, crypto, commits)
- [memory.md](./memory.md) — persistent context: file map, what works/flaky, bug history, user preferences, glossary
- [changelog.md](./changelog.md) — version history with commit hashes

## How to work in this repo

### Surface every error
Don't leave `.catch(() => {})` anywhere. The user lost an evening to swallowed errors during 0.2.0 development. Wrap promise chains in `App.tsx`-style toasts that show the actual message.

### Describe next state before user-driven steps
When a code change requires the user to do something on their phone or TV, *describe the next state to expect* before they tap. ("The TV should display a 4-character hex code; the modal should pop up on phone within 1s.") This dramatically improves debug velocity.

### Use the monitor pattern for long sessions
- Start `npx expo start --dev-client` as a background Bash task
- Tail the task output with `Monitor`, grepping for `LOG`, `WARN`, `ERROR`, brand prefixes (`\[Sony\]`, `\[GoogleTV\]`, `\[ADB\]`), and step markers
- For new flows, follow the same logging pattern: `step 1/N — sending Foo` … `step 1/N ✓ got FooAck`

### Diagnose, don't guess
The user's Mac has `bash`, `curl`, `nc`, `openssl`, `rsvg-convert`, `ipconfig`. Probe the TV from the Mac before adding more JS-side debug code — the data you get is far more reliable.

## Hard don'ts

- Don't add new dependencies casually. The current dep set is finely tuned around Hermes + Android TLS + EAS Build.
- Don't change `newArchEnabled` (it's `false` because `react-native-tcp-socket` isn't ready).
- Don't introduce a state library, logger framework, or backend service.
- Don't write to `node_modules/`, `ios/`, `android/`, `.expo/`, `.claude/` — all gitignored, regenerated as needed.
- Don't suggest `npx expo run:android` to the user — they don't have Android SDK installed locally. Use EAS Build.
- Don't put `Co-Authored-By:` trailers in commits or amend them in.
