// YouTube Content Blocker with Shorts support
class FocusGuardYouTube {
  constructor() {
    this.blockedCount = 0;
    this.setupObserver();
    this.injectStyles();
    this.handleShorts();
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
    `;
    document.head.appendChild(style);
  }

  async blockContent() {
    const { blockedKeywords, isActive } = await chrome.storage.sync.get(['blockedKeywords', 'isActive']);
    if (!isActive) return;

    // Block regular videos
    document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer').forEach(video => {
      if (video.classList.contains('fg-processed')) return;
      
      const title = video.querySelector('#video-title')?.textContent.toLowerCase();
      if (title && blockedKeywords.some(kw => title.includes(kw.toLowerCase()))) {
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

  handleShorts() {
    const shortsObserver = new MutationObserver(() => {
      const shortsPlayer = document.getElementById('shorts-player');
      if (shortsPlayer && !shortsPlayer.classList.contains('fg-processed')) {
        shortsPlayer.innerHTML = `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            height: 100%;
            background: #ffebee;
            color: #c62828;
            padding: 20px;
            text-align: center;
          ">
            <h3>🚫 Shorts Blocked</h3>
            <p>FocusGuard has disabled this short video</p>
            <button style="
              background: #4285f4;
              color: white;
              border: none;
              padding: 8px 16px;
              border-radius: 4px;
              margin-top: 12px;
              cursor: pointer;
            " onclick="window.location.href='https://youtube.com'">
              Back to Regular Videos
            </button>
          </div>
        `;
        shortsPlayer.classList.add('fg-processed');
        this.blockedCount++;
      }
    });

    shortsObserver.observe(document.body, { childList: true, subtree: true });
  }

  setupObserver() {
    const observer = new MutationObserver(() => this.blockContent());
    observer.observe(document.body, { childList: true, subtree: true });
    this.blockContent(); // Initial run
  }
}

// Initialize
new FocusGuardYouTube();