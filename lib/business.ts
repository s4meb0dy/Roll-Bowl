/** Public business details — footer, legal pages, impressum. */
export const BUSINESS = {
  name: "Roll & Bowl",
  street: "Ruggeveldlaan 730",
  postalCode: "2100",
  city: "Deurne",
  country: "België",
  phoneE164: "+32486648014",
  phoneDisplay: "+32 486 64 80 14",
  email: "info@rollnbowl.be",
  kbo: "0731.988.031",
  vat: "BE 0731.988.031",
  mapsUrl:
    "https://www.google.com/maps/search/?api=1&query=Ruggeveldlaan+730,+2100+Deurne,+Belgium",
  social: {
    instagram: "https://www.instagram.com/rollnbowl_/",
    tiktok: "https://www.tiktok.com/@rollnbowl_",
    facebook: "https://www.facebook.com/p/RollBowl-100060276047327/",
  },
} as const;

export const BUSINESS_ADDRESS_LINE = `${BUSINESS.street}, ${BUSINESS.postalCode} ${BUSINESS.city}`;
