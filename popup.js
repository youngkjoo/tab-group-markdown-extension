document.addEventListener('DOMContentLoaded', async () => {
  const groupSelect = document.getElementById('groupSelect');
  const exportBtn = document.getElementById('exportBtn');
  const statusDiv = document.getElementById('statusBox');

  let groups = [];
  try {
    // 1. Fetch all groups across windows
    groups = await chrome.tabGroups.query({});
    
    // 2. Fetch current active tab to pre-select its group if it is part of one
    const activeTabs = await chrome.tabs.query({ active: true, currentWindow: true });
    let activeGroupId = (activeTabs && activeTabs.length > 0) ? activeTabs[0].groupId : chrome.tabGroups.TAB_GROUP_ID_NONE;
    
    if (groups.length === 0) {
      const option = document.createElement('option');
      option.text = "No open Tab Groups found";
      option.value = "";
      groupSelect.add(option);
      exportBtn.disabled = true;
      return;
    }

    groups.forEach(group => {
      const option = document.createElement('option');
      
      // Fallback logic for Unnamed Groups
      const fallbackName = `Unnamed_Group_${new Date().toISOString().split('T')[0]}`;
      const groupName = (group.title && group.title.trim().length > 0) ? group.title : fallbackName;
      
      option.text = groupName;
      option.value = group.id;
      option.dataset.name = groupName; 
      
      groupSelect.add(option);
      
      // Auto-select the active tab's group
      if (group.id === activeGroupId) {
        option.selected = true;
      }
    });

  } catch (err) {
    statusDiv.textContent = "Error fetching groups: " + err.message;
  }

  exportBtn.addEventListener('click', async () => {
    const selectedOption = groupSelect.options[groupSelect.selectedIndex];
    if (!selectedOption || !selectedOption.value) return;
    
    const groupId = parseInt(selectedOption.value);
    const groupName = selectedOption.dataset.name;

    try {
      // Fetch all tabs belonging to this specific group
      const tabs = await chrome.tabs.query({ groupId: groupId });
      if (tabs.length === 0) {
        statusDiv.textContent = "Group is empty.";
        return;
      }

      // Generate Markdown
      const now = new Date();
      let md = `# ${groupName}\n`;
      md += `*Exported on: ${now.toISOString().replace('T', ' ').slice(0, 19)}*\n\n`;
      
      tabs.forEach(t => {
        md += `- [${t.title}](${t.url})\n`;
      });

      // Export choices
      const copyChecked = document.getElementById('radioCopy').checked;
      const downloadChecked = document.getElementById('radioDownload').checked;
      const bothChecked = document.getElementById('radioBoth').checked;

      const doCopy = copyChecked || bothChecked;
      const doDownload = downloadChecked || bothChecked;

      if (doCopy) {
        await navigator.clipboard.writeText(md);
        statusDiv.textContent = "Copied to Clipboard!";
        statusDiv.style.color = "#10b981"; // elegant green
      }

      if (doDownload) {
        const safeName = groupName.replace(/[^a-z0-9]/gi, '_').toLowerCase();
        const blob = new Blob([md], { type: 'text/markdown' });
        const url = URL.createObjectURL(blob);
        
        await chrome.downloads.download({
          url: url,
          filename: `${safeName}_links.md`,
          saveAs: false
        });
        
        if (!doCopy) {
           statusDiv.textContent = "Started Download!";
           statusDiv.style.color = "#10b981";
        } else {
           statusDiv.textContent = "Copied & Downloaded!";
        }
      }

      // Reset the status message after 3 seconds
      setTimeout(() => {
        statusDiv.textContent = "";
      }, 3000);

    } catch(err) {
      statusDiv.textContent = "Error: " + err.message;
      statusDiv.style.color = "#ef4444";
    }
  });
});
