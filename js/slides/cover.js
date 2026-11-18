// Motion for the 'cover' slide. See js/motion.js for MotionDef and ctx.
// Enter: logo pops, wordmark slides in, tagline and body rise, a thin orange route draws under the body.
// Ambient: slow photo push-in (yoyo) and 5 convoy dots riding the route on a 9 s loop.
import { riseEase } from '../motion.js';

const SVG_NS = 'http://www.w3.org/2000/svg';
const ACCENT = '#C2410C';
const PAPER = '#F5F4F0';

// ---- helpers shared with close.js ------------------------------------------------------------------

// Box of el (or of its text when text=true) relative to the section, in 1920-px slide units.
export function slideBox(section, el, text = false) {
  const s = section.getBoundingClientRect();
  const k = s.width / 1920;
  if (!k) return null;
  let r = el.getBoundingClientRect();
  if (text) {
    const range = document.createRange();
    range.selectNodeContents(el);
    r = range.getBoundingClientRect();
  }
  return { x: (r.left - s.left) / k, y: (r.top - s.top) / k, w: r.width / k, h: r.height / k };
}

// The photo push-in runs on a .mo copy of img.bleed placed right above it (below every text block), so
// the original keeps its exact box and transform. Returns the copy's inner img, the one to scale.
export function bleedCopy(section) {
  const img = section.querySelector(':scope > img.bleed');
  let wrap = section.querySelector(':scope > .mo.bleed-zoom');
  if (!wrap) {
    wrap = document.createElement('div');
    wrap.className = 'mo bleed-zoom';
    wrap.setAttribute('aria-hidden', 'true');
    wrap.style.cssText = 'position:absolute; left:0; top:0; width:1920px; height:1080px; overflow:hidden; pointer-events:none';
    const copy = document.createElement('img');
    copy.src = img.currentSrc || img.src;
    copy.alt = '';
    copy.decoding = 'async';
    copy.style.cssText = `display:block; width:100%; height:100%; object-fit:cover; object-position:${getComputedStyle(img).objectPosition}`;
    wrap.append(copy);
    img.after(wrap);
  }
  const copy = wrap.firstElementChild;
  window.gsap.set(copy, { scale: 1, transformOrigin: '50% 50%' });
  return copy;
}

// A full-slide .mo svg appended to the section (once), for route lines and dots.
export function overlaySvg(section, build) {
  let svg = section.querySelector(':scope > svg.mo.route-layer');
  if (!svg) {
    svg = document.createElementNS(SVG_NS, 'svg');
    svg.setAttribute('class', 'mo route-layer');
    svg.setAttribute('aria-hidden', 'true');
    svg.setAttribute('viewBox', '0 0 1920 1080');
    svg.setAttribute('width', '1920');
    svg.setAttribute('height', '1080');
    svg.style.cssText = 'position:absolute; left:0; top:0; overflow:visible; pointer-events:none; z-index:3';
    build(svg);
    section.append(svg);
  }
  return svg;
}

export function svgEl(tag, attrs) {
  const node = document.createElementNS(SVG_NS, tag);
  for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
  return node;
}

// A gentle two-wave road from (x0, y) to (x1, y).
export function wavePath(x0, x1, y, amp) {
  const w = x1 - x0;
  const f = n => n.toFixed(1);
  return `M${f(x0)} ${f(y)} C${f(x0 + w * 0.17)} ${f(y - amp)} ${f(x0 + w * 0.33)} ${f(y + amp)} ${f(x0 + w * 0.5)} ${f(y)}`
    + ` S${f(x0 + w * 0.83)} ${f(y - amp)} ${f(x1)} ${f(y)}`;
}

// ---- cover -----------------------------------------------------------------------------------------

const DOTS = 5;
const LOOP = 9;       // seconds per convoy loop
const RIDE = 7;       // seconds one dot takes along the route
const GAP = 0.45;     // seconds between dots

function layer(section) {
  return overlaySvg(section, svg => {
    svg.append(svgEl('path', { class: 'route', fill: 'none', stroke: ACCENT, 'stroke-width': 3, 'stroke-linecap': 'round' }));
    for (let i = 0; i < DOTS; i++) {
      svg.append(svgEl('circle', { class: 'dot', cx: 0, cy: 0, r: 7, fill: ACCENT, stroke: PAPER, 'stroke-width': 2, opacity: 0 }));
    }
  });
}

export default {
  id: 'cover',
  steps: [],
  enter(section, ctx) {
    const { gsap } = ctx;
    const in1 = section.querySelector('.in1');
    const logo = in1.querySelector('img');
    const wordmark = in1.querySelector('.wordmark');
    const tagline = section.querySelector('.in2');
    const body = section.querySelector('.in3');

    const svg = layer(section);
    const route = svg.querySelector('.route');
    const dots = [...svg.querySelectorAll('.dot')];
    const text = slideBox(section, body, true);
    const box = slideBox(section, body);
    if (text && box) {
      const half = Math.max(text.w / 2 + 40, 360);
      const cx = text.x + text.w / 2;
      route.setAttribute('d', wavePath(cx - half, cx + half, box.y + box.h + 30, 12));
    }

    const tl = gsap.timeline();
    tl.fromTo(in1, { opacity: 0 }, { opacity: 1, duration: 0.45, ease: 'power2.out', immediateRender: true }, 0.05);
    tl.fromTo(logo, { scale: 0.8 }, { scale: 1, duration: 0.8, ease: 'back.out(1.6)', immediateRender: true }, 0.05);
    tl.fromTo(wordmark, { x: -24 }, { x: 0, duration: 0.8, ease: 'power3.out', immediateRender: true }, 0.15);
    [[tagline, 0.4], [body, 0.55]].forEach(([el, at]) => {
      tl.fromTo(el, { opacity: 0, translate: '0px 16px' },
        { opacity: 1, translate: '0px 0px', duration: 0.52, ease: riseEase, immediateRender: true }, at);
    });
    tl.fromTo(route, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.9, ease: 'power2.inOut', immediateRender: true }, 0.8);
    tl.set([logo, wordmark], { clearProps: 'transform' });
    tl.set([in1, tagline, body], { clearProps: 'opacity,translate' });

    // ambient: photo push-in, then the convoy loop once the route is drawn
    ctx.ambient(section, gsap.to(bleedCopy(section), { scale: 1.06, duration: 20, ease: 'sine.inOut', repeat: -1, yoyo: true }));
    gsap.set(dots, { opacity: 0 });
    const loop = gsap.timeline({ repeat: -1, delay: 1.7 });
    dots.forEach((dot, i) => {
      const at = i * GAP;
      loop.to(dot, { motionPath: { path: route, align: route, alignOrigin: [0.5, 0.5] }, duration: RIDE, ease: 'none' }, at);
      loop.fromTo(dot, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power1.out', immediateRender: false }, at);
      loop.to(dot, { opacity: 0, duration: 0.6, ease: 'power1.in' }, at + RIDE - 0.6);
    });
    loop.set(dots, { opacity: 0 }, LOOP);
    ctx.ambient(section, loop);
    return tl;
  },
};
