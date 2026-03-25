import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import StoreHydration from "@/components/StoreHydration";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Roll & Bowl — Fresh Bowls Delivered",
  description:
    "Build your perfect bowl or choose from our chef-curated ready-made selections. Healthy, delicious, delivered fast.",
  keywords: ["healthy food", "bowls", "delivery", "fresh", "vegan", "gluten-free"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${playfair.variable}`}>
      <body className="min-h-screen">
        <StoreHydration />
        {children}
      </body>
    </html>
  );
}
