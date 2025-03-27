// Background service worker with enhanced stats tracking
let stats = {
  videosBlocked: 0,
  warningsTriggered: 0,
  lastWarningTime: null
};

// Initialize storage
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    blockedKeywords: ['shorts', '#shorts', 'viral', 'trending'],
    distanceThreshold: 180,
    isActive: true,
    stats: stats
  });
});

// Update stats in real-time
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'UPDATE_STATS') {
    chrome.storage.sync.get(['stats'], (data) => {
      const updatedStats = {
        ...data.stats,
        ...request.data
      };
      chrome.storage.sync.set({ stats: updatedStats });
    });
  }
});

// Daily stats reset
chrome.alarms.create('resetStats', { periodInMinutes: 1440 });
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'resetStats') {
    chrome.storage.sync.set({ stats });
  }
});