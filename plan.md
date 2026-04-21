1. **Analyze Failure:** The e2e test fails in `tests/e2e/app.spec.ts` at the step "Verify GraphOverlay controls".
   The timeout is likely on `await node.click();` where `node` is `page.getByTestId('node-main.tsx')`.
2. **Review Context:** The context memory mentions:
   `When using Playwright to interact with React Flow nodes (e.g., clicking .react-flow__node), use click(force=True) to safely bypass intercepted clicks caused by overlapping children or bounding box overlays.`
3. **Fix Issue:** Modify `tests/e2e/app.spec.ts` to use `await node.click({ force: true });`.
4. **Verification:** Run `pnpm test:e2e` to verify the fix locally.
