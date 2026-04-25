# TV Remote

React Native (TypeScript) remote control app for Sony Google TV, Samsung Tizen TV, and Amazon Firestick.

## Setup

```bash
npm install
npx expo run:ios      # or
npx expo run:android
```

---

## Device Configuration

All devices must be on the **same Wi-Fi network** as your phone.

### Sony Google TV (XR-55X90J)

1. On the TV: **Settings → Network → Remote Start** → On
2. On the TV: **Settings → Device Preferences → Developer options → Network debugging** (optional for advanced use)
3. Enable **Pre-Shared Key** authentication:
   - TV Settings → Apps → See all apps → Sony's BRAVIA Connectivity Module → Permissions → Allow
   - Or set a PSK in **Settings → Network & Internet → Home network setup → IP Control**
4. In the app: tap the device name, add Sony Google TV with the TV's IP address and your PSK.

**BRAVIA REST API** is used for all commands (HTTP POST to `http://{tv_ip}/sony/`).

---

### Samsung Tizen TV (U8200F / QN-series)

1. On the TV: **Settings → General → External Device Manager → Device Connection Manager** → Allow new connections
2. Find the TV IP: **Settings → General → Network → Network Status → IP Settings**
3. In the app: add Samsung TV with the IP address and port `8001`.
4. First time connecting: a **pairing dialog** appears on the TV — accept it.

A **token** is issued after pairing and cached for future connections.

**WebSocket protocol** (`ws://tv_ip:8001/api/v2/channels/samsung.remote.control`) is used.

---

### Amazon Firestick (2nd Gen)

ADB (Android Debug Bridge) over Wi-Fi is used.

1. On the Firestick: **Settings → My Fire TV → About** → click "Build" 7 times to enable Developer Options
2. **Settings → My Fire TV → Developer Options** → ADB debugging → On
3. **Settings → My Fire TV → Developer Options** → Network debugging → On  
   *(Note the IP shown — you'll need this)*
4. In the app: add Firestick with IP and port `5555`.
5. **First connect**: an **"Allow ADB debugging?"** dialog appears on the TV screen — check "Always allow from this device" and tap OK.

**ADB over TCP** with RSA key authentication is used. The app generates a unique RSA key pair on first launch, stored securely on your phone.

---

## Architecture

```
src/
├── types/           Device types, RemoteKey enum
├── constants/       Colors, command codes (IRCC / Samsung keys / ADB keycodes)
├── services/
│   ├── devices/     SonyBraviaService, SamsungTizenService, AmazonFirestickService
│   └── adb/         AdbProtocol (binary), AdbClient (TCP)
├── hooks/           useDevice — connects/sends keys/manages device list
├── components/      DPad, LabeledBtn, TabBar, Toast, PowerButton, logos
└── screens/         Remote, Apps, Keyboard, OTT
```

## Dependencies

| Package | Purpose |
|---------|---------|
| `react-native-svg` | SVG logos |
| `react-native-tcp-socket` | ADB TCP connection for Firestick |
| `react-native-rsa-native` | RSA key gen + signing for ADB auth |
| `expo-secure-store` | Secure storage of ADB RSA private key |
| `@react-native-async-storage/async-storage` | Device list persistence |
| `lucide-react-native` | Icons |
