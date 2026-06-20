import { BUSINESS, BUSINESS_ADDRESS_LINE } from "@/lib/business";
import type { LegalContentMap } from "./types";

const UPDATED = "16 juni 2026";

export const termsContent: LegalContentMap = {
  nl: {
    title: "Algemene voorwaarden",
    updated: UPDATED,
    intro:
      "Deze voorwaarden zijn van toepassing op alle bestellingen via rollnbowl.be. Door te bestellen aanvaardt u deze voorwaarden.",
    sections: [
      {
        title: "1. Identiteit van de ondernemer",
        paragraphs: [
          `${BUSINESS.name}, ${BUSINESS_ADDRESS_LINE}, ${BUSINESS.country}.`,
          `KBO: ${BUSINESS.kbo} · BTW: ${BUSINESS.vat}`,
          `E-mail: ${BUSINESS.email} · Tel: ${BUSINESS.phoneDisplay}`,
        ],
      },
      {
        title: "2. Toepassingsgebied",
        paragraphs: [
          "Deze voorwaarden gelden voor alle online bestellingen via onze website.",
          "Afwijkingen zijn enkel geldig indien schriftelijk bevestigd.",
        ],
      },
      {
        title: "3. Bestelling en contract",
        paragraphs: [
          "Een bestelling is pas definitief na bevestiging door ons keukensysteem en (bij online betaling) succesvolle betaling.",
          "Wij behouden ons het recht voor om bestellingen te weigeren bij onbereikbaarheid, sluitingsuren of onjuiste gegevens.",
          "Prijzen en beschikbaarheid kunnen wijzigen; de prijs op het moment van bestellen is bindend.",
        ],
      },
      {
        title: "4. Prijzen en betaling",
        paragraphs: [
          "Alle prijzen zijn in euro, inclusief BTW, tenzij anders vermeld.",
          "Minimum bestelbedrag en bezorgkosten hangen af van uw postcode en worden vóór afrekenen getoond.",
          "Betaling kan online (Stripe: Bancontact, kaart, enz.) of contant bij levering, afhankelijk van de beschikbare opties.",
        ],
      },
      {
        title: "5. Levering en afhalen",
        paragraphs: [
          "Bezorging gebeurt binnen ons leveringsgebied. Levertijden zijn indicatief, geen harde garantie.",
          "Afhalen is mogelijk op ons adres tijdens openingsuren (zie website).",
          "Zorg dat u bereikbaar bent op het opgegeven telefoonnummer bij levering.",
        ],
      },
      {
        title: "6. Herroepingsrecht",
        paragraphs: [
          "Voor verse voeding en snel bederfelijke producten is het herroepingsrecht uitgesloten (art. VI.53 WER).",
          "Bij een duidelijke fout of kwaliteitsprobleem neemt u contact op via " +
            BUSINESS.email +
            "; wij zoeken een passende oplossing.",
        ],
      },
      {
        title: "7. Allergenen en dieetwensen",
        paragraphs: [
          "Raadpleeg onze allergenenkaart vóór bestelling. Bij ernstige allergieën: vermeld dit in uw bestelopmerking en contacteer ons.",
          "Wij bereiden voedsel in een keuken waar allergenen aanwezig kunnen zijn (kruisbesmetting).",
        ],
      },
      {
        title: "8. Klachten",
        paragraphs: [
          "Klachten? Mail naar " + BUSINESS.email + " of bel " + BUSINESS.phoneDisplay + ".",
          "Wij streven ernaar binnen 14 dagen te antwoorden.",
        ],
      },
      {
        title: "9. Aansprakelijkheid",
        paragraphs: [
          "Onze aansprakelijkheid is beperkt tot het bedrag van de betreffende bestelling, behalve bij opzet of grove nalatigheid.",
          "Wij zijn niet aansprakelijk voor indirecte schade of vertraging buiten onze controle.",
        ],
      },
      {
        title: "10. Toepasselijk recht",
        paragraphs: [
          "Op deze voorwaarden is het Belgisch recht van toepassing.",
          "Geschillen worden voorgelegd aan de bevoegde rechtbanken van het arrondissement Antwerpen.",
        ],
      },
    ],
  },
  en: {
    title: "Terms & Conditions",
    updated: "16 June 2026",
    intro:
      "These terms apply to all orders placed via rollnbowl.be. By placing an order you accept these terms.",
    sections: [
      {
        title: "1. Trader identity",
        paragraphs: [
          `${BUSINESS.name}, ${BUSINESS_ADDRESS_LINE}, ${BUSINESS.country}.`,
          `KBO: ${BUSINESS.kbo} · VAT: ${BUSINESS.vat}`,
          `Email: ${BUSINESS.email} · Tel: ${BUSINESS.phoneDisplay}`,
        ],
      },
      {
        title: "2. Scope",
        paragraphs: [
          "These terms apply to all online orders via our website.",
          "Deviations are only valid if confirmed in writing.",
        ],
      },
      {
        title: "3. Order and contract",
        paragraphs: [
          "An order is confirmed once accepted by our kitchen system and (for online payment) payment succeeds.",
          "We may refuse orders due to unavailability, closing hours or incorrect details.",
          "Prices and availability may change; the price at checkout is binding.",
        ],
      },
      {
        title: "4. Prices and payment",
        paragraphs: [
          "All prices are in euros, VAT included, unless stated otherwise.",
          "Minimum order and delivery fee depend on your postcode and are shown before checkout.",
          "Payment online (Stripe) or cash on delivery, depending on available options.",
        ],
      },
      {
        title: "5. Delivery and pickup",
        paragraphs: [
          "Delivery within our delivery zone. Times are indicative, not guaranteed.",
          "Pickup available at our address during opening hours (see website).",
          "Please ensure you are reachable on the phone number provided.",
        ],
      },
      {
        title: "6. Right of withdrawal",
        paragraphs: [
          "Fresh and perishable food is excluded from the right of withdrawal (Belgian Economic Law).",
          "For clear errors or quality issues, contact " +
            BUSINESS.email +
            " and we will find a suitable solution.",
        ],
      },
      {
        title: "7. Allergens and dietary needs",
        paragraphs: [
          "Consult our allergen chart before ordering. For severe allergies: note this in your order and contact us.",
          "Food is prepared in a kitchen where allergens may be present (cross-contamination).",
        ],
      },
      {
        title: "8. Complaints",
        paragraphs: [
          "Complaints? Email " + BUSINESS.email + " or call " + BUSINESS.phoneDisplay + ".",
          "We aim to respond within 14 days.",
        ],
      },
      {
        title: "9. Liability",
        paragraphs: [
          "Our liability is limited to the amount of the relevant order, except in case of intent or gross negligence.",
          "We are not liable for indirect damage or delays beyond our control.",
        ],
      },
      {
        title: "10. Governing law",
        paragraphs: [
          "Belgian law applies to these terms.",
          "Disputes shall be submitted to the competent courts of the Antwerp district.",
        ],
      },
    ],
  },
  fr: {
    title: "Conditions générales",
    updated: "16 juin 2026",
    intro:
      "Ces conditions s'appliquent à toutes les commandes via rollnbowl.be. En commandant, vous les acceptez.",
    sections: [
      {
        title: "1. Identité du commerçant",
        paragraphs: [
          `${BUSINESS.name}, ${BUSINESS_ADDRESS_LINE}, ${BUSINESS.country}.`,
          `BCE : ${BUSINESS.kbo} · TVA : ${BUSINESS.vat}`,
          `E-mail : ${BUSINESS.email} · Tél : ${BUSINESS.phoneDisplay}`,
        ],
      },
      {
        title: "2. Champ d'application",
        paragraphs: [
          "Ces conditions s'appliquent à toutes les commandes en ligne via notre site.",
          "Les dérogations ne sont valables que si confirmées par écrit.",
        ],
      },
      {
        title: "3. Commande et contrat",
        paragraphs: [
          "Une commande est confirmée après acceptation par notre système cuisine et (pour paiement en ligne) paiement réussi.",
          "Nous pouvons refuser une commande en cas d'indisponibilité, fermeture ou données incorrectes.",
          "Les prix et disponibilités peuvent changer ; le prix au moment de la commande fait foi.",
        ],
      },
      {
        title: "4. Prix et paiement",
        paragraphs: [
          "Tous les prix sont en euros, TVA comprise, sauf indication contraire.",
          "Minimum de commande et frais de livraison selon code postal, affichés avant paiement.",
          "Paiement en ligne (Stripe) ou espèces à la livraison, selon les options disponibles.",
        ],
      },
      {
        title: "5. Livraison et retrait",
        paragraphs: [
          "Livraison dans notre zone. Délais indicatifs, sans garantie stricte.",
          "Retrait possible à notre adresse aux heures d'ouverture (voir site).",
          "Assurez-vous d'être joignable au numéro indiqué.",
        ],
      },
      {
        title: "6. Droit de rétractation",
        paragraphs: [
          "Les denrées fraîches et périssables sont exclues du droit de rétractation (droit économique belge).",
          "En cas d'erreur ou problème de qualité, contactez " +
            BUSINESS.email +
            " pour une solution adaptée.",
        ],
      },
      {
        title: "7. Allergènes",
        paragraphs: [
          "Consultez notre tableau des allergènes avant de commander. Allergies graves : mentionnez-le et contactez-nous.",
          "Les plats sont préparés dans une cuisine où des allergènes peuvent être présents (contamination croisée).",
        ],
      },
      {
        title: "8. Réclamations",
        paragraphs: [
          "Réclamation ? E-mail " + BUSINESS.email + " ou " + BUSINESS.phoneDisplay + ".",
          "Réponse visée sous 14 jours.",
        ],
      },
      {
        title: "9. Responsabilité",
        paragraphs: [
          "Notre responsabilité est limitée au montant de la commande concernée, sauf faute intentionnelle ou grave.",
          "Pas de responsabilité pour dommages indirects ou retards hors de notre contrôle.",
        ],
      },
      {
        title: "10. Droit applicable",
        paragraphs: [
          "Droit belge applicable.",
          "Litiges soumis aux tribunaux compétents de l'arrondissement d'Anvers.",
        ],
      },
    ],
  },
};

export function getTermsDocument(locale: keyof typeof termsContent) {
  return termsContent[locale] ?? termsContent.nl;
}
