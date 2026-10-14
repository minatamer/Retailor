import type { Metadata } from "next";
import type { ReactNode } from "react";
import { FontPreloads } from "../styles/font-preloads";
import "../styles/fonts.css";
import "../styles/tokens.css";
import "../styles/globals.css";
export const metadata: Metadata = {
  title: "Retailor — Bring your products. See your store.",
  description: "A clothing storefront demo with Tailor beside you.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "16x16 32x32 48x48", type: "image/x-icon" },
      { url: "/favicon-96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: {
      url: "/apple-touch-icon.png",
      sizes: "180x180",
      type: "image/png",
    },
  },
};
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <FontPreloads />
        {children}
      </body>
    </html>
  );
}
