/// <reference types="vitest" />
import path from "path"
import fs from "fs"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vitest/config"

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8"))

export default defineConfig({
  base: "/dependency-maritime/",
  plugins: [react(), tailwindcss()],
  define: {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(packageJson.version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    exclude: ["e2e/**", "node_modules/**"],
  },
})
