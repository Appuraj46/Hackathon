document.addEventListener('DOMContentLoaded', async () => {
  // Load saved settings
  const { 
    blockedKeywords, 
    distanceThreshold, 
    isActive,
    stats 
  } = await chrome.storage.sync.get([
    'blockedKeywords',
    'distanceThreshold',
    'isActive',
    'stats'
  ]);

  // Initialize UI
  document.getElementById('blockedKeywords').value = blockedKeywords?.join(', ') || '';
  document.getElementById('distanceThreshold').value = distanceThreshold || 150;
  document.getElementById('thresholdValue').textContent = distanceThreshold || 150;
  document.getElementById('toggleExtension').checked = isActive !== false;
  
  // Update stats
  document.getElementById('blockedCount').textContent = stats?.videosBlocked || 0;
  document.getElementById('distanceWarnings').textContent = stats?.warningsTriggered || 0;

  // Threshold slider
  document.getElementById('distanceThreshold').addEventListener('input', (e) => {
    document.getElementById('thresholdValue').textContent = e.target.value;
  });

  // Save settings
  document.getElementById('saveSettings').addEventListener('click', async () => {
    const blockedKeywords = document.getElementById('blockedKeywords').value
      .split(',')
      .map(k => k.trim())
      .filter(k => k.length > 0);
    
    const distanceThreshold = parseInt(document.getElementById('distanceThreshold').value);
    const isActive = document.getElementById('toggleExtension').checked;
    
    await chrome.storage.sync.set({
      blockedKeywords,
      distanceThreshold,
      isActive
    });

    // Send update to content scripts
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (tab?.id) {
      chrome.tabs.sendMessage(tab.id, { 
        type: 'SETTINGS_UPDATED',
        blockedKeywords,
        distanceThreshold,
        isActive
      });
    }

    // Show confirmation
    const saveBtn = document.getElementById('saveSettings');
    saveBtn.textContent = '✓ Saved!';
    setTimeout(() => {
      saveBtn.textContent = 'Save Settings';
    }, 2000);
  });
});