import os
from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Configuration
        app_url = os.environ.get('APP_URL', 'http://localhost:5173/dependency-maritime/')
        timeout = int(os.environ.get('TIMEOUT', 10000))
        screenshot_path = os.environ.get('SCREENSHOT_PATH', 'verification/verification.png')

        # Navigate to the app
        print(f"Navigating to {app_url}...")
        page.goto(app_url)

        # Wait for the graph to load
        print("Waiting for graph...")
        page.wait_for_selector(".react-flow__node", timeout=timeout)

        # Expect to find "App.tsx"
        print("Checking for App.tsx...")
        expect(page.get_by_text("App.tsx")).to_be_visible()

        # Take a screenshot
        print(f"Taking screenshot to {screenshot_path}...")
        page.screenshot(path=screenshot_path)

        browser.close()

if __name__ == "__main__":
    run()
