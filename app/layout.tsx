import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "The Stuff Buyers — We Buy Excess Inventory",
  description:
    "Got excess inventory sitting in a warehouse or storage unit? The Stuff Buyers buys electronics, toys, housewares, general merchandise — anything with value, in any quantity. Fast quotes. Clean exits. No drama.",
  keywords: "excess inventory, liquidation, bulk buying, overstock, closeouts, inventory recovery",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={poppins.variable}>
      <body className="font-poppins antialiased bg-brand-bg text-brand-gray">
        {children}
      </body>
    </html>
  );
}
