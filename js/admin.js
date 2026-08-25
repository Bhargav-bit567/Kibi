

const PAGE_SIZE = 10;

const state = {
  currentAdmin: null,
  tab: 'tab-dashboard',
  users: { page: 1, search: '', role: '', status: '' },
  trips: { page: 1, search: '', status: '' },
  requests: { status: 'pending' },
  pendingConfirm: null
};

document.addEventListener('DOMContentLoaded', () => {
  init();
});

function init() {
  const user = typeof getCurrentUser === 'function' ? getCurrentUser() : null;

  if (!user) {
    showGate({
      title: 'Sign in required',
      message: 'You need to be signed in to view the admin dashboard.',
      actionsHtml: `<a href="login.html" class="block w-full py-2.5 rounded-lg btn-primary text-sm font-medium">Go to Login</a>`
    });
    return;
  }

  if (!isUserAdmin(user)) {
    if (!anyAdminExists()) {
      showGate({
        title: 'Claim admin access',
        message: `No admin account exists yet. As ${escapeHtml(user.name || user.email || 'the first user')}, you can claim the admin role to set up this dashboard.`,
        actionsHtml: `<button id="claimAdminBtn" class="w-full py-2.5 rounded-lg btn-primary text-sm font-medium">Claim Admin Access</button>`
      });
      document.getElementById('claimAdminBtn').addEventListener('click', () => {
        setUserRole(user.id, USER_ROLES.ADMIN);
        toast('Admin access granted', 'success');
        setTimeout(() => window.location.reload(), 400);
      });
    } else {
      showGate({
        title: 'Access denied',
        message: `Your account (${escapeHtml(user.email || user.name || '')}) doesn't have admin permissions. Contact an existing admin if you believe this is a mistake.`,
        actionsHtml: `<a href="index.html" class="block w-full py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50 transition-colors">Back to Site</a>`
      });
    }
    return;
  }

  if (user.status === USER_STATUS.SUSPENDED || user.status === USER_STATUS.BANNED) {
    showGate({
      title: 'Account restricted',
      message: 'Your account is currently restricted and cannot access the admin dashboard.',
      actionsHtml: ''
    });
    return;
  }

  state.currentAdmin = user;
  document.getElementById('accessGate').classList.add('hidden');
  const shell = document.getElementById('dashboardShell');
  shell.classList.remove('hidden');
  shell.classList.add('flex');

  bindShell();
  renderAll();
}

function showGate(opts) {
  const gate = document.getElementById('accessGate');
  gate.classList.remove('hidden');
  gate.classList.add('flex');
  document.getElementById('gateTitle').textContent = opts.title;
  document.getElementById('gateMessage').textContent = opts.message;
  document.getElementById('gateActions').innerHTML = opts.actionsHtml || '';
}


function bindShell() {
  document.querySelectorAll('#sidebarNav .nav-link').forEach(btn => {
    btn.addEventListener('click', () => switchTab(btn.dataset.tab));
  });

  document.getElementById('logoutBtn').addEventListener('click', () => {
    if (typeof logoutUser === 'function') logoutUser();
    window.location.href = 'login.html';
  });

  document.getElementById('refreshBtn').addEventListener('click', renderAll);

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });
  [document.getElementById('userModal'), document.getElementById('tripModal'), document.getElementById('confirmModal')].forEach(modal => {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) closeModal(modal.id);
    });
  });

  document.getElementById('confirmCancelBtn').addEventListener('click', () => closeModal('confirmModal'));
  document.getElementById('confirmOkBtn').addEventListener('click', () => {
    if (typeof state.pendingConfirm === 'function') state.pendingConfirm();
    closeModal('confirmModal');
  });
  document.getElementById('userSearch').addEventListener('input', debounce((e) => {
    state.users.search = e.target.value.trim().toLowerCase();
    state.users.page = 1;
    renderUsers();
  }, 200));
  document.getElementById('userRoleFilter').addEventListener('change', (e) => {
    state.users.role = e.target.value;
    state.users.page = 1;
    renderUsers();
  });
  document.getElementById('userStatusFilter').addEventListener('change', (e) => {
    state.users.status = e.target.value;
    state.users.page = 1;
    renderUsers();
  });
  document.getElementById('exportUsersBtn').addEventListener('click', exportUsersCSV);
  document.getElementById('tripSearch').addEventListener('input', debounce((e) => {
    state.trips.search = e.target.value.trim().toLowerCase();
    state.trips.page = 1;
    renderTrips();
  }, 200));
  document.getElementById('tripStatusFilter').addEventListener('change', (e) => {
    state.trips.status = e.target.value;
    state.trips.page = 1;
    renderTrips();
  });
  document.getElementById('exportTripsBtn').addEventListener('click', exportTripsCSV);
  document.getElementById('requestStatusFilter').addEventListener('change', (e) => {
    state.requests.status = e.target.value;
    renderRequests();
  });
  document.getElementById('clearLogBtn').addEventListener('click', () => {
    openConfirm('Clear activity log?', 'This will permanently remove all recorded admin actions.', () => {
      clearActivityLog();
      toast('Activity log cleared', 'default');
      renderActivity();
    });
  });
}

function switchTab(tabId) {
  state.tab = tabId;
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-link').forEach(b => {
    b.classList.remove('active');
    const ind = b.querySelector('.nav-indicator');
    if (ind) ind.remove();
  });
  document.getElementById(tabId).classList.add('active');
  const activeBtn = document.querySelector(`.nav-link[data-tab="${tabId}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
    if (!activeBtn.querySelector('.nav-indicator')) {
      const ind = document.createElement('span');
      ind.className = 'nav-indicator';
      activeBtn.prepend(ind);
    }
  }
  const titles = {
    'tab-dashboard': 'Dashboard',
    'tab-users': 'Users',
    'tab-trips': 'Trips',
    'tab-requests': 'Join Requests',
    'tab-activity': 'Activity Log'
  };
  const subtitles = {
    'tab-dashboard': 'Overview of your Kibi platform',
    'tab-users': 'Manage registered users',
    'tab-trips': 'Manage all trips',
    'tab-requests': 'Review trip join requests',
    'tab-activity': 'Audit trail of admin actions'
  };
  document.getElementById('pageTitle').textContent = titles[tabId] || 'Dashboard';
  const sub = document.getElementById('pageSubtitle');
  if (sub) { sub.textContent = subtitles[tabId] || ''; sub.classList.remove('hidden'); }
}

function renderAll() {
  renderSidebarUser();
  renderNavCounts();
  renderDashboard();
  renderUsers();
  renderTrips();
  renderRequests();
  renderActivity();
  document.getElementById('lastUpdated').textContent = 'Updated ' + new Date().toLocaleTimeString();
}

function renderSidebarUser() {
  const u = state.currentAdmin;
  const avatarEl = document.getElementById('sidebarUserAvatar');
  const infoEl = document.getElementById('sidebarUserInfo');
  if (avatarEl) avatarEl.textContent = (u.name || u.email || 'A').charAt(0).toUpperCase();
  if (infoEl) {
    infoEl.querySelector('div:first-child').textContent = u.name || 'Admin';
    infoEl.querySelector('div:last-child').textContent = u.email || '';
  }
}

function renderNavCounts() {
  document.getElementById('navUserCount').textContent = getUsers().length;
  document.getElementById('navTripCount').textContent = getTrips().length;
  const pending = getJoinRequests().filter(r => r.status === 'pending').length;
  const reqCountEl = document.getElementById('navRequestCount');
  reqCountEl.textContent = pending;
  reqCountEl.classList.toggle('hidden', pending === 0);
}


function renderDashboard() {
  const stats = getAdminStats();
  const cards = [
    { label: 'Total Users', value: stats.totalUsers, sub: `+${stats.newUsersThisWeek} this week`, icon: 'fa-users', iconBg: 'bg-blue-50', iconColor: 'text-blue-500', accent: 'from-blue-500 to-blue-600' },
    { label: 'Admins', value: stats.admins, sub: `${stats.suspended} suspended`, icon: 'fa-shield-halved', iconBg: 'bg-indigo-50', iconColor: 'text-indigo-500', accent: 'from-indigo-500 to-indigo-600' },
    { label: 'Total Trips', value: stats.totalTrips, sub: `+${stats.newTripsThisWeek} this week`, icon: 'fa-route', iconBg: 'bg-orange-50', iconColor: 'text-orange-500', accent: 'from-orange-400 to-orange-500' },
    { label: 'Open Trips', value: stats.openTrips, sub: `${stats.totalTrips - stats.openTrips} closed/full`, icon: 'fa-map-location-dot', iconBg: 'bg-emerald-50', iconColor: 'text-emerald-500', accent: 'from-emerald-500 to-emerald-600' },
    { label: 'Pending Requests', value: stats.pendingRequests, sub: `${stats.totalRequests} total`, icon: 'fa-envelope-open-text', iconBg: 'bg-amber-50', iconColor: 'text-amber-500', accent: 'from-amber-400 to-amber-500' }
  ];

  document.getElementById('statsGrid').innerHTML = cards.map(c => `
    <div class="stat-card p-5 cursor-default">
      <div class="flex items-start justify-between mb-3">
        <div class="stat-icon ${c.iconBg}"><i class="fa-solid ${c.icon} ${c.iconColor} text-lg"></i></div>
        <div class="h-1 w-12 rounded-full bg-gradient-to-r ${c.accent} opacity-60"></div>
      </div>
      <div class="text-3xl font-bold text-gray-900 font-heading tracking-tight mb-0.5">${c.value}</div>
      <div class="text-sm font-semibold text-gray-600">${c.label}</div>
      <div class="text-xs text-gray-400 mt-1">${c.sub}</div>
    </div>
  `).join('');

  const avatarColors = ['bg-blue-100 text-blue-600', 'bg-violet-100 text-violet-600', 'bg-emerald-100 text-emerald-600', 'bg-amber-100 text-amber-600', 'bg-rose-100 text-rose-600'];
  const recentUsers = [...getUsers()].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)).slice(0, 5);
  document.getElementById('recentUsers').innerHTML = recentUsers.length ? recentUsers.map(u => {
    const role = u.role || 'user';
    const initial = (u.name || u.email || '?').charAt(0).toUpperCase();
    const color = avatarColors[initial.charCodeAt(0) % avatarColors.length];
    return `
      <div class="flex items-center justify-between gap-3 py-1">
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-9 h-9 rounded-full ${color} flex items-center justify-center text-sm font-bold shrink-0">${initial}</div>
          <div class="min-w-0">
            <div class="text-sm font-semibold text-gray-800 truncate">${escapeHtml(u.name || 'N/A')}</div>
            <div class="text-xs text-gray-400 truncate">${escapeHtml(u.email || '')}</div>
          </div>
        </div>
        <div class="flex items-center gap-2 shrink-0">
          <span class="badge badge-${role}">${capitalize(role)}</span>
          <span class="text-xs text-gray-400 whitespace-nowrap">${timeAgo(u.createdAt)}</span>
        </div>
      </div>`;
  }).join('') : `<div class="text-center py-6"><i class="fa-solid fa-users text-gray-200 text-3xl mb-2"></i><p class="text-sm text-gray-400">No users yet.</p></div>`;

  const actColors = { role_change: 'bg-blue-400', status_change: 'bg-amber-400', user_deleted: 'bg-red-400', trip_featured: 'bg-purple-400', trip_deleted: 'bg-red-400', join_approved: 'bg-emerald-400', join_rejected: 'bg-orange-400' };
  const recentActivity = getActivityLog().slice(0, 6);
  document.getElementById('recentActivity').innerHTML = recentActivity.length ? recentActivity.map(a => `
    <div class="flex items-start gap-3 py-1">
      <div class="activity-dot mt-1.5 ${actColors[a.action] || 'bg-gray-300'} shrink-0"></div>
      <div class="min-w-0 flex-1">
        <div class="text-sm text-gray-800 leading-snug">${escapeHtml(a.details || a.action)}</div>
        <div class="text-xs text-gray-400 mt-0.5">${actionLabel(a.action)}</div>
      </div>
      <span class="text-xs text-gray-400 whitespace-nowrap shrink-0">${timeAgo(a.createdAt)}</span>
    </div>
  `).join('') : `<div class="text-center py-6"><i class="fa-solid fa-clock-rotate-left text-gray-200 text-3xl mb-2"></i><p class="text-sm text-gray-400">No activity recorded yet.</p></div>`;
}


function getFilteredUsers() {
  let users = getUsers();
  const { search, role, status } = state.users;
  if (search) {
    users = users.filter(u =>
      (u.name || '').toLowerCase().includes(search) ||
      (u.email || '').toLowerCase().includes(search)
    );
  }
  if (role) users = users.filter(u => (u.role || 'user') === role);
  if (status) users = users.filter(u => (u.status || 'active') === status);
  return users.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function renderUsers() {
  const container = document.getElementById('usersContainer');
  const all = getFilteredUsers();
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  state.users.page = Math.min(state.users.page, totalPages);
  const start = (state.users.page - 1) * PAGE_SIZE;
  const pageItems = all.slice(start, start + PAGE_SIZE);

  if (all.length === 0) {
    container.innerHTML = '<p class="p-8 text-center text-gray-400">No users match your filters.</p>';
    document.getElementById('usersPagination').innerHTML = '';
    return;
  }

  container.innerHTML = `
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50/80 border-b border-gray-200">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        ${pageItems.map(u => userRow(u)).join('')}
      </tbody>
    </table>
  `;

  container.querySelectorAll('[data-edit-user]').forEach(btn => {
    btn.addEventListener('click', () => openUserModal(btn.dataset.editUser));
  });
  container.querySelectorAll('[data-delete-user]').forEach(btn => {
    btn.addEventListener('click', () => confirmDeleteUser(btn.dataset.deleteUser));
  });

  renderPagination('usersPagination', state.users.page, totalPages, all.length, (p) => {
    state.users.page = p;
    renderUsers();
  });
}

function userRow(u) {
  const role = u.role || 'user';
  const status = u.status || 'active';
  const isSelf = state.currentAdmin && u.id === state.currentAdmin.id;
  return `
    <tr class="hover:bg-gray-50">
      <td class="px-6 py-4 whitespace-nowrap">
        <div class="flex items-center gap-3">
          <div class="w-9 h-9 rounded-full bg-gray-100 flex items-center justify-center text-sm font-semibold text-gray-500 shrink-0">${(u.name || u.email || '?').charAt(0).toUpperCase()}</div>
          <div class="min-w-0">
            <div class="text-sm font-medium text-gray-900 truncate">${escapeHtml(u.name || 'N/A')} ${isSelf ? '<span class="text-xs text-gray-400">(you)</span>' : ''}</div>
            <div class="text-xs text-gray-500 truncate">${escapeHtml(u.email || '')}</div>
          </div>
        </div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="text-xs font-medium px-2.5 py-1 rounded-full role-badge-${role}">${capitalize(role)}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="text-xs font-medium px-2.5 py-1 rounded-full status-badge-${status}">${capitalize(status)}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${u.createdAt ? new Date(u.createdAt).toLocaleDateString() : 'N/A'}</td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
        <button data-edit-user="${u.id}" class="text-primary hover:text-accent hover:underline font-medium transition-colors mr-4">Edit</button>
        <button data-delete-user="${u.id}" class="text-error hover:underline font-medium" ${isSelf ? 'disabled title="You can\'t delete your own account"' : ''} style="${isSelf ? 'opacity:.4;cursor:not-allowed' : ''}">Delete</button>
      </td>
    </tr>
  `;
}

function openUserModal(userId) {
  const u = getUserById(userId);
  if (!u) return;
  const role = u.role || 'user';
  const status = u.status || 'active';
  const isSelf = state.currentAdmin && u.id === state.currentAdmin.id;

  document.getElementById('userModalBody').innerHTML = `
    <div class="flex items-center gap-3 mb-2">
      <div class="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center text-lg font-semibold text-gray-500">${(u.name || u.email || '?').charAt(0).toUpperCase()}</div>
      <div class="min-w-0">
        <div class="font-medium text-gray-900 truncate">${escapeHtml(u.name || 'N/A')}</div>
        <div class="text-xs text-gray-500 truncate">${escapeHtml(u.email || '')}</div>
      </div>
    </div>
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">Role</label>
      <select id="modalRoleSelect" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" ${isSelf ? 'disabled' : ''}>
        <option value="user" ${role === 'user' ? 'selected' : ''}>User</option>
        <option value="moderator" ${role === 'moderator' ? 'selected' : ''}>Moderator</option>
        <option value="admin" ${role === 'admin' ? 'selected' : ''}>Admin</option>
      </select>
      ${isSelf ? '<p class="text-xs text-gray-400 mt-1">You can\'t change your own role.</p>' : ''}
    </div>
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">Status</label>
      <select id="modalStatusSelect" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" ${isSelf ? 'disabled' : ''}>
        <option value="active" ${status === 'active' ? 'selected' : ''}>Active</option>
        <option value="suspended" ${status === 'suspended' ? 'selected' : ''}>Suspended</option>
        <option value="banned" ${status === 'banned' ? 'selected' : ''}>Banned</option>
      </select>
    </div>
    <div>
      <label class="block text-xs font-medium text-gray-500 mb-1">Reason (optional, shown in audit log)</label>
      <input id="modalReasonInput" type="text" placeholder="e.g. spam reports" class="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" value="${escapeHtml(u.statusReason || '')}">
    </div>
    <div class="flex gap-3 pt-2">
      <button id="modalCancelBtn" class="flex-1 py-2.5 rounded-lg border border-gray-200 text-gray-600 text-sm font-medium hover:bg-gray-50">Cancel</button>
      <button id="modalSaveBtn" class="flex-1 py-2.5 rounded-lg btn-primary text-sm font-medium">Save Changes</button>
    </div>
  `;

  openModal('userModal');
  document.getElementById('modalCancelBtn').addEventListener('click', () => closeModal('userModal'));
  document.getElementById('modalSaveBtn').addEventListener('click', () => {
    if (!isSelf) {
      const newRole = document.getElementById('modalRoleSelect').value;
      const newStatus = document.getElementById('modalStatusSelect').value;
      const reason = document.getElementById('modalReasonInput').value.trim();

      if (role === 'admin' && newRole !== 'admin' && getUsers().filter(x => isUserAdmin(x)).length <= 1) {
        toast("Can't remove the last admin", 'error');
        return;
      }

      if (newRole !== role) setUserRole(u.id, newRole);
      if (newStatus !== status || reason !== (u.statusReason || '')) setUserStatus(u.id, newStatus, reason);
      toast('User updated', 'success');
    }
    closeModal('userModal');
    renderUsers();
    renderDashboard();
    renderActivity();
  });
}

function confirmDeleteUser(userId) {
  const u = getUserById(userId);
  if (!u) return;
  if (state.currentAdmin && u.id === state.currentAdmin.id) {
    toast("You can't delete your own account", 'error');
    return;
  }
  openConfirm(
    `Delete ${u.name || u.email || 'this user'}?`,
    'This permanently removes the user, their trips, join requests, and saved data. This cannot be undone.',
    () => {
      deleteUser(userId);
      toast('User deleted', 'success');
      renderAll();
    }
  );
}

function exportUsersCSV() {
  const rows = getFilteredUsers().map(u => ({
    id: u.id, name: u.name || '', email: u.email || '',
    role: u.role || 'user', status: u.status || 'active',
    createdAt: u.createdAt || ''
  }));
  downloadCSV('users.csv', rows);
}


function getFilteredTrips() {
  let trips = getTrips();
  const { search, status } = state.trips;
  if (search) {
    trips = trips.filter(t =>
      (t.title || '').toLowerCase().includes(search) ||
      (t.destination || '').toLowerCase().includes(search)
    );
  }
  if (status) trips = trips.filter(t => (t.status || 'open') === status);
  return trips.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
}

function renderTrips() {
  const container = document.getElementById('tripsContainer');
  const all = getFilteredTrips();
  const totalPages = Math.max(1, Math.ceil(all.length / PAGE_SIZE));
  state.trips.page = Math.min(state.trips.page, totalPages);
  const start = (state.trips.page - 1) * PAGE_SIZE;
  const pageItems = all.slice(start, start + PAGE_SIZE);

  if (all.length === 0) {
    container.innerHTML = '<p class="p-8 text-center text-gray-400">No trips match your filters.</p>';
    document.getElementById('tripsPagination').innerHTML = '';
    return;
  }

  container.innerHTML = `
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50/80 border-b border-gray-200">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Destination</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dates</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Members</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        ${pageItems.map(t => tripRow(t)).join('')}
      </tbody>
    </table>
  `;

  container.querySelectorAll('[data-view-trip]').forEach(btn => {
    btn.addEventListener('click', () => openTripModal(btn.dataset.viewTrip));
  });
  container.querySelectorAll('[data-feature-trip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = getTripById(btn.dataset.featureTrip);
      setTripFeatured(t.id, !t.featured);
      toast(t.featured ? 'Trip unfeatured' : 'Trip featured', 'default');
      renderTrips();
      renderActivity();
    });
  });
  container.querySelectorAll('[data-delete-trip]').forEach(btn => {
    btn.addEventListener('click', () => {
      const t = getTripById(btn.dataset.deleteTrip);
      openConfirm(
        `Delete "${t.title || t.destination}"?`,
        'This permanently removes the trip and any related join requests.',
        () => {
          adminDeleteTrip(t.id);
          toast('Trip deleted', 'success');
          renderAll();
        }
      );
    });
  });

  renderPagination('tripsPagination', state.trips.page, totalPages, all.length, (p) => {
    state.trips.page = p;
    renderTrips();
  });
}

function tripRow(t) {
  const status = t.status || 'open';
  const statusColors = { open: 'bg-green-100 text-green-700', closed: 'bg-gray-100 text-gray-600', full: 'bg-amber-100 text-amber-700' };
  return `
    <tr class="hover:bg-gray-50">
      <td class="px-6 py-4 whitespace-nowrap text-sm">
        <div class="font-medium text-gray-900">${escapeHtml(t.title || 'Untitled')} ${t.featured ? '<span title="Featured">⭐</span>' : ''}</div>
        <div class="text-xs text-gray-500">${t.id}</div>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${escapeHtml(t.destination || 'N/A')}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${t.startDate || 'N/A'} – ${t.endDate || 'N/A'}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${t.members ? t.members.length : 0}${t.maxMembers ? '/' + t.maxMembers : ''}</td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[status] || statusColors.open}">${capitalize(status)}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
        <button data-view-trip="${t.id}" class="text-primary hover:text-accent hover:underline font-medium transition-colors mr-3">View</button>
        <button data-feature-trip="${t.id}" class="text-gray-500 hover:underline font-medium mr-3">${t.featured ? 'Unfeature' : 'Feature'}</button>
        <button data-delete-trip="${t.id}" class="text-error hover:underline font-medium">Delete</button>
      </td>
    </tr>
  `;
}

function openTripModal(tripId) {
  const t = getTripById(tripId);
  if (!t) return;
  const creator = t.createdBy ? getUserById(t.createdBy) : null;
  const memberNames = (t.members || []).map(id => {
    const m = getUserById(id);
    return m ? (m.name || m.email || id) : id;
  });

  document.getElementById('tripModalBody').innerHTML = `
    <div>
      <div class="font-semibold text-gray-900 text-base">${escapeHtml(t.title || t.destination || 'Untitled trip')}</div>
      <div class="text-gray-500">${escapeHtml(t.destination || '')}</div>
    </div>
    <div class="grid grid-cols-2 gap-3 text-gray-600">
      <div><span class="text-xs text-gray-400 block">Dates</span>${t.startDate || 'N/A'} – ${t.endDate || 'N/A'}</div>
      <div><span class="text-xs text-gray-400 block">Budget</span>${t.budget ? '₹' + t.budget : 'N/A'}</div>
      <div><span class="text-xs text-gray-400 block">Status</span>${capitalize(t.status || 'open')}</div>
      <div><span class="text-xs text-gray-400 block">Created by</span>${creator ? escapeHtml(creator.name || creator.email) : (t.createdBy || 'N/A')}</div>
    </div>
    ${t.description ? `<div><span class="text-xs text-gray-400 block mb-1">Description</span><p class="text-gray-600">${escapeHtml(t.description)}</p></div>` : ''}
    <div>
      <span class="text-xs text-gray-400 block mb-1">Members (${memberNames.length})</span>
      ${memberNames.length ? `<div class="flex flex-wrap gap-1.5">${memberNames.map(n => `<span class="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">${escapeHtml(n)}</span>`).join('')}</div>` : '<p class="text-gray-400">No members yet.</p>'}
    </div>
  `;
  openModal('tripModal');
}

function exportTripsCSV() {
  const rows = getFilteredTrips().map(t => ({
    id: t.id, title: t.title || '', destination: t.destination || '',
    startDate: t.startDate || '', endDate: t.endDate || '',
    members: (t.members || []).length, status: t.status || 'open',
    featured: !!t.featured
  }));
  downloadCSV('trips.csv', rows);
}


function renderRequests() {
  const container = document.getElementById('requestsContainer');
  let requests = getJoinRequests().sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  if (state.requests.status) requests = requests.filter(r => r.status === state.requests.status);

  if (requests.length === 0) {
    container.innerHTML = '<p class="p-8 text-center text-gray-400">No join requests found.</p>';
    return;
  }

  container.innerHTML = `
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50/80 border-b border-gray-200">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requester</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Trip</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requested</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
          <th class="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        ${requests.map(r => requestRow(r)).join('')}
      </tbody>
    </table>
  `;

  container.querySelectorAll('[data-approve-req]').forEach(btn => {
    btn.addEventListener('click', () => {
      approveJoinRequest(btn.dataset.approveReq);
      toast('Request approved', 'success');
      renderAll();
    });
  });
  container.querySelectorAll('[data-reject-req]').forEach(btn => {
    btn.addEventListener('click', () => {
      rejectJoinRequest(btn.dataset.rejectReq);
      toast('Request rejected', 'default');
      renderAll();
    });
  });
  container.querySelectorAll('[data-delete-req]').forEach(btn => {
    btn.addEventListener('click', () => {
      openConfirm('Delete this request?', 'This removes the join request record entirely.', () => {
        deleteJoinRequest(btn.dataset.deleteReq);
        toast('Request deleted', 'default');
        renderAll();
      });
    });
  });
}

function requestRow(r) {
  const requester = getUserById(r.userId);
  const trip = getTripById(r.tripId);
  const statusColors = { pending: 'bg-amber-100 text-amber-700', approved: 'bg-green-100 text-green-700', rejected: 'bg-red-100 text-red-700' };
  return `
    <tr class="hover:bg-gray-50">
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-900">${requester ? escapeHtml(requester.name || requester.email) : (r.userId || 'N/A')}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${trip ? escapeHtml(trip.title || trip.destination) : (r.tripId || 'N/A')}</td>
      <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${r.createdAt ? new Date(r.createdAt).toLocaleDateString() : 'N/A'}</td>
      <td class="px-6 py-4 whitespace-nowrap">
        <span class="text-xs font-medium px-2.5 py-1 rounded-full ${statusColors[r.status] || statusColors.pending}">${capitalize(r.status || 'pending')}</span>
      </td>
      <td class="px-6 py-4 whitespace-nowrap text-right text-sm">
        ${r.status === 'pending' ? `
          <button data-approve-req="${r.id}" class="text-green-600 hover:underline font-medium mr-3">Approve</button>
          <button data-reject-req="${r.id}" class="text-amber-600 hover:underline font-medium mr-3">Reject</button>
        ` : ''}
        <button data-delete-req="${r.id}" class="text-error hover:underline font-medium">Delete</button>
      </td>
    </tr>
  `;
}


function renderActivity() {
  const container = document.getElementById('activityContainer');
  const log = getActivityLog();

  if (log.length === 0) {
    container.innerHTML = '<p class="p-8 text-center text-gray-400">No admin actions recorded yet.</p>';
    return;
  }

  container.innerHTML = `
    <table class="min-w-full divide-y divide-gray-200">
      <thead class="bg-gray-50/80 border-b border-gray-200">
        <tr>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Details</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actor</th>
          <th class="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">When</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-gray-200">
        ${log.slice(0, 200).map(a => {
          const actor = getUserById(a.actorId);
          return `
            <tr class="hover:bg-gray-50">
              <td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${actionLabel(a.action)}</td>
              <td class="px-6 py-4 text-sm text-gray-500">${escapeHtml(a.details || '')}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${actor ? escapeHtml(actor.name || actor.email) : (a.actorId || 'system')}</td>
              <td class="px-6 py-4 whitespace-nowrap text-sm text-gray-400">${timeAgo(a.createdAt)}</td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function actionLabel(action) {
  const labels = {
    role_change: 'Role changed',
    status_change: 'Status changed',
    user_deleted: 'User deleted',
    trip_featured: 'Trip featured',
    trip_status_change: 'Trip status changed',
    trip_deleted: 'Trip deleted',
    join_approved: 'Join request approved',
    join_rejected: 'Join request rejected'
  };
  return labels[action] || action;
}


function renderPagination(containerId, page, totalPages, totalItems, onChange) {
  const el = document.getElementById(containerId);
  if (totalPages <= 1) { el.innerHTML = `<span>${totalItems} total</span>`; return; }

  el.innerHTML = `
    <span>Page ${page} of ${totalPages} · ${totalItems} total</span>
    <div class="flex gap-2">
      <button id="${containerId}-prev" class="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-40" ${page <= 1 ? 'disabled' : ''}>Previous</button>
      <button id="${containerId}-next" class="px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 hover:border-gray-300 transition-colors disabled:opacity-40" ${page >= totalPages ? 'disabled' : ''}>Next</button>
    </div>
  `;
  const prev = document.getElementById(`${containerId}-prev`);
  const next = document.getElementById(`${containerId}-next`);
  if (prev) prev.addEventListener('click', () => onChange(page - 1));
  if (next) next.addEventListener('click', () => onChange(page + 1));
}

function openModal(id) {
  const m = document.getElementById(id);
  m.classList.remove('hidden');
  m.classList.add('flex');
}
function closeModal(id) {
  const m = document.getElementById(id);
  m.classList.add('hidden');
  m.classList.remove('flex');
}

function openConfirm(title, message, onConfirm) {
  document.getElementById('confirmTitle').textContent = title;
  document.getElementById('confirmMessage').textContent = message;
  state.pendingConfirm = onConfirm;
  openModal('confirmModal');
}

function toast(message, type = 'default') {
  const colors = {
    default: 'bg-gray-900 text-white',
    success: 'bg-green-600 text-white',
    error: 'bg-red-600 text-white'
  };
  const el = document.createElement('div');
  el.className = `toast px-4 py-2.5 rounded-lg shadow-lg text-sm font-medium ${colors[type] || colors.default}`;
  el.textContent = message;
  document.getElementById('toastContainer').appendChild(el);
  setTimeout(() => {
    el.style.transition = 'opacity .2s';
    el.style.opacity = '0';
    setTimeout(() => el.remove(), 200);
  }, 2600);
}

function downloadCSV(filename, rows) {
  if (!rows.length) { toast('Nothing to export', 'default'); return; }
  const headers = Object.keys(rows[0]);
  const csvLines = [
    headers.join(','),
    ...rows.map(r => headers.map(h => csvEscape(r[h])).join(','))
  ];
  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  toast('Exported ' + filename, 'success');
}

function csvEscape(value) {
  const str = String(value === undefined || value === null ? '' : value);
  if (/[",\n]/.test(str)) return `"${str.replace(/"/g, '""')}"`;
  return str;
}

function escapeHtml(str) {
  if (str === undefined || str === null) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function timeAgo(dateStr) {
  if (!dateStr) return 'N/A';
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}