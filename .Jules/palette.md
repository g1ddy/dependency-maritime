## 2025-02-12 - [Accessible Disabled Tooltips]
**Learning:** Tooltips on native `disabled` buttons are inaccessible to keyboard and screen reader users because disabled elements are removed from the focus order and do not fire events.
**Action:** Use `aria-disabled="true"`, prevent default click behavior (`e.preventDefault()`), and style the button to look disabled (`cursor-not-allowed opacity-50`). This keeps the element focusable so the tooltip can be triggered.

## 2025-03-11 - [Accessible Search Results List]
**Learning:** Using a `<div>` with an `onClick` handler for interactive list items (like search results) is an accessibility anti-pattern. It prevents keyboard focus (Tab key) and fails to announce the interactive role to screen readers, leaving non-mouse users unable to navigate or select results.
**Action:** Replace clickable `<div>` elements with semantic `<button type="button">` tags. Apply `w-full text-left` to maintain the block layout, and add focus styles (e.g., `focus:outline-none focus:bg-gray-600`) to ensure keyboard users receive clear visual feedback when navigating.

## 2024-03-19 - [Accessible Search Input with Clear Button]
**Learning:** A plain text input used for searching is less intuitive without visual indicators (like a magnifying glass icon). Furthermore, requiring users to manually backspace to clear a search is poor UX. Adding an absolute-positioned clear (X) button inside the input improves this. However, this icon button must be keyboard accessible.
**Action:** When adding absolute-positioned icons inside inputs, always adjust the input's padding (`pl-9`, `pr-9`) to prevent text overlap. For the clear button, ensure it uses `type="button"`, has an `aria-label`, and includes focus styles (`focus-visible:ring-2`) so keyboard users can navigate to it and trigger it.

## 2025-03-26 - [Interactive List Accessibility]
**Learning:** Found custom button list items in `RelationshipOverlay.tsx` and `NodeInspectorPanel.tsx` that didn't have keyboard focus rings when tabbing through results or lists. Specifically, some lists relied on hover states or non-standard focus outlines (`focus:bg-gray-600`). In React apps with interactive custom lists (like search results or dependents/dependencies), it's easy to forget standard focus visibility since they often act as clickable rows rather than standalone buttons visually.
**Action:** Always ensure that interactive list elements (e.g. `<li><button>...</button></li>`) explicitly declare standard focus styles. I added `focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring` (and `focus-visible:ring-blue-500` depending on the surrounding UI palette) so that keyboard-only users can clearly identify their focused item.

## 2024-05-14 - Add tooltip to theme toggle button
**Learning:** Icon-only buttons, even with `sr-only` text, lack visual discoverability for sighted users. Adding a Tooltip to an existing DropdownMenuTrigger enhances clarity without cluttering the UI.
**Action:** Always wrap icon-only actions with Tooltips, ensuring the TooltipTrigger and DropdownMenuTrigger correctly merge refs via `asChild`.
