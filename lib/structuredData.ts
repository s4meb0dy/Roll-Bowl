import { BUSINESS } from "./business";
import { OPENING_HOURS } from "./deliveryConfig";
import { getSiteUrl } from "./siteUrl";

/** schema.org day names indexed by JS `Date.getDay()` (0 = Sunday). */
const SCHEMA_DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
] as const;

const pad2 = (n: number) => String(n).padStart(2, "0");

/**
 * Restaurant JSON-LD (schema.org) for the storefront. Helps Google understand
 * the business (name, address, phone, opening hours, socials) and can surface a
 * rich result / knowledge panel. Data is derived from the shared BUSINESS +
 * OPENING_HOURS config so it never drifts from the footer/legal pages.
 */
export function buildRestaurantJsonLd(): Record<string, unknown> {
  const siteUrl = getSiteUrl();

  const openingHoursSpecification = Object.entries(OPENING_HOURS).flatMap(
    ([day, windows]) => {
      if (!windows?.length) return [];
      const dayOfWeek = SCHEMA_DAY_NAMES[Number(day)];
      return windows.map((w) => ({
        "@type": "OpeningHoursSpecification",
        dayOfWeek,
        opens: `${pad2(w.openHour)}:${pad2(w.openMinute)}`,
        closes: `${pad2(Math.min(w.closeHour, 23))}:${pad2(w.closeMinute)}`,
      }));
    }
  );

  return {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    "@id": `${siteUrl}/#restaurant`,
    name: BUSINESS.name,
    url: siteUrl,
    image: `${siteUrl}/logo.png`,
    logo: `${siteUrl}/logo.png`,
    telephone: BUSINESS.phoneE164,
    email: BUSINESS.email,
    priceRange: "€€",
    servesCuisine: ["Poké bowls", "Sushi", "Burritos", "Smoothies", "Healthy"],
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS.street,
      postalCode: BUSINESS.postalCode,
      addressLocality: BUSINESS.city,
      addressCountry: "BE",
    },
    hasMenu: `${siteUrl}/menu`,
    acceptsReservations: false,
    openingHoursSpecification,
    sameAs: [
      BUSINESS.social.instagram,
      BUSINESS.social.tiktok,
      BUSINESS.social.facebook,
    ],
  };
}
