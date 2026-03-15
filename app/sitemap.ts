import type { MetadataRoute } from "next";

const SITE_URL = "https://thestuffbuyers.com";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const corePages: MetadataRoute.Sitemap = [
    { url: SITE_URL, lastModified: now, changeFrequency: "weekly", priority: 1.0 },
    { url: `${SITE_URL}/about`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
  ];

  const seoLandingPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/sell-excess-inventory`, lastModified: now, changeFrequency: "weekly", priority: 0.95 },
    { url: `${SITE_URL}/sell-dead-stock`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${SITE_URL}/inventory-liquidation-services`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
  ];

  const industries = [
    "electronics",
    "toys-games",
    "health-beauty",
    "tools-hardware",
    "general-merchandise",
    "food-beverage",
  ];

  const industryPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/industries`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...industries.map((slug) => ({
      url: `${SITE_URL}/industries/${slug}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
  ];

  const blogPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/blog`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
  ];

  const legalPages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE_URL}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];

  return [...corePages, ...seoLandingPages, ...industryPages, ...blogPages, ...legalPages];
}
