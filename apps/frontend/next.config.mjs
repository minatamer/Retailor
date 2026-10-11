const nextConfig = {
  output: "standalone",
  distDir: process.env.RETAILOR_DEV === "true" ? ".next-dev" : ".next",
  poweredByHeader: false,
};
export default nextConfig;
