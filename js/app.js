// Boots the deck: loads the slides listed in deck.json, waits for the fonts, then starts reveal.js.
// window.__deck = { ready: Promise<void>, order: string[], static: boolean, motion }
// ?static shows every slide finished (tests), ?reduced completes every animation at once,
// ?fixture swaps in tests/fixtures/motion_fixture.js.
import './elements.js';
import { initMotion, registerMotion } from './motion.js';
import motions from './slides/index.js';

const params = new URLSearchParams(location.search);
const deck = window.__deck = { order: [], static: params.has('static') };

// Every face css/fonts.css declares, with Thai and Latin text so both subsets load
// (reveal hides most slides, and the browser only fetches fonts for text it lays out).
const FACES = [
  ...[400, 500, 600, 700].map(w => `${w} 32px Anuphan`),
  ...[400, 500, 600].map(w => `${w} 32px Inter`),
  ...[400, 600, 700].map(w => `${w} 32px "Noto Sans Thai"`),
];

async function loadFonts() {
  await Promise.all(FACES.map(face => document.fonts.load(face, 'Aก').catch(() => [])));
  await document.fonts.ready;
}

// deck.json sections are {key: {start: slideId}}; a slide belongs to the last section started at or before it.
function sectionKeys(meta) {
  const starts = Object.entries(meta.sections || {})
    .map(([key, s]) => [meta.order.indexOf(s.start), key])
    .filter(([index]) => index >= 0)
    .sort((a, b) => a[0] - b[0]);
  return meta.order.map((_, i) => {
    let key = '';
    for (const [index, k] of starts) if (index <= i) key = k;
    return key;
  });
}

// A small local server (python -m http.server, as serve.cmd runs it) can drop a connection when 15
// slides are requested at once, so each fetch gets a few tries.
async function fetchText(url, tries = 4) {
  for (let attempt = 1; ; attempt++) {
    try {
      const response = await fetch(url);
      if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
      return await response.text();
    } catch (error) {
      if (attempt >= tries) throw error;
      await new Promise(resolve => setTimeout(resolve, 150 * attempt));
    }
  }
}

// The speaker view sets notes in normal white space, which would merge the authors' paragraphs:
// turn each newline of the plain text into a <br>.
function keepNoteBreaks(aside) {
  for (const node of [...aside.childNodes]) {
    if (node.nodeType !== Node.TEXT_NODE || !node.data.includes('
')) continue;
    const parts = node.data.split('
');
    const nodes = parts.flatMap((part, i) => (i ? [document.createElement('br'), document.createTextNode(part)] : [document.createTextNode(part)]));
    node.replaceWith(...nodes);
  }
}

async function injectSlides() {
  const meta = JSON.parse(await fetchText('deck.json'));
  deck.order = meta.order.slice();
  const keys = sectionKeys(meta);
  const html = await Promise.all(meta.order.map(id => fetchText(`slides/${id}.html`)));
  const container = document.querySelector('.reveal .slides');
  html.forEach((text, i) => {
    const template = document.createElement('template');
    template.innerHTML = text.trim();
    const section = template.content.querySelector('section');
    section.dataset.page = String(i + 1);
    section.dataset.section = keys[i];
    for (const aside of section.querySelectorAll(':scope > aside')) {
      aside.classList.add('notes');
      keepNoteBreaks(aside);
    }
    for (const pn of section.querySelectorAll('.pn')) pn.textContent = String(i + 1);
    container.append(section);
  });
}

async function boot() {
  await injectSlides();
  motions.forEach(registerMotion);
  if (params.has('fixture')) await import('../tests/fixtures/motion_fixture.js');
  await loadFonts();
  // Fragments and cues go in before reveal starts; the engine binds its events once reveal is ready.
  deck.motion = initMotion(window.Reveal);
  await window.Reveal.initialize({
    width: 1920, height: 1080, margin: 0, minScale: 0.1, maxScale: 4,
    center: false, hash: true, controls: false, progress: false,
    transition: 'fade', transitionSpeed: 'fast', backgroundTransition: 'none',
    display: 'flex', pdfSeparateFragments: false, plugins: [window.RevealNotes],
  });
}

deck.ready = boot();

// Offline backup: the service worker keeps the whole deck in the browser cache after one online visit.
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').catch(() => {});
  });
}
