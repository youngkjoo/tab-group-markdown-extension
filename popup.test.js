const fs = require('fs');
const path = require('path');

// Pull exactly what our UI looks like and processes
const htmlContent = fs.readFileSync(path.resolve(__dirname, './popup.html'), 'utf8');
const jsCode = fs.readFileSync(path.resolve(__dirname, './popup.js'), 'utf8');

describe('Chrome Extension Popup Logic', () => {
  beforeAll(() => {
    eval(jsCode);
  });

  beforeEach(() => {
    // Setup complete clean JSDOM document
    document.documentElement.innerHTML = htmlContent.toString();
    
    // Mock the global Chrome Extension API Object
    global.chrome = {
      tabGroups: {
        TAB_GROUP_ID_NONE: -1,
        query: jest.fn() // Used to fetch groups
      },
      tabs: {
        query: jest.fn() // Used to fetch active tabs and tabs within a group
      },
      downloads: {
        download: jest.fn() // Used to download the file blob
      }
    };

    // Mock global Clipboard API
    Object.assign(navigator, {
      clipboard: {
        writeText: jest.fn().mockResolvedValue()
      }
    });

    // Mock URL object creation API for downloading Blocs
    global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');
  });

  afterEach(() => {
    jest.resetAllMocks();
  });

  // Test 1: DOM Initialization and Dropdown Populating
  it('correctly populates the dropdown with named tab groups and auto-generates names for unnamed groups', async () => {
    // Return two groups from API (one real, one unnamed)
    chrome.tabGroups.query.mockResolvedValue([
      { id: 1, title: 'Development Workspace' },
      { id: 2, title: '' } // Simulating unnamed group
    ]);
    
    // Return empty for current active tab check
    chrome.tabs.query.mockResolvedValue([]);

    // Simulate DOMContentLoaded event firing
    document.dispatchEvent(new Event('DOMContentLoaded'));
    
    // Flush microtasks (await promises)
    await new Promise(r => setTimeout(r, 0));

    const select = document.getElementById('groupSelect');
    
    // Assets
    expect(select.options.length).toBe(2);
    expect(select.options[0].text).toBe('Development Workspace');
    expect(select.options[1].text).toMatch(/Unnamed_Group_\d{4}-\d{2}-\d{2}/);
  });

  // Test 2: Pre-selecting active tabs
  it('automatically selects the tab group containing the currently active tab', async () => {
    chrome.tabGroups.query.mockResolvedValue([
      { id: 10, title: 'Group A' },
      { id: 20, title: 'Group B' }
    ]);
    
    // Current active tab is inside Group 20!
    chrome.tabs.query.mockResolvedValue([{ groupId: 20 }]);

    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r => setTimeout(r, 0));

    const select = document.getElementById('groupSelect');
    expect(select.value).toBe('20');
  });

  // Test 3: Markdown Generation and Clipboard logic
  it('generates the correct markdown and writes strictly to the clipboard when export is clicked', async () => {
    // Base state
    chrome.tabGroups.query.mockResolvedValue([{ id: 101, title: 'My Links' }]);
    
    chrome.tabs.query.mockImplementation(async (queryObj) => {
      // Simulate fetching tabs for export
      if (queryObj.groupId === 101) {
        return [
          { title: 'Google', url: 'https://google.com' },
          { title: 'GitHub', url: 'https://github.com' }
        ];
      }
      return [];
    });

    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r => setTimeout(r, 0));

    // UI Interaction
    document.getElementById('groupSelect').value = '101';
    document.getElementById('radioCopy').checked = true; // Set export method to Clipboard
    
    const exportBtn = document.getElementById('exportBtn');
    exportBtn.click();
    
    await new Promise(r => setTimeout(r, 0));

    // Verify Clipboard was called exactly once
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    
    // Assert the Markdown string format
    const markdownOutput = navigator.clipboard.writeText.mock.calls[0][0];
    
    expect(markdownOutput).toContain('# My Links');
    expect(markdownOutput).toContain('- [Google](https://google.com)');
    expect(markdownOutput).toContain('- [GitHub](https://github.com)');
    
    // Ensure success UI text
    expect(document.getElementById('statusBox').textContent).toBe('Copied to Clipboard!');
    
    // Ensure download API was NOT called
    expect(chrome.downloads.download).not.toHaveBeenCalled();
  });

  // Test 4: Download logic
  it('triggers a file download when the download radio is manually selected', async () => {
    chrome.tabGroups.query.mockResolvedValue([{ id: 99, title: 'Test Group' }]);
    chrome.tabs.query.mockImplementation(async (queryObj) => {
      if (queryObj.groupId === 99) return [{ title: 'Example', url: 'https://example.com' }];
      return [];
    });

    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r => setTimeout(r, 0));

    document.getElementById('groupSelect').value = '99';
    document.getElementById('radioCopy').checked = false;
    document.getElementById('radioDownload').checked = true; // Set to download only
    
    document.getElementById('exportBtn').click();
    await new Promise(r => setTimeout(r, 0));

    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(chrome.downloads.download).toHaveBeenCalledTimes(1);
    
    const downloadArgs = chrome.downloads.download.mock.calls[0][0];
    expect(downloadArgs.filename).toBe('test_group_links.md');
    expect(downloadArgs.url).toBe('blob:mock-url');
  });

  // Test 5: No Tab Groups are open
  it('handles case where no tab groups are open', async () => {
    chrome.tabGroups.query.mockResolvedValue([]);
    chrome.tabs.query.mockResolvedValue([]);

    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r => setTimeout(r, 0));

    const select = document.getElementById('groupSelect');
    const exportBtn = document.getElementById('exportBtn');
    
    expect(select.options.length).toBe(1);
    expect(select.options[0].text).toBe('No open Tab Groups found');
    expect(exportBtn.disabled).toBe(true);
  });

  // Test 6: Error fetching groups
  it('displays error when fetching groups fails', async () => {
    chrome.tabGroups.query.mockRejectedValue(new Error('Extension API failed'));
    
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r => setTimeout(r, 0));

    expect(document.getElementById('statusBox').textContent).toBe('Error fetching groups: Extension API failed');
  });

  // Test 7: Exporting an empty group
  it('displays "Group is empty." when exporting an empty group', async () => {
    chrome.tabGroups.query.mockResolvedValue([{ id: 77, title: 'Empty Group' }]);
    chrome.tabs.query.mockImplementation(async (queryObj) => {
      if (queryObj.groupId === 77) return []; // Empty tabs
      return [];
    });

    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r => setTimeout(r, 0));

    document.getElementById('groupSelect').value = '77';
    document.getElementById('exportBtn').click();
    await new Promise(r => setTimeout(r, 0));

    expect(document.getElementById('statusBox').textContent).toBe('Group is empty.');
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
    expect(chrome.downloads.download).not.toHaveBeenCalled();
  });

  // Test 8: Exporting with Both selected
  it('performs both clipboard copy and download when "Both" is selected', async () => {
    chrome.tabGroups.query.mockResolvedValue([{ id: 55, title: 'Both Group' }]);
    chrome.tabs.query.mockImplementation(async (queryObj) => {
      if (queryObj.groupId === 55) return [{ title: 'Tab', url: 'https://tab.com' }];
      return [];
    });

    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r => setTimeout(r, 0));

    document.getElementById('groupSelect').value = '55';
    document.getElementById('radioCopy').checked = false;
    document.getElementById('radioDownload').checked = false;
    document.getElementById('radioBoth').checked = true;
    
    document.getElementById('exportBtn').click();
    await new Promise(r => setTimeout(r, 0));

    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    expect(chrome.downloads.download).toHaveBeenCalledTimes(1);
    expect(document.getElementById('statusBox').textContent).toBe('Copied & Downloaded!');
  });

  // Test 9: Errors during export
  it('handles errors gracefully during the export process', async () => {
    chrome.tabGroups.query.mockResolvedValue([{ id: 44, title: 'Error Group' }]);
    chrome.tabs.query.mockImplementation(async (queryObj) => {
      if (queryObj.groupId === 44) return [{ title: 'Tab', url: 'https://tab.com' }];
      return [];
    });

    // Make download fail
    chrome.downloads.download.mockRejectedValue(new Error('Download blocked'));

    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r => setTimeout(r, 0));

    document.getElementById('groupSelect').value = '44';
    document.getElementById('radioDownload').checked = true;
    
    document.getElementById('exportBtn').click();
    await new Promise(r => setTimeout(r, 0));

    expect(document.getElementById('statusBox').textContent).toBe('Error: Download blocked');
  });

  // Test 10: Diffing Engine Upload Test
  it('diffs an uploaded markdown file against live tabs and dynamically drives the Sync export flow', async () => {
    const mockFileContent = `# Old Group Backup\n- [Google](https://google.com)\n- [Removed Tab](https://removed.com)\n`;
    const file = new File([mockFileContent], 'old.md', { type: 'text/markdown' });

    // Stage Live Tabs differently than backup
    chrome.tabGroups.query.mockResolvedValue([{ id: 11, title: 'Live Group' }]);
    chrome.tabs.query.mockImplementation(async (queryObj) => {
      if (queryObj.groupId === 11) return [
        { title: 'Google', url: 'https://google.com' }, // Unchanged
        { title: 'New Tab', url: 'https://new.com' }    // Added completely new
      ];
      return [];
    });

    document.dispatchEvent(new Event('DOMContentLoaded'));
    await new Promise(r => setTimeout(r, 0));

    document.getElementById('groupSelect').value = '11';

    const fileInput = document.getElementById('mdUpload');
    
    // Force JSDOM File selection hack
    Object.defineProperty(fileInput, 'files', { value: [file] });
    fileInput.dispatchEvent(new Event('change'));

    // FileReader is inherently asynchronous in JS, await processing microtask
    await new Promise(r => setTimeout(r, 50));

    const diffResults = document.getElementById('diffResults');
    
    const addedElement = diffResults.querySelector('.diff-added');
    const removedElement = diffResults.querySelector('.diff-removed');
    
    expect(addedElement).not.toBeNull();
    expect(addedElement.textContent).toBe('New: New Tab');
    
    expect(removedElement).not.toBeNull();
    expect(removedElement.textContent).toBe('Deleted: Removed Tab');

    const syncBtn = document.getElementById('syncBtn');
    expect(syncBtn.style.display).toBe('block');
    
    // Test that the Sync Button perfectly shortcuts to exporting the accurate live environment
    syncBtn.click();
    await new Promise(r => setTimeout(r, 0));
    
    expect(navigator.clipboard.writeText).toHaveBeenCalledTimes(1);
    const clipboardData = navigator.clipboard.writeText.mock.calls[0][0];
    
    expect(clipboardData).toContain('[New Tab](https://new.com)');
    expect(clipboardData).toContain('[Google](https://google.com)');
    expect(clipboardData).not.toContain('Removed Tab'); // Confirm deletion is obeyed!
  });

});
