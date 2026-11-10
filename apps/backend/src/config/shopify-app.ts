// Retailor's public app identity, not a merchant store or access token.
// Copy Client ID from Shopify Dev Dashboard -> Retailor Local -> Settings.
export const SHOPIFY_APP = {
  clientId: "31874998d05aff3f0b7463e109913066",
  // Shopify-generated entry for local dev-store testing, never public distribution.
  developmentInstallUrl:
    "https://admin.shopify.com/?organization_id=246478493&no_redirect=true&redirect=/oauth/redirect_from_developer_dashboard?client_id%3D31874998d05aff3f0b7463e109913066",
  provider: "live" as "live" | "fixture",
  // Hosted only; keep blank for local development. Never use checkout storage.
  storageProject: "",
  storageBucket: "",
};
