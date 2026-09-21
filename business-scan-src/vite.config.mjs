import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const currentDirectory = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  root: currentDirectory,
  base: "/diagnostico/",
  plugins: [react()],
  build: {
    outDir: resolve(currentDirectory, "../diagnostico"),
    emptyOutDir: true,
    sourcemap: false,
  },
});
