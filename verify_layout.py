from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()
    page.goto("http://localhost:5173/dependency-maritime/")

    # Wait for nodes to be present
    page.wait_for_selector('[data-testid^="node-"]', timeout=30000)

    # Wait a bit for layout and fitView
    page.wait_for_timeout(2000)

    # Take screenshot
    page.screenshot(path="verification-layout.png")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
