# Setting up UI Integration Tests

To accurately test Chrome Extensions in a real browser environment, we will use **Puppeteer** to launch an actual headless Chromium browser instance loaded with our extension. 

## Proposed Changes

### Package Configuration
#### [MODIFY] package.json
- Add `puppeteer` to `devDependencies`.
- Add a `"test:ui": "jest integration.test.js"` script.

### Test Implementation
#### [NEW] integration.test.js
We will write a comprehensive Puppeteer test suite that controls a real browser. To accurately set up various "Tab Group stages", we will interact with the extension's loaded background context to programmatically create actual Chrome Tab Groups before opening the popup.

**Specific Test Scenarios Covered:**
1. **Empty State:** Launch the browser with zero tab groups → Open popup → Verify `<select>` shows `"No open Tab Groups found"` and the Export button is disabled.
2. **Named Tab Group Recognition:** Programmatically create a tab group named "Project Research" → Open popup → Verify the dropdown is populated with "Project Research".
3. **Unnamed Tab Group Fallback:** Create a tab group without a title → Open popup → Verify the dropdown auto-generates and displays the fallback name (`Unnamed_Group_YYYY-MM-DD`).
4. **Active Tab Auto-selection:** Create multiple groups and focus a tab inside "Group B" → Open popup → Verify that the dropdown automatically pre-selects "Group B".
5. **Clipboard Export Flow:** Select a configured group → Choose the "Clipboard" radio button → Click Export → Verify the UI status strictly updates to `"Copied to Clipboard!"` in green.
6. **Download Export Flow:** Select a configured group → Choose the "Download .md" radio button → Click Export → Verify the UI status updates to `"Started Download!"` and the download triggers.
7. **Both Option Flow:** Choose the "Both" radio button → Click Export → Verify the UI reflects `"Copied & Downloaded!"`.

## Verification Plan

### Automated Tests
- Running `npm run test:ui` will execute the full Puppeteer matrix. It will launch a real Chrome instance, organically create the tab groups via Chrome APIs, and assert the popup HTML behaves exactly as a user would experience it.
