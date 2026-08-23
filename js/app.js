/* ============================================
   Kibi — Shared App Module
   Navigation, notifications, auth checks, toasts
   ============================================ */

/* --- Navigation HTML Generator --- */
function getNavHTML(activePage = "", darkHero = false) {
  return `<header class="relative z-50 px-6 lg:px-12 flex justify-between items-center w-full max-w-7xl mx-auto pt-6 pb-4">
  
  <!-- Logo -->
  <a href="index.html" class="flex items-center justify-center h-10 px-5 bg-white/90 backdrop-blur-md rounded-full font-heading font-bold text-[1.25rem] tracking-tight text-[#005da7] hover:bg-white transition-colors shadow-sm border border-white/20">
    Kibi
  </a>

  <!-- Center Nav Pill -->
  <nav class="hidden md:flex items-center bg-white/85 backdrop-blur-md rounded-full px-2 py-1.5 border border-white/40 shadow-sm">
    <ul class="flex items-center gap-1 lg:gap-2 text-[14px]">
      <li><a href="index.html" class="bg-white shadow-sm border border-slate-50 text-slate-900 px-5 py-2 rounded-full block transition-colors font-medium">Home</a></li>
      <li><a href="discover.html" class="hover:bg-slate-100/50 px-5 py-2 rounded-full transition-colors block text-slate-700 font-medium">Discover</a></li>
      <li><a href="plan-trip.html" class="hover:bg-slate-100/50 px-5 py-2 rounded-full transition-colors block text-slate-700 font-medium">Plan Trip</a></li>
      <li><a href="my-trips.html" class="hover:bg-slate-100/50 px-5 py-2 rounded-full transition-colors block text-slate-700 font-medium">My Trips</a></li>
      <li><a href="about.html" class="hover:bg-slate-100/50 px-5 py-2 rounded-full transition-colors block text-slate-700 font-medium">About Us</a></li>
    </ul>
  </nav>

  <!-- Right Action -->
  <div class="flex items-center gap-3">
    <div id="auth-action-container"></div>
    <button id="mobile-menu-btn" class="md:hidden w-10 h-10 rounded-full bg-white/90 backdrop-blur-md flex items-center justify-center text-slate-800 hover:bg-white transition-colors shadow-sm border border-white/20">
      <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16"/></svg>
    </button>
  </div>
</header>

<!-- Mobile Menu -->
<div id="mobileMenu" class="fixed inset-0 z-40 bg-white/95 backdrop-blur-lg opacity-0 pointer-events-none transition-opacity duration-300 md:hidden flex flex-col items-center justify-center gap-6">
  <a href="index.html" class="text-xl font-medium text-slate-800">Home</a>
  <a href="discover.html" class="text-xl font-medium text-slate-700">Discover</a>
  <a href="plan-trip.html" class="text-xl font-medium text-slate-700">Plan Trip</a>
  <a href="my-trips.html" class="text-xl font-medium text-slate-700">My Trips</a>
  <a href="about.html" class="text-xl font-medium text-slate-700">About Us</a>
  <div id="mobile-auth-action-container"></div>
</div>`;
}

/* --- Footer HTML Generator --- */
function getFooterHTML() {
  return `<footer class="bg-brand-dark text-white pt-16 pb-8 px-6 lg:px-12 rounded-t-[3rem] mt-10">
    <div class="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-4 gap-10 md:gap-4 mb-12">

      <!-- Brand Column -->
      <div class="md:col-span-1">
        <div class="flex items-center gap-2 font-heading font-bold text-2xl tracking-tight text-white mb-4">
          Kibi
        </div>
        <p class="text-white/60 text-xs mb-6 max-w-[200px] leading-relaxed">
          Making travel planning effortless and personal for the modern explorer.
        </p>
        <!-- Socials -->
        <div class="flex gap-4">
          <a href="#" class="text-white/60 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path
                d="M16 8.049c0-4.446-3.582-8.05-8-8.05C3.58 0-.002 3.603-.002 8.05c0 4.017 2.926 7.347 6.75 7.951v-5.625h-2.03V8.05H6.75V6.275c0-2.017 1.195-3.131 3.022-3.131.876 0 1.791.157 1.791.157v1.98h-1.009c-.993 0-1.303.621-1.303 1.258v1.51h2.218l-.354 2.326H9.25V16c3.824-.604 6.75-3.934 6.75-7.951z" />
            </svg>
          </a>
          <a href="#" class="text-white/60 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path
                d="M5.026 15c6.038 0 9.341-5.003 9.341-9.334 0-.14 0-.282-.006-.422A6.685 6.685 0 0 0 16 3.542a6.658 6.658 0 0 1-1.889.518 3.301 3.301 0 0 0 1.447-1.817 6.533 6.533 0 0 1-2.087.793A3.286 3.286 0 0 0 7.875 6.03a9.325 9.325 0 0 1-6.767-3.429 3.289 3.289 0 0 0 1.018 4.382A3.323 3.323 0 0 1 .64 6.575v.045a3.288 3.288 0 0 0 2.632 3.218 3.203 3.203 0 0 1-.865.115 3.23 3.23 0 0 1-.614-.057 3.283 3.283 0 0 0 3.067 2.277A6.588 6.588 0 0 1 .78 13.58a6.32 6.32 0 0 1-.78-.045A9.344 9.344 0 0 0 5.026 15z" />
            </svg>
          </a>
          <a href="#" class="text-white/60 hover:text-white transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
              <path
                d="M8 0C5.829 0 5.556.01 4.703.048 3.85.088 3.269.222 2.76.42a3.917 3.917 0 0 0-1.417.923A3.927 3.927 0 0 0 .42 2.76C.222 3.268.087 3.85.048 4.7.01 5.555 0 5.827 0 8.001c0 2.172.01 2.444.048 3.297.04.852.174 1.433.372 1.942.205.526.478.972.923 1.417.444.445.89.719 1.416.923.51.198 1.09.333 1.942.372C5.555 15.99 5.827 16 8 16s2.444-.01 3.298-.048c.851-.04 1.434-.174 1.943-.372a3.916 3.916 0 0 0 1.416-.923c.445-.445.718-.891.923-1.417.197-.509.332-1.09.372-1.942C15.99 10.445 16 10.173 16 8s-.01-2.445-.048-3.299c-.04-.851-.175-1.433-.372-1.941a3.926 3.926 0 0 0-.923-1.417A3.911 3.911 0 0 0 13.24.42c-.51-.198-1.092-.333-1.943-.372C10.443.01 10.172 0 7.998 0h.003zm-.717 1.442h.718c2.136 0 2.389.007 3.232.046.78.035 1.204.166 1.486.275.373.145.64.319.92.599.28.28.453.546.598.92.11.281.24.705.275 1.485.039.843.047 1.096.047 3.231s-.008 2.389-.047 3.232c-.035.78-.166 1.203-.275 1.485a2.47 2.47 0 0 1-.599.919c-.28.28-.546.453-.92.598-.28.11-.704.24-1.485.276-.843.038-1.096.047-3.232.047s-2.39-.009-3.233-.047c-.78-.036-1.203-.166-1.485-.276a2.478 2.478 0 0 1-.92-.598 2.48 2.48 0 0 1-.6-.92c-.109-.281-.24-.705-.275-1.485-.038-.843-.046-1.096-.046-3.233 0-2.136.008-2.388.046-3.231.036-.78.166-1.204.276-1.486.145-.373.319-.64.599-.92.28-.28.546-.453.92-.598.282-.11.705-.24 1.485-.276.738-.034 1.024-.044 2.515-.045v.002zm4.988 1.328a.96.96 0 1 0 0 1.92.96.96 0 0 0 0-1.92zm-4.27 1.122a4.109 4.109 0 1 0 0 8.217 4.109 4.109 0 0 0 0-8.217zm0 1.441a2.667 2.667 0 1 1 0 5.334 2.667 2.667 0 0 1 0-5.334z" />
            </svg>
          </a>
        </div>
      </div>

      <!-- Links Column 1 -->
      <div class="md:col-span-1 md:justify-self-center">
        <ul class="space-y-3 text-sm">
          <li><a href="index.html" class="text-white hover:text-brand-blue transition-colors">Home</a></li>
          <li><a href="discover.html" class="text-white/60 hover:text-white transition-colors">Destinations</a></li>
          <li><a href="plan-trip.html" class="text-white/60 hover:text-white transition-colors">Plan Trip</a></li>
          <li><a href="about.html" class="text-white/60 hover:text-white transition-colors">About Us</a></li>
          <li><a href="#pricing" class="text-white/60 hover:text-white transition-colors">Pricing</a></li>
          <li><a href="#faq" class="text-white/60 hover:text-white transition-colors">FAQ</a></li>
        </ul>
      </div>

      <!-- Links Column 2 -->
      <div class="md:col-span-1 md:justify-self-center">
        <ul class="space-y-3 text-sm">
          <li><a href="#" class="text-white/60 hover:text-white transition-colors">Support</a></li>
          <li><a href="#" class="text-white/60 hover:text-white transition-colors">User Guide</a></li>
          <li><a href="#" class="text-white/60 hover:text-white transition-colors">Terms of Service</a></li>
          <li><a href="#" class="text-white/60 hover:text-white transition-colors">API Access</a></li>
        </ul>
      </div>

      <!-- Contact Column -->
      <div class="md:col-span-1 md:justify-self-end text-sm">
        <ul class="space-y-3">
          <li class="text-white/60">Contact Us</li>
          <li class="text-white/80">info@kibi.io</li>
          <li class="text-white/80">+1 (555) 123-4567</li>
        </ul>
      </div>
    </div>

    <!-- Bottom Bar -->
    <div
      class="max-w-7xl mx-auto pt-6 border-t border-white/10 flex flex-col md:flex-row justify-between items-center text-xs text-white/40 gap-4">
      <p>&copy; 2024 Kibi. All rights reserved.</p>
      <div class="flex gap-6">
        <a href="#" class="hover:text-white transition-colors">Privacy Policy</a>
        <a href="#" class="hover:text-white transition-colors">Cookie Policy</a>
        <a href="#" class="hover:text-white transition-colors">Manage Cookies</a>
      </div>
    </div>
  </footer>`;
}

/* --- Auth Action Buttons --- */
function renderAvatarHTML(user, sizeClass = "w-10 h-10", textClass = "text-sm") {
  const initial = user.name ? user.name.charAt(0).toUpperCase() : 'U';
  const img = user.avatar && (user.avatar.startsWith('http') || user.avatar.startsWith('data:image'))
    ? user.avatar
    : (user.avatar && user.avatar.startsWith('assets/') ? user.avatar : null);
  if (img) {
    return `<img src="${img}" alt="${user.name || 'User'}" class="${sizeClass} rounded-full object-cover border border-white/20 shadow-sm" />`;
  }
  return `<div class="${sizeClass} rounded-full bg-[#005da7] text-white flex items-center justify-center font-bold ${textClass} shadow-sm border border-white/20">${initial}</div>`;
}

function getAuthActionHTML(isMobile = false) {
  const user = getCurrentUser();
  if (user) {
    const displayName = user.name || 'Traveler';
    const displayEmail = user.email || '';
    const avatarBtn = renderAvatarHTML(user, 'w-10 h-10', 'text-sm');
    const avatarHeader = renderAvatarHTML(user, 'w-11 h-11', 'text-base');

    if (isMobile) {
      return `
        <div class="flex flex-col items-center gap-4">
          <span class="text-sm font-medium text-slate-500">${displayName}</span>
          <a href="dashboard.html" class="text-xl font-medium text-slate-800">Dashboard</a>
          <button id="mobileLogoutBtn" class="text-xl font-medium text-red-500">Log out</button>
        </div>
      `;
    }

    return `
      <div class="relative" id="profileDropdownWrapper">
        <button id="profileAvatarBtn" class="rounded-full overflow-hidden flex items-center justify-center transition-all hover:ring-2 hover:ring-[#005da7]/30 cursor-pointer" aria-label="Open profile menu">
          ${avatarBtn}
        </button>
        <div id="profileDropdown" class="absolute top-[calc(100%+8px)] right-0 w-[300px] bg-white border border-slate-200/60 shadow-xl shadow-black/8 rounded-xl overflow-hidden p-5 flex flex-col gap-4 z-[100] opacity-0 invisible translate-y-1 transition-all duration-200 pointer-events-none">
          <div class="flex items-center gap-3">
            ${avatarHeader}
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
            <button id="dropdownLogoutBtn" class="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-red-50 text-red-500 hover:text-red-600 transition-colors duration-150 group w-full text-left cursor-pointer">
              <svg class="w-[18px] h-[18px]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.8" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"/></svg>
              <span class="text-[14px] font-semibold">Logout</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }
  return `
    <div class="${isMobile ? 'flex flex-col items-center gap-4' : 'hidden md:flex items-center gap-3'}">
      <a href="login.html" class="${isMobile ? 'text-xl font-medium text-slate-700' : 'px-4 py-2 rounded-full text-slate-700 hover:bg-slate-100/50 transition-colors text-sm font-medium'}">Log in</a>
      <a href="signup.html" class="${isMobile ? 'px-6 py-2 rounded-full bg-primary text-white font-medium' : 'px-4 py-2 rounded-full bg-primary text-white hover:bg-primary-container transition-colors text-sm font-medium shadow-sm'}">Sign up</a>
    </div>
  `;
}

/* --- Initialize Navigation --- */
function initNav(activePage = '', darkHero = false) {
  // Insert nav at the top
  const navContainer = document.getElementById('navContainer');
  if (navContainer) {
    navContainer.innerHTML = getNavHTML(activePage, darkHero);
  }

  // Insert footer
  const footerContainer = document.getElementById('footerContainer');
  if (footerContainer) {
    footerContainer.innerHTML = getFooterHTML();
  }

  // Render auth actions (skip on home page — home.js handles its own header)
  if (activePage !== 'home') {
    const authContainer = document.getElementById('auth-action-container');
    if (authContainer) {
      authContainer.innerHTML = getAuthActionHTML(false);
    }
    const mobileAuthContainer = document.getElementById('mobile-auth-action-container');
    if (mobileAuthContainer) {
      mobileAuthContainer.innerHTML = getAuthActionHTML(true);
    }
  }

  // Scroll handler — nav background
  const nav = document.getElementById('mainNav');
  if (nav) {
    const isDarkHero = nav.dataset.darkHero === 'true';
    const updateNav = () => {
      if (window.scrollY > 50) {
        if (isDarkHero) {
          nav.classList.add('bg-charcoal/95', 'backdrop-blur-md', 'shadow-sm');
          nav.classList.remove('bg-cream/95');
        } else {
          nav.classList.add('bg-cream/95', 'backdrop-blur-md', 'shadow-sm');
          nav.classList.remove('bg-charcoal/95');
        }
      } else {
        nav.classList.remove('bg-cream/95', 'bg-charcoal/95', 'backdrop-blur-md', 'shadow-sm');
      }
    };
    window.addEventListener('scroll', updateNav, { passive: true });
    updateNav();
  }

  // Hamburger menu
  const hamburger = document.getElementById('hamburgerBtn');
  const mobileMenu = document.getElementById('mobileMenu');
  if (hamburger && mobileMenu) {
    let menuOpen = false;
    hamburger.addEventListener('click', () => {
      menuOpen = !menuOpen;
      if (menuOpen) {
        mobileMenu.classList.remove('opacity-0', 'pointer-events-none');
        mobileMenu.classList.add('opacity-100', 'pointer-events-auto');
        hamburger.children[0].classList.add('rotate-45', 'translate-y-2');
        hamburger.children[1].classList.add('opacity-0');
        hamburger.children[2].classList.add('-rotate-45', '-translate-y-2');
        document.body.style.overflow = 'hidden';
      } else {
        mobileMenu.classList.add('opacity-0', 'pointer-events-none');
        mobileMenu.classList.remove('opacity-100', 'pointer-events-auto');
        hamburger.children[0].classList.remove('rotate-45', 'translate-y-2');
        hamburger.children[1].classList.remove('opacity-0');
        hamburger.children[2].classList.remove('-rotate-45', '-translate-y-2');
        document.body.style.overflow = '';
      }
    });

    // Close on link click
    mobileMenu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        menuOpen = false;
        mobileMenu.classList.add('opacity-0', 'pointer-events-none');
        mobileMenu.classList.remove('opacity-100', 'pointer-events-auto');
        hamburger.children[0].classList.remove('rotate-45', 'translate-y-2');
        hamburger.children[1].classList.remove('opacity-0');
        hamburger.children[2].classList.remove('-rotate-45', '-translate-y-2');
        document.body.style.overflow = '';
      });
    });
  }

  // Notification bell
  const notifBell = document.getElementById('notificationBell');
  const notifDropdown = document.getElementById('notifDropdown');
  if (notifBell && notifDropdown) {
    notifBell.addEventListener('click', (e) => {
      e.stopPropagation();
      const isHidden = notifDropdown.classList.contains('hidden');
      if (isHidden) {
        notifDropdown.classList.remove('hidden');
        renderNotifications();
      } else {
        notifDropdown.classList.add('hidden');
      }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
      if (!notifBell.contains(e.target)) {
        notifDropdown.classList.add('hidden');
      }
    });
  }

  // Profile dropdown hover/click logic
  const profileWrapper = document.getElementById('profileDropdownWrapper');
  const profileDropdown = document.getElementById('profileDropdown');
  const profileAvatarBtn = document.getElementById('profileAvatarBtn');

  if (profileWrapper && profileDropdown) {
    let hideTimeout;

    function showDropdown() {
      clearTimeout(hideTimeout);
      profileDropdown.classList.remove('opacity-0', 'invisible', 'translate-y-1', 'pointer-events-none');
      profileDropdown.classList.add('opacity-100', 'visible', 'translate-y-0', 'pointer-events-auto');
    }

    function hideDropdown() {
      hideTimeout = setTimeout(() => {
        profileDropdown.classList.add('opacity-0', 'invisible', 'translate-y-1', 'pointer-events-none');
        profileDropdown.classList.remove('opacity-100', 'visible', 'translate-y-0', 'pointer-events-auto');
      }, 150);
    }

    // Show on hover
    profileWrapper.addEventListener('mouseenter', showDropdown);
    profileWrapper.addEventListener('mouseleave', hideDropdown);

    // Also toggle on click for touch devices
    if (profileAvatarBtn) {
      profileAvatarBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = profileDropdown.classList.contains('opacity-100');
        if (isVisible) {
          hideDropdown();
        } else {
          showDropdown();
        }
      });
    }

    // Close when clicking outside
    document.addEventListener('click', (e) => {
      if (!profileWrapper.contains(e.target)) {
        profileDropdown.classList.add('opacity-0', 'invisible', 'translate-y-1', 'pointer-events-none');
        profileDropdown.classList.remove('opacity-100', 'visible', 'translate-y-0', 'pointer-events-auto');
      }
    });
  }

  // Logout buttons
  const dropdownLogoutBtn = document.getElementById('dropdownLogoutBtn');
  const mobileLogoutBtn = document.getElementById('mobileLogoutBtn');

  function handleLogout(e) {
    e.preventDefault();
    logoutUser();
    window.location.href = 'index.html';
  }

  if (dropdownLogoutBtn) dropdownLogoutBtn.addEventListener('click', handleLogout);
  if (mobileLogoutBtn) mobileLogoutBtn.addEventListener('click', handleLogout);
}

/* --- Render Notifications --- */
function renderNotifications() {
  const user = getCurrentUser();
  if (!user) return;

  const notifList = document.getElementById('notifList');
  if (!notifList) return;

  const notifications = getUserNotifications(user.id);

  if (notifications.length === 0) {
    notifList.innerHTML = '<div class="px-5 py-8 text-center text-sm text-text-muted">No notifications yet</div>';
    return;
  }

  notifList.innerHTML = notifications.slice(0, 10).map(notif => `
    <div class="px-5 py-3 border-b border-border-light cursor-pointer transition-colors hover:bg-cream-dark ${notif.read ? '' : 'bg-sage/5'}" data-id="${notif.id}">
      <p class="text-sm text-charcoal leading-snug">${notif.message}</p>
      <span class="text-xs text-text-muted mt-1 block">${getTimeAgo(notif.createdAt)}</span>
    </div>
  `).join('');

  // Mark as read on click
  notifList.querySelectorAll('.notification-item').forEach(item => {
    item.addEventListener('click', () => {
      markNotificationRead(item.dataset.id);
      item.classList.remove('unread');
      updateNotifBadge();
    });
  });

  // Mark all as read
  markAllNotificationsRead(user.id);
  updateNotifBadge();
}

function updateNotifBadge() {
  const user = getCurrentUser();
  const badge = document.getElementById('notifBadge');
  if (!user || !badge) return;

  const count = getUnreadCount(user.id);
  badge.classList.toggle('hidden', count === 0);
}

/* --- Time Ago Helper --- */
function getTimeAgo(dateString) {
  const now = new Date();
  const date = new Date(dateString);
  const seconds = Math.floor((now - date) / 1000);

  if (seconds < 60) return 'Just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  if (seconds < 604800) return `${Math.floor(seconds / 86400)} days ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

/* --- Toast Notification --- */
function showToast(message, type = 'default', duration = 3000) {
  // Remove existing toast
  const existing = document.querySelector('.toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  document.body.appendChild(toast);

  // Trigger animation
  requestAnimationFrame(() => {
    toast.classList.add('active');
  });

  // Auto-remove
  setTimeout(() => {
    toast.classList.remove('active');
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

/* --- Auth Check --- */
function requireAuth(redirectTo = 'login.html') {
  const user = getCurrentUser();
  if (!user) {
    window.location.href = redirectTo;
    return null;
  }
  return user;
}

/* --- Date Formatting --- */
function formatDate(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatDateShort(dateString) {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short'
  });
}

function formatDateRange(start, end) {
  return `${formatDateShort(start)} — ${formatDateShort(end)}`;
}

/* --- Budget Formatting --- */
function formatBudget(amount) {
  return '₹' + parseInt(amount).toLocaleString('en-IN');
}

/* --- Get Greeting --- */
function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

/* --- Destination Image Helper --- */
function getDestImage(destinationId) {
  const dest = getDestinationById(destinationId);
  return dest ? dest.image : 'https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1200&q=80';
}

/* --- URL Query Params --- */
function getQueryParam(param) {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.get(param);
}

/* --- Travel Personality Mapper --- */
function getTravelPersonality(user) {
  if (!user || !user.travelStyle) return 'Explorer';

  const styles = Array.isArray(user.travelStyle) ? user.travelStyle : [user.travelStyle];

  if (styles.includes('Nature') && styles.includes('Photography')) return 'Nature Explorer';
  if (styles.includes('Adventure')) return 'Adventure Seeker';
  if (styles.includes('Culture')) return 'Culture Enthusiast';
  if (styles.includes('Relaxed')) return 'Relaxed Wanderer';
  if (styles.includes('Food')) return 'Food Explorer';
  if (styles.includes('Nature')) return 'Nature Lover';
  if (styles.includes('Photography')) return 'Visual Storyteller';
  return 'Explorer';
}

/* --- Social Preference Label --- */
function getSocialLabel(pref) {
  const labels = {
    'Solo': 'Prefer Solo',
    '1-2 People': '1–2 Companions',
    'Small Group': 'Small Group (3–6)',
    'Social': 'Social Traveler',
    'Highly Social': 'Highly Social'
  };
  return labels[pref] || pref;
}

/* --- Budget Range Label --- */
function getBudgetLabel(budget) {
  const labels = {
    '3000-8000': '₹3K–₹8K',
    '5000-10000': '₹5K–₹10K',
    '7000-12000': '₹7K–₹12K',
    '8000-15000': '₹8K–₹15K',
    '10000-20000': '₹10K–₹20K',
    '15000-30000': '₹15K–₹30K',
    '20000+': '₹20K+'
  };
  return labels[budget] || budget;
}
