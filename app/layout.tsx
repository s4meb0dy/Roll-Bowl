import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import "./globals.css";
import StoreHydration from "@/components/StoreHydration";
import MobileBottomNav from "@/components/MobileBottomNav";
import SiteFooter from "@/components/SiteFooter";
import { getSiteUrl } from "@/lib/siteUrl";

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

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Roll&Bowl",
  description:
    "Build your perfect bowl or choose from our chef-curated ready-made selections. Healthy, delicious, delivered fast.",
  keywords: ["healthy food", "bowls", "delivery", "fresh", "vegan", "gluten-free"],
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
        <StoreHydration />
        {children}
        <SiteFooter />
        <MobileBottomNav />
      </body>
    </html>
  );
}
