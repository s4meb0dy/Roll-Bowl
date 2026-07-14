import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import StoreHydration from "@/components/StoreHydration";
import MobileBottomNav from "@/components/MobileBottomNav";
import SiteFooter from "@/components/SiteFooter";
import { getSiteUrl } from "@/lib/siteUrl";
import { buildRestaurantJsonLd } from "@/lib/structuredData";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
  weight: ["500", "600", "700", "800"],
});

// Base URL used by Next.js to resolve relative Open Graph / Twitter image
// paths into absolute URLs. Override in production via NEXT_PUBLIC_SITE_URL
// (e.g. https://rollenbowl.be) so social-card crawlers don't fall back to
// localhost.
const siteUrl = getSiteUrl();

// Google Search Console verification token. Set NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION
// in production to the value Google gives you when adding the site as a property
// (the "HTML tag" method). Leave unset locally.
const googleSiteVerification = process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION;

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Roll&Bowl — Poké bowls, sushi & burritos in Deurne, Antwerpen",
    template: "%s | Roll&Bowl",
  },
  description:
    "Build your perfect bowl or choose from our chef-curated ready-made selections. Healthy, delicious, delivered fast in Deurne & Antwerpen.",
  keywords: [
    "poké bowl",
    "poke bowl Antwerpen",
    "sushi Deurne",
    "burritos",
    "healthy food",
    "bowls",
    "delivery",
    "afhalen",
    "takeaway Antwerpen",
    "vegan",
    "gluten-free",
  ],
  alternates: {
    canonical: "/",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  ...(googleSiteVerification
    ? { verification: { google: googleSiteVerification } }
    : {}),
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
    ],
    apple: [
      { url: "/logo.png", sizes: "180x180", type: "image/png" },
    ],
    shortcut: ["/logo.png"],
  },
  openGraph: {
    title: "Roll&Bowl",
    description: "Fresh poké bowls, burritos and sushi delivered in Antwerp.",
    images: ["/logo.png"],
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl" className={`scroll-smooth ${inter.variable} ${manrope.variable}`}>
      <body className="min-h-screen">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(buildRestaurantJsonLd()),
          }}
        />
        <StoreHydration />
        {children}
        <SiteFooter />
        <MobileBottomNav />
      </body>
    </html>
  );
}
