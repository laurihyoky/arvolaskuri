import { defineConfig } from "vite";

const rawPort = process.env.PORT ?? "5173";
const port = Number(rawPort);
if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const rawBase = process.env.BASE_PATH || "/";
const base = `/${rawBase.replace(/^\/+|\/+$/g, "")}/`.replace(/^\/\/$/, "/");

export default defineConfig({
  base,
  build: {
    outDir: "dist/public",
    emptyOutDir: true
  },
  server: { host: "0.0.0.0", port, strictPort: true, allowedHosts: [".replit.dev"] },
  preview: { host: "0.0.0.0", port, strictPort: true, allowedHosts: [".replit.dev"] }
});