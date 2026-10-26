/* ============================================
   Kibi — Page loading skeleton + smooth page-to-page transitions
   Loaded first in <head> on every page.
   - Shows a shimmering skeleton (under the header) until the page's content
     and data are ready, then fades it out.
   - Opts into cross-document View Transitions so navigating between pages
     crossfades instead of flashing blank; the navbar stays in place.
   - Exposes window.KIBI_PAGE_SHOWN, resolved once the skeleton has faded,
     so animations (e.g. the navbar) start on a calm, fully rendered page.
   ============================================ */

(function () {
  const root = document.documentElement;
  const MAX_WAIT_MS = 8000; // never keep the skeleton up longer than this
  const FADE_MS = 280;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  let isDark = false;
  try {
    const saved = localStorage.getItem('kibi_theme');
    isDark = saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch (e) {}

  const colors = isDark
    ? { bg: '#0B0F17', block: '#161b22', shine: 'rgba(255,255,255,0.06)', card: '#11161d', edge: 'rgba(255,255,255,0.06)',
        hero: '#121a26', onHero: 'rgba(255,255,255,0.07)', sidebar: '#0d1a2e' }
    : { bg: '#f8fafc', block: '#e8eef5', shine: 'rgba(255,255,255,0.75)', card: '#ffffff', edge: 'rgba(15,23,42,0.06)',
        hero: '#dbe8f5', onHero: 'rgba(255,255,255,0.55)', sidebar: '#16325a' };

  const css = `
    @view-transition { navigation: auto; }
    ::view-transition-old(root), ::view-transition-new(root) { animation-duration: .3s; animation-timing-function: ease; }
    .gooey-nav { view-transition-name: kibi-nav; }

    #kibi-skeleton { position: fixed; inset: 0; z-index: 40; background: ${colors.bg}; overflow: hidden;
      transition: opacity ${FADE_MS}ms ease; pointer-events: none; }
    #kibi-skeleton.is-hiding { opacity: 0; }
    #kibi-skeleton .sk { border-radius: 12px; background: ${colors.block}; position: relative; overflow: hidden; flex-shrink: 0; max-width: 100%; }
    #kibi-skeleton .sk::after { content: ''; position: absolute; inset: 0; transform: translateX(-100%);
      background: linear-gradient(90deg, transparent, ${colors.shine}, transparent);
      animation: kibi-sk-shimmer 1.3s ease-in-out infinite; }
    #kibi-skeleton .sk.pill { border-radius: 999px; }
    #kibi-skeleton .sk.round { border-radius: 50%; }
    #kibi-skeleton .on-hero .sk { background: ${colors.onHero}; }
    #kibi-skeleton .hero { background: ${colors.hero}; position: relative; overflow: hidden; }
    #kibi-skeleton .card { background: ${colors.card}; border: 1px solid ${colors.edge}; border-radius: 22px; position: relative; overflow: hidden; }
    #kibi-skeleton .wrap { max-width: 1232px; margin: 0 auto; padding-left: 24px; padding-right: 24px; }
    #kibi-skeleton .c { margin-left: auto; margin-right: auto; }
    #kibi-skeleton .row { display: flex; align-items: center; gap: 12px; }
    #kibi-skeleton .wrap-row { display: flex; flex-wrap: wrap; gap: 10px; }
    #kibi-skeleton .between { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
    #kibi-skeleton .g2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
    #kibi-skeleton .g21 { display: grid; grid-template-columns: 2fr 1fr; gap: 40px; }
    #kibi-skeleton .g3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: 24px; }
    #kibi-skeleton .g4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 22px; }
    #kibi-skeleton .g5 { display: grid; grid-template-columns: repeat(5, 1fr); gap: 20px; }
    #kibi-skeleton .split { display: grid; grid-template-columns: 1fr 1fr; height: 100vh; }
    #kibi-skeleton .admin { display: grid; grid-template-columns: 256px 1fr; height: 100vh; }
    #kibi-skeleton .sidebar { background: ${colors.sidebar}; padding: 24px 12px; }
    #kibi-skeleton .sidebar .sk { background: rgba(255,255,255,0.10); }
    @media (max-width: 900px) {
      #kibi-skeleton .g2, #kibi-skeleton .g21, #kibi-skeleton .split { grid-template-columns: 1fr; }
      #kibi-skeleton .g3, #kibi-skeleton .g4, #kibi-skeleton .g5 { grid-template-columns: repeat(2, 1fr); }
      #kibi-skeleton .split > :first-child, #kibi-skeleton .hide-sm { display: none !important; }
      #kibi-skeleton .admin { grid-template-columns: 1fr; }
    }
    @media (max-width: 600px) { #kibi-skeleton .g3, #kibi-skeleton .g4, #kibi-skeleton .g5 { grid-template-columns: 1fr; } }
    @keyframes kibi-sk-shimmer { to { transform: translateX(100%); } }
    @media (prefers-reduced-motion: reduce) { #kibi-skeleton .sk::after { animation: none; } #kibi-skeleton { transition: none; } }
  `;

  const style = document.createElement('style');
  style.id = 'kibi-page-skeleton-css';
  style.textContent = css;
  document.head.appendChild(style);

  /* ---------- Page-specific skeletons (shaped like each page's real cards) ---------- */
  // b(width, height, extra classes, extra style) → one shimmering block
  const b = (w, h, cls = '', style = '') =>
    `<div class="sk ${cls}" style="width:${typeof w === 'number' ? w + 'px' : w};height:${h}px;${style}"></div>`;
  const lines = (widths, h = 14, gap = 10, center = false) =>
    widths.map(w => b(w, h, `pill${center ? ' c' : ''}`, `margin-bottom:${gap}px`)).join('');
  const chips = widths => `<div class="wrap-row">${widths.map(w => b(w, 34, 'pill')).join('')}</div>`;
  const field = (labelW = 90) => b(labelW, 12, 'pill', 'margin-bottom:10px') + b('100%', 54, '', 'border-radius:14px;margin-bottom:22px');
  const tripCard = () => `<div class="card">${b('100%', 190, '', 'border-radius:0')}
      <div style="padding:22px">${b('60%', 22, 'pill', 'margin-bottom:14px')}${b('42%', 14, 'pill', 'margin-bottom:16px')}${b(64, 22, 'pill', 'margin-bottom:24px')}
      <div class="between">${b(110, 18, 'pill')}${b(80, 40, 'pill')}</div></div></div>`;
  const dayCard = () => `<div class="card" style="padding:28px;margin-bottom:18px"><div class="row" style="margin-bottom:18px">${b(40, 40, 'round')}${b('40%', 24, 'pill')}</div>
      <div style="padding-left:52px">${lines(['70%', '50%'])}</div></div>`;

  const TEMPLATES = {
    index: () => `<div class="hero" style="height:100vh"><div class="on-hero" style="padding-top:160px;text-align:center">
        ${b(320, 30, 'pill c', 'margin-bottom:22px')}${b('min(460px,80%)', 100, 'c', 'border-radius:26px;margin-bottom:26px')}
        ${lines(['min(650px,86%)', 'min(520px,70%)'], 16, 12, true)}
        <div class="row" style="justify-content:center;margin-top:28px">${b(156, 44, 'pill')}${b(158, 44, 'pill')}</div></div></div>`,

    discover: () => `<div class="wrap" style="padding-top:166px;text-align:center">
        ${b(200, 28, 'pill c', 'margin-bottom:26px')}${b('min(400px,80%)', 56, 'c', 'margin-bottom:12px')}${b('min(330px,70%)', 56, 'c', 'margin-bottom:28px')}
        ${lines(['min(660px,90%)', 'min(510px,75%)'], 16, 12, true)}
        <div class="card c" style="max-width:894px;margin-top:56px;border-radius:26px;text-align:left">
          <div style="padding:26px 36px;border-bottom:1px solid ${colors.edge}">${b('48%', 18, 'pill')}</div>
          ${[[70, 74, 70, 70, 66, 70, 66, 66], [90, 106, 92, 104, 64, 96, 86], [80, 104, 94, 90, 96, 98, 82, 84]].map(row =>
            `<div style="padding:22px 24px;border-bottom:1px solid ${colors.edge}">${b(190, 14, 'pill', 'margin-bottom:18px')}${chips(row)}</div>`).join('')}
        </div></div>`,

    'plan-trip': () => `<div class="hero" style="min-height:100vh"><div class="wrap" style="padding-top:207px">
        <div class="card" style="border-radius:22px;padding:52px 48px">
          ${b('min(330px,80%)', 52, 'c', 'margin-bottom:20px')}${b('min(630px,90%)', 16, 'pill c', 'margin-bottom:52px')}
          <div class="g2"><div>${b(170, 30, '', 'margin-bottom:30px')}${field(100)}<div class="g2" style="gap:16px"><div>${field(80)}</div><div>${field(72)}</div></div>${field(90)}${field(130)}</div>
          <div>${['Travel Style', 'Interests'].map(() => `<div class="card" style="padding:28px;margin-bottom:32px">${b(170, 32, '', 'margin-bottom:24px')}${chips([116, 94, 102, 98, 84])}</div>`).join('')}</div></div>
        </div></div></div>`,

    itinerary: () => `<div class="wrap" style="max-width:1328px;padding-top:200px">
        <div class="between" style="margin-bottom:34px">${b(180, 18, 'pill')}<div class="row hide-sm">${b(84, 30, 'pill')}${b(96, 30, 'pill')}${b(122, 30, 'pill')}</div></div>
        <div class="hero" style="height:400px;border-radius:28px;margin-bottom:48px"><div class="on-hero" style="position:absolute;left:32px;bottom:34px;right:32px">
          <div class="row" style="margin-bottom:18px">${b(126, 28, 'pill')}${b(110, 16, 'pill')}</div>
          <div class="between">${b('min(330px,60%)', 46, '')}<div class="row hide-sm">${b(108, 44, 'pill')}${b(146, 44, 'pill')}</div></div></div></div>
        <div class="g21"><div>${b(190, 24, '', 'margin-bottom:26px')}${dayCard()}${dayCard()}</div><div class="hide-sm">${b('100%', 320, '', 'border-radius:24px')}</div></div></div>`,

    'saved-itinerary': () => `<div class="wrap" style="padding-top:190px">
        <div class="hero" style="height:397px;border-radius:28px;margin-bottom:44px"><div class="on-hero" style="position:absolute;left:32px;bottom:34px">${b(120, 26, 'pill', 'margin-bottom:16px')}${b(320, 46)}</div></div>
        <div class="g21"><div>${b(190, 24, '', 'margin-bottom:26px')}${dayCard()}${dayCard()}</div><div class="hide-sm">${b('100%', 300, '', 'border-radius:24px')}</div></div></div>`,

    'my-trips': () => `<div class="wrap" style="padding-top:236px">
        ${b('min(310px,80%)', 48, '', 'margin-bottom:20px')}${lines(['min(640px,90%)', 'min(400px,60%)'], 16, 10)}
        <div class="row" style="margin:52px 0 26px">${b(24, 24, '', 'border-radius:6px')}${b(170, 26)}</div>
        <div class="g3">${tripCard()}${tripCard()}<div class="card" style="border-style:dashed;border-width:2px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;min-height:400px">
          ${b(64, 64, 'round')}${b(180, 22, 'pill')}${b(150, 14, 'pill')}${b(150, 42, 'pill')}</div></div></div>`,

    dashboard: () => `<div class="wrap" style="max-width:1264px;padding-top:119px">
        <div style="position:relative;height:550px">
          <div class="hero" style="height:380px;border-radius:32px"></div>
          <div class="hide-sm" style="position:absolute;left:36px;top:342px;width:204px;height:204px;border-radius:50%;background:${colors.card};padding:6px;box-shadow:0 10px 30px rgba(0,0,0,.08)">${b('100%', 192, 'round')}</div>
          <div class="card hide-sm" style="position:absolute;left:272px;right:32px;top:268px;height:281px;border-radius:32px;padding:44px 40px;display:flex;gap:40px">
            <div style="flex:1">${b('min(260px,60%)', 40, '', 'margin-bottom:28px')}${lines(['92%', '70%'], 15, 12)}</div>
            <div style="width:200px;border-left:1px solid ${colors.edge};padding-left:32px">${[0, 1, 2].map(() => b(100, 11, 'pill', 'margin-bottom:10px') + b(80, 28, '', 'margin-bottom:18px')).join('')}</div>
          </div></div>
        <div class="g21" style="margin-top:46px"><div><div class="row" style="margin-bottom:24px">${b(32, 32, '', 'border-radius:8px')}${b(130, 28)}</div>${tripCard()}</div>
          <div class="card" style="padding:28px">${b(160, 22, '', 'margin-bottom:26px')}${[0, 1, 2].map(() => b('100%', 64, '', 'border-radius:18px;margin-bottom:14px')).join('')}</div></div></div>`,

    'trip-details': () => `<div class="hero" style="height:455px;border-radius:0 0 28px 28px"><div class="wrap on-hero" style="position:relative;height:100%">
          <div style="position:absolute;left:24px;bottom:62px">${b('min(380px,70vw)', 50, '', 'margin-bottom:16px')}${b(230, 18, 'pill')}</div></div></div>
        <div class="wrap g21" style="padding-top:34px"><div>${lines(['95%', '60%'], 16, 12)}<div style="margin-top:24px">${chips([56, 50, 62, 70, 90])}</div></div>
          <div><div class="card" style="padding:26px;margin-bottom:24px;text-align:center">${b(168, 62, 'pill c', 'margin-bottom:16px')}${b(180, 14, 'pill c')}</div>
          <div class="card" style="padding:26px">${b(110, 22, '', 'margin-bottom:24px')}<div class="row">${b(60, 14, 'pill')}${b(60, 14, 'pill')}${b(80, 14, 'pill')}</div></div></div></div>`,

    about: () => `<div class="wrap" style="padding-top:303px;text-align:center">
        ${b(196, 40, 'pill c', 'margin-bottom:44px')}${b('min(600px,90%)', 70, 'c', 'border-radius:18px;margin-bottom:16px')}${b('min(320px,60%)', 70, 'c', 'border-radius:18px;margin-bottom:34px')}
        ${lines(['min(650px,90%)', 'min(640px,88%)', 'min(250px,50%)'], 16, 12, true)}${b(194, 56, 'pill c', 'margin-top:40px')}</div>`,

    login: () => `<div class="split"><div class="hero on-hero" style="position:relative"><div style="position:absolute;left:48px;bottom:56px">${b(176, 44, 'pill', 'margin-bottom:30px')}${b(430, 40, '', 'margin-bottom:10px')}${b(130, 40, '', 'margin-bottom:22px')}${lines([420, 160], 15)}</div></div>
        <div style="display:flex;justify-content:center;padding-top:158px"><div style="width:min(420px,88vw)">
          <div class="between" style="margin-bottom:60px">${b(44, 26)}${b(40, 40, 'round')}</div>
          ${b(200, 32, '', 'margin-bottom:14px')}${b(330, 16, 'pill', 'margin-bottom:40px')}${field(110)}${field(80)}
          ${b('100%', 52, 'pill', 'margin:4px 0 30px')}${b('100%', 1, '', 'margin-bottom:30px')}${b('100%', 46, '', 'border-radius:12px;margin-bottom:34px')}${b(260, 14, 'pill c')}</div></div></div>`,

    signup: () => `<div class="split"><div class="hero on-hero" style="position:relative"><div style="position:absolute;left:0;right:0;top:44%;text-align:center">${b(190, 44, 'pill c', 'margin-bottom:30px')}${b(380, 46, 'c', 'margin-bottom:12px')}${b(360, 46, 'c', 'margin-bottom:22px')}${lines([300, 280], 15, 10, true)}</div></div>
        <div style="display:flex;justify-content:center;padding-top:96px"><div style="width:min(448px,88vw)">
          <div class="between" style="margin-bottom:22px">${b(1, 1, '', 'opacity:0')}${b(40, 40, 'round')}</div>
          ${b(280, 32, '', 'margin-bottom:12px')}${b(300, 16, 'pill', 'margin-bottom:30px')}${field(80)}${field(110)}${field(80)}
          <div class="row" style="margin:-10px 0 24px">${b(74, 22, 'pill')}${b(96, 22, 'pill')}${b(92, 22, 'pill')}${b(80, 22, 'pill')}</div>
          ${field(140)}<div class="row" style="margin-bottom:26px">${b(18, 18, '', 'border-radius:4px')}${b(300, 14, 'pill')}</div>${b('100%', 52, '', 'border-radius:14px')}</div></div></div>`,

    onboarding: () => `<div style="height:84px;border-bottom:1px solid ${colors.edge};display:flex;align-items:center;justify-content:center">${b(64, 26)}</div>
        <div class="wrap" style="max-width:1070px;text-align:center">
          <div class="row" style="justify-content:center;gap:8px;margin-top:28px">${[0, 1, 2, 3].map(() => b(138, 4, 'pill')).join('')}</div>
          ${b(96, 12, 'pill c', 'margin-top:22px')}${b('min(750px,90%)', 48, 'c', 'margin-top:44px')}${b('min(690px,85%)', 16, 'pill c', 'margin-top:22px')}
          <div class="g4" style="margin-top:44px">${b('100%', 186, '', 'border-radius:24px')}${b('100%', 186, '', 'border-radius:24px')}${b('100%', 186, '', 'border-radius:24px;grid-column:span 2')}
            ${[0, 1, 2, 3].map(() => b('100%', 186, '', 'border-radius:24px')).join('')}</div></div>`,

    admin: () => `<div class="admin"><div class="sidebar hide-sm">
          <div class="row" style="padding:0 12px;margin-bottom:46px">${b(32, 32, '', 'border-radius:9px')}${b(70, 22)}</div>
          ${[0, 1, 2, 3, 4].map(() => `<div class="row" style="padding:10px 12px;margin-bottom:8px">${b(18, 18, '', 'border-radius:5px')}${b(110, 14, 'pill')}</div>`).join('')}</div>
        <div><div class="between" style="height:62px;padding:0 32px;border-bottom:1px solid ${colors.edge};background:${colors.card}">${b(110, 20)}${b(94, 34, '', 'border-radius:10px')}</div>
          <div style="padding:32px">
            <div class="g5" style="margin-bottom:32px">${[0, 1, 2, 3, 4].map(() => `<div class="card" style="padding:20px;height:174px">${b(44, 44, '', 'border-radius:12px;margin-bottom:22px')}${b(40, 28, '', 'margin-bottom:12px')}${b(100, 14, 'pill', 'margin-bottom:10px')}${b(70, 11, 'pill')}</div>`).join('')}</div>
            <div class="g21" style="gap:20px;margin-bottom:24px"><div class="card" style="padding:22px;height:226px">${b(150, 16, 'pill', 'margin-bottom:10px')}${b(170, 11, 'pill')}</div>
              <div class="card" style="padding:22px">${b(100, 16, 'pill', 'margin-bottom:26px')}${[0, 1, 2].map(() => b('100%', 22, 'pill', 'margin-bottom:14px')).join('')}</div></div>
            <div class="g2" style="gap:20px">${[0, 1].map(() => `<div class="card" style="padding:22px;height:122px">${b(130, 16, 'pill', 'margin-bottom:22px')}<div class="row">${b(36, 36, 'round')}${b(160, 14, 'pill')}</div></div>`).join('')}</div>
          </div></div></div>`
  };
  TEMPLATES.default = () => `<div class="wrap" style="padding-top:150px;text-align:center">${b('min(520px,70%)', 40, 'c', 'margin-bottom:14px')}${b('min(360px,55%)', 14, 'pill c', 'margin-bottom:36px')}
      ${b('100%', 240, '', 'border-radius:24px;margin-bottom:28px')}<div class="g3">${tripCard()}${tripCard()}${tripCard()}</div></div>`;

  const page = (location.pathname.split('/').pop() || 'index.html').replace('.html', '') || 'index';
  const skeleton = document.createElement('div');
  skeleton.id = 'kibi-skeleton';
  skeleton.setAttribute('aria-hidden', 'true');
  skeleton.innerHTML = (TEMPLATES[page] || TEMPLATES.default)();
  // <body> doesn't exist yet; the skeleton lives on <html> until it's removed.
  root.appendChild(skeleton);
  root.setAttribute('aria-busy', 'true');

  let resolveShown;
  window.KIBI_PAGE_SHOWN = new Promise(resolve => { resolveShown = resolve; });

  let hidden = false;
  function hide() {
    if (hidden) return;
    hidden = true;
    root.removeAttribute('aria-busy');
    if (reduceMotion) {
      skeleton.remove();
      resolveShown();
      return;
    }
    skeleton.classList.add('is-hiding');
    setTimeout(() => { skeleton.remove(); resolveShown(); }, FADE_MS);
  }

  // Ready = the document is parsed, the page's data has loaded (storage.js),
  // and the pages' own setup code has rendered (two frames later).
  function whenParsed() {
    return document.readyState === 'loading'
      ? new Promise(resolve => document.addEventListener('DOMContentLoaded', resolve, { once: true }))
      : Promise.resolve();
  }
  const nextFrames = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));

  whenParsed()
    .then(() => window.KIBI_DATA_READY || null)
    .then(nextFrames)
    .then(hide, hide);
  setTimeout(hide, MAX_WAIT_MS);

  // Coming back via the browser's back/forward cache: nothing to load.
  window.addEventListener('pageshow', event => { if (event.persisted) hide(); });
})();
