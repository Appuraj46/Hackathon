// AI Distance Monitor with Enhanced Face Detection
class FocusGuardDistance {
  constructor() {
    this.warningActive = false;
    this.lastWarningTime = 0;
    this.setupCamera();
    this.injectStyles();
  }

  injectStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .fg-distance-warning {
        position: fixed;
        top: 20px;
        left: 50%;
        transform: translateX(-50%);
        background: #fff3e0;
        color: #e65100;
        padding: 12px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 99999;
        font-weight: 600;
        display: flex;
        align-items: center;
        border: 1px solid #ffb74d;
        animation: fg-pulse 1.5s infinite;
      }
      @keyframes fg-pulse {
        0% { opacity: 1; }
        50% { opacity: 0.8; }
        100% { opacity: 1; }
      }
      .fg-camera-feed {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 120px;
        height: 90px;
        border-radius: 8px;
        border: 2px solid #4285f4;
        z-index: 99998;
        object-fit: cover;
        box-shadow: 0 2px 10px rgba(0,0,0,0.2);
      }
    `;
    document.head.appendChild(style);
  }

  async setupCamera() {
    try {
      // Load face detection model
      await faceapi.nets.tinyFaceDetector.loadFromUri(
        chrome.runtime.getURL('assets/models')
      );

      // Create UI elements
      this.createWarningElement();
      this.createCameraFeed();

      // Start detection loop
      this.detectDistance();
    } catch (error) {
      console.error('FocusGuard: Camera setup failed', error);
      this.setupMouseFallback();
    }
  }

  createWarningElement() {
    this.warningElement = document.createElement('div');
    this.warningElement.className = 'fg-distance-warning';
    this.warningElement.innerHTML = `
      <svg width="20" height="20" viewBox="0 0 24 24" style="margin-right: 8px;">
        <path fill="#e65100" d="M12 2L1 21h22L12 2zm0 3.5L19.5 19h-15L12 5.5z"/>
        <circle cx="12" cy="16.5" r="1" fill="#e65100"/>
        <path fill="#e65100" d="M12 8v5"/>
      </svg>
      You're too close! Move back for better posture.
    `;
    this.warningElement.style.display = 'none';
    document.body.appendChild(this.warningElement);
  }

  createCameraFeed() {
    this.cameraFeed = document.createElement('video');
    this.cameraFeed.className = 'fg-camera-feed';
    this.cameraFeed.autoplay = true;
    this.cameraFeed.muted = true;
    this.cameraFeed.playsInline = true;
    document.body.appendChild(this.cameraFeed);

    // Start camera
    navigator.mediaDevices.getUserMedia({ video: true })
      .then(stream => {
        this.cameraFeed.srcObject = stream;
      })
      .catch(() => this.setupMouseFallback());
  }

  async detectDistance() {
    try {
      const { distanceThreshold, isActive } = await chrome.storage.sync.get([
        'distanceThreshold',
        'isActive'
      ]);
      
      if (!isActive) return;

      const detections = await faceapi.detectAllFaces(
        this.cameraFeed,
        new faceapi.TinyFaceDetectorOptions({
          inputSize: 320,
          scoreThreshold: 0.5
        })
      );

      const now = Date.now();
      const cooldownPeriod = 10000; // 10 seconds

      if (detections.length > 0) {
        const face = detections[0];
        if (face.box.width > distanceThreshold && now - this.lastWarningTime > cooldownPeriod) {
          this.showWarning();
          this.lastWarningTime = now;
          chrome.runtime.sendMessage({
            type: 'UPDATE_STATS',
            data: { warningsTriggered: 1 }
          });
        }
      } else if (this.warningActive && now - this.lastWarningTime > 5000) {
        this.hideWarning();
      }

      requestAnimationFrame(() => this.detectDistance());
    } catch (error) {
      console.error('FocusGuard: Detection error', error);
      this.setupMouseFallback();
    }
  }

  setupMouseFallback() {
    console.log('FocusGuard: Using mouse position fallback');
    document.addEventListener('mousemove', (e) => {
      if (e.clientY < 50) {
        this.showWarning();
        setTimeout(() => this.hideWarning(), 2000);
      }
    });
  }

  showWarning() {
    if (!this.warningActive) {
      this.warningActive = true;
      this.warningElement.style.display = 'flex';
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    }
  }

  hideWarning() {
    if (this.warningActive) {
      this.warningActive = false;
      this.warningElement.style.display = 'none';
    }
  }
}

// Initialize
new FocusGuardDistance();