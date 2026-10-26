/* ============================================
   WanderMatch — Frame Sequence Engine
   Scroll-driven image frame animation using Canvas
   ============================================ */

class FrameSequence {
  constructor(options = {}) {
    this.canvas = options.canvas;
    this.framePath = options.framePath;
    this.frameCount = options.frameCount;
    this.extension = options.extension || 'jpg';
    this.digits = options.digits || 3;
    this.preloadBatch = options.preloadBatch || 30;
    this.onLoadProgress = options.onLoadProgress || null;

    this.ctx = this.canvas.getContext('2d');
    this.frames = new Map(); // Cache of loaded images
    this.loadingQueue = [];
    this.isLoading = false;
    this.currentFrame = -1;
    this.fallbackImage = null;
    this.posterImage = null;
    this.cssWidth = 0;
    this.cssHeight = 0;
    this.destroyed = false;

    this.resize();
  }

  /**
   * Generate frame filename from index
   */
  getFrameName(index) {
    const num = (index + 1).toString().padStart(this.digits, '0');
    return `${this.framePath}${num}.${this.extension}`;
  }

  /**
   * Load a single frame image
   */
  loadFrame(index) {
    return new Promise((resolve, reject) => {
      if (this.frames.has(index)) {
        resolve(this.frames.get(index));
        return;
      }

      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        this.frames.set(index, img);
        resolve(img);
      };
      img.onerror = () => {
        reject(new Error(`Failed to load frame ${index}`));
      };
      img.src = this.getFrameName(index);
    });
  }

  /**
   * Preload a batch of frames starting from an index
   */
  async preloadFrames(startIndex = 0, count = null) {
    const end = Math.min(
      this.frameCount,
      startIndex + (count || this.preloadBatch)
    );

    const promises = [];
    for (let i = startIndex; i < end; i++) {
      if (!this.frames.has(i)) {
        promises.push(this.loadFrame(i).catch(() => null));
      }
    }

    await Promise.all(promises);
    if (this.onLoadProgress) {
      this.onLoadProgress(this.frames.size, this.frameCount);
    }
    return this.frames.size;
  }

  /**
   * Load poster / fallback image (first frame)
   */
  async loadPoster() {
    try {
      this.posterImage = await this.loadFrame(0);
      this.fallbackImage = this.posterImage;
      return this.posterImage;
    } catch (e) {
      console.warn('Could not load poster frame:', e);
      return null;
    }
  }

  /**
   * Progressive preload — keeps loading frames in background
   */
  startProgressiveLoad() {
    let index = 0;
    const loadNext = async () => {
      if (this.destroyed || index >= this.frameCount) return;
      await this.preloadFrames(index, this.preloadBatch);
      index += this.preloadBatch;
      if (index < this.frameCount) {
        setTimeout(loadNext, 100);
      }
    };
    loadNext();
  }

  /**
   * Draw a specific frame to the canvas
   */
  drawFrame(index) {
    if (index === this.currentFrame) return;
    index = Math.max(0, Math.min(this.frameCount - 1, Math.floor(index)));
    this.currentFrame = index;

    const img = this.frames.get(index) || this.fallbackImage;
    if (!img) return;

    const canvas = this.canvas;
    const ctx = this.ctx;
    const cw = this.cssWidth;
    const ch = this.cssHeight;
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;

    if (!iw || !ih || !cw || !ch) return;

    // Object-fit: cover logic using CSS pixel dimensions
    const canvasRatio = cw / ch;
    const imageRatio = iw / ih;

    let drawW, drawH, dx, dy;
    if (imageRatio > canvasRatio) {
      drawH = ch;
      drawW = ch * imageRatio;
      dx = (cw - drawW) / 2;
      dy = 0;
    } else {
      drawW = cw;
      drawH = cw / imageRatio;
      dx = 0;
      dy = (ch - drawH) / 2;
    }

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(img, dx, dy, drawW, drawH);
  }

  /**
   * Set progress (0 to 1) and draw corresponding frame
   */
  setProgress(progress) {
    const frameIndex = Math.min(
      this.frameCount - 1,
      Math.floor(progress * (this.frameCount - 1))
    );

    // Preload frames near current position
    this.preloadFrames(frameIndex, 10).catch(() => {});

    this.drawFrame(frameIndex);
  }

  /**
   * Handle canvas resizing with device pixel ratio
   */
  resize() {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.cssWidth = rect.width;
    this.cssHeight = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.scale(dpr, dpr);
    // Redraw current frame if available
    if (this.currentFrame >= 0) {
      this.drawFrame(this.currentFrame);
    } else if (this.posterImage) {
      this.drawFrame(0);
    }
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.destroyed = true;
    this.frames.clear();
    this.posterImage = null;
    this.fallbackImage = null;
  }
}

/* ============================================
   Shared utilities
   ============================================ */

function createGradientTexture(colors = ['#5B7B6A', '#1A1A1A'], direction = 'vertical') {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const gradient = direction === 'vertical'
    ? ctx.createLinearGradient(0, 0, 0, 512)
    : ctx.createLinearGradient(0, 0, 512, 0);
  colors.forEach((c, i) => gradient.addColorStop(i / (colors.length - 1), c));
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 512, 512);
  return canvas;
}
