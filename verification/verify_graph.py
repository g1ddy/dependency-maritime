from playwright.sync_api import sync_playwright, expect

def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()

        # Navigate to the app
        print("Navigating to app...")
        page.goto("http://localhost:5173/dependency-maritime/")

        # Wait for the graph to load
        print("Waiting for graph...")
        page.wait_for_selector(".react-flow__node", timeout=10000)

        # Expect to find "App.tsx"
        print("Checking for App.tsx...")
        expect(page.get_by_text("App.tsx")).to_be_visible()

        # Take a screenshot
        print("Taking screenshot...")
        page.screenshot(path="verification/verification.png")

        browser.close()

if __name__ == "__main__":
    run()
