## 2024-05-23 - Added Loading States to Data Source Dialog
**Learning:** Users were left guessing during file uploads and large graph imports because of missing feedback.
**Action:** Always wrap async actions (even local file reads) in a loading state with visual feedback (spinners/disabled states).
