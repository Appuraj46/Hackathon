document.addEventListener('DOMContentLoaded', async () => {
  const elements = {
    toggleActive: document.getElementById('toggleActive'),
    blockedKeywords: document.getElementById('blockedKeywords'),
    distanceThreshold: document.getElementById('distanceThreshold'),
    thresholdValue: document.getElementById('thresholdValue'),
    blockedCount: document.getElementById('blockedCount'),
    warningsCount: document.getElementById('warningsCount'),
    saveBtn: document.getElementById('saveBtn')
  };

  // Load settings
  const settings = await getSettings();
  elements.toggleActive.checked = settings.isActive !== false;
  elements.blockedKeywords.value = settings.blockedKeywords?.join(', ') || '';
  elements.distanceThreshold.value = settings.distanceThreshold || 150;
  elements.thresholdValue.textContent = elements.distanceThreshold.value;

  // Load stats
  const stats = await getStats();
  elements.blockedCount.textContent = stats.videosBlocked || 0;
  elements.warningsCount.textContent = stats.warningsTriggered || 0;

  // Event listeners
  elements.distanceThreshold.addEventListener('input', () => {
    elements.thresholdValue.textContent = elements.distanceThreshold.value;
  });

  elements.saveBtn.addEventListener('click', saveSettings);

  // Functions
  async function getSettings() {
    return new Promise(resolve => {
      chrome.runtime.sendMessage(
        { type: 'GET_SETTINGS' },
        response => resolve(response || {})
      );
    });
  }

  async function getStats() {
    return new Promise(resolve => {
      chrome.runtime.sendMessage(
        { type: 'GET_STATS' },
        response => resolve(response || {})
      );
    });
  }

  async function saveSettings() {
    const settings = {
      isActive: elements.toggleActive.checked,
      blockedKeywords: elements.blockedKeywords.value
        .split(',')
        .map(k => k.trim())
        .filter(k => k.length > 0),
      distanceThreshold: parseInt(elements.distanceThreshold.value)
    };

    await new Promise(resolve => {
      chrome.runtime.sendMessage(
        { type: 'UPDATE_SETTINGS', settings },
        resolve
      );
    });

    elements.saveBtn.textContent = 'Saved!';
    setTimeout(() => {
      elements.saveBtn.textContent = 'Save Settings';
    }, 2000);
  }
});