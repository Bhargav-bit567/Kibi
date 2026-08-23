/* Kibi — Client-side runtime configuration
   Loads OAuth client IDs from /config.json (generated from .env by the developer).
   If config.json is missing, falls back to empty placeholders so the app still loads. */

window.KIBI_CONFIG = window.KIBI_CONFIG || {
  GOOGLE_CLIENT_ID: '',
  APPLE_CLIENT_ID: '',
  APPLE_REDIRECT_URI: ''
};

function loadKibiConfig() {
  return fetch('config.json', { cache: 'no-store' })
    .then(res => { if (!res.ok) throw new Error('not found'); return res.json(); })
    .then(cfg => {
      window.KIBI_CONFIG = { ...window.KIBI_CONFIG, ...cfg };
      if (typeof onKibiConfigLoaded === 'function') onKibiConfigLoaded();
    })
    .catch(e => {
      console.warn('Kibi config.json not found; OAuth buttons will use demo fallback until configured.');
    });
}

// Expose the promise so other scripts can wait for config before using OAuth
window.KIBI_CONFIG_READY = loadKibiConfig();
