# Implementation Plan: Tab Group to Markdown Extension

This implementation plan outlines the steps fully executed during the initial build phase, followed seamlessly by the architecture for the UI integration tests.

---

## Part 1: Original Extension Architecture

### Goal Description
Create a Chrome Extension with a clean, one-click popup UI that parses tabs from a selected Tab Group (defaulting to the user's current group, if applicable) and exports them as formatted Markdown text.

### Proposed Changes

#### [NEW] manifest.json
- Define extension metadata, Manifest Version 3.
- Request explicit permissions: `tabGroups`, `tabs`, `downloads`.
- Register standard `action` pointing to `popup.html`.

#### [NEW] popup.html
- Provide the basic HTML skeleton structure for the popup interface.
- Add components:
  - Header / Hero title indicating the extension purpose.
  - Dropdown (`<select>`) for choosing the target Tab Group across all windows.
  - "Export Method" container with radio buttons (Copy to Clipboard [Checked by default], Download File, Both).
  - A prominent Action Button (`<button>`) to execute the export.
  - Status/feedback area (`<div>`) for displaying success ("Copied to Clipboard!").

#### [NEW] popup.css
- Style the popup layout. Given the guidelines, this features a sleek, modern, simple UI with standard padding (min. 300px width), rounded corners, and clear, styled inputs. A subtle hover state on the submit button.

#### [NEW] popup.js
- **Initialization:** Query Chrome APIs `chrome.tabGroups.query({})` and `chrome.tabs.query({})` on load to fetch ALL tabs and ALL tab groups across windows.
- **Default Selection Logic:** Determine the active tab's group ID. If valid, default the `<select>` dropdown to this value.
- **Markdown Logic:** Loop through the tabs associated with the chosen group ID, output the formatted string. Include a condition to handle the `Unnamed_Group_YYYY-MM-DD` fallback.
- **Action Controller:** Tie the Action Button click event to checking the user's chosen "Export Method":
  - If "Clipboard" or "Both": Utilize `navigator.clipboard.writeText(markdownString)` and show success UI text.
  - If "Download" or "Both": Utilize `URL.createObjectURL(new Blob([markdownString]))` with `chrome.downloads.download()`.

---

## Part 2: Automated Testing Implementation

To accurately test Chrome Extensions in a real browser environment, we utilized **Puppeteer** alongside a robust Jest unit-test suite.

### Proposed Changes

#### [MODIFY] package.json
- Added `puppeteer` to `devDependencies`.
- Added `"test:ui": "jest integration.test.js --forceExit"` script to isolate integration tests from unit tests.

#### [NEW] integration.test.js
A comprehensive Puppeteer test suite that controls a real browser. To accurately set up various "Tab Group stages", we interact with the extension's loaded background context to programmatically create actual Chrome Tab Groups before opening the popup.

**Test Scenarios Covered:**
1. **Empty State:** Launch the browser with zero tab groups → Open popup → Verify `<select>` shows `"No open Tab Groups found"` and the Export button is disabled.
2. **Named Tab Group Recognition:** Programmatically create a tab group named "Project Research" → Open popup → Verify the dropdown is populated with "Project Research".
3. **Unnamed Tab Group Fallback:** Create a tab group without a title → Open popup → Verify the dropdown auto-generates and displays the fallback name (`Unnamed_Group_YYYY-MM-DD`).
4. **Active Tab Auto-selection:** Create multiple groups and focus a tab inside "Group B" → Open popup → Verify that the dropdown automatically pre-selects "Group B".
5. **Clipboard Export Flow:** Select a configured group → Choose the "Clipboard" radio button → Click Export → Verify the UI status strictly updates to `"Copied to Clipboard!"` in green.
6. **Download Export Flow:** Select a configured group → Choose the "Download .md" radio button → Click Export → Verify the UI status updates to `"Started Download!"` and the download triggers.
7. **Both Option Flow:** Choose the "Both" radio button → Click Export → Verify the UI reflects `"Copied & Downloaded!"`.

### Verification Plan
- **Automated Verification:** Running `npm run test:ui` executes the full Puppeteer matrix. It launches a real Chrome instance, organically creates the tab groups via Chrome APIs, and asserts the popup HTML behaves exactly as a user would experience it.

---

## Part 3: Markdown Sync & Diffing Feature
Enhancing the extension to allow users to compare an exported `.md` file with the live realistic state of a Tab Group, visually diffing additions and removals, and generating a synchronized explicit `.md` file organically.

### Proposed Architecture

#### [MODIFY] popup.html
- Organize the standard export button safely inside `.options`.
- Add an expandable `<details>` container completely isolated beneath the main application box.
- Inject `<input type="file">` correctly identifying `.md` payloads.
- Inject an override `<input type="checkbox">` toggling explicitly inside the Sync block.
- Render dynamic table-aligned Flexlist items structurally separated via nested `span` containers formatting visual emojis (`✨ New:`, `🗑️ Removed:`).

#### [MODIFY] popup.js
- Implement secure file reading capability using Chrome's native HTML5 `FileReader`.
- Parse the Markdown file utilizing standard regex `/\[(.*?)\]\((.*?)\)/g` to extract Tab URLs reliably.
- Construct the Sync Algorithm analyzing arrays of `LiveURLs` vs `PreviousURLs` mapped strictly by their active HTTP addresses, ensuring accurate instantaneous diffs.
- Provide a Sync Export button utilizing the same core blob/clipboard architecture for generating the fresh markup snippet.

#### [MODIFY] Tests
- Comprehensive unit testing over isolated string regex parsing logic.
- Headless Puppeteer automation injecting artificial mock `.md` files to explicitly assert correct graphical HTML diff rendering across the DOM.
