"use client";

import LegalPageShell from "@/components/LegalPageShell";
import { getPrivacyDocument } from "@/lib/legal/privacy";
import { useStore } from "@/lib/store/useStore";

export default function PrivacyPage() {
  const locale = useStore((s) => s.locale);
  return <LegalPageShell doc={getPrivacyDocument(locale)} />;
}
