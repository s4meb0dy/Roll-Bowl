# Epson ePOS SDK for JavaScript

Roll&Bowl loads the official Epson library from this folder for silent kitchen printing on iPad (TM-m30II / TM-m30III over Wi‑Fi).

## Install (one-time)

1. Download **ePOS SDK for JavaScript** from Epson:  
   https://download.epson.biz/sec_pubs/pos/reference_en/index.html  
   (look for **ePOS SDK for JavaScript**, file `epos-2.27.0.js` or latest `epos-2.x.x.js`).

2. Copy the library file here as:

   ```
   public/epos/epos-2.27.0.js
   ```

3. Redeploy the site (or restart `npm run dev` locally).

Without this file, `/admin` still tries **HTTP ePOS-Print (SOAP)** as a fallback. The full SDK is recommended for iPad Safari.

## Printer setup

1. Connect printer to café Wi‑Fi (Epson **TM Utility** → Wi‑Fi Setup Wizard).
2. Reserve a **fixed IP** in the router (DHCP reservation).
3. Open **http://[printer-ip]** in a browser → login `epson` / `epson` (or serial as password).
4. Enable **ePOS-Print** → **Restart** printer.
5. In **rollnbowl.be/admin** → enter IP → **Testbon** → enable **ePOS-druk**.

## SDK license

Use of `epos-2.x.x.js` is subject to Epson’s software license included in the SDK download package.
