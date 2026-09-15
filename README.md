# Razer BlackShark V2 HyperSpeed WebHID Controller

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![WebHID](https://img.shields.io/badge/WebHID-Chrome%20%7C%20Edge%20%7C%20Brave-blue.svg)](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API)
[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen.svg)](https://justik13.github.io/razer-blackshark-v2-hyperspeed-webhid/)

> **A zero-dependency, browser-based hardware controller and reverse-engineered protocol documentation for the Razer BlackShark V2 HyperSpeed headset (USB 1532:0565 / 1532:0566).**

No Razer Synapse, no background services, no drivers needed. Works directly in any WebHID-capable browser (Google Chrome, Microsoft Edge, Brave, Opera) on Windows, macOS, Linux, and ChromeOS.

👉 **[Launch Live Web Controller](https://justik13.github.io/razer-blackshark-v2-hyperspeed-webhid/)**

---

## 🎧 Supported Devices

| Device | Connection | USB VID:PID | Status |
| :--- | :--- | :--- | :---: |
| **Razer BlackShark V2 HyperSpeed** | 2.4 GHz Wireless Dongle | `1532:0565` | ✅ Supported |
| **Razer BlackShark V2 HyperSpeed** | USB Type-C Wired | `1532:0566` | ✅ Supported |

*(Note: BlackShark V2 Pro 2023 `1532:0555` uses a different protocol based on MXIC `PA` frames. This repository addresses the **MediaTek Inc** architecture used in the HyperSpeed model).*

---

## ✨ Features

- 🔋 **Battery Level & Charging State**: Live percentage display (0–100%) with animated gauge and charging detection (`0x21` / `0x2A`).
- ⏱️ **Auto Power-Off Timer**: Selectable sleep timer (15, 30, 45, 60 minutes, or Disabled) written directly to device EEPROM (`0xAC`).
- 💡 **Wireless Dongle LED Control**: Select between Connection Status (White), Battery Status (Green/Yellow/Red), or Low-Battery Warning Only (`0xE6`).
- 🎤 **Microphone Sidetone (Mic Monitoring)**: Toggle on/off and slider level (0–10). Includes a built-in browser mic activator and live VU-meter to keep audio sessions awake.
- 🎚️ **10-Band Hardware Equalizer (On-Device DSP)**:
  - Writes directly to headset onboard flash memory — curve persists across reboots, consoles, mobile phones, or other PCs.
  - **Live Preview mode**: Audition EQ changes on the fly with 60ms debounced updates.
  - **Instant DSP Latching**: Fixes the firmware quirk where curves lag by one apply sequence.
  - **Hardware Offset Calibration**: Fully compensates for the internal MediaTek `-5 dB` offset so headphones maintain 100% native volume and clarity.
  - **Presets included**: Flat (0 dB), Bass+ (+1 dB), Music, Game (Footsteps), and AutoEQ (Rtings target).
  - 🎵 **Built-in Audio Test Generator**: Integrated Web Audio multi-tone and noise synthesizer to audition bass, mids, and treble adjustments immediately.

---

## 🔍 MediaTek Protocol Reverse Engineering Specification

Unlike earlier Razer headsets or the V2 Pro, the BlackShark V2 HyperSpeed communicates via a proprietary **MediaTek Inc** vendor HID interface (`Usage Page 0xFF00, Usage 0x01, Interface 3`).

### 1. Frame Structure (64 Bytes)

All communication uses **Report ID `0x02`** followed by 63 bytes of payload:

```text
Byte 0:     0x00        Status / Reserved
Byte 1:     0x60 | seq  Synapse Client Mask (0x60) + 5-bit rolling counter (0x00..0x1F)
Bytes 2-4:  0x00..0x00  Reserved padding
Byte 5:     length      Payload length (0x04 for query, 0x05 for 1-byte set, 0x0E for 10-byte EQ)
Byte 6:     0x00        Sub-length
Byte 7:     0x00        Direction (0x00 = Host OUT)
Byte 8:     domain      0x80 for Headset/DSP/Audio, 0x00 for Wireless Dongle
Byte 9:     command_id  Command opcode
Byte 10:    0x00        ACK flag (0x00 in OUT requests, 0x01 in IN replies)
Byte 11:    count       Number of parameter bytes (0, 1, or 10)
Bytes 12+:  payload     Data bytes
Byte 61:    XOR_CHK     XOR Checksum (Byte 62 in the full 64-byte HID report)
Byte 62:    0x00        Trailer byte
```

### 2. XOR Checksum Algorithm

The MediaTek microcontroller rejects any frame where byte 61 does not match the XOR sum:

```javascript
let checksum = 0x02; // Report ID
for (let i = 0; i < 61; i++) {
  checksum ^= payload[i];
}
payload[61] = checksum;
```

### 3. Command Register Map

| Command ID | Domain | Action | Length | Count | Description / Values |
| :--- | :---: | :---: | :---: | :---: | :--- |
| `0x21` | `0x80` | GET | `0x04` | `0` | Battery level (`0..100%`) |
| `0x2A` | `0x80` | GET | `0x04` | `0` | Charging state (`0` = battery, `>0` = charging) |
| `0x2C` | `0x80` | GET | `0x04` | `0` | Auto power-off timeout (minutes) |
| `0xAC` | `0x80` | SET | `0x05` | `1` | Set auto power-off (`0, 15, 30, 45, 60` min) |
| `0x66` | `0x00` | GET | `0x04` | `0` | Dongle LED mode query |
| `0xE6` | `0x00` | SET | `0x05` | `1` | Set Dongle LED (`1` = Link status, `2` = Battery, `3` = Warning) |
| `0x18` | `0x80` | GET | `0x04` | `0` | Mic Sidetone state (`0` = off, `1` = on) |
| `0x98` | `0x80` | SET | `0x05` | `1` | Enable/Disable Sidetone (`0` or `1`) |
| `0x19` | `0x80` | GET | `0x04` | `0` | Sidetone volume level (`0..10`) |
| `0x99` | `0x80` | SET | `0x05` | `1` | Set Sidetone volume level (`0..10`) |
| `0x13` | `0x80` | GET | `0x04` | `0` | Active EQ preset selector |
| `0x93` | `0x80` | SET | `0x05` | `1` | Set EQ preset (`0x07` Game, `0x08` Music, `0x09` Movie, `0xFF` Custom) |
| `0x15` | `0x80` | GET | `0x04` | `0` | Read 10-band EQ curve from active preset |
| `0x95` | `0x80` | SET | `0x0E` | `10` | Write 10-band EQ curve |

### 4. Hardware Quirks & Solutions

#### Quirk A: MediaTek `-5 dB` Storage Offset
The MediaTek DSP subtracts 5 from any value written via `0x95` before storing it into the register (`gain_stored = wire_val - 5`). If a host sends `0` for Flat EQ, the headset stores `-5 dB` across all bands, resulting in attenuated volume, muffled dynamics, and a hollow sound.
- **Solution**: Pre-bias all values on write: `wire_value = target_dB + 5`. Reading back (`0x15`) returns the exact `target_dB`.

#### Quirk B: Preset Latching Lag
When writing a custom EQ, `0x93` (preset selector) latches the slot existing content into the live audio path before `0x95` updates the memory. Sending only one sequence leaves the sound one step behind.
- **Solution**: Follow Synapse apply sequence with a re-latch frame:
  1. `0x1E` (Prep)
  2. `0x93` (`0xFF` Custom slot)
  3. `0x9D` (`0x01` Enhance flag)
  4. `0x95` (10 band values)
  5. Wait 40ms, then re-send `0x93` (`0xFF`) to latch the newly stored curve into the live DSP stream immediately.

---

## 🚀 How to Run Locally

1. Clone this repository:
   ```bash
   git clone https://github.com/justik13/razer-blackshark-v2-hyperspeed-webhid.git
   cd razer-blackshark-v2-hyperspeed-webhid
   ```
2. Open `index.html` directly in Google Chrome or Microsoft Edge (no local web server needed).
3. Plug in the 2.4G wireless dongle or USB-C cable and click **«⚡ Подключить гарнитуру»**.
4. Select **Razer BlackShark V2 HS 2.4** in the browser prompt.

---

## 📜 License

Distributed under the **MIT License**. See [LICENSE](LICENSE) for more information.

## 🤝 Acknowledgments & References

- [OpenRazer Issue #2316](https://github.com/openrazer/openrazer/issues/2316) — Initial descriptors and packet captures by `GegudeBR` & `konn-neko`.
- [OpenRazer PR #2862](https://github.com/openrazer/openrazer/pull/2862) by `FalconHeavy57` — Reverse-engineering insights on BlackShark V2 Pro audio sequences.
