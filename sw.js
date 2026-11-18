// Offline cache for the pitch deck. tools/precache.py rewrites VERSION and PRECACHE; do not edit them by hand.
// Network first (3 s), then the cache, so edits show up online and the deck still opens with no signal.
/* precache:start */
const VERSION = "9634d63d7067412b";
const PRECACHE = [
  "./",
  "assets/26c5e1e7500a049f42247d06c2b1448a.jpg",
  "assets/45037e7e2de8de011fcfb27765400f60.jpg",
  "assets/45cd57552e2a20992c9c660f086e8a27.jpg",
  "assets/4c3ad8a097a01792299a142787dd8ae6.jpg",
  "assets/79402f621925759ba97eba07bbb3c3fc.png",
  "assets/7a918efd44accc6c9d34f745a8167753.jpg",
  "assets/810a2c046d98c26781b03e4ec4a52f4a.png",
  "assets/86d8f2621ed1e5ecedf758a42ec04c67.jpg",
  "assets/8d71235d02562743c2967d18ceda8412.png",
  "assets/98ed9d879255f999a7a00a79bda9e5ff.png",
  "assets/9b2e422073143862e282e61c32460793.jpg",
  "assets/a0828c36b7167c6169e7c560ac461c68.jpg",
  "assets/bc79dbcae3966869798e0d9c376c490f.png",
  "assets/bc7edeb174f57b4ec02a459161ff4582.jpg",
  "assets/c10006eace69f1907bd87d7fd13b5824.png",
  "assets/cbbd4a6c881254de7742ef2d11122404.jpg",
  "assets/cbdcb6efdf7f8b511eac5b1ac6da4d35.jpg",
  "assets/cccc6154ac7b6cf09bda8ed9d6079528.jpg",
  "assets/d64f8165816d9b6e5acae679d92bd698.png",
  "assets/e0079381f4460f66e16170f36fd4b194.jpg",
  "assets/ef8daf379a0459a5c2a35ab3bf761d09.png",
  "assets/f01d2877afd5db5d801d31f832e57eda.jpg",
  "assets/f8a6af08e2ac174d5baec191de744051.png",
  "assets/fc5b6cac1650ab9dfadbcdf8bf2366d1.png",
  "credits.html",
  "css/deck.css",
  "css/fonts.css",
  "css/site.css",
  "cues.html",
  "deck.json",
  "fonts/anuphan-latin-ext.woff2",
  "fonts/anuphan-latin.woff2",
  "fonts/anuphan-thai.woff2",
  "fonts/anuphan-vietnamese.woff2",
  "fonts/inter-cyrillic-ext.woff2",
  "fonts/inter-cyrillic.woff2",
  "fonts/inter-greek-ext.woff2",
  "fonts/inter-greek.woff2",
  "fonts/inter-latin-ext.woff2",
  "fonts/inter-latin.woff2",
  "fonts/inter-vietnamese.woff2",
  "fonts/noto-sans-thai-latin-ext.woff2",
  "fonts/noto-sans-thai-latin.woff2",
  "fonts/noto-sans-thai-thai.woff2",
  "index.html",
  "js/app.js",
  "js/elements.js",
  "js/motion.js",
  "js/slides/breakeven.js",
  "js/slides/close.js",
  "js/slides/cover.js",
  "js/slides/hands.js",
  "js/slides/idea.js",
  "js/slides/index.js",
  "js/slides/market.js",
  "js/slides/model.js",
  "js/slides/persona.js",
  "js/slides/product.js",
  "js/slides/proof.js",
  "js/slides/scenario.js",
  "js/slides/setup.js",
  "js/slides/shop.js",
  "js/slides/team.js",
  "js/slides/unique.js",
  "slides/breakeven.html",
  "slides/close.html",
  "slides/cover.html",
  "slides/hands.html",
  "slides/idea.html",
  "slides/market.html",
  "slides/model.html",
  "slides/persona.html",
  "slides/product.html",
  "slides/proof.html",
  "slides/scenario.html",
  "slides/setup.html",
  "slides/shop.html",
  "slides/team.html",
  "slides/unique.html",
  "vendor/gsap/DrawSVGPlugin.min.js",
  "vendor/gsap/gsap.min.js",
  "vendor/gsap/MotionPathPlugin.min.js",
  "vendor/MANIFEST.json",
  "vendor/reveal/LICENSE",
  "vendor/reveal/plugin/notes/notes.js",
  "vendor/reveal/reveal.css",
  "vendor/reveal/reveal.js",
];
/* precache:end */

const CACHE = `trippro-${VERSION}`;
const NETWORK_TIMEOUT_MS = 3000;

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    for (const key of await caches.keys()) if (key !== CACHE) await caches.delete(key);
    await self.clients.claim();
  })());
});

function fromNetwork(request) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), NETWORK_TIMEOUT_MS);
    fetch(request).then(response => {
      clearTimeout(timer);
      if (response.ok && response.status === 200) {
        const copy = response.clone();
        caches.open(CACHE).then(cache => cache.put(request, copy)).catch(() => {});
      }
      resolve(response);
    }, error => { clearTimeout(timer); reject(error); });
  });
}

self.addEventListener('fetch', event => {
  const { request } = event;
  if (request.method !== 'GET' || !request.url.startsWith(self.registration.scope)) return;
  event.respondWith(
    fromNetwork(request).catch(async error => {
      const cached = await caches.match(request, { ignoreSearch: true });
      if (cached) return cached;
      throw error;
    }),
  );
});
