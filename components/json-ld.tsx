// =============================================================================
// REUSABLE JSON-LD COMPONENT
// =============================================================================
// Drop this into any page to inject structured data without boilerplate.
// Usage: <JsonLd data={mySchemaObject} />
// =============================================================================

import { Thing, WithContext } from "schema-dts";

interface JsonLdProps {
  data: WithContext<Thing>;
}

export function JsonLd({ data }: JsonLdProps) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

// -- Pre-built structured data generators ------------------------------------

import { SITE_CONFIG } from "@/lib/seo-constants";

export function generateBreadcrumbJsonLd(
  items: { name: string; url?: string }[]
) {
  return {
    "@context": "https://schema.org" as const,
    "@type": "BreadcrumbList" as const,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

export function generateLocalBusinessJsonLd() {
  return {
    "@context": "https://schema.org" as const,
    "@type": "LocalBusiness" as const,
    name: SITE_CONFIG.legalName,
    url: SITE_CONFIG.url,
    telephone: SITE_CONFIG.phoneTel,
    email: SITE_CONFIG.email,
    address: {
      "@type": "PostalAddress" as const,
      streetAddress: SITE_CONFIG.address.street,
      addressLocality: SITE_CONFIG.address.city,
      addressRegion: SITE_CONFIG.address.state,
      postalCode: SITE_CONFIG.address.zip,
      addressCountry: SITE_CONFIG.address.country,
    },
    areaServed: {
      "@type": "Country" as const,
      name: "United States",
    },
  };
}

export function generateServiceJsonLd(
  name: string,
  description: string,
  serviceType: string
) {
  return {
    "@context": "https://schema.org" as const,
    "@type": "Service" as const,
    name,
    description,
    serviceType,
    provider: {
      "@type": "Organization" as const,
      name: SITE_CONFIG.legalName,
      url: SITE_CONFIG.url,
    },
    areaServed: {
      "@type": "Country" as const,
      name: "United States",
    },
  };
}

export function generateArticleJsonLd(
  title: string,
  description: string,
  url: string,
  datePublished: string,
  dateModified?: string
) {
  return {
    "@context": "https://schema.org" as const,
    "@type": "Article" as const,
    headline: title,
    description,
    url,
    datePublished,
    dateModified: dateModified || datePublished,
    author: {
      "@type": "Organization" as const,
      name: SITE_CONFIG.legalName,
      url: SITE_CONFIG.url,
    },
    publisher: {
      "@type": "Organization" as const,
      name: SITE_CONFIG.legalName,
      url: SITE_CONFIG.url,
      logo: {
        "@type": "ImageObject" as const,
        url: `${SITE_CONFIG.url}/logo.png`,
      },
    },
  };
}
