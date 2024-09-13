import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";
import reactPlugin from "@vitejs/plugin-react";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    reactPlugin(),
    VitePWA({
      injectRegister: "auto",
    }),
  ],
  build: {
    outDir: "build",
  },
  server: {
    port: 4444,
  },
  hmr: {
    port: 4444,
  },
});
