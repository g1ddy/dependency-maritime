from playwright.sync_api import sync_playwright, expect

def verify_upload_modal(page):
    # Navigate to the app
    page.goto("http://localhost:5173/dependency-maritime/")
    page.wait_for_load_state("networkidle")

    # Click the upload button
    # The button has aria-label="Upload/Select Data Source"
    upload_btn = page.get_by_label("Upload/Select Data Source")
    expect(upload_btn).to_be_visible()
    upload_btn.click()

    # Verify modal is open
    modal_title = page.get_by_role("heading", name="Select Data Source")
    expect(modal_title).to_be_visible()

    # Check for options
    expect(page.get_by_text("Sample Data")).to_be_visible()
    expect(page.get_by_text("Project Graph")).to_be_visible()
    expect(page.get_by_text("Click to upload or drag and drop")).to_be_visible()

    # Screenshot the modal
    page.screenshot(path="verification/upload_modal.png")

    # Click 'Project Graph'
    project_graph_btn = page.get_by_text("Project Graph")
    project_graph_btn.click()

    # Modal should close
    expect(modal_title).not_to_be_visible()

    # Screenshot the graph (just to be sure it didn't crash)
    page.screenshot(path="verification/after_load.png")

if __name__ == "__main__":
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        page = browser.new_page()
        try:
            verify_upload_modal(page)
            print("Verification script finished successfully.")
        except Exception as e:
            print(f"Verification script failed: {e}")
            page.screenshot(path="verification/failure.png")
            raise
        finally:
            browser.close()
