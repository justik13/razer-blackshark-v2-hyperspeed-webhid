# Razer BlackShark V2 HyperSpeed WebHID Controller

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![WebHID](https://img.shields.io/badge/WebHID-Chrome%20%7C%20Edge%20%7C%20Brave-blue.svg)](https://developer.mozilla.org/en-US/docs/Web/API/WebHID_API)
[![GitHub Pages](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-brightgreen.svg)](https://justik13.github.io/razer-blackshark-v2-hyperspeed-webhid/)

Browser-based hardware controller and protocol documentation for the Razer BlackShark V2 HyperSpeed headset (USB 1532:0565 / 1532:056E).

Runs directly in WebHID-enabled browsers (Chrome, Edge, Brave, Opera) on Windows, macOS, Linux, and ChromeOS without Razer Synapse, background services, or custom kernel modules.

[Launch Live Web Controller](https://justik13.github.io/razer-blackshark-v2-hyperspeed-webhid/)

---

## Supported Devices

| Device | Connection | USB VID:PID | Status |
| :--- | :--- | :--- | :---: |
| Razer BlackShark V2 HyperSpeed | 2.4 GHz Wireless Dongle | `1532:0565` | Supported |
| Razer BlackShark V2 HyperSpeed | USB Type-C Wired | `1532:056E` | Supported |

The BlackShark V2 Pro 2023 (1532:0555) uses MXIC protocol frames. This project covers the MediaTek Inc architecture used in HyperSpeed models.

---

## Features

- **Device Hardware Info**: Live readout of device serial number (`0x00`), firmware version (`0x02`), physical microphone mute button status (`0x55`), and connection transport mode.
- **Battery Level and Charging State**: Percentage readout (0–100%) with visual level indicator and USB charging detection (`0x21` / `0x2A`).
- **Auto Power-Off Timer**: Sleep timer configuration written directly to device memory (`0xAC`). Supports arbitrary timeouts (0–255 minutes; presets include 5, 10, 15, 20, 30, 45, 60, 90, 120 min, or off).
- **Wireless Dongle LED Control**: Select Off (`0`), link status (white, `1`), battery status (green/yellow/red, `2`), or low-battery warning only (`3`) via register `0xE6`.
- **Microphone Sidetone**: Sidetone toggle and hardware volume slider (0–15, accessing the full hardware register range beyond Synapse's 0–10 cap). Includes optional software monitoring with configurable delay (20–400 ms) and VU meter.
- **10-Band Hardware Equalizer**:
  - Writes directly to headset onboard flash memory. Curves persist across reboots, consoles, mobile devices, and separate PCs.
  - **Live Preview mode**: Auditions slider adjustments in real time with 60 ms debouncing.
  - **DSP Latching**: Sends an immediate re-apply sequence to prevent the firmware from staying one write behind.
  - **Hardware Offset Calibration**: Compensates for the internal MediaTek -5 dB storage offset so output stays at full unity volume.
  - **Presets**: Flat (0 dB), Bass+, Music (clean V-shape), Game (footstep clarity), Neutral (Harman target), and direct access to factory ROM presets (Game, Music, Movie).
  - **Audio Test Generator**: Built-in Web Audio tone and noise synthesizer to verify response changes immediately.

---

## MediaTek Protocol Specification

The BlackShark V2 HyperSpeed communicates through a vendor HID interface on Usage Page `0xFF00`, Usage `0x01`, Interface 3.

### 1. Frame Structure (64 Bytes)

All communications use Report ID `0x02` followed by 63 payload bytes:

```text
Byte 0:     0x00        Status / Reserved
Byte 1:     0x60 | seq  Synapse client mask (0x60) + 5-bit rolling counter (0x00..0x1F)
Bytes 2-4:  0x00..0x00  Reserved padding
Byte 5:     length      Payload length (0x04 for query, 0x05 for 1-byte set, 0x0E for 10-byte EQ)
Byte 6:     0x00        Sub-length
Byte 7:     0x00        Direction (0x00 = Host OUT)
Byte 8:     domain      0x80 for 2.4G RF (Headset/DSP), 0x00 for USB Wired connection (or Dongle LED)
Byte 9:     command_id  Command opcode
Byte 10:    0x00        ACK flag (0x00 in OUT requests, 0x01 in IN replies)
Byte 11:    count       Number of parameter bytes (0, 1, or 10)
Bytes 12+:  payload     Data bytes
Byte 61:    XOR_CHK     XOR Checksum (Byte 62 in the full 64-byte HID report)
Byte 62:    0x00        Trailer byte
```

### 2. XOR Checksum Algorithm

The microcontroller drops any frame where byte 61 does not match this XOR calculation:

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
| `0x00` | `0x80` | GET | `0x04` | `0` | Headset Serial Number (15 ASCII characters) |
| `0x02` | `0x80` | GET | `0x04` | `0` | Firmware Version (4 bytes: major, minor, build, rev) |
| `0x21` | `0x80` | GET | `0x04` | `0` | Battery level (`0..100%`) |
| `0x2A` | `0x80` | GET | `0x04` | `0` | Charging state (`0` = battery, `>0` = charging) |
| `0x2C` | `0x80` | GET | `0x04` | `0` | Auto power-off timeout query (minutes) |
| `0xAC` | `0x80` | SET | `0x05` | `1` | Set auto power-off timeout (`0..255` minutes; `0` = off) |
| `0x55` | `0x80` | GET | `0x04` | `0` | Hardware Mic Mute button status (`0` = unmuted, `1` = muted) |
| `0x66` | `0x00` | GET | `0x04` | `0` | Dongle LED mode query |
| `0xE6` | `0x00` | SET | `0x05` | `1` | Set Dongle LED (`0` = Off, `1` = Link status, `2` = Battery, `3` = Warning) |
| `0x18` | `0x80` | GET | `0x04` | `0` | Sidetone state (`0` = off, `1` = on) |
| `0x98` | `0x80` | SET | `0x05` | `1` | Enable or disable sidetone (`0` or `1`) |
| `0x19` | `0x80` / `0x00` | GET | `0x04` | `0` | Sidetone volume query (`0..15`) |
| `0x99` | `0x80` / `0x00` | SET | `0x05` | `1` | Set sidetone volume level (`0..15`) |
| `0x13` | `0x80` | GET | `0x04` | `0` | Active EQ preset query |
| `0x93` | `0x80` | SET | `0x05` | `1` | Set EQ preset (`0x07` Game, `0x08` Music, `0x09` Movie, `0xFF` Custom) |
| `0x15` | `0x80` | GET | `0x04` | `0` | Read 10-band EQ curve from active preset |
| `0x95` | `0x80` | SET | `0x0E` | `10` | Write 10-band EQ curve |

### 4. Firmware Details

#### Hardware Onboard vs Synapse Software Architecture
Live reverse-engineering of the firmware clarifies what runs on the headset microcontroller vs what Razer Synapse handled in Windows software:
- **Onboard Hardware Features**: EQ filter coefficients (`0x95`), ROM presets (`0x93`), hardware sidetone loopback & volume (`0x98`/`0x99`), sleep timer (`0xAC`), mute detection (`0x55`), and dongle LED mode (`0xE6`) are stored in internal non-volatile memory and function identically on consoles (PS5, Nintendo Switch) and mobile devices.
- **Synapse Software Filters**: THX Spatial Audio, Mic Noise Gate, Voice Clarity, and Mic Equalizer were implemented purely as Windows Audio Processing Objects (APO) in software drivers, not inside the headset DSP.

#### Arbitrary Sleep Timer Timeout
Synapse restricted the sleep timer dropdown to 15, 30, 45, or 60 minutes. The underlying MediaTek firmware stores the timeout as a raw 8-bit unsigned integer (minutes). Any value from `1` to `255` minutes (such as 5, 10, or 20 minutes) is natively supported by the hardware. Setting `0` disables the sleep timer entirely.

#### MediaTek -5 dB Storage Offset
The MediaTek DSP subtracts 5 from each band written via `0x95` before committing it to internal memory: `gain_stored = wire_val - 5`. Writing literal zeros for a flat curve stores -5 dB across all bands, cutting overall output and damping low-end punch.
Pre-biasing outgoing values (`wire_value = target_dB + 5`) keeps the DSP register at true 0 dB. Querying `0x15` reads back the target value directly.

#### Preset Latching Order
When setting custom EQ, `0x93` (preset selector) latches the slot's current content into the live audio path before `0x95` writes new values. Writing only once leaves the audio path playing the previous curve.
Applying the full Synapse sequence resolves this:
1. `0x1E` (Prep)
2. `0x93` (`0xFF` Custom slot)
3. `0x9D` (`0x01` Enhance flag)
4. `0x95` (10 band values)
5. Pause 40 ms, then re-send `0x93` (`0xFF`) to latch the newly committed curve immediately.

---

## Local Setup

1. Clone the repository:
   ```bash
   git clone https://github.com/justik13/razer-blackshark-v2-hyperspeed-webhid.git
   cd razer-blackshark-v2-hyperspeed-webhid
   ```
2. Open `index.html` in Chrome, Edge, or Brave.
3. Connect the 2.4 GHz wireless dongle or USB-C cable and click **Подключить гарнитуру**.
4. Select **Razer BlackShark V2 HS 2.4** in the device picker.

---

## License

Distributed under the [MIT License](LICENSE).

## References

- [OpenRazer Issue #2316](https://github.com/openrazer/openrazer/issues/2316): Descriptors and initial captures by `GegudeBR` and `konn-neko`.
- [OpenRazer PR #2862](https://github.com/openrazer/openrazer/pull/2862): Reverse-engineering notes by `FalconHeavy57` on BlackShark V2 Pro audio sequences.
