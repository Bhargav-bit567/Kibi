/* ============================================
   Kibi — Animation Engine
   IntersectionObserver, parallax, counters, SVG routes
   ============================================ */

/* --- Scroll Reveal (IntersectionObserver) --- */
function initScrollReveal() {
  const revealElements = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  if (revealElements.length === 0) return;

  // Check for reduced motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) {
    revealElements.forEach(el => el.classList.add('revealed'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        observer.unobserve(entry.target); // Only animate once
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  revealElements.forEach(el => observer.observe(el));
}

/* --- Parallax Effect --- */
function initParallax() {
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (prefersReducedMotion) return;

  const parallaxElements = document.querySelectorAll('.parallax-layer');
  if (parallaxElements.length === 0) return;

  let ticking = false;

  function updateParallax() {
    const scrollY = window.scrollY;
    parallaxElements.forEach(el => {
      const speed = parseFloat(el.dataset.speed) || 0.3;
      const rect = el.getBoundingClientRect();
      const elementCenter = rect.top + rect.height / 2;
      const viewportCenter = window.innerHeight / 2;
      const distance = elementCenter - viewportCenter;
      const offset = distance * speed;
      el.style.transform = `translateY(${offset}px)`;
    });
    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }, { passive: true });
}

/* --- Number Counter Animation --- */
function initCounters() {
  const counters = document.querySelectorAll('[data-counter]');
  if (counters.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        animateCounter(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(counter => observer.observe(counter));
}

function animateCounter(element) {
  const target = parseInt(element.dataset.counter);
  const prefix = element.dataset.prefix || '';
  const suffix = element.dataset.suffix || '';
  const duration = parseInt(element.dataset.duration) || 1500;
  const start = 0;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Ease out cubic
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(start + (target - start) * easeOut);

    element.textContent = prefix + current.toLocaleString('en-IN') + suffix;

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

/* --- SVG Route Drawing --- */
function initRouteDrawing() {
  const routeLines = document.querySelectorAll('.route-line');
  const routePoints = document.querySelectorAll('.route-point');
  if (routeLines.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        // Get the SVG container
        const svg = entry.target.closest('svg') || entry.target;

        // Animate route lines
        const lines = svg.querySelectorAll('.route-line');
        lines.forEach(line => {
          const length = line.getTotalLength();
          line.style.strokeDasharray = length;
          line.style.strokeDashoffset = length;

          requestAnimationFrame(() => {
            line.style.transition = 'stroke-dashoffset 2s ease-in-out';
            line.style.strokeDashoffset = '0';
          });
        });

        // Animate route points with delay
        const points = svg.querySelectorAll('.route-point');
        points.forEach((point, index) => {
          setTimeout(() => {
            point.classList.add('visible');
            point.style.opacity = '1';
          }, 500 + (index * 400));
        });

        // Animate labels
        const labels = svg.querySelectorAll('.route-point-label');
        labels.forEach((label, index) => {
          label.style.opacity = '0';
          setTimeout(() => {
            label.style.transition = 'opacity 0.5s ease';
            label.style.opacity = '1';
          }, 700 + (index * 400));
        });

        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  // Observe SVG containers
  document.querySelectorAll('.route-svg').forEach(svg => observer.observe(svg));
}

/* --- Image Hover Zoom --- */
function initImageZoom() {
  // Already handled by CSS .img-zoom class — this is for any JS-specific needs
  const zoomContainers = document.querySelectorAll('.img-zoom');
  zoomContainers.forEach(container => {
    container.addEventListener('mouseenter', () => {
      container.classList.add('zooming');
    });
    container.addEventListener('mouseleave', () => {
      container.classList.remove('zooming');
    });
  });
}

/* --- Card Sequence Animation --- */
function initCardSequence() {
  const staggerContainers = document.querySelectorAll('.stagger-children');
  if (staggerContainers.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const children = entry.target.querySelectorAll('.reveal');
        children.forEach((child, index) => {
          child.style.transitionDelay = `${index * 120}ms`;
          setTimeout(() => {
            child.classList.add('revealed');
          }, 50);
        });
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.2 });

  staggerContainers.forEach(container => observer.observe(container));
}

/* --- Compatibility Animation --- */
function animateCompatibility(element, targetPercent) {
  const duration = 1500;
  const startTime = performance.now();

  function update(currentTime) {
    const elapsed = currentTime - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const easeOut = 1 - Math.pow(1 - progress, 3);
    const current = Math.round(targetPercent * easeOut);

    element.textContent = current + '%';

    // Update compatibility bar if present
    const bar = element.closest('.traveler-card')?.querySelector('.compat-bar-fill');
    if (bar) {
      bar.style.width = current + '%';
    }

    if (progress < 1) {
      requestAnimationFrame(update);
    }
  }

  requestAnimationFrame(update);
}

function initCompatibilityAnimations() {
  const matchScores = document.querySelectorAll('.match-score[data-score]');
  if (matchScores.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const target = parseInt(entry.target.dataset.score);
        animateCompatibility(entry.target.querySelector('.score-value') || entry.target, target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.5 });

  matchScores.forEach(score => observer.observe(score));
}

/* --- Itinerary Day Reveal --- */
function initItineraryReveal() {
  const days = document.querySelectorAll('.itinerary-day');
  if (days.length === 0) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  days.forEach((day, index) => {
    day.style.transitionDelay = `${index * 200}ms`;
    observer.observe(day);
  });
}

/* --- Lazy Load Images --- */
function initLazyLoad() {
  const lazyImages = document.querySelectorAll('img[data-src]');
  if (lazyImages.length === 0) return;

  const imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const img = entry.target;
        img.src = img.dataset.src;
        img.removeAttribute('data-src');
        img.classList.add('loaded');
        imageObserver.unobserve(img);
      }
    });
  }, { rootMargin: '200px' });

  lazyImages.forEach(img => imageObserver.observe(img));
}

/* --- Initialize All Animations --- */
function initAllAnimations() {
  // Wait for DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      runAnimationInit();
    });
  } else {
    runAnimationInit();
  }
}

function runAnimationInit() {
  initScrollReveal();
  initParallax();
  initCounters();
  initRouteDrawing();
  initImageZoom();
  initCardSequence();
  initCompatibilityAnimations();
  initItineraryReveal();
  initLazyLoad();
}

// Auto-initialize
initAllAnimations();
