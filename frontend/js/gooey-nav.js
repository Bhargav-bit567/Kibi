/* ============================================
   Kibi — Navbar with a sliding white pill
   (frosted frame and sizing from React Bits' GooeyNav, size "md"; the droplet
   effect is left out to keep page loads light. Colours follow the site theme.)

   - The pill sits on the current page's item.
   - Hovering (or keyboard-focusing) an item glides the pill to it; leaving the
     nav glides it back.
   - Arriving from another page, the pill starts on the item you clicked from
     and glides to the new page's item once the page has loaded.
   ============================================ */

(function () {
  const ITEMS = [
    { label: 'Home', href: 'index.html' },
    { label: 'Discover', href: 'discover.html' },
    { label: 'Plan Trip', href: 'plan-trip.html' },
    { label: 'My Trips', href: 'my-trips.html' },
    { label: 'About Us', href: 'about.html' }
  ];
  // Pages without their own item light up the section they belong to.
  const SECTION_OF = {
    '': 'index.html',
    'itinerary.html': 'plan-trip.html',
    'saved-itinerary.html': 'my-trips.html',
    'trip-details.html': 'discover.html'
  };
  const FROM_KEY = 'kibi_gooey_from';

  // Colours live in css/gooey-nav.css and follow the site's light/dark theme.

  function currentIndex() {
    const file = window.location.pathname.split('/').pop();
    const href = SECTION_OF[file] ?? file;
    return ITEMS.findIndex(item => item.href === href);
  }

  function mount(nav) {
    if (nav.dataset.gooeyReady) return;
    nav.dataset.gooeyReady = 'true';

    const current = currentIndex();
    // Keep the page's responsive visibility (hidden on mobile, shown from md up).
    nav.className = 'gooey-nav gooey-nav--md gooey-nav--framed hidden md:inline-flex';
    nav.removeAttribute('style');
    nav.setAttribute('aria-label', 'Main');
    nav.innerHTML = `<span class="gooey-nav__rim"></span>
      <div class="gooey-nav__stage">
        <ul class="gooey-nav__list">
          <li class="gooey-nav__pill" role="presentation" aria-hidden="true"></li>
          ${ITEMS.map((item, index) => `<li class="gooey-nav__item"${index === current ? ' data-active' : ''}>` +
            `<a href="${item.href}" class="gooey-nav__link"${index === current ? ' aria-current="page"' : ''}>${item.label}</a></li>`).join('')}
        </ul>
      </div>`;

    const list = nav.querySelector('.gooey-nav__list');
    const pill = nav.querySelector('.gooey-nav__pill');
    const items = [...list.querySelectorAll('.gooey-nav__item')];
    let lit = null;

    function place(li, instant) {
      lit = li;
      items.forEach(item => item.classList.toggle('is-lit', item === li));
      if (!li) { pill.style.opacity = '0'; return; }
      if (instant) pill.classList.add('no-anim');
      pill.style.width = `${li.offsetWidth}px`;
      pill.style.transform = `translateX(${li.offsetLeft}px)`;
      pill.style.opacity = '1';
      if (instant) { void pill.offsetWidth; pill.classList.remove('no-anim'); }
    }
    const home = () => items[current] || null;

    // Arriving from another nav item: start there, glide here once the page has loaded.
    let from = -1;
    try {
      from = Number(sessionStorage.getItem(FROM_KEY) ?? -1);
      sessionStorage.removeItem(FROM_KEY);
    } catch (e) {}
    const animateIn = from >= 0 && from !== current && current >= 0 && items[from];
    place(animateIn ? items[from] : home(), true);
    if (animateIn) {
      (window.KIBI_PAGE_SHOWN || Promise.resolve()).then(() => {
        requestAnimationFrame(() => requestAnimationFrame(() => { if (lit === items[from]) place(home()); }));
      });
    }

    items.forEach((li, index) => {
      li.addEventListener('mouseenter', () => place(li));
      li.addEventListener('focusin', () => place(li));
      li.querySelector('a').addEventListener('click', event => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0) return; // new tab etc.
        if (index === current) { event.preventDefault(); return; }
        try { sessionStorage.setItem(FROM_KEY, String(current >= 0 ? current : index)); } catch (e) {}
      });
    });
    list.addEventListener('mouseleave', () => place(home()));
    list.addEventListener('focusout', event => { if (!list.contains(event.relatedTarget)) place(home()); });

    // Keep the pill aligned when fonts load or the layout changes.
    const realign = () => place(lit, true);
    new ResizeObserver(realign).observe(list);
    document.fonts?.ready.then(realign);
  }

  // The desktop nav pill: the <nav> in the page header that links to the main pages.
  function enhanceAll() {
    document.querySelectorAll('header nav').forEach(nav => {
      if (nav.dataset.gooeyReady || nav.querySelector('a[href="discover.html"]')) mount(nav);
    });
  }

  window.KibiGooeyNav = { enhance: enhanceAll };
  // Run now: this script loads after the header, so the nav is ready before first paint.
  enhanceAll();
  document.addEventListener('DOMContentLoaded', enhanceAll);
})();
