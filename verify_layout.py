from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:5173/dependency-maritime/")

    # Wait for nodes to be present and layout to be ready
    page.wait_for_selector('[data-layout-ready="true"]', timeout=30000)

    # Wait a tiny bit for fitView animation if enabled (though disableAnimations is often set in E2E)
    page.wait_for_timeout(500)

    # Take screenshot
    page.screenshot(path="verification-layout.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
