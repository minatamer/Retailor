import type { Metadata } from "next";
import type { ReactNode } from "react";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/globals.css";
export const metadata: Metadata = {
  title: "Retailor — Bring your products. See your store.",
  description: "A clothing storefront demo with Tailor beside you.",
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
