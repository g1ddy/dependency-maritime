/// <reference types="vitest" />
import path from "path"
import fs from "fs"
import react from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { defineConfig, type Plugin } from "vitest/config"

interface PackageJson {
  version: string;
}

const packageJson = JSON.parse(fs.readFileSync("./package.json", "utf-8")) as PackageJson
const APP_VERSION_FALLBACK = 'DEV-LOCAL'
const version = process.env.VITE_APP_VERSION || packageJson.version || APP_VERSION_FALLBACK

const cspPlugin = (): Plugin => {
  return {
    name: 'html-csp',
    transformIndexHtml(html, ctx) {
      const isDev = !!ctx.server;
      // Dev: Relaxed CSP for HMR and eval
      const devPolicy = [
        "default-src 'self'",
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self' ws: wss:",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
      ].join('; ');

      // Prod: Strict CSP (No unsafe-eval, no ws/wss)
      // Note: We keep unsafe-inline for styles as Tailwind/CSS-in-JS often needs it.
      // We removed unsafe-inline for scripts because modern Vite builds with ES modules do not require it.
      // This significantly reduces XSS risks.
      const prodPolicy = [
        "default-src 'self'",
        "script-src 'self'",
        "style-src 'self' 'unsafe-inline'",
        "img-src 'self' data: blob:",
        "font-src 'self' data:",
        "connect-src 'self'",
        "worker-src 'self' blob:",
        "object-src 'none'",
        "base-uri 'self'",
        "frame-ancestors 'none'",
      ].join('; ');

      const policy = isDev ? devPolicy : prodPolicy;

      return html.replace(
        '<head>',
        `<head>
    <meta http-equiv="Content-Security-Policy" content="${policy}">`
      );
    },
  }
}

export default defineConfig({
  base: "/dependency-maritime/",
  plugins: [react(), tailwindcss(), cspPlugin()],
  build: {
    emptyOutDir: false,
  },
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
    setupFiles: ["./tests/utils/setup.ts", "./tests/utils/setup-layout-mock.ts", "./tests/utils/setup-worker-mock.ts"],
    exclude: ["tests/e2e/**", "node_modules/**"],
    coverage: {
      provider: 'v8',
      include: ['src/**/*.ts', 'src/**/*.tsx'],
      exclude: [
        'src/components/ui/**',
        'src/vite-env.d.ts',
        '**/*.test.ts',
        '**/*.test.tsx',
      ],
      reporter: ['text', 'json', 'html'],
    },
  },
})
