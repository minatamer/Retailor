// Retailor's public app identity, not a merchant store or access token.
// Copy Client ID from Shopify Dev Dashboard -> Retailor -> Settings.
// Local candidate: Undecided distribution, managed installation enabled.
// External eligibility still needs native/Shopify confirmation (RTL-174).
export const SHOPIFY_APP = {
  clientId: "31874998d05aff3f0b7463e109913066",
  provider: "live" as "live" | "fixture",
  // Hosted only; keep blank for local development. Never use checkout storage.
  storageProject: "",
  storageBucket: "",
};
