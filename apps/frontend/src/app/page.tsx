import type { Metadata } from "next";
import { Landing } from "../features/landing/landing";
export const metadata: Metadata = {
  title: "Retailor — Bring your products. See your store.",
  description:
    "Bring clothing photos, review your draft and personalize page layouts, colours, type and branding with Tailor. Explore your connected demo store and owner dashboard. No signup. No real payments.",
};
export default function Home() {
  return <Landing />;
}
