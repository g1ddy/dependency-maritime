import os
from playwright.sync_api import sync_playwright, expect

def verify_filters(page):
    # Navigate to the app
    page.goto("http://localhost:5173/dependency-maritime/")

    # Wait for the graph to load (look for "All Modules" button)
    all_btn = page.get_by_role("button", name="All Modules")
    expect(all_btn).to_be_visible(timeout=10000)

    # Click "Core"
    core_btn = page.get_by_role("button", name="Core")
    core_btn.click()

    # Click "UI Kit"
    ui_btn = page.get_by_role("button", name="UI Kit")
    ui_btn.click()

    # Wait a bit for layout
    page.wait_for_timeout(1000)

    # Take screenshot of multiple selection
    page.screenshot(path="verification/multiple_filters.png")

    # Reset
    all_btn.click()
    page.wait_for_timeout(500)
    page.screenshot(path="verification/reset_filters.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_filters(page)
        finally:
            browser.close()
