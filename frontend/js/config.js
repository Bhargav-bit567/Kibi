/* Kibi — Client-side runtime configuration
   Settings come from the server (/api/config): whether "Continue with Google" and
   Kibi AI are enabled. Secrets (OAuth, Gemini key) stay in backend/.env. */

window.KIBI_CONFIG = window.KIBI_CONFIG || {
  GOOGLE_ENABLED: false,
  GEMINI_ENABLED: false
};

function loadKibiConfig() {
  const apiBase = (window.KIBI_API_BASE || '/api').replace(/\/$/, '');
  return fetch(`${apiBase}/config`, { cache: 'no-store' })
    .then(res => (res.ok ? res.json() : {}))
    .catch(() => ({}))
    .then(server => {
      window.KIBI_CONFIG = { ...window.KIBI_CONFIG, ...server };
      if (typeof onKibiConfigLoaded === 'function') onKibiConfigLoaded();
    });
}

// Expose the promise so other scripts can wait for config before using OAuth or AI
window.KIBI_CONFIG_READY = loadKibiConfig();
