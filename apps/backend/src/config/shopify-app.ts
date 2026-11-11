// Retailor's public app identity, not a merchant store or access token.
// Copy Client ID from Shopify Dev Dashboard -> Retailor -> Settings.
// Owner-selected shared registration: managed installation, dev stores only.
// External eligibility remains a native/platform acceptance check (RTL-174).
export const SHOPIFY_APP = {
  clientId: "31874998d05aff3f0b7463e109913066",
  provider: "live" as "live" | "fixture",
  // Hosted only; keep blank for local development. Never use checkout storage.
  storageProject: "",
  storageBucket: "",
};

export const SHOPIFY_HOSTED = {
  ...SHOPIFY_APP,
  storageProject: "retailor-511714",
  storageBucket: "retailor-511714-shopify-ledger",
  origin: "https://tryretailor.com",
  maintenanceAudience: "https://retailor-backend-xmacampiyq-ew.a.run.app",
  maintenanceIdentity:
    "retailor-shopify-cleanup@retailor-511714.iam.gserviceaccount.com",
} as const;
