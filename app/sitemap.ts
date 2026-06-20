import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/siteUrl";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = getSiteUrl();
  const lastModified = new Date();

  return [
    { url: base, lastModified, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/menu`, lastModified, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/privacy`, lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/voorwaarden`, lastModified, changeFrequency: "monthly", priority: 0.3 },
    { url: `${base}/allergenen`, lastModified, changeFrequency: "monthly", priority: 0.4 },
  ];
}
