from playwright.sync_api import sync_playwright

def run(playwright):
    browser = playwright.chromium.launch(headless=True)
    page = browser.new_page()

    # Navigate
    print("Navigating...")
    page.goto("http://localhost:5174/dependency-maritime/")

    # Wait for graph to load
    print("Waiting for graph...")
    # Wait for any node
    page.wait_for_selector("div[data-testid^='node-']", timeout=10000)

    # Take initial screenshot
    page.screenshot(path="verification/layout_initial.png")

    # Find Layout button
    print("Clicking Layout button...")
    # It might be in a toolbar. Using get_by_role button with name "Layout: Standard"
    layout_btn = page.get_by_role("button", name="Layout: Standard")
    layout_btn.click()

    # Take screenshot of menu
    page.screenshot(path="verification/layout_menu.png")

    # Click ELK
    print("Selecting ELK...")
    page.get_by_role("menuitemradio", name="ELK").click()

    # Verify button text changed to "Layout: ELK"
    print("Verifying change...")
    page.get_by_role("button", name="Layout: ELK").wait_for()

    # Take final screenshot
    page.screenshot(path="verification/layout_elk.png")

    print("Done.")
    browser.close()

with sync_playwright() as playwright:
    run(playwright)
