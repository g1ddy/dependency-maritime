## 2024-05-23 - Added Loading States to Data Source Dialog
**Learning:** Users were left guessing during file uploads and large graph imports because of missing feedback.
**Action:** Always wrap async actions (even local file reads) in a loading state with visual feedback (spinners/disabled states).

## 2024-05-24 - Accessible Names for Icon-Only Buttons
**Learning:** Icon-only buttons (like the menu trigger) and buttons with responsive text visibility (hidden on mobile) are completely invisible to screen readers without explicit accessible names.
**Action:** Always add `aria-label` to icon-only buttons and buttons where text content might be hidden via CSS.
