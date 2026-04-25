# 🥗 Roll & Bowl

A professional food delivery web application built with **Next.js 15**, **Tailwind CSS**, and **Zustand**.

## Features

- **Welcome Page** — Postal code entry with real-time delivery zone check
- **Bowl Builder** — 4-step constructor: Base → Protein → Toppings → Sauce
- **Ready-Made Bowls** — 8 chef-curated bowls with notes
- **Cart** — Per-item notes, quantity controls, checkout form
- **Order Confirmation** — Live order status tracker
- **Admin / Kitchen View** — PIN-protected orders board (PIN: `1234`) with print support
- **Inventory Management** — Live stock control with real-time Server-Sent Events sync

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) v18 or higher

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

### Build for Production

```bash
npm run build
npm start
```

## Delivery Zones & Postal Codes (for testing)

| Postal Code | Area | Min. Order | Delivery Fee |
|-------------|------|------------|--------------|
| 1000 | Brussels Centre | €15.00 | €2.50 |
| 1030 | Schaerbeek | €18.00 | €3.00 |
| 2000 | Antwerp Centre | €15.00 | €2.50 |
| 2100 | Deurne | €20.00 | €3.00 |
| 9000 | Ghent Centre | €25.00 | €4.00 |

> Add more zones in `lib/zipCodes.json`

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Styling**: Tailwind CSS 3 with custom sage green + wood palette
- **Icons**: Lucide React
- **State**: Zustand with localStorage persistence
- **Fonts**: Inter + Playfair Display (Google Fonts via `next/font`)

## Project Structure

```
app/
├── page.tsx              # Landing / postal code check
├── menu/page.tsx         # Bowl builder + ready-made bowls
├── cart/page.tsx         # Cart & checkout
├── order-confirmed/      # Order success page
└── admin/page.tsx        # Kitchen view (PIN: 1234)

components/
├── Header.tsx
├── BowlBuilder.tsx       # 4-step multi-select builder
├── ReadyMadeBowls.tsx    # Curated bowls grid
└── StoreHydration.tsx

lib/
├── types.ts
├── zipCodes.json         # Delivery zone config
├── menu.ts               # All menu data
└── store/useStore.ts     # Zustand store
```

## Customisation

- **Add delivery zones**: Edit `lib/zipCodes.json`
- **Add menu items**: Edit `lib/menu.ts`
- **Change admin PIN**: Update `ADMIN_PIN` in `app/admin/page.tsx`
- **Brand colours**: Update `tailwind.config.ts`

## Inventory Management

The admin can mark any ready-made item or Build-Your-Own option as out of stock
from `/admin/inventory` (same PIN as the kitchen board). Two protection layers:

- **Category toggles** — `Bowls`, `Burritos`, and `Sushi` are marked
  `protected: true` in `lib/inventory/config.ts`. The toggle renders as locked
  and the server rejects any API call trying to disable them. All other
  categories (Smoothies, Smoothie bowls, Extra's, Desserten, Dranken) can be
  switched off; when off, their tab is hidden from the menu.
- **Item toggles** — Any product or BYO option (e.g. `Zalm`, `Avocado`) can be
  flipped off. On the menu, unavailable products render as "Uitverkocht" with
  the Add-to-cart button disabled. Inside the Classic/Inside-Out Roll builders
  (and the Poké/Burrito/Smoothie builders) unavailable proteins & mix-ins are
  greyed out, line-through, and non-clickable.

### Storage

State lives in a JSON file at `data/inventory.json` (created on first write).
The file persists across restarts and is small — only overrides are written
(default for any missing key is "available").

### Real-time sync

- `GET /api/inventory` — one-shot snapshot.
- `POST /api/inventory` — admin-only (PIN header `x-admin-pin`) flip one switch.
- `GET /api/inventory/stream` — Server-Sent Events, pushes `snapshot` on
  connect and `patch` on every change. Clients auto-reconnect; a polling
  fallback (`15 s`) kicks in when SSE fails.
- `POST /api/inventory/sync` — pulls availability from Lightspeed POS and
  bulk-applies it (see below).

### Lightspeed POS integration (optional)

`lib/lightspeed/inventory.ts` ships with a documented stub. To enable live
Lightspeed sync, set:

```bash
LIGHTSPEED_API_URL=https://api.lightspeedapp.com/API/Account/<accountID>
LIGHTSPEED_API_TOKEN=<oauth-bearer-token>
```

Then wire the real fetch call inside `fetchLightspeedAvailability()` — the
bulk-apply pipeline (`applyBulk`) and the SSE broadcast are already in place,
so the UI will update instantly across every connected browser.

### Kitchen / Lightspeed order push (checkout → POS)

After checkout, the app `POST`s the order to `POST /api/orders/push`, which
calls `lib/lightspeed/pushOrder.ts`. The JSON body sent to your endpoint includes:

- **`status` / `posStatus`:** `PAID` (online payment) or `ACCEPTED` (cash) — as required
  by many POS flows to fire kitchen printers.
- **`items[]`:** each line has `name`, `quantity`, `unitPrice`, `lineTotal`, `lineType`,
  `menuItemId`, **`categoryId`**, and **`printerGroupId`** (from env mapping; bowls,
  burritos, sushi/rolls, smoothies, extras go to the correct station when IDs are set).

**Environment variables**

```bash
# Target URL for your proxy or Lightspeed-compatible POST handler (required to push)
LIGHTSPEED_ORDER_PUSH_URL=https://your-pos-gateway.example/orders
# or alias:
# LIGHTSPEED_KITCHEN_API_URL=...

# Bearer token (or reuse inventory token)
LIGHTSPEED_API_TOKEN=...
# LIGHTSPEED_ORDER_API_TOKEN=...  # optional alias

# Optional: per-station category + printer group IDs (strings your POS expects)
LIGHTSPEED_CATEGORY_BOWLS_ID=
LIGHTSPEED_CATEGORY_BURRITOS_ID=
LIGHTSPEED_CATEGORY_SUSHI_ID=
LIGHTSPEED_CATEGORY_SMOOTHIES_ID=
LIGHTSPEED_CATEGORY_EXTRAS_ID=
LIGHTSPEED_PRINTER_BOWLS_ID=      # defaults to category id if empty
LIGHTSPEED_PRINTER_BURRITOS_ID=
LIGHTSPEED_PRINTER_SUSHI_ID=
LIGHTSPEED_PRINTER_SMOOTHIES_ID=
LIGHTSPEED_PRINTER_EXTRAS_ID=

# Log payload without calling the network (development)
# LIGHTSPEED_PUSH_DRY_RUN=1
```

Rejections and HTTP errors are logged on the server (`console.error` with response body).
The admin order card shows a green **“Naar keuken / POS”** badge when the push succeeds.
