/// <reference types="vitest" />
import path from "path"
import fs from "fs"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "vitest/config"

interface PackageJson {
  version: string;
}

const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8")) as PackageJson
const APP_VERSION_FALLBACK = 'DEV-LOCAL'
const version = process.env.VITE_APP_VERSION || packageJson.version || APP_VERSION_FALLBACK

export default defineConfig({
  base: "/dependency-maritime/",
  plugins: [react(), tailwindcss()],
  define: {
    'import.meta.env.VITE_APP_VERSION': JSON.stringify(version),
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./tests/utils/setup.ts", "./tests/utils/setup-layout-mock.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/components/ui/**',
        'src/vite-env.d.ts',
        'config/**',
        'sample-data/**',
        'scripts/**',
        '**/*.test.ts',
        '**/*.test.tsx',
        'tests/**',
      ],
      reporter: ['text', 'json', 'html'],
    },
  },
})
