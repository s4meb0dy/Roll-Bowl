"use client";

import LegalPageShell from "@/components/LegalPageShell";
import { getTermsDocument } from "@/lib/legal/terms";
import { useStore } from "@/lib/store/useStore";

export default function TermsPage() {
  const locale = useStore((s) => s.locale);
  return <LegalPageShell doc={getTermsDocument(locale)} />;
}
