import { fileURLToPath, URL } from "node:url";

import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const mobileRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  root: mobileRoot,
  base: "./",
  plugins: [react()],
  publicDir: fileURLToPath(new URL("./public", import.meta.url)),
  resolve: {
    alias: [
      {
        find: "../../lib/platform/supabaseBrowser",
        replacement: fileURLToPath(
          new URL("./src/stubs/supabaseBrowser.ts", import.meta.url),
        ),
      },
    ],
  },
  build: {
    outDir: fileURLToPath(new URL("../mobile-dist", import.meta.url)),
    emptyOutDir: true,
    sourcemap: false,
  },
});
