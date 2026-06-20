import { BUSINESS, BUSINESS_ADDRESS_LINE } from "@/lib/business";
import type { LegalContentMap } from "./types";

const UPDATED = "16 juni 2026";

export const privacyContent: LegalContentMap = {
  nl: {
    title: "Privacybeleid",
    updated: UPDATED,
    intro: `${BUSINESS.name} respecteert uw privacy. In dit beleid leest u welke persoonsgegevens wij verzamelen via rollnbowl.be en waarvoor wij ze gebruiken.`,
    sections: [
      {
        title: "1. Verantwoordelijke",
        paragraphs: [
          `${BUSINESS.name}, ${BUSINESS_ADDRESS_LINE}, ${BUSINESS.country}.`,
          `KBO: ${BUSINESS.kbo} · BTW: ${BUSINESS.vat}`,
          `E-mail: ${BUSINESS.email} · Tel: ${BUSINESS.phoneDisplay}`,
        ],
      },
      {
        title: "2. Welke gegevens verzamelen wij?",
        paragraphs: [
          "Contact- en leveringsgegevens: naam, telefoonnummer, bezorgadres en postcode.",
          "Bestelgegevens: gekozen producten, opmerkingen, betaalmethode, afhaal- of bezorgmoment.",
          "Betaalgegevens: online betalingen worden verwerkt door Stripe. Wij slaan geen kaartnummers op.",
          "Technische gegevens: IP-adres, browsertype en apparaatinformatie (serverlogs via onze hosting).",
        ],
      },
      {
        title: "3. Waarvoor gebruiken wij uw gegevens?",
        paragraphs: [
          "Het verwerken en bezorgen van uw bestelling.",
          "Contact opnemen bij vragen over uw bestelling.",
          "Betalingen afhandelen en fraude voorkomen.",
          "Wettelijke verplichtingen nakomen (o.a. boekhouding).",
        ],
      },
      {
        title: "4. Rechtsgrond (GDPR)",
        paragraphs: [
          "Uitvoering van de overeenkomst (art. 6.1.b GDPR) — voor het verwerken van bestellingen.",
          "Wettelijke verplichting (art. 6.1.c) — voor fiscale bewaring.",
          "Gerechtvaardigd belang (art. 6.1.f) — voor beveiliging van onze website en diensten.",
        ],
      },
      {
        title: "5. Bewaartermijn",
        paragraphs: [
          "Bestelgegevens bewaren wij zolang nodig voor levering, klantenservice en boekhouding (doorgaans tot 7 jaar voor fiscale documenten).",
          "Technische logs worden beperkt bewaard door onze hostingprovider.",
        ],
      },
      {
        title: "6. Delen met derden",
        paragraphs: [
          "Stripe — online betalingen (stripe.com/privacy).",
          "Vercel — hosting van de website.",
          "Upstash — tijdelijke opslag van bestellingen voor keukenverwerking.",
          "Wij verkopen uw gegevens niet aan derden.",
        ],
      },
      {
        title: "7. Cookies",
        paragraphs: [
          "Wij gebruiken strikt noodzakelijke cookies voor het functioneren van de website (o.a. taalkeuze in uw browser, admin-sessie voor keukenbeheer).",
          "Online betaling via Stripe kan functionele cookies plaatsen voor fraudepreventie.",
          "Wij gebruiken momenteel geen marketing- of analytics-cookies.",
        ],
      },
      {
        title: "8. Uw rechten",
        paragraphs: [
          "U heeft het recht op inzage, rectificatie, verwijdering, beperking, overdraagbaarheid en bezwaar.",
          "Contacteer ons via " + BUSINESS.email + ". Wij antwoorden binnen 30 dagen.",
          "Klacht? U kunt terecht bij de Gegevensbeschermingsautoriteit (GBA/APD): gegevensbeschermingsautoriteit.be.",
        ],
      },
    ],
  },
  en: {
    title: "Privacy Policy",
    updated: "16 June 2026",
    intro: `${BUSINESS.name} respects your privacy. This policy explains what personal data we collect via rollnbowl.be and how we use it.`,
    sections: [
      {
        title: "1. Data controller",
        paragraphs: [
          `${BUSINESS.name}, ${BUSINESS_ADDRESS_LINE}, ${BUSINESS.country}.`,
          `KBO: ${BUSINESS.kbo} · VAT: ${BUSINESS.vat}`,
          `Email: ${BUSINESS.email} · Tel: ${BUSINESS.phoneDisplay}`,
        ],
      },
      {
        title: "2. What data do we collect?",
        paragraphs: [
          "Contact and delivery details: name, phone number, delivery address and postcode.",
          "Order details: selected products, notes, payment method, pickup or delivery time.",
          "Payment data: online payments are processed by Stripe. We do not store card numbers.",
          "Technical data: IP address, browser type and device info (server logs via our host).",
        ],
      },
      {
        title: "3. How do we use your data?",
        paragraphs: [
          "Processing and delivering your order.",
          "Contacting you about your order.",
          "Handling payments and preventing fraud.",
          "Complying with legal obligations (including accounting).",
        ],
      },
      {
        title: "4. Legal basis (GDPR)",
        paragraphs: [
          "Performance of a contract (Art. 6.1.b GDPR) — to process orders.",
          "Legal obligation (Art. 6.1.c) — for tax record keeping.",
          "Legitimate interest (Art. 6.1.f) — for website and service security.",
        ],
      },
      {
        title: "5. Retention",
        paragraphs: [
          "We keep order data as long as needed for delivery, customer service and accounting (typically up to 7 years for tax records).",
          "Technical logs are retained for a limited period by our hosting provider.",
        ],
      },
      {
        title: "6. Third parties",
        paragraphs: [
          "Stripe — online payments (stripe.com/privacy).",
          "Vercel — website hosting.",
          "Upstash — temporary order storage for kitchen processing.",
          "We do not sell your data to third parties.",
        ],
      },
      {
        title: "7. Cookies",
        paragraphs: [
          "We use strictly necessary cookies for the website to function (e.g. language preference, admin session for kitchen management).",
          "Online payment via Stripe may place functional cookies for fraud prevention.",
          "We do not currently use marketing or analytics cookies.",
        ],
      },
      {
        title: "8. Your rights",
        paragraphs: [
          "You have the right to access, rectify, erase, restrict, port and object to processing.",
          "Contact us at " + BUSINESS.email + ". We respond within 30 days.",
          "Complaint? Contact the Belgian Data Protection Authority: gegevensbeschermingsautoriteit.be.",
        ],
      },
    ],
  },
  fr: {
    title: "Politique de confidentialité",
    updated: "16 juin 2026",
    intro: `${BUSINESS.name} respecte votre vie privée. Cette politique explique quelles données personnelles nous collectons via rollnbowl.be et comment nous les utilisons.`,
    sections: [
      {
        title: "1. Responsable du traitement",
        paragraphs: [
          `${BUSINESS.name}, ${BUSINESS_ADDRESS_LINE}, ${BUSINESS.country}.`,
          `BCE : ${BUSINESS.kbo} · TVA : ${BUSINESS.vat}`,
          `E-mail : ${BUSINESS.email} · Tél : ${BUSINESS.phoneDisplay}`,
        ],
      },
      {
        title: "2. Quelles données collectons-nous ?",
        paragraphs: [
          "Coordonnées et livraison : nom, numéro de téléphone, adresse et code postal.",
          "Détails de commande : produits choisis, remarques, mode de paiement, heure de retrait ou livraison.",
          "Paiement : les paiements en ligne sont traités par Stripe. Nous ne stockons pas les numéros de carte.",
          "Données techniques : adresse IP, type de navigateur et informations sur l'appareil (journaux serveur).",
        ],
      },
      {
        title: "3. Finalités",
        paragraphs: [
          "Traiter et livrer votre commande.",
          "Vous contacter concernant votre commande.",
          "Gérer les paiements et prévenir la fraude.",
          "Respecter nos obligations légales (comptabilité).",
        ],
      },
      {
        title: "4. Base juridique (RGPD)",
        paragraphs: [
          "Exécution du contrat (art. 6.1.b RGPD) — pour le traitement des commandes.",
          "Obligation légale (art. 6.1.c) — conservation fiscale.",
          "Intérêt légitime (art. 6.1.f) — sécurité du site et des services.",
        ],
      },
      {
        title: "5. Durée de conservation",
        paragraphs: [
          "Nous conservons les données de commande aussi longtemps que nécessaire pour la livraison, le service client et la comptabilité (jusqu'à 7 ans pour les documents fiscaux).",
          "Les journaux techniques sont conservés pour une durée limitée par notre hébergeur.",
        ],
      },
      {
        title: "6. Tiers",
        paragraphs: [
          "Stripe — paiements en ligne (stripe.com/privacy).",
          "Vercel — hébergement du site.",
          "Upstash — stockage temporaire des commandes pour la cuisine.",
          "Nous ne vendons pas vos données à des tiers.",
        ],
      },
      {
        title: "7. Cookies",
        paragraphs: [
          "Nous utilisons des cookies strictement nécessaires au fonctionnement du site (langue, session admin cuisine).",
          "Le paiement via Stripe peut placer des cookies fonctionnels anti-fraude.",
          "Nous n'utilisons pas de cookies marketing ou analytiques pour le moment.",
        ],
      },
      {
        title: "8. Vos droits",
        paragraphs: [
          "Vous avez le droit d'accès, de rectification, d'effacement, de limitation, de portabilité et d'opposition.",
          "Contactez-nous à " + BUSINESS.email + ". Réponse sous 30 jours.",
          "Réclamation ? Autorité de protection des données : autoriteprotectiondonnees.be.",
        ],
      },
    ],
  },
};

export function getPrivacyDocument(locale: keyof typeof privacyContent) {
  return privacyContent[locale] ?? privacyContent.nl;
}
