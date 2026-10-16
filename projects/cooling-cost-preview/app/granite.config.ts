import { defineConfig } from "@apps-in-toss/web-framework/config";

export default defineConfig({
  appName: "cooling-cost-preview",
  brand: {
    displayName: "냉방비 미리보기",
    primaryColor: "#0064FF",
    icon: "appsintoss-logo.png",
  },
  web: {
    host: process.env.TOSS_DEV_HOST || "localhost",
    port: 5173,
    commands: {
      dev: "vite dev --mode toss --host 0.0.0.0",
      build: "vite build --mode toss",
    },
  },
  permissions: [],
  outdir: "dist",
});
