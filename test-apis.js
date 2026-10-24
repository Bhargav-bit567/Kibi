// test-apis.js - Independent test runner for all Kibi external APIs
// Run: node test-apis.js

const results = [];

async function probe(name, url, options = {}, validator = null) {
  const start = Date.now();
  try {
    const res = await fetch(url, {
      ...options,
      signal: AbortSignal.timeout(options.timeout || 10000)
    });
    const elapsed = Date.now() - start;
    if (!res.ok) {
      results.push({ name, status: 'FAIL', code: res.status, elapsed: `${elapsed}ms`, note: `HTTP ${res.statusText}` });
      return null;
    }
    const data = await res.json();
    let valid = true;
    let note = 'OK';
    if (validator) {
      const vResult = validator(data);
      if (typeof vResult === 'string') {
        valid = false;
        note = vResult;
      } else if (!vResult) {
        valid = false;
        note = 'Validation check failed';
      }
    }
    results.push({ name, status: valid ? 'PASS' : 'WARN', code: res.status, elapsed: `${elapsed}ms`, note });
    return data;
  } catch (err) {
    const elapsed = Date.now() - start;
    results.push({ name, status: 'FAIL', code: 'ERR', elapsed: `${elapsed}ms`, note: err.message });
    return null;
  }
}

async function runAll() {
  console.log('Probing Kibi APIs...\n');

  // 1. Nominatim Geocoding
  await probe(
    'Nominatim Geocoding (OSM)',
    'https://nominatim.openstreetmap.org/search?q=Manali&format=json&limit=1&featuretype=city',
    { headers: { 'User-Agent': 'KibiTravelApp/1.0 (Testing)' } },
    d => Array.isArray(d) && d.length > 0 && d[0].lat ? true : 'Empty or invalid array'
  );

  // 2. Open-Meteo Weather
  await probe(
    'Open-Meteo Weather',
    'https://api.open-meteo.com/v1/forecast?latitude=32.24&longitude=77.18&current_weather=true',
    {},
    d => d.current_weather && typeof d.current_weather.temperature === 'number' ? true : 'Missing temperature'
  );

  // 3. Wikipedia Summary (TripMate)
  await probe(
    'Wikipedia REST Summary',
    'https://en.wikipedia.org/api/rest_v1/page/summary/' + encodeURIComponent('Manali, Himachal Pradesh'),
    {},
    d => d.extract && d.extract.length > 20 ? true : 'Missing or short extract'
  );

  // 4. Sunrise-Sunset API
  await probe(
    'Sunrise-Sunset API',
    'https://api.sunrise-sunset.org/json?lat=32.24&lng=77.18&formatted=0',
    {},
    d => d.status === 'OK' && d.results?.sunrise ? true : 'Invalid status or missing sunrise'
  );

  // 5. Exchange Rate API
  await probe(
    'Exchange Rate API (open.er-api.com)',
    'https://open.er-api.com/v6/latest/INR',
    {},
    d => d.result === 'success' && d.rates?.USD ? true : 'Missing USD rate'
  );

  // 6. OpenTripMap (Hardcoded key check)
  const otmKey = '5ae2e3f221c38a28845f05b65ad5c69491fc9e193e19e64eaaf88418';
  await probe(
    'OpenTripMap (Geoname)',
    `https://api.opentripmap.com/0.1/en/places/geoname?name=Manali&apikey=${otmKey}`,
    {},
    d => typeof d.lat === 'number' ? true : 'No coordinates returned'
  );

  // 7. Overpass API (OpenStreetMap)
  const overpassQuery = '[out:json][timeout:10];node["tourism"="hotel"](around:2000,32.24,77.18);out 5;';
  await probe(
    'Overpass API (Primary)',
    'https://overpass-api.de/api/interpreter',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'data=' + encodeURIComponent(overpassQuery),
      timeout: 12000
    },
    d => Array.isArray(d.elements) ? true : 'Invalid elements payload'
  );

  // 8. OSRM Demo Routing (Free replacement candidate for ORS)
  await probe(
    'OSRM Public Routing (Candidate)',
    'https://router.project-osrm.org/route/v1/driving/77.18,32.24;77.19,32.25?overview=false',
    {},
    d => d.code === 'Ok' && Array.isArray(d.routes) && d.routes.length > 0 ? true : 'Route calculation failed'
  );

  // Print results summary table
  console.table(results);

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warned = results.filter(r => r.status === 'WARN').length;
  console.log(`Summary: ${passed} passed, ${warned} warnings, ${failed} failed.`);

  process.exit(failed > 0 ? 1 : 0);
}

runAll();
