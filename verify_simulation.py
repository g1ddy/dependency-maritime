from playwright.sync_api import sync_playwright, expect
import time

def run():
    with sync_playwright() as p:
        print("Launching browser...")
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        page.set_viewport_size({"width": 1920, "height": 1080})

        # Navigate
        url = "http://localhost:5173/dependency-maritime/"
        print(f"Navigating to {url}...")
        page.goto(url)

        # Wait for graph
        print("Waiting for graph...")
        page.wait_for_selector(".react-flow__renderer", state="visible", timeout=30000)

        time.sleep(2)

        # Check for Reset Button (should be visible due to forced state)
        # Text is "Reset Simulation"
        reset_btn = page.get_by_role("button", name="Reset Simulation")

        try:
            expect(reset_btn).to_be_visible(timeout=5000)
            print("Reset button visible!")
            page.screenshot(path="verification_overlay.png")
            print("Screenshot taken.")
        except Exception as e:
            print(f"Reset button NOT visible: {e}")
            page.screenshot(path="verification_failed.png")

        browser.close()

if __name__ == "__main__":
    run()
