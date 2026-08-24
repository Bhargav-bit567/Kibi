/* ============================================
   WanderMatch — GSAP ScrollTrigger Controller
   Connects scroll position to scene progress
   ============================================ */

class ScrollController {
  constructor(engine, options = {}) {
    this.engine = engine;
    this.scenes = [];
    this.currentSceneIndex = 0;
    this.options = options;
    this.lenis = null;

    this.initLenis = this.initLenis.bind(this);
    this.onScroll = this.onScroll.bind(this);
  }

  initLenis() {
    if (typeof Lenis === 'undefined') return false;
    this.lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      orientation: 'vertical',
      smoothWheel: true
    });

    function raf(time) {
      if (this.lenis) this.lenis.raf(time);
      requestAnimationFrame(raf.bind(this));
    }
    requestAnimationFrame(raf.bind(this));

    // Sync Lenis with ScrollTrigger
    this.lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => {
      if (this.lenis) this.lenis.raf(time * 1000);
    });
    gsap.ticker.lagSmoothing(0);

    return true;
  }

  registerScene(scene, triggerElement, options = {}) {
    this.scenes.push({ scene, triggerElement, options });

    ScrollTrigger.create({
      trigger: triggerElement,
      start: options.start || 'top top',
      end: options.end || 'bottom top',
      pin: options.pin || false,
      scrub: options.scrub !== false,
      anticipatePin: 1,
      onUpdate: (self) => {
        const progress = self.progress;
        if (this.engine.activeScene !== scene) {
          this.engine.setActiveScene(scene);
        }
        this.engine.setProgress(progress);
      },
      onEnter: () => {
        if (this.engine.activeScene !== scene) {
          this.engine.setActiveScene(scene);
        }
      }
    });
  }

  onScroll(progress) {
    this.engine.setProgress(progress);
  }

  refresh() {
    ScrollTrigger.refresh();
  }

  destroy() {
    ScrollTrigger.getAll().forEach(t => t.kill());
    if (this.lenis) this.lenis.destroy();
  }
}
