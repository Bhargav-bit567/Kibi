/* ============================================
   WanderMatch — Hero Scroll Frame Animation
   Maps scroll progress to image frame sequence
   ============================================ */

(function() {
  'use strict';

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHeroFrameAnimation);
  } else {
    initHeroFrameAnimation();
  }

  async function initHeroFrameAnimation() {
    // Initialize nav and footer
    if (typeof initNav === 'function') {
      initNav('home', true);
    }

    const loadingScreen = document.getElementById('loadingScreen');
    const loadingBarFill = document.getElementById('loadingBarFill');
    const loadingPercent = document.getElementById('loadingPercent');
    const canvas = document.getElementById('heroFrameCanvas');

    if (!canvas) {
      console.warn('Hero canvas not found');
      return;
    }

    // Ensure GSAP / ScrollTrigger are available
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      console.warn('GSAP or ScrollTrigger not loaded');
      hideLoading();
      return;
    }
    gsap.registerPlugin(ScrollTrigger);

    const sequence = new FrameSequence({
      canvas: canvas,
      framePath: 'assets/sequences/hero/ezgif-frame-',
      frameCount: 192,
      extension: 'jpg',
      digits: 3,
      preloadBatch: 30,
      onLoadProgress: (loaded, total) => {
        const pct = Math.round((loaded / total) * 100);
        if (loadingBarFill) loadingBarFill.style.width = pct + '%';
        if (loadingPercent) loadingPercent.textContent = pct + '%';
      }
    });

    // Load poster first so something shows immediately
    await sequence.loadPoster();
    sequence.drawFrame(0);

    // Start progressive background loading
    sequence.startProgressiveLoad();

    // Hide loading screen once first frame is ready
    hideLoading();

    // Main scroll trigger: map scroll progress to frame index
    ScrollTrigger.create({
      trigger: '#scrollContainer',
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.5,
      onUpdate: (self) => {
        sequence.setProgress(self.progress);
      }
    });

    // Hero text animations
    const heroTl = gsap.timeline({
      scrollTrigger: {
        trigger: '#sceneHero',
        start: 'top top',
        end: '+=150%',
        scrub: 1,
        pin: true
      }
    });

    heroTl
      .to('#heroLine1', { opacity: 1, y: 0, duration: 0.2 }, 0)
      .to('#heroLine1', { opacity: 0, y: -50, duration: 0.2 }, 0.4)
      .to('#heroLine2', { opacity: 1, y: 0, duration: 0.2 }, 0.5)
      .to('#heroSubtext', { opacity: 0, y: -30, duration: 0.2 }, 0.7)
      .to('#heroButtons', { opacity: 0, y: -30, duration: 0.2 }, 0.7);

    // Traveler text animations
    gsap.fromTo('#travelerTitle',
      { opacity: 0, y: 50 },
      {
        opacity: 1, y: 0,
        scrollTrigger: {
          trigger: '#sceneTraveler',
          start: 'top 80%',
          end: 'top 30%',
          scrub: 1,
          pin: true
        }
      }
    );

    gsap.utils.toArray('#travelerFeatures .feature-item').forEach((item, i) => {
      gsap.to(item, {
        opacity: 1,
        x: 0,
        scrollTrigger: {
          trigger: '#sceneTraveler',
          start: `top ${70 - i * 10}%`,
          end: `top ${40 - i * 10}%`,
          scrub: 1
        }
      });
    });

    // Phone text animations
    gsap.fromTo('#phoneTitle',
      { opacity: 0, x: 50 },
      {
        opacity: 1, x: 0,
        scrollTrigger: {
          trigger: '#scenePhone',
          start: 'top 80%',
          end: 'top 40%',
          scrub: 1,
          pin: true
        }
      }
    );

    gsap.fromTo('#phoneText',
      { opacity: 0, x: 50 },
      {
        opacity: 1, x: 0,
        scrollTrigger: {
          trigger: '#scenePhone',
          start: 'top 70%',
          end: 'top 30%',
          scrub: 1
        }
      }
    );

    // Map text
    gsap.fromTo('#mapTitle',
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        scrollTrigger: {
          trigger: '#sceneMap',
          start: 'top 80%',
          end: 'top 40%',
          scrub: 1,
          pin: true
        }
      }
    );

    gsap.fromTo('#routeLabels',
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        scrollTrigger: {
          trigger: '#sceneMap',
          start: 'top 60%',
          end: 'top 20%',
          scrub: 1
        }
      }
    );

    // Itinerary section reveal
    gsap.utils.toArray('#sceneItinerary .reveal').forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, y: 30 },
        {
          opacity: 1, y: 0,
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            end: 'top 60%',
            scrub: 1
          }
        }
      );
    });

    // Social cards
    gsap.fromTo('#socialTitle',
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        scrollTrigger: {
          trigger: '#sceneSocial',
          start: 'top 80%',
          end: 'top 40%',
          scrub: 1,
          pin: true
        }
      }
    );

    document.querySelectorAll('#socialCards .traveler-card-large').forEach((card, i) => {
      const scoreEl = card.querySelector('.score-value');
      const targetScore = [94, 91, 87][i] || 80;

      gsap.fromTo(card,
        { opacity: 0, y: 50, scale: 0.9 },
        {
          opacity: 1, y: 0, scale: 1,
          scrollTrigger: {
            trigger: '#sceneSocial',
            start: `top ${70 - i * 15}%`,
            end: `top ${40 - i * 15}%`,
            scrub: 1,
            onUpdate: (self) => {
              if (scoreEl) {
                scoreEl.textContent = Math.round(targetScore * self.progress);
              }
            }
          }
        }
      );
    });

    // Destinations parallax
    gsap.utils.toArray('.dest-parallax-card').forEach((card, i) => {
      const speed = [0.2, -0.2, 0.15, -0.15][i] || 0.1;
      gsap.to(card, {
        y: speed * 100,
        scrollTrigger: {
          trigger: '#sceneDestinations',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        }
      });
    });

    // Final scene
    gsap.fromTo('#finalTitle',
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        scrollTrigger: {
          trigger: '#sceneFinal',
          start: 'top 80%',
          end: 'top 40%',
          scrub: 1,
          pin: true
        }
      }
    );

    gsap.fromTo('#finalSubtext, #finalButtons',
      { opacity: 0, y: 30 },
      {
        opacity: 1, y: 0,
        scrollTrigger: {
          trigger: '#sceneFinal',
          start: 'top 60%',
          end: 'top 30%',
          scrub: 1
        }
      }
    );

    // Budget counters
    initCounters();

    // Resize handler
    let resizeTimeout;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => sequence.resize(), 150);
    });

    // Lenis smooth scroll
    if (typeof Lenis !== 'undefined') {
      const lenis = new Lenis({
        duration: 1.2,
        easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
        smoothWheel: true
      });

      function raf(time) {
        lenis.raf(time);
        requestAnimationFrame(raf);
      }
      requestAnimationFrame(raf);

      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add((time) => {
        lenis.raf(time * 1000);
      });
      gsap.ticker.lagSmoothing(0);
    }

    // Refresh ScrollTrigger after fonts/images load
    window.addEventListener('load', () => {
      ScrollTrigger.refresh();
    });

    function hideLoading() {
      if (loadingBarFill) loadingBarFill.style.width = '100%';
      if (loadingPercent) loadingPercent.textContent = '100%';
      setTimeout(() => {
        if (loadingScreen) loadingScreen.classList.add('hidden');
      }, 400);
    }
  }

  function initCounters() {
    const counters = document.querySelectorAll('#sceneItinerary [data-counter]');
    counters.forEach(counter => {
      const target = parseInt(counter.dataset.counter) || 0;
      const prefix = counter.dataset.prefix || '';
      const suffix = counter.dataset.suffix || '';

      ScrollTrigger.create({
        trigger: counter,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          const obj = { value: 0 };
          gsap.to(obj, {
            value: target,
            duration: 1.5,
            ease: 'power2.out',
            onUpdate: function() {
              counter.textContent = prefix + Math.round(obj.value).toLocaleString('en-IN') + suffix;
            }
          });
        }
      });
    });
  }
})();
