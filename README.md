# 🥗 Roll & Bowl

A professional food delivery web application built with **Next.js 15**, **Tailwind CSS**, and **Zustand**.

## Features

- **Welcome Page** — Postal code entry with real-time delivery zone check
- **Bowl Builder** — 4-step constructor: Base → Protein → Toppings → Sauce
- **Ready-Made Bowls** — 8 chef-curated bowls with notes
- **Cart** — Per-item notes, quantity controls, checkout form
- **Order Confirmation** — Live order status tracker
- **Admin / Kitchen View** — PIN-protected orders board (PIN: `1234`) with print support

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
