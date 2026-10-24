/* ============================================
   Kibi — API Tester Dashboard JS
   ============================================ */

document.addEventListener('DOMContentLoaded', () => {
  if (typeof initNav === 'function') initNav('discover');
  setupTabs();
  setupButtons();
});

/* ── Tab switching ── */
function setupTabs() {
  document.querySelectorAll('.tab-pill').forEach(pill => {
    pill.addEventListener('click', () => {
      const tab = pill.dataset.tab;
      document.querySelectorAll('.tab-pill').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
      pill.classList.add('active');
      const pane = document.getElementById(`tab-${tab}`);
      if (pane) pane.classList.add('active');
    });
  });
}

function setupButtons() {
  document.getElementById('geocoding-test').addEventListener('click', testGeocoding);
  document.getElementById('images-test').addEventListener('click', testImages);
  document.getElementById('weather-test').addEventListener('click', testWeather);
  document.getElementById('pois-test').addEventListener('click', testPOIs);
  document.getElementById('desc-test').addEventListener('click', testDescription);

  // Enter key triggers test on focused tab
  document.querySelectorAll('.api-input').forEach(input => {
    input.addEventListener('keydown', e => {
      if (e.key === 'Enter') {
        const tab = input.closest('.tab-pane');
        if (tab) tab.querySelector('.btn-test')?.click();
      }
    });
  });
}

/* ── Quick-fill helpers ── */
function fillCoords(lat, lon) {
  document.getElementById('weather-lat').value = lat;
  document.getElementById('weather-lon').value = lon;
}
function fillPOICoords(lat, lon) {
  document.getElementById('pois-lat').value = lat;
  document.getElementById('pois-lon').value = lon;
}

/* ── Copy to clipboard ── */
function copyText(elId, btn) {
  const text = document.getElementById(elId)?.textContent || '';
  navigator.clipboard.writeText(text).then(() => {
    const orig = btn.innerHTML;
    btn.innerHTML = '<span class="material-symbols-outlined" style="font-size:14px">check</span>Copied!';
    setTimeout(() => { btn.innerHTML = orig; }, 1800);
  });
}

/* ── Shared UI helpers ── */
function setStatus(prefix, state, ms) {
  const wrap = document.getElementById(`${prefix}-status`);
  const badge = document.getElementById(`${prefix}-status-badge`);
  if (!wrap || !badge) return;
  wrap.classList.remove('hidden');

  const map = {
    testing: ['status-testing', '⏳ Testing…'],
    success: ['status-success', `✓ Success${ms ? ' · ' + ms + 'ms' : ''}`],
    error:   ['status-error',   `✗ Error${ms ? ' · ' + ms + 'ms' : ''}`],
  };
  badge.className = 'status-badge ' + (map[state]?.[0] || 'status-idle');
  badge.innerHTML = `<div class="status-dot"></div><span>${map[state]?.[1] || ''}</span>`;
}

function showURL(prefix, url, url2) {
  document.getElementById(`${prefix}-url`)?.classList.remove('hidden');
  const el = document.getElementById(`${prefix}-url-text`);
  if (el) el.textContent = url;
  if (url2) {
    const el2 = document.getElementById(`${prefix}-url-text2`);
    if (el2) el2.textContent = url2;
  }
}

function showResponse(prefix, data) {
  document.getElementById(`${prefix}-response`)?.classList.remove('hidden');
  document.getElementById(`${prefix}-empty`)?.classList.add('hidden');
  const el = document.getElementById(`${prefix}-response-text`);
  if (el) el.textContent = JSON.stringify(data, null, 2);
}

function setBtnLoading(id, loading) {
  const btn = document.getElementById(id);
  if (!btn) return;
  btn.classList.toggle('loading', loading);
  btn.disabled = loading;
}

/* ── Weather code → readable ── */
const WMO = {
  0:'Clear sky', 1:'Mainly clear', 2:'Partly cloudy', 3:'Overcast',
  45:'Fog', 48:'Rime fog', 51:'Light drizzle', 53:'Drizzle', 55:'Heavy drizzle',
  61:'Light rain', 63:'Rain', 65:'Heavy rain',
  71:'Light snow', 73:'Snow', 75:'Heavy snow',
  80:'Rain showers', 81:'Showers', 82:'Heavy showers',
  95:'Thunderstorm', 96:'Thunderstorm + hail',
};
const WMO_ICON = {
  0:'☀️', 1:'🌤️', 2:'⛅', 3:'☁️', 45:'🌫️', 48:'🌫️',
  51:'🌦️', 53:'🌧️', 55:'🌧️', 61:'🌦️', 63:'🌧️', 65:'🌧️',
  71:'❄️', 73:'❄️', 75:'❄️', 80:'🌦️', 81:'🌧️', 82:'⛈️',
  95:'⛈️', 96:'⛈️',
};

/* ═══════════════════════════════════════
   1. GEOCODING
   ═══════════════════════════════════════ */
async function testGeocoding() {
  const place = document.getElementById('geocoding-place').value.trim();
  if (!place) return alert('Enter a place name');

  setBtnLoading('geocoding-test', true);
  setStatus('geocoding', 'testing');
  const t0 = Date.now();

  const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(place)}&format=json&limit=1`;
  showURL('geocoding', url);

  try {
    const res = await fetch(url, { headers: { 'User-Agent': 'KibiTravelApp/1.0' } });
    const data = await res.json();
    const ms = Date.now() - t0;

    if (Array.isArray(data) && data.length > 0) {
      const result = { lat: data[0].lat, lon: data[0].lon, display_name: data[0].display_name };
      showResponse('geocoding', result);
      setStatus('geocoding', 'success', ms);
    } else {
      showResponse('geocoding', { error: 'No results found for: ' + place });
      setStatus('geocoding', 'error', ms);
    }
  } catch (e) {
    showResponse('geocoding', { error: e.message });
    setStatus('geocoding', 'error', Date.now() - t0);
  }
  setBtnLoading('geocoding-test', false);
}

/* ═══════════════════════════════════════
   2. IMAGES
   ═══════════════════════════════════════ */
async function testImages() {
  const place = document.getElementById('images-place').value.trim();
  if (!place) return alert('Enter a place name');

  setBtnLoading('images-test', true);
  setStatus('images', 'testing');
  const t0 = Date.now();

  const BAD = ['map','locator','flag','logo','icon','symbol','seal','emblem','svg',
               'diagram','chart','location','sat-nasa','satellite','stub','blank',
               'silhouette','red_dot','blue_dot','arrow','placeholder'];

  const searchUrl = `https://commons.wikimedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(place + ' landscape')}&srnamespace=6&srlimit=8&format=json&origin=*`;
  document.getElementById('images-url')?.classList.remove('hidden');
  document.getElementById('images-url-text').textContent = searchUrl;

  try {
    const searchRes = await fetch(searchUrl);
    const searchData = await searchRes.json();

    const fileTitles = (searchData.query?.search || [])
      .map(r => r.title)
      .filter(t => /\.(jpg|jpeg|png)$/i.test(t))
      .slice(0, 5);

    if (!fileTitles.length) {
      showResponse('images', { error: 'No image files found. Try a more specific name.' });
      setStatus('images', 'error', Date.now() - t0);
      setBtnLoading('images-test', false);
      return;
    }

    const infoUrl = `https://commons.wikimedia.org/w/api.php?action=query&titles=${encodeURIComponent(fileTitles.join('|'))}&prop=imageinfo&iiprop=url|size&format=json&origin=*`;
    document.getElementById('images-url-text2').textContent = infoUrl;

    const infoRes = await fetch(infoUrl);
    const infoData = await infoRes.json();
    const ms = Date.now() - t0;

    const urls = Object.values(infoData.query?.pages || {})
      .map(p => p.imageinfo?.[0]?.url?.split('?')[0])
      .filter(u => u && /\.(jpg|jpeg|png)$/i.test(u) && !BAD.some(kw => u.toLowerCase().includes(kw)));

    document.getElementById('images-empty')?.classList.add('hidden');

    if (urls.length > 0) {
      // Preview strip
      const strip = document.getElementById('images-preview-strip');
      const previewWrap = document.getElementById('images-preview');
      if (strip && previewWrap) {
        strip.innerHTML = urls.map(u =>
          `<img src="${u}" alt="Destination" loading="lazy" onerror="this.style.display='none'">`
        ).join('');
        previewWrap.classList.remove('hidden');
      }
      showResponse('images', { source: 'Wikimedia Commons', count: urls.length, urls });
      setStatus('images', 'success', ms);
    } else {
      showResponse('images', { error: 'All images were filtered (maps/flags). Try "Gulmarg Kashmir" or similar.' });
      setStatus('images', 'error', ms);
    }
  } catch (e) {
    showResponse('images', { error: e.message });
    setStatus('images', 'error', Date.now() - t0);
  }
  setBtnLoading('images-test', false);
}

/* ═══════════════════════════════════════
   3. WEATHER
   ═══════════════════════════════════════ */
async function testWeather() {
  const lat = document.getElementById('weather-lat').value.trim();
  const lon = document.getElementById('weather-lon').value.trim();
  if (!lat || !lon) return alert('Enter latitude and longitude');

  setBtnLoading('weather-test', true);
  setStatus('weather', 'testing');
  const t0 = Date.now();

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current_weather=true`;
  showURL('weather', url);

  try {
    const res = await fetch(url);
    const data = await res.json();
    const ms = Date.now() - t0;

    if (data.current_weather) {
      const cw = data.current_weather;
      const code = cw.weathercode;

      // Pretty widget
      document.getElementById('weather-empty')?.classList.add('hidden');
      document.getElementById('weather-widget')?.classList.remove('hidden');
      document.getElementById('ww-temp').textContent = `${cw.temperature}°C`;
      document.getElementById('ww-condition').textContent = WMO[code] || `Code ${code}`;
      document.getElementById('ww-icon').textContent = WMO_ICON[code] || '🌡️';
      document.getElementById('ww-wind').textContent = `Wind: ${cw.windspeed} km/h`;

      showResponse('weather', { temperature: cw.temperature, condition: WMO[code] || code, windspeed: cw.windspeed, timezone: data.timezone });
      setStatus('weather', 'success', ms);
    } else {
      showResponse('weather', { error: 'No current_weather in response' });
      setStatus('weather', 'error', ms);
    }
  } catch (e) {
    showResponse('weather', { error: e.message });
    setStatus('weather', 'error', Date.now() - t0);
  }
  setBtnLoading('weather-test', false);
}

/* ═══════════════════════════════════════
   4. POIs
   ═══════════════════════════════════════ */
const POI_ICONS = {
  hotel:'🏨', hostel:'🏨', motel:'🏨',
  restaurant:'🍽️', cafe:'☕', fast_food:'🍔', bar:'🍺',
  attraction:'🏛️', museum:'🏛️', park:'🌳', viewpoint:'🔭',
  place_of_worship:'🛕', shop:'🛍️',
};

async function testPOIs() {
  const lat = document.getElementById('pois-lat').value.trim();
  const lon = document.getElementById('pois-lon').value.trim();
  const radius = document.getElementById('pois-radius').value.trim() || '1000';
  if (!lat || !lon) return alert('Enter latitude and longitude');

  setBtnLoading('pois-test', true);
  setStatus('pois', 'testing');
  const t0 = Date.now();

  const query = `[out:json][timeout:10];(node["tourism"="hotel"](around:${radius},${lat},${lon});node["amenity"="restaurant"](around:${radius},${lat},${lon});node["tourism"="attraction"](around:${radius},${lat},${lon}););out 20;`;
  showURL('pois', `POST https://overpass-api.de/api/interpreter\n\nBody:\ndata=${encodeURIComponent(query)}`);

  try {
    const res = await fetch('https://overpass-api.de/api/interpreter', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(query)}`
    });
    const data = await res.json();
    const ms = Date.now() - t0;

    if (Array.isArray(data.elements)) {
      const pois = data.elements
        .filter(e => e.tags?.name)
        .map(e => ({
          name: e.tags.name,
          type: e.tags.tourism || e.tags.amenity || 'place',
          lat: e.lat, lon: e.lon
        }))
        .slice(0, 15);

      document.getElementById('pois-empty')?.classList.add('hidden');

      // Pretty list
      const listWrap = document.getElementById('pois-list');
      if (listWrap) {
        listWrap.classList.remove('hidden');
        listWrap.innerHTML = `<p class="section-label mb-2">${pois.length} places found</p>` +
          pois.map(p => {
            const icon = POI_ICONS[p.type] || '📍';
            return `<div class="flex items-center gap-3 p-3 rounded-xl bg-gray-50 dark:bg-slate-800/60">
              <span class="text-xl w-8 text-center">${icon}</span>
              <div class="min-w-0">
                <p class="font-semibold text-sm text-charcoal dark:text-white truncate">${p.name}</p>
                <p class="text-xs text-gray-400 capitalize">${p.type}</p>
              </div>
            </div>`;
          }).join('');
      }

      showResponse('pois', { count: pois.length, pois });
      setStatus('pois', 'success', ms);
    } else {
      showResponse('pois', { error: 'Unexpected response format' });
      setStatus('pois', 'error', ms);
    }
  } catch (e) {
    showResponse('pois', { error: e.message });
    setStatus('pois', 'error', Date.now() - t0);
  }
  setBtnLoading('pois-test', false);
}

/* ═══════════════════════════════════════
   5. DESCRIPTIONS
   ═══════════════════════════════════════ */
async function testDescription() {
  const place = document.getElementById('desc-place').value.trim();
  if (!place) return alert('Enter a place name');

  setBtnLoading('desc-test', true);
  setStatus('desc', 'testing');
  const t0 = Date.now();

  const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(place)}`;
  showURL('desc', url);

  try {
    const res = await fetch(url);
    const data = await res.json();
    const ms = Date.now() - t0;

    if (data.extract) {
      document.getElementById('desc-empty')?.classList.add('hidden');

      // Pretty widget
      const widget = document.getElementById('desc-widget');
      if (widget) {
        widget.classList.remove('hidden');
        const img = document.getElementById('desc-img');
        const imgSrc = data.originalimage?.source || data.thumbnail?.source;
        if (img) {
          img.src = imgSrc || '';
          img.style.display = imgSrc ? 'block' : 'none';
        }
        document.getElementById('desc-title').textContent = data.title;
        document.getElementById('desc-text').textContent = data.extract;
      }

      showResponse('desc', { title: data.title, description: data.extract.substring(0, 300) + '…', image: data.originalimage?.source || null });
      setStatus('desc', 'success', ms);
    } else {
      showResponse('desc', { error: 'No Wikipedia article found. Try adding "India" e.g. "Manali, India"' });
      setStatus('desc', 'error', ms);
    }
  } catch (e) {
    showResponse('desc', { error: e.message });
    setStatus('desc', 'error', Date.now() - t0);
  }
  setBtnLoading('desc-test', false);
}
