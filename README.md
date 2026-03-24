# Product Requirements Document (PRD): Tab Group to Markdown Extension

## 1. Overview
A Chrome extension that allows users to export the list of tabs (Title and URL only) from a Chrome Tab Group across any open window into a formatted Markdown file. This output is ideal for importing into LLM contexts like NotebookLM, Gemini, or personal knowledge bases.

## 2. Core User Journeys (CUJs)
- **CUJ 1: Active Group Export:** As a user with an active tab inside a Tab Group, I want to click the extension icon to open a popup that automatically defaults to my active Tab Group. With one click ("Confirm/Export"), I can copy its Markdown formatting to my clipboard (default action).
- **CUJ 2: Selection & Alternative Actions:** As a user, I want to click the extension icon, see a prompt with my active Tab Group (if any), and a dropdown list of *all* Tab Groups across all open windows. I can select a different group, choose my preferred export method (Download, Copy to Clipboard, or Both), and execute the export.

## 3. Features & Requirements
### 3.1 Data Extraction
- Extract the **Title** and **URL** of every tab within the target Tab Group(s). Includes all special/local tabs (`chrome://`, `file://`, etc.).
- Extract the **Name** of the Tab Group.
- Retrieve Tab Groups from all open Chrome windows.

### 3.2 Output Format
The output should be clean, standard Markdown. Example:
```markdown
# [Tab Group Name]
*Exported on: YYYY-MM-DD HH:MM:SS*

- [Tab Title 1](URL 1)
- [Tab Title 2](URL 2)
```

### 3.3 User Interface (Popup)
- **Target Selection:** Dropdown or list defaulting to the currently active Tab Group. If no active group, simply instruct the user to select one from the list.
- **Export Options:** Radio buttons or a dropdown with three options:
  1. Copy to Clipboard (Default)
  2. Download File
  3. Both (Copy and Download)
- **Action Button:** A large "Export Markdown" or "Confirm" button that requires only one click if the user accepts the context defaults.

### 3.4 Export Mechanism
- **Download File:** Generates a `.md` file named `[TabGroupName]_links.md` and saves it to the default Downloads directory.
- **Copy to Clipboard:** Copies the formatted Markdown to the system clipboard. The extension must provide visual feedback (e.g., button changes to "Copied!") in the popup upon success.

### 3.5 Sync & Diff Existing Files
- **Drift Detection:** Allows users to systematically diff the live active Chrome Tab Group state against any previously exported `.md` file. By uploading an old file, the extension natively parses its contents and compares it to live reality.
- **Diff UI:** Visually presents exactly which tabs were strictly **Added** (Green `+`) or **Removed** (Red `-`).
- **One-Click Sync:** Seamlessly syncs the active Chrome state and eliminates outdated removed tabs, organically generating an updated Markdown export without manual editing.

## 4. Edge Cases & Constraints
- **Unnamed Tab Groups:** Though uncommon, the fallback naming convention is `Unnamed_Group_[YYYY-MM-DD]`.
- **Special URLs:** Ensure Chrome Extensions API does not inadvertently block copying URLs for `chrome://` or `file://` tabs. They should be handled as plain text exactly the same.
- **Empty Tab Groups:** The extension should gracefully handle and warn the user if an empty group is somehow selected.

## 5. Security & Permissions
- Requires `tabGroups` permission to read groups across windows.
- Requires `tabs` permission to read URLs and Titles.
- Requires `downloads` permission to save the `.md` file natively.
