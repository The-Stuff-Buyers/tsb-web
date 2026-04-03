import type { Metadata, Viewport } from "next";
import { Poppins } from "next/font/google";
import { Organization, WebSite, WithContext } from "schema-dts";
import "./globals.css";
import { PWARegistration } from "./components/PWARegistration";
import HamburgerNav from "./components/HamburgerNav";
import Footer from "./components/Footer";
import { ConditionalShell } from "./components/ConditionalShell";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-poppins",
  display: "swap",
});

const SITE_URL = "https://thestuffbuyers.com";
const SITE_NAME = "The Stuff Buyers";
const DEFAULT_DESCRIPTION =
  "We buy excess inventory, dead stock, overstock, and closeout merchandise. Get a recovery quote in 48 hours. No contracts, no hassle. Nationwide pickup and payment.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),

  title: {
    default: "The Stuff Buyers — We Buy Excess Inventory, Dead Stock & Closeouts",
    template: "%s | The Stuff Buyers",
  },

  description: DEFAULT_DESCRIPTION,

  keywords: [
    "excess inventory buyer",
    "sell excess inventory",
    "dead stock buyer",
    "overstock liquidation",
    "closeout buyer",
    "inventory liquidation",
    "surplus inventory buyer",
    "sell dead stock",
    "bulk inventory buyer",
    "wholesale liquidation",
    "inventory recovery",
    "sell overstock merchandise",
    "warehouse clearance buyer",
    "Amazon FBA liquidation",
    "retail liquidation buyer",
    "sell closeout merchandise",
    "inventory asset recovery",
    "we buy stuff",
  ],

  authors: [{ name: "The Stuff Buyers LLC" }],
  creator: "The Stuff Buyers LLC",
  publisher: "The Stuff Buyers LLC",

  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },

  openGraph: {
    type: "website",
    locale: "en_US",
    url: SITE_URL,
    siteName: SITE_NAME,
    title: "The Stuff Buyers — We Buy Excess Inventory, Dead Stock & Closeouts",
    description: DEFAULT_DESCRIPTION,
    images: [
      {
        url: `${SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "The Stuff Buyers — We Buy Stuff. The stuff you can't sell.",
        type: "image/png",
      },
    ],
  },

  twitter: {
    card: "summary_large_image",
    title: "The Stuff Buyers — We Buy Excess Inventory",
    description: DEFAULT_DESCRIPTION,
    images: [`${SITE_URL}/og-image.png`],
  },

  alternates: {
    canonical: SITE_URL,
  },

  other: {
    "geo.region": "US-TN",
    "geo.placename": "Mt Juliet, Tennessee",
    "geo.position": "36.2001;-86.5119",
    ICBM: "36.2001, -86.5119",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a1a1a",
};

const organizationJsonLd: WithContext<Organization> = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "The Stuff Buyers LLC",
  alternateName: "The Stuff Buyers",
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  description: DEFAULT_DESCRIPTION,
  foundingDate: "2025",
  address: {
    "@type": "PostalAddress",
    streetAddress: "448 Cobblestone Way",
    addressLocality: "Mt Juliet",
    addressRegion: "TN",
    postalCode: "37122",
    addressCountry: "US",
  },
  contactPoint: [
    {
      "@type": "ContactPoint",
      telephone: "+1-314-358-5293",
      contactType: "sales",
      email: "quotes@thestuffbuyers.com",
      areaServed: "US",
      availableLanguage: "English",
    },
  ],
  sameAs: [],
  parentOrganization: {
    "@type": "Organization",
    name: "Snowfield Enterprises LLC",
  },
  knowsAbout: [
    "Excess inventory liquidation",
    "Dead stock purchasing",
    "Closeout merchandise buying",
    "Inventory asset recovery",
    "Wholesale liquidation brokerage",
    "Surplus inventory acquisition",
    "Overstock merchandise purchasing",
    "Amazon FBA inventory liquidation",
  ],
  slogan: "We Buy Stuff. The stuff you can't sell.",
};

const websiteJsonLd: WithContext<WebSite> = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: SITE_NAME,
  url: SITE_URL,
  description: DEFAULT_DESCRIPTION,
  publisher: {
    "@type": "Organization",
    name: "The Stuff Buyers LLC",
  },
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${SITE_URL}/?q={search_term_string}`,
    },
    // @ts-expect-error schema-dts typing
    "query-input": "required name=search_term_string",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <head>
        {/* JSON-LD Structured Data */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(websiteJsonLd),
          }}
        />

        {/* PWA */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="We Buy Stuff" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <link rel="manifest" href="/site.webmanifest" />

        {/* Favicon set */}
        <link rel="icon" href="/favicon.ico" sizes="any" />
      </head>
      <body className="font-poppins antialiased bg-brand-bg text-brand-gray">
        <PWARegistration />
        <ConditionalShell nav={<HamburgerNav />} footer={<Footer />}>
          {children}
        </ConditionalShell>
      </body>
    </html>
  );
}
