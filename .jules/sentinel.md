## 2025-01-27 - Harden Content Security Policy (CSP)
**Vulnerability:** The production CSP included `'unsafe-inline'` for scripts, which allows XSS attacks if an attacker can inject script tags or inline event handlers. This was originally added due to a belief that Vite injects inline scripts for module loading.
**Learning:** Modern Vite builds (v7+) with standard ES modules do not necessarily inject inline scripts in the final HTML, especially for simple setups. Verifying the build output (`dist/index.html`) confirmed that no inline scripts were present, making `'unsafe-inline'` unnecessary.
**Prevention:** Always verify if `'unsafe-inline'` is actually required by the build tool rather than assuming it based on outdated templates or comments. A stricter CSP significantly reduces the attack surface.
## 2026-02-28 - [Client-Side DoS via Large File Uploads]
**Vulnerability:** Missing file size limits on CSV uploads in the Relationship feature.
**Learning:** Unrestricted file uploads parsed entirely in the browser (via PapaParse) can block the main thread or crash the user's browser (client-side DoS).
**Prevention:** Implement `MAX_FILE_SIZE` checks (e.g., 20MB) early in the file upload handler before initiating any parsing operations.
