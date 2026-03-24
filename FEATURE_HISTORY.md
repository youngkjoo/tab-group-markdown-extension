# Feature Enhancements History: Markdown Sync Feature

This document captures the sequential enhancements and UI iterations developed during the `feature/md-sync` branch creation.

## 1. Initial Implementation of Sync & Diff
- **Concept:** Provide a way to compare live Tab Group URLs against a previously exported `.md` file.
- **Implementation:** Added a file upload `input` inside the popup. The extension natively parses the `.md` string, dynamically compares URLs against active tabs, and injects green `+` and red `-` DOM nodes to highlight symmetric differences (drift).

## 2. Refined Emotive Labels
- **Modification:** Replaced the generic `+` and `-` characters with explicitly recognizable emotive text prefixes: `✨ New:` and `🗑️ Removed:`.
- **Testing:** Updated `popup.test.js` and `integration.test.js` to rigidly enforce DOM regex assertions for these specific UI strings.

## 3. Explicit File Overwrite Control
- **Concept:** By default, Chrome handles duplicate filenames by uniquely enumerating them identically (e.g., `_links (1).md`). The user required a way to forcefully *overwrite* the original file completely to satisfy the concept of a true "Sync".
- **Implementation:** Integrated an `<input type="checkbox" id="chkOverride" checked>` into the UI. Attached its boolean state explicitly to the `conflictAction: "overwrite"` parameter inside the underlying Chromium API payload.

## 4. UI Layout & Visual Hierarchy
- **Visual Separation:** Shifted the main `Export Markdown` submit button tightly inside the core radio-selection box frame.
- **Sync Isolation:** Encapsulated the entire secondary Diff/Sync architecture securely within a `<details>` collapsible accordion, parked distinctly below the core application usage box.
- **Safeguard Locking:** Bound the Overwrite File toggle capabilities strictly to the Sync component. Standard generic user exports unequivocally fallback to `conflictAction: "uniquify"` to prevent catastrophic accidental data loss, whereas Sync operations intuitively bypass this via an internal `isSyncExport` logic flag.

## 5. Structured Data Grid Rendering
- **Concept:** The previous text string for the diffs (e.g., `✨ New: Title`) caused jagged horizontal line wrapping because the character widths of "New" and "Removed" text blocks natively differed.
- **Implementation:** Transformed the basic line-item text injections into a strict two-column CSS Flex layout. The label prefixes were wrapped firmly in a bounded flex basis width of `85px`, forcing the resulting URL titles to align flawlessly on a unified vertical visual axis.
