class YouTubeBlocker {
  constructor() {
    this.statsBuffer = { videosBlocked: 0 };
    this.currentKeywords = [];
    this.observer = null;
    this.init();
  }

  async init() {
    try {
      await this.injectStyles();
      await this.loadSettings();
      this.setupObservers();
      this.startStatsFlusher();
      console.log('YouTube Blocker initialized');
    } catch (error) {
      console.error('Initialization failed:', error);
    }
  }

  async injectStyles() {
    if (document.head.querySelector('#fg-blocker-styles')) return;

    const style = document.createElement('style');
    style.id = 'fg-blocker-styles';
    style.textContent = `
      .fg-blocked-container {
        position: relative;
        margin: 8px 0;
        border-radius: 8px;
        overflow: hidden;
      }
      .fg-blocked-overlay {
        background: #ffebee;
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
      }
      .shorts-blocked-message {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        padding: 20px;
        background: #ffebee;
        color: #c62828;
        text-align: center;
      }
    `;
    document.head.appendChild(style);
  }

  async loadSettings() {
    try {
      const response = await chrome.runtime.sendMessage({ type: 'GET_SETTINGS' });
      this.currentKeywords = response?.blockedKeywords || ['shorts', '#shorts'];
      this.isActive = response?.isActive !== false;
    } catch (error) {
      console.error('Failed to load settings:', error);
      this.currentKeywords = ['shorts', '#shorts'];
      this.isActive = true;
    }
  }

  setupObservers() {
    // Main observer for regular videos
    this.observer = new MutationObserver(() => {
      if (this.isActive) {
        if (location.pathname.includes('/shorts/')) {
          this.checkShorts();
        } else {
          this.checkVideos();
        }
      }
    });

    this.observer.observe(document.body, {
      childList: true,
      subtree: true
    });

    // Additional check for initial load
    setTimeout(() => {
      if (location.pathname.includes('/shorts/')) {
        this.checkShorts();
      } else {
        this.checkVideos();
      }
    }, 1000);

    // Handle SPA navigation
    window.addEventListener('yt-navigate-finish', () => {
      if (this.isActive) {
        if (location.pathname.includes('/shorts/')) {
          this.checkShorts();
        } else {
          this.checkVideos();
        }
      }
    });
  }

  checkVideos() {
    try {
      document.querySelectorAll('ytd-rich-item-renderer, ytd-video-renderer').forEach(video => {
        if (video.dataset.fgProcessed) return;
        
        const title = this.getVideoTitle(video);
        if (title && this.shouldBlock(title)) {
          this.blockVideo(video, title);
        }
      });
    } catch (error) {
      console.error('Video check error:', error);
    }
  }

  checkShorts() {
    try {
      const shortsPlayer = document.getElementById('shorts-player');
      if (!shortsPlayer || shortsPlayer.dataset.fgProcessed) return;
      
      const title = this.getShortsTitle();
      if (title && this.shouldBlock(title)) {
        this.blockShorts(shortsPlayer, title);
      }
    } catch (error) {
      console.error('Shorts check error:', error);
    }
  }

  getVideoTitle(element) {
    try {
      return (
        element.querySelector('#video-title')?.textContent?.toLowerCase() ||
        element.querySelector('#video-title-link')?.textContent?.toLowerCase() ||
        ''
      );
    } catch {
      return '';
    }
  }

  getShortsTitle() {
    try {
      return (
        document.querySelector('.title.style-scope.ytd-reel-player-header-renderer')?.textContent?.toLowerCase() ||
        document.querySelector('h1.title')?.textContent?.toLowerCase() ||
        ''
      );
    } catch {
      return '';
    }
  }

  shouldBlock(title) {
    return this.currentKeywords.some(keyword => 
      keyword && title.includes(keyword.toLowerCase())
    );
  }

  blockVideo(video, title) {
    try {
      video.dataset.fgProcessed = true;
      
      const container = document.createElement('div');
      container.className = 'fg-blocked-container';
      container.innerHTML = `
        <div class="fg-blocked-overlay">
          <div class="fg-blocked-title">🚫 Blocked by FocusGuard</div>
          <p>${this.truncateText(title, 50)}</p>
          <button class="fg-unblock-btn">Show Anyway</button>
        </div>
      `;
      
      video.parentNode.insertBefore(container, video);
      video.style.display = 'none';
      
      container.querySelector('.fg-unblock-btn').addEventListener('click', () => {
        container.remove();
        video.style.display = '';
        video.dataset.fgProcessed = false;
      });
      
      this.statsBuffer.videosBlocked++;
    } catch (error) {
      console.error('Failed to block video:', error);
    }
  }

  blockShorts(player, title) {
    try {
      player.dataset.fgProcessed = true;
      player.innerHTML = `
        <div class="shorts-blocked-message">
          <h3>🚫 Blocked by FocusGuard</h3>
          <p>${this.truncateText(title, 40)}</p>
          <button onclick="location.reload()" style="
            background: #4285f4;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            margin-top: 12px;
            cursor: pointer;
          ">
            Back to Videos
          </button>
        </div>
      `;
      
      this.statsBuffer.videosBlocked++;
    } catch (error) {
      console.error('Failed to block Shorts:', error);
    }
  }

  truncateText(text, maxLength) {
    return text.length > maxLength 
      ? `${text.substring(0, maxLength)}...` 
      : text;
  }

  startStatsFlusher() {
    setInterval(() => this.flushStats(), 30000);
  }

  async flushStats() {
    if (this.statsBuffer.videosBlocked > 0) {
      try {
        await chrome.runtime.sendMessage({
          type: 'INCREMENT_STATS',
          data: { videosBlocked: this.statsBuffer.videosBlocked }
        });
        this.statsBuffer.videosBlocked = 0;
      } catch (error) {
        console.error('Failed to update stats:', error);
      }
    }
  }

  cleanup() {
    if (this.observer) {
      this.observer.disconnect();
    }
    window.removeEventListener('yt-navigate-finish', this.checkShorts);
  }
}

// Initialize with protection
if (!window.focusGuardYouTubeBlocker) {
  window.focusGuardYouTubeBlocker = new YouTubeBlocker();
  
  // Cleanup on page unload
  window.addEventListener('beforeunload', () => {
    window.focusGuardYouTubeBlocker?.cleanup();
  });
}