# Epson ePOS SDK for JavaScript

Roll&Bowl loads the official Epson library from this folder for silent kitchen printing on iPad (TM-m30II / TM-m30III over Wi‑Fi).

## Install (one-time)

1. Download **Epson ePOS SDK for JavaScript** (current: `ePOS_SDK_JavaScript_v2.27.0h.zip`, ~23 MB). Options:
   - **Epson support page for the printer:** https://epson.com/support → search **TM-m30III** (or TM-m30II) → **Drivers & Downloads** → **Additional Software** → *Epson ePOS SDK for JavaScript*.
   - **Direct readme (JP, no request needed):** https://www.epson.jp/dl_soft/readme/45381.htm → download button at the bottom.
   - Any regional TM-printer support page works — the SDK file is the same.

2. Unzip and copy the library file here, renamed to match the loader:

   ```
   public/epos/epos-2.27.0.js
   ```

   (In the zip it is `epos-2.27.0.js`; if a version suffix differs, rename it to exactly `epos-2.27.0.js`.)

3. Redeploy the site (or restart `npm run dev` locally).

Without this file, `/admin` still tries **HTTP ePOS-Print (SOAP)** as a fallback. The full SDK is recommended for iPad Safari.

> **HTTPS note:** rollnbowl.be is served over HTTPS, so the browser blocks plain
> `http://[printer-ip]` requests (mixed content). Enable **SSL** + **ePOS-Print**
> on the printer, then visit `https://[printer-ip]` once on the iPad to accept the
> self-signed certificate. After that the SDK/HTTP call over HTTPS works.

## Printer setup

1. Connect printer to café Wi‑Fi (Epson **TM Utility** → Wi‑Fi Setup Wizard).
2. Reserve a **fixed IP** in the router (DHCP reservation).
3. Open **http://[printer-ip]** in a browser → login `epson` / `epson` (or serial as password).
4. Enable **ePOS-Print** → **Restart** printer.
5. In **rollnbowl.be/admin** → enter IP → **Testbon** → enable **ePOS-druk**.

## SDK license

Use of `epos-2.x.x.js` is subject to Epson’s software license included in the SDK download package.
