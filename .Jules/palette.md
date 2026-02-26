## 2025-02-12 - [Accessible Disabled Tooltips]
**Learning:** Tooltips on native `disabled` buttons are inaccessible to keyboard and screen reader users because disabled elements are removed from the focus order and do not fire events.
**Action:** Use `aria-disabled="true"`, prevent default click behavior (`e.preventDefault()`), and style the button to look disabled (`cursor-not-allowed opacity-50`). This keeps the element focusable so the tooltip can be triggered.
