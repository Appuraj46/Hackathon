// FocusGuard YouTube Content Blocker with Keyword-Aware Shorts Blocking
class FocusGuardYouTube {
  constructor() {
    this.blockedCount = 0;
    this.currentKeywords = [];
    this.setupObserver();
    this.injectStyles();
    this.handleShorts();
    this.loadSettings();
  }

  async loadSettings() {
    const { blockedKeywords } = await chrome.storage.sync.get(['blockedKeywords']);
    this.currentKeywords = blockedKeywords || ['shorts', '#shorts'];
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .fg-blocked-container {
        position: relative;
        margin: 8px 0;
        border-radius: 12px;
        overflow: hidden;
      }
      .fg-blocked-overlay {
        background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
        padding: 16px;
        text-align: center;
        border: 1px solid #ef9a9a;
      }
      .fg-blocked-title {
        color: #c62828;
        font-weight: 500;
        margin-bottom: 8px;
      }
      .fg-unblock-btn {
        background: #4285f4;
        color: white;
        border: none;
        padding: 6px 12px;
        border-radius: 4px;
        cursor: pointer;
        font-size: 13px;
      }
      .shorts-blocked-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        background: #ffebee;
        color: #c62828;
        padding: 20px;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  async blockContent() {
    const { isActive } = await chrome.storage.sync.get(['isActive']);
    if (!isActive) return;

    // Block regular videos
    document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer').forEach(video => {
      if (video.classList.contains('fg-processed')) return;
      
      const title = video.querySelector('#video-title')?.textContent.toLowerCase();
      if (title && this.currentKeywords.some(kw => title.includes(kw.toLowerCase()))) {
        video.classList.add('fg-processed');
        this.createBlockOverlay(video);
        this.blockedCount++;
      }
    });

    // Update stats
    chrome.runtime.sendMessage({
      type: 'UPDATE_STATS',
      data: { videosBlocked: this.blockedCount }
    });
  }

  async handleShorts() {
    const checkShorts = async () => {
      const shortsPlayer = document.getElementById('shorts-player');
      if (!shortsPlayer || shortsPlayer.classList.contains('fg-processed')) return;

      // Get Shorts title (different from regular videos)
      const titleElement = document.querySelector('.title.style-scope.ytd-reel-player-header-renderer');
      const title = titleElement?.textContent.toLowerCase() || '';

      // Only block if matches keywords
      if (this.currentKeywords.some(kw => title.includes(kw.toLowerCase()))) {
        shortsPlayer.classList.add('fg-processed');
        shortsPlayer.innerHTML = `
          <div class="shorts-blocked-message">
            <h3>🚫 Shorts Blocked</h3>
            <p>This short contains blocked keywords: "${title.substring(0, 20)}..."</p>
            <button style="
              background: #4285f4;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              margin-top: 12px;
              cursor: pointer;
            " onclick="this.parentNode.parentNode.classList.remove('fg-processed'); location.reload()">
              Show Anyway
            </button>
          </div>
        `;
        this.blockedCount++;
      }
    };

    // Check for Shorts periodically and on navigation
    setInterval(checkShorts, 1000);
    document.addEventListener('yt-navigate-finish', checkShorts);
  }

  createBlockOverlay(video) {
    const container = document.createElement('div');
    container.className = 'fg-blocked-container';
    
    const overlay = document.createElement('div');
    overlay.className = 'fg-blocked-overlay';
    overlay.innerHTML = `
      <div class="fg-blocked-title">🚫 Blocked by FocusGuard</div>
      <p>This content matches your blocked keywords</p>
      <button class="fg-unblock-btn">Show Anyway</button>
    `;
    
    container.appendChild(overlay);
    video.parentNode.insertBefore(container, video);
    video.style.display = 'none';
    
    overlay.querySelector('.fg-unblock-btn').addEventListener('click', () => {
      container.remove();
      video.style.display = '';
    });
  }

  setupObserver() {
    const observer = new MutationObserver(() => this.blockContent());
    observer.observe(document.body, { childList: true, subtree: true });
    this.blockContent(); // Initial run
  }
}

// Initialize
new FocusGuardYouTube();

// Listen for settings changes
chrome.runtime.onMessage.addListener((request) => {
  if (request.type === 'SETTINGS_UPDATED') {
    window.location.reload(); // Refresh to apply new keyword filters
  }
});