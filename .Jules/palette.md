## 2025-02-12 - [Accessible Disabled Tooltips]
**Learning:** Tooltips on native `disabled` buttons are inaccessible to keyboard and screen reader users because disabled elements are removed from the focus order and do not fire events.
**Action:** Use `aria-disabled="true"`, prevent default click behavior (`e.preventDefault()`), and style the button to look disabled (`cursor-not-allowed opacity-50`). This keeps the element focusable so the tooltip can be triggered.

## 2025-03-11 - [Accessible Search Results List]
**Learning:** Using a `<div>` with an `onClick` handler for interactive list items (like search results) is an accessibility anti-pattern. It prevents keyboard focus (Tab key) and fails to announce the interactive role to screen readers, leaving non-mouse users unable to navigate or select results.
**Action:** Replace clickable `<div>` elements with semantic `<button type="button">` tags. Apply `w-full text-left` to maintain the block layout, and add focus styles (e.g., `focus:outline-none focus:bg-gray-600`) to ensure keyboard users receive clear visual feedback when navigating.
