import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";
import { PWARegistration } from "./components/PWARegistration";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "900"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Stuff Buyers — We Buy Excess Inventory",
  description:
    "Excess inventory. Dead stock. The stuff collecting dust. Send us your item sheet and we'll return a recovery quote in 48 hours. No contracts. No commitments. No hassle.",
  keywords: "excess inventory, liquidation, bulk buying, overstock, closeouts, inventory recovery",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#F5C518" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="We Buy Stuff" />
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
      </head>
      <body className="font-poppins antialiased bg-brand-bg text-brand-gray">
        <PWARegistration />
        {children}
      </body>
    </html>
  );
}
