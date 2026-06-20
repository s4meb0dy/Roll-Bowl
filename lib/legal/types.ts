import type { Locale } from "@/lib/i18n";

export type AllergenId =
  | "gluten"
  | "crustaceans"
  | "eggs"
  | "fish"
  | "peanuts"
  | "soy"
  | "milk"
  | "nuts"
  | "celery"
  | "mustard"
  | "sesame"
  | "sulphites"
  | "lupin"
  | "molluscs";

export const ALLERGEN_IDS: AllergenId[] = [
  "gluten",
  "crustaceans",
  "eggs",
  "fish",
  "peanuts",
  "soy",
  "milk",
  "nuts",
  "celery",
  "mustard",
  "sesame",
  "sulphites",
  "lupin",
  "molluscs",
];

export interface LegalSection {
  title: string;
  paragraphs: string[];
}

export interface LegalDocument {
  title: string;
  updated: string;
  intro?: string;
  sections: LegalSection[];
}

export type LegalContentMap = Record<Locale, LegalDocument>;

export interface AllergenChartItem {
  id: string;
  name: string;
  allergens: AllergenId[];
}

export interface AllergenChartSection {
  titleKey: string;
  items: AllergenChartItem[];
}
