/**
 * @jest-environment node
 */
const puppeteer = require('puppeteer');
const path = require('path');

const EXTENSION_PATH = path.resolve(__dirname);
let browser;
let extensionId;
let worker;

jest.setTimeout(30000); // UI Integration tests can be slow due to browser automation

beforeAll(async () => {
  // Launch Chrome loading the extension naturally
  browser = await puppeteer.launch({
    headless: false, // Chrome extensions are not supported natively in old headless mode
    args: [
      `--disable-extensions-except=${EXTENSION_PATH}`,
      `--load-extension=${EXTENSION_PATH}`
    ]
  });

  // Wait for the background service worker to boot. 
  // We use this context to perform Chrome API operations (like grouped tab generation)
  const workerTarget = await browser.waitForTarget(
    target => target.type() === 'service_worker'
  );
  
  worker = await workerTarget.worker();
  
  // Extract Extension ID automatically from the worker URL
  const url = new URL(worker.url());
  extensionId = url.hostname;
});

afterAll(async () => {
  if (browser) await browser.close();
});

// Helper: Run an isolated command within the extension's privileged background context
async function bgEval(fn, ...args) {
  return await worker.evaluate(fn, ...args);
}

// Clean up any stray tabs or groups before each test to guarantee an isolated environment
beforeEach(async () => {
  await bgEval(async () => {
     // Close all groups
     const groups = await chrome.tabGroups.query({});
     for (const g of groups) {
       // Ungrouping or removing removes the group visual
       const tabsInGroup = await chrome.tabs.query({groupId: g.id});
       if (tabsInGroup.length > 0) {
          await chrome.tabs.remove(tabsInGroup.map(t => t.id));
       }
     }
     // Ensure we always have at least one blank tab open to keep the Chrome window alive
     const currentTabs = await chrome.tabs.query({});
     if (currentTabs.length > 1) {
       await chrome.tabs.remove(currentTabs.slice(1).map(t => t.id));
     }
  });
});

describe('Tab Group Extension UI Integration Tests', () => {
  
  it('Empty State: Displays lack of groups and disables export', async () => {
    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    // Extract options from the <select> element
    const selectOptions = await page.$$eval('#groupSelect option', opts => opts.map(o => o.textContent));
    expect(selectOptions).toContain('No open Tab Groups found');

    // Button should be disabled strictly
    const exportDisabled = await page.$eval('#exportBtn', btn => btn.disabled);
    expect(exportDisabled).toBe(true);
    
    await page.close();
  });

  it('Named Tab Group: Populates dropdown with the group title', async () => {
    // Stage Data: Organically create a tab group via Chromium
    await bgEval(async () => {
      const tab = await chrome.tabs.create({url: 'https://example.com'});
      const groupId = await chrome.tabs.group({tabIds: tab.id});
      await chrome.tabGroups.update(groupId, {title: 'Data Analysis Flow'});
    });

    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    const selectOptions = await page.$$eval('#groupSelect option', opts => opts.map(o => o.textContent));
    expect(selectOptions).toContain('Data Analysis Flow');
    
    await page.close();
  });

  it('Unnamed Group: Generates an automated fallback name', async () => {
    await bgEval(async () => {
      const tab = await chrome.tabs.create({url: 'https://example.com'});
      await chrome.tabs.group({tabIds: tab.id}); // create explicitly without naming
    });

    const page = await browser.newPage();
    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    const selectOptions = await page.$$eval('#groupSelect option', opts => opts.map(o => o.textContent));
    
    // Assert the dynamically generated Date format name is displayed
    const fallbackRegex = /Unnamed_Group_\d{4}-\d{2}-\d{2}/;
    const hasMatch = selectOptions.some(opt => fallbackRegex.test(opt));
    expect(hasMatch).toBe(true);

    await page.close();
  });

  it('Copy Flow: Updates UI visually upon clicking export', async () => {
    await bgEval(async () => {
      const tab = await chrome.tabs.create({url: 'https://example.com'});
      const groupId = await chrome.tabs.group({tabIds: tab.id});
      await chrome.tabGroups.update(groupId, {title: 'Copy Test'});
    });

    const page = await browser.newPage();
    
    // In Puppeteer, giving Clipboard Write permissions avoids annoying "Allow Clipboard" dialog prompts
    const context = browser.defaultBrowserContext();
    await context.overridePermissions(`chrome-extension://${extensionId}`, ['clipboard-read', 'clipboard-write']);

    await page.goto(`chrome-extension://${extensionId}/popup.html`);

    await page.click('#radioCopy');
    await page.click('#exportBtn');

    // Wait for the exact DOM node content update
    await page.waitForFunction(() => document.querySelector('#statusBox').textContent === 'Copied to Clipboard!');
    
    const statusText = await page.$eval('#statusBox', el => el.textContent);
    expect(statusText).toBe('Copied to Clipboard!');
    
    await page.close();
  });

});
