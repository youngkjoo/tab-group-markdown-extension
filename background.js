// Background service worker
// Required to provide a persistent context for Puppeteer to evaluate extension-privileged APIs (like chrome.tabs.group) during UI integration testing.
console.log('Service worker initialized for Tab Group extension.');
