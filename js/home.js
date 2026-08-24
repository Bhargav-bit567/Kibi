/* ============================================
   Kibi — Homepage Interactions
   ============================================ */

(function() {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isTouchDevice = window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initHome);
  } else {
    initHome();
  }

  function initHome() {
    // Initialize nav and footer
    if (typeof initNav === 'function') {
      initNav('home', true);
    }

    // Kibi landing page has its own static content; only initialize legacy sections if present.
    if (document.getElementById('destinationsGrid')) initDestinations();
    if (document.getElementById('trendingTrips')) initTrendingTrips();
    if (document.getElementById('communityTravelers')) initCommunityTravelers();

    initMobileMenu();
    initAuthAction();

    if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
      gsap.registerPlugin(ScrollTrigger);
      initReveals();
      initParallax();
      initCounters();
      ScrollTrigger.refresh();
    } else {
      // Fallback: reveal elements without animation
      document.querySelectorAll('.reveal').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
    }

    initCustomCursor();
    initMagneticButtons();
    initSmoothScroll();
    initFAQ();
  }

  /* ---------- Mobile menu is handled by js/app.js ---------- */
  function initMobileMenu() {
    // app.js creates and wires the full-screen mobile overlay on all pages.
  }

  /* ---------- Auth Action (Desktop Header) ---------- */
  function initAuthAction() {
    const container = document.getElementById('auth-action-container');
    if (!container) return;
    
    // Assume getCurrentUser is available globally from storage.js
    const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;
    
    if (user) {
      const displayName = user.name || 'Traveler';
      const displayEmail = user.email || '';
      const avatarBtnHTML = typeof renderAvatarHTML === 'function'
        ? renderAvatarHTML(user, 'w-10 h-10', 'text-sm')
        : `<div class="w-10 h-10 rounded-full bg-[#005da7] text-white flex items-center justify-center font-bold text-sm shadow-sm border border-white/20">${user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>`;
      const avatarHeaderHTML = typeof renderAvatarHTML === 'function'
        ? renderAvatarHTML(user, 'w-11 h-11', 'text-base')
        : `<div class="w-11 h-11 rounded-full bg-[#005da7] text-white flex items-center justify-center font-bold text-base shrink-0">${user.name ? user.name.charAt(0).toUpperCase() : 'U'}</div>`;
      container.innerHTML = `
        <div class="relative" id="homeProfileDropdownWrapper">
          <button id="homeProfileAvatarBtn" class="rounded-full overflow-hidden flex items-center justify-center transition-all hover:ring-2 hover:ring-white/40 cursor-pointer" aria-label="Open profile menu">
            ${avatarBtnHTML}
          </button>
          <div id="homeProfileDropdown" class="absolute top-[calc(100%+8px)] right-0 w-[300px] bg-white border border-slate-200/60 shadow-xl shadow-black/8 rounded-xl overflow-hidden p-5 flex flex-col gap-4 z-[100] opacity-0 invisible translate-y-1 transition-all duration-200 pointer-events-none">
            <div class="flex items-center gap-3">
              ${avatarHeaderHTML}
              <div class="flex flex-col min-w-0">
                <span class="font-semibold text-[15px] text-slate-900 leading-tight truncate">${displayName}</span>
                <span class="text-[13px] text-slate-500 font-normal truncate">${displayEmail}</span>
              </div>
            </div>
            <div class="h-px w-full bg-slate-100"></div>
            <div class="flex flex-col gap-1">
              <a href="dashboard.html" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-blue-50 text-slate-700 hover:text-[#005da7] transition-colors duration-150 group w-full text-left no-underline">
                <svg class="w-[18px] h-[18px] text-slate-400 group-hover:text-[#005da7] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z"/></svg>
                <span class="text-[14px] font-semibold">Dashboard</span>
              </a>
              <button id="homeThemeToggleBtn" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors duration-150 group w-full text-left cursor-pointer">
                <svg id="homeThemeIconMoon" class="w-[18px] h-[18px] text-slate-400 group-hover:text-slate-700 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z"/></svg>
                <svg id="homeThemeIconSun" class="w-[18px] h-[18px] text-slate-400 group-hover:text-slate-700 transition-colors hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z"/></svg>
                <span id="homeThemeToggleLabel" class="text-[14px] font-semibold">Dark Mode</span>
              </button>
              <button id="homeDropdownLogoutBtn" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors duration-150 group w-full text-left cursor-pointer">
                <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
                <span class="text-[14px] font-semibold">Logout</span>
              </button>
            </div>
          </div>
        </div>
      `;

      // Wire up hover/click dropdown logic
      const wrapper = document.getElementById('homeProfileDropdownWrapper');
      const dropdown = document.getElementById('homeProfileDropdown');
      const avatarBtn = document.getElementById('homeProfileAvatarBtn');
      let hideTimeout;

      function showDropdown() {
        clearTimeout(hideTimeout);
        dropdown.classList.remove('opacity-0', 'invisible', 'translate-y-1', 'pointer-events-none');
        dropdown.classList.add('opacity-100', 'visible', 'translate-y-0', 'pointer-events-auto');
      }
      function hideDropdown() {
        hideTimeout = setTimeout(() => {
          dropdown.classList.add('opacity-0', 'invisible', 'translate-y-1', 'pointer-events-none');
          dropdown.classList.remove('opacity-100', 'visible', 'translate-y-0', 'pointer-events-auto');
        }, 150);
      }

      wrapper.addEventListener('mouseenter', showDropdown);
      wrapper.addEventListener('mouseleave', hideDropdown);

      avatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdown.classList.contains('opacity-100') ? hideDropdown() : showDropdown();
      });

      document.addEventListener('click', (e) => {
        if (!wrapper.contains(e.target)) {
          dropdown.classList.add('opacity-0', 'invisible', 'translate-y-1', 'pointer-events-none');
          dropdown.classList.remove('opacity-100', 'visible', 'translate-y-0', 'pointer-events-auto');
        }
      });

      // Theme toggle
      const homeThemeBtn = document.getElementById('homeThemeToggleBtn');
      if (homeThemeBtn) {
        homeThemeBtn.addEventListener('click', (e) => {
          e.preventDefault();
          toggleTheme();
        });
      }

      // Logout handler
      const logoutBtn = document.getElementById('homeDropdownLogoutBtn');
      if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
          e.preventDefault();
          if (typeof logoutUser === 'function') logoutUser();
          window.location.href = 'index.html';
        });
      }
    } else {
      container.innerHTML = `
        <div class="flex items-center gap-2">
          <a href="login.html" class="hidden sm:block text-slate-700 hover:text-slate-900 font-medium text-[14px] px-3 py-2 transition-colors">
            Log In
          </a>
          <a href="signup.html" class="bg-white/85 hover:bg-white/95 backdrop-blur-md text-slate-900 px-5 py-2 rounded-full font-medium text-[14px] transition-colors shadow-sm border border-white/40 block">
            Sign Up
          </a>
        </div>
      `;
    }
  }

  /* ---------- FAQ accordion ---------- */
  function initFAQ() {
    const accordion = document.getElementById('faq-accordion');
    if (!accordion) return;
    accordion.querySelectorAll('.faq-toggle').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const item = toggle.parentElement;
        const content = item.querySelector('.faq-content');
        const icon = toggle.querySelector('i');
        const isOpen = !content.classList.contains('hidden');

        // Close all
        accordion.querySelectorAll('.faq-content').forEach(c => c.classList.add('hidden'));
        accordion.querySelectorAll('.faq-toggle i').forEach(i => {
          i.classList.remove('fa-chevron-up');
          i.classList.add('fa-chevron-down');
          i.classList.remove('text-brand-blue');
          i.classList.add('text-gray-400');
        });
        accordion.querySelectorAll('.faq-toggle').forEach(t => {
          t.classList.remove('text-brand-blue', 'bg-blue-50/50');
          t.classList.add('text-gray-800');
        });

        if (!isOpen) {
          content.classList.remove('hidden');
          icon.classList.remove('fa-chevron-down');
          icon.classList.add('fa-chevron-up');
          icon.classList.remove('text-gray-400');
          icon.classList.add('text-brand-blue');
          toggle.classList.remove('text-gray-800');
          toggle.classList.add('text-brand-blue', 'bg-blue-50/50');
        }
      });
    });
  }

  /* ---------- Scroll reveals ---------- */
  function initReveals() {
    if (prefersReducedMotion) {
      document.querySelectorAll('.reveal').forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    gsap.utils.toArray('.reveal').forEach(el => {
      gsap.fromTo(el,
        { opacity: 0, y: 30 },
        {
          opacity: 1,
          y: 0,
          duration: 0.8,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: el,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        }
      );
    });

    // Stagger children inside .stagger-children
    document.querySelectorAll('.stagger-children').forEach(container => {
      const children = container.querySelectorAll('.reveal');
      if (children.length === 0) return;
      gsap.fromTo(children,
        { opacity: 0, y: 24 },
        {
          opacity: 1,
          y: 0,
          duration: 0.7,
          stagger: 0.1,
          ease: 'power2.out',
          scrollTrigger: {
            trigger: container,
            start: 'top 85%',
            toggleActions: 'play none none none'
          }
        }
      );
    });
  }

  /* ---------- Parallax ---------- */
  function initParallax() {
    if (prefersReducedMotion) return;

    // Hero background parallax
    gsap.to('#heroBg', {
      yPercent: 20,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1
      }
    });

    // Destination cards subtle parallax
    gsap.utils.toArray('.destination-card').forEach((card, i) => {
      const speed = i % 2 === 0 ? 20 : -10;
      gsap.to(card, {
        y: speed,
        ease: 'none',
        scrollTrigger: {
          trigger: '#destinations',
          start: 'top bottom',
          end: 'bottom top',
          scrub: 1
        }
      });
    });

    ScrollTrigger.refresh();
  }

  /* ---------- Counters ---------- */
  function initCounters() {
    const counters = document.querySelectorAll('[data-counter]');
    if (counters.length === 0) return;

    counters.forEach(counter => {
      const target = parseInt(counter.dataset.counter) || 0;
      const prefix = counter.dataset.prefix || '';
      const suffix = counter.dataset.suffix || '';

      ScrollTrigger.create({
        trigger: counter,
        start: 'top 85%',
        once: true,
        onEnter: () => {
          if (prefersReducedMotion) {
            counter.textContent = prefix + target.toLocaleString('en-IN') + suffix;
            return;
          }
          const obj = { value: 0 };
          gsap.to(obj, {
            value: target,
            duration: 1.8,
            ease: 'power2.out',
            onUpdate: () => {
              counter.textContent = prefix + Math.round(obj.value).toLocaleString('en-IN') + suffix;
            }
          });
        }
      });
    });
  }

  /* ---------- Destinations ---------- */
  function initDestinations() {
    const grid = document.getElementById('destinationsGrid');
    const searchInput = document.getElementById('homeDestSearch');
    const searchBtn = document.getElementById('homeDestSearchBtn');
    if (!grid) return;

    const CURATED = [
      { id: 'dest_manali', name: 'Manali', state: 'Himachal Pradesh', tags: ['Nature', 'Adventure'], image: 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80' },
      { id: 'dest_kasol', name: 'Kasol', state: 'Himachal Pradesh', tags: ['Slow Travel', 'Mountains'], image: 'https://images.unsplash.com/photo-1506905927185-0d3c0e4d3f4e?w=1200&q=80' },
      { id: 'dest_goa', name: 'Goa', state: 'Goa', tags: ['Beach', 'Relaxation'], image: 'https://images.unsplash.com/photo-1512343879784-a73133f1bf21?w=1200&q=80' },
      { id: 'dest_rishikesh', name: 'Rishikesh', state: 'Uttarakhand', tags: ['Adventure', 'Wellness'], image: 'https://images.unsplash.com/photo-1527697891168-4d3a18e2955e?w=1200&q=80' }
    ];

    function addDays(date, days) {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result.toISOString().split('T')[0];
    }

    function renderCard(dest, large = false) {
      return `
        <div class="${large ? 'lg:col-span-2' : ''} destination-card group relative rounded-[2rem] overflow-hidden shadow-lg h-80 cursor-pointer" role="link" tabindex="0">
          <img src="${dest.image}" alt="${dest.name}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy" onerror="this.src='https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80'">
          <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>
          <div class="absolute top-4 left-4 bg-white/20 backdrop-blur-md rounded-full px-3 py-1 text-xs text-white font-medium border border-white/30">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" class="inline mr-1" viewBox="0 0 16 16"><path d="M3.612 15.443c-.386.198-.824-.149-.746-.592l.83-4.73L.173 6.765c-.329-.314-.158-.888.283-.95l4.898-.696L7.538.792c.197-.39.73-.39.927 0l2.184 4.327 4.898.696c.441.062.612.636.282.95l-3.522 3.356.83 4.73c.078.443-.36.79-.746.592L8 13.187l-4.389 2.256z"/></svg>
            4.9
          </div>
          <div class="absolute bottom-6 left-6 right-6">
            <h3 class="text-white ${large ? 'text-2xl' : 'text-xl'} font-bold mb-1">${dest.name}</h3>
            <p class="text-white/80 ${large ? 'text-sm' : 'text-xs line-clamp-2'}">${dest.description || `Explore ${dest.name}, ${dest.state || ''}`}</p>
            ${large ? `
            <div class="flex justify-between items-end mt-4">
              <div class="flex flex-wrap gap-2">
                ${(dest.tags || []).slice(0, 2).map(tag => `<span class="text-xs px-2 py-1 bg-white/20 backdrop-blur-sm rounded-full">${tag}</span>`).join('')}
              </div>
              <button class="bg-white text-gray-900 text-sm font-semibold py-2 px-5 rounded-full hover:bg-gray-100 transition-colors pointer-events-none">View details</button>
            </div>` : ''}
          </div>
        </div>
      `;
    }

    function wireCardClicks(handler) {
      grid.querySelectorAll('.destination-card').forEach(card => {
        card.addEventListener('click', handler);
        card.addEventListener('keydown', e => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handler(e);
          }
        });
      });
    }

    function renderFallback() {
      grid.innerHTML = CURATED.map((dest, i) => renderCard(dest, i === 0)).join('');
      wireCardClicks((e) => {
        const card = e.currentTarget;
        const idx = Array.from(grid.children).indexOf(card);
        const dest = CURATED[idx];
        if (dest) generateHomeTrip(dest.name, null, null, e);
      });
    }

    async function searchDestination(query) {
      query = query.trim();
      if (!query) {
        renderFallback();
        return;
      }

      grid.innerHTML = '<div class="col-span-full text-center py-12 text-gray-500">Searching for your destination...</div>';

      try {
        const [place, geo] = await Promise.all([
          typeof TripMateAPI !== 'undefined' ? TripMateAPI.getPlaceInfo(query).catch(() => null) : Promise.resolve(null),
          typeof GeocodingAPI !== 'undefined' ? GeocodingAPI.searchDestination(query).catch(() => []) : Promise.resolve([])
        ]);

        const geoResult = geo[0];
        if (!place && !geoResult) {
          grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500">We couldn't find "${query}". Try a different place.</div>`;
          return;
        }

        const dest = {
          name: place?.name || geoResult?.name || query,
          state: place?.description ? place.description.split(',')[0] : (geoResult?.displayName || ''),
          description: place?.description || `Discover ${query}`,
          image: place?.image || `https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=800&q=80`, // reliable fallback for unknown queries
          lat: geoResult?.latitude ? parseFloat(geoResult.latitude) : (place?.coordinates?.lat || null),
          lon: geoResult?.longitude ? parseFloat(geoResult.longitude) : (place?.coordinates?.lon || null)
        };

        grid.innerHTML = renderCard(dest, true);
        wireCardClicks((e) => generateHomeTrip(dest.name, dest.lat, dest.lon, e));

        const back = document.createElement('div');
        back.className = 'col-span-full text-center mt-2';
        back.innerHTML = `<button id="homeClearSearch" class="text-sm text-brand-blue hover:underline">Clear search</button>`;
        grid.appendChild(back);
        document.getElementById('homeClearSearch').addEventListener('click', renderFallback);
      } catch (err) {
        console.error('Home destination search error:', err);
        grid.innerHTML = `<div class="col-span-full text-center py-12 text-gray-500">Something went wrong searching for "${query}".</div>`;
      }
    }

    window.generateHomeTrip = async function(destinationName, lat, lon, evt) {
      const card = evt?.currentTarget;
      if (card) {
        card.style.pointerEvents = 'none';
        card.style.opacity = '0.7';
      }

      try {
        showToast(`Planning your ${destinationName} trip...`, 'default');
        const startDate = addDays(new Date(), 7);
        const endDate = addDays(startDate, 3);
        const result = await generateItinerary({
          destinationId: 'home_' + destinationName.toLowerCase().replace(/\s+/g, '_'),
          destinationName,
          lat: lat || undefined,
          lon: lon || undefined,
          startDate,
          endDate,
          budget: 12000,
          travelStyle: ['Adventure'],
          interests: ['Nature', 'Photography'],
          socialPreference: 'Small Group',
          travelPace: 'Moderate'
        });

        if (!result) throw new Error('Itinerary generation failed');

        sessionStorage.setItem('wm_generated_itinerary', JSON.stringify(result));
        window.location.href = 'itinerary.html';
      } catch (err) {
        console.error('Home trip generation error:', err);
        showToast('Could not generate itinerary. Please try again.', 'error');
        if (card) {
          card.style.pointerEvents = '';
          card.style.opacity = '';
        }
      }
    };

    if (searchBtn) searchBtn.addEventListener('click', () => searchDestination(searchInput.value));
    if (searchInput) {
      searchInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') searchDestination(searchInput.value);
      });
    }

    renderFallback();
  }

  /* ---------- Trending trips ---------- */
  function initTrendingTrips() {
    const container = document.getElementById('trendingTrips');
    if (!container) return;

    const trips = getTrips().slice(0, 3);
    if (trips.length === 0) {
      container.innerHTML = '<p class="text-text-secondary col-span-full text-center py-8">No trips yet. Be the first to plan one!</p>';
      return;
    }

    container.innerHTML = trips.map(trip => `
      <div class="bg-white rounded-2xl overflow-hidden shadow-soft hover:shadow-card transition-shadow duration-300 cursor-pointer group" onclick="window.location.href='itinerary.html?id=${trip.id}'">
        <div class="aspect-[16/10] overflow-hidden">
          <img src="${trip.image || 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80'}" alt="${trip.destination}" class="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" loading="lazy">
        </div>
        <div class="p-6">
          <div class="flex items-center justify-between mb-2">
            <span class="text-xs font-medium text-sage uppercase tracking-wider">${trip.destination}</span>
            <span class="text-xs text-text-muted">${formatDateRange(trip.startDate, trip.endDate)}</span>
          </div>
          <h3 class="font-serif text-xl mb-3 group-hover:text-sage transition-colors">${trip.title || trip.destination}</h3>
          <div class="flex items-center justify-between text-sm text-text-secondary">
            <span>${formatBudget(trip.budget || trip.totalBudget || 0)}</span>
            <span>${(trip.members || []).length}/${trip.maxMembers || '?'} travelers</span>
          </div>
        </div>
      </div>
    `).join('');
  }

  /* ---------- Community travelers ---------- */
  function initCommunityTravelers() {
    const container = document.getElementById('communityTravelers');
    if (!container) return;

    const travelers = getSampleTravelers().slice(0, 4);
    container.innerHTML = travelers.map(t => `
      <div class="bg-charcoal-light rounded-2xl p-5 border border-white/10 hover:border-sage/30 transition-colors duration-300">
        <div class="flex items-center gap-3 mb-4">
          <div class="w-12 h-12 rounded-full bg-sage text-white flex items-center justify-center font-serif text-lg">${t.avatar || t.name[0]}</div>
          <div>
            <div class="font-medium text-white">${t.name}</div>
            <div class="text-sm text-white/50">${getTravelPersonality(t)}</div>
          </div>
        </div>
        <div class="flex flex-wrap gap-2 mb-4">
          ${(t.interests || t.travelStyle || []).slice(0, 3).map(i => `<span class="text-xs px-2 py-1 bg-white/10 text-white/80 rounded-full">${i}</span>`).join('')}
        </div>
        <div class="flex items-center justify-between text-sm">
          <span class="text-white/50">${getBudgetLabel(t.budget)}</span>
          <span class="text-sage-light">${t.matchScore || 90}% match</span>
        </div>
      </div>
    `).join('');
  }

  /* ---------- Custom cursor ---------- */
  function initCustomCursor() {
    if (isTouchDevice || prefersReducedMotion) return;

    const dot = document.querySelector('.cursor-dot');
    const outline = document.querySelector('.cursor-outline');
    if (!dot || !outline) return;

    let mouseX = 0;
    let mouseY = 0;
    let outlineX = 0;
    let outlineY = 0;
    let rafId = null;
    let isActive = true;

    document.addEventListener('mousemove', e => {
      mouseX = e.clientX;
      mouseY = e.clientY;
      if (!isActive) {
        isActive = true;
        animate();
      }
    });

    document.addEventListener('mouseleave', () => {
      dot.style.opacity = '0';
      outline.style.opacity = '0';
    });

    document.addEventListener('mouseenter', () => {
      dot.style.opacity = '1';
      outline.style.opacity = '1';
    });

    function animate() {
      outlineX += (mouseX - outlineX) * 0.15;
      outlineY += (mouseY - outlineY) * 0.15;

      dot.style.left = mouseX + 'px';
      dot.style.top = mouseY + 'px';
      outline.style.left = outlineX + 'px';
      outline.style.top = outlineY + 'px';

      rafId = requestAnimationFrame(animate);
    }

    animate();

    const hoverTargets = 'a, button, .magnetic, .destination-card, .trip-card, .itinerary-day-card, .stat-card';

    function bindHover(el) {
      if (el.__cursorBound) return;
      el.__cursorBound = true;
      el.addEventListener('mouseenter', () => outline.classList.add('hover'));
      el.addEventListener('mouseleave', () => outline.classList.remove('hover'));
    }

    function bindAllHovers() {
      document.querySelectorAll(hoverTargets).forEach(bindHover);
    }

    bindAllHovers();

    const observer = new MutationObserver(bindAllHovers);
    observer.observe(document.body, { childList: true, subtree: true });
  }

  /* ---------- Magnetic buttons ---------- */
  function initMagneticButtons() {
    if (isTouchDevice || prefersReducedMotion) return;

    document.querySelectorAll('.magnetic').forEach(btn => {
      btn.addEventListener('mousemove', e => {
        const rect = btn.getBoundingClientRect();
        const x = e.clientX - rect.left - rect.width / 2;
        const y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = `translate(${x * 0.2}px, ${y * 0.2}px)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = '';
      });
    });
  }

  /* ---------- Smooth scroll for anchor links ---------- */
  function initSmoothScroll() {
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', e => {
        const targetId = anchor.getAttribute('href');
        if (targetId === '#') return;
        const target = document.querySelector(targetId);
        if (target) {
          e.preventDefault();
          target.scrollIntoView({ behavior: prefersReducedMotion ? 'auto' : 'smooth' });
        }
      });
    });
  }
})();
