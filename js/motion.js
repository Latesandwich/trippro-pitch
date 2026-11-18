// Motion engine: one MotionDef per slide id, driven by reveal.js fragments.
//
// MotionDef = {
//   id: string,                      // slide id (the <section id>)
//   steps: string[],                 // Thai cue label per click step; steps.length = number of clicks
//   setup?(section, ctx),            // once, after reveal is ready (the slide may still be hidden)
//   enter?(section, ctx) -> Timeline // default: ctx.rise(section)
//   step?(section, i, ctx) -> Timeline   // i is 1-based
//   reset?(section, ctx),            // back to the pre-enter state; default hides .in1-.in5
// }
// ctx = { gsap, rise(section), ring(el, cx, cy, color, opts?), count(el, from, to, format, opts?),
//         ambient(section, animation), reduced }
//
// Rules: forward entry = reset, then play enter. A shown step plays step(i). Backward entry, a hidden step,
// overview, print and ?static show the finished state: reset, enter.progress(1), step(1..k).progress(1).
// While anything plays, the navigation API (and so every key, click and remote) only completes it.

const IN = '.in1, .in2, .in3, .in4, .in5';
const RISE_DELAYS = [0.08, 0.22, 0.36, 0.5, 0.64];
const GUARDED = ['next', 'prev', 'left', 'right', 'up', 'down', 'navigateNext', 'navigatePrev'];
const SVG_NS = 'http://www.w3.org/2000/svg';

const defs = new Map();

export function registerMotion(def) {
  if (!def || !def.id) throw new Error('registerMotion: a MotionDef needs an id');
  defs.set(def.id, { steps: [], ...def });
}

// cubic-bezier() as a GSAP ease function.
function cubicBezier(x1, y1, x2, y2) {
  const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
  const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
  const x = t => ((ax * t + bx) * t + cx) * t;
  const y = t => ((ay * t + by) * t + cy) * t;
  const dx = t => (3 * ax * t + 2 * bx) * t + cx;
  return p => {
    if (p <= 0) return 0;
    if (p >= 1) return 1;
    let t = p;
    for (let i = 0; i < 8; i++) {
      const error = x(t) - p;
      if (Math.abs(error) < 1e-7) return y(t);
      const slope = dx(t);
      if (Math.abs(slope) < 1e-7) break;
      t -= error / slope;
    }
    let lo = 0, hi = 1;
    t = p;
    while (hi - lo > 1e-7) {
      if (x(t) < p) lo = t; else hi = t;
      t = (lo + hi) / 2;
    }
    return y(t);
  };
}

export const riseEase = cubicBezier(0.2, 0.7, 0.2, 1);

export function initMotion(Reveal) {
  const gsap = window.gsap;
  for (const plugin of [window.DrawSVGPlugin, window.MotionPathPlugin]) if (plugin) gsap.registerPlugin(plugin);

  const params = new URLSearchParams(location.search);
  const reduced = params.has('reduced');
  const still = params.has('static');
  const print = /print-pdf/i.test(location.search);

  const sections = [...document.querySelectorAll('.reveal .slides > section')];
  const slides = new Map();
  for (const section of sections) {
    const def = defs.get(section.id) || { id: section.id, steps: [] };
    const steps = def.steps.map(() => {
      const span = document.createElement('span');
      span.className = 'fragment motion-step mo';
      section.append(span);
      return span;
    });
    const notes = section.querySelector(':scope > aside.notes');
    if (notes && def.steps.length) {
      const cues = def.steps.flatMap((label, i) =>
        [document.createTextNode(`▶ คลิก ${i + 1}: ${label}\n`), document.createElement('br')]);
      notes.prepend(...cues);
    }
    slides.set(section, { def, steps, rendered: 0, rings: [], counts: new Set(), ambient: [] });
  }
  const S = section => slides.get(section);

  let current = null;
  let overview = false;
  let active = []; // [{section, tl}] for enter, step and wipe timelines that may still be playing
  const originals = new WeakMap(); // count() element -> its original child nodes

  // ---- ctx ----------------------------------------------------------------------------------------

  function rise(section) {
    const tl = gsap.timeline();
    const all = [];
    RISE_DELAYS.forEach((delay, j) => {
      const els = section.querySelectorAll(`.in${j + 1}`);
      if (!els.length) return;
      all.push(...els);
      // `translate` composes with any inline `transform`, so resting positions stay untouched.
      tl.fromTo(els, { opacity: 0, translate: '0px 16px' },
        { opacity: 1, translate: '0px 0px', duration: 0.52, ease: riseEase, immediateRender: true }, delay);
    });
    if (all.length) tl.set(all, { clearProps: 'opacity,translate' });
    return tl;
  }

  function ring(el, cx, cy, color = '#C2410C', { r = 28, duration = 0.9, width = 3 } = {}) {
    const section = el.closest('section');
    const tl = gsap.timeline();
    let node;
    if (el instanceof SVGElement) {
      const host = el instanceof SVGSVGElement || el.tagName.toLowerCase() === 'g' ? el : el.parentNode;
      node = document.createElementNS(SVG_NS, 'circle');
      node.setAttribute('class', 'mo ring');
      for (const [k, v] of Object.entries({ cx, cy, r: 0, fill: 'none', stroke: color, 'stroke-width': width })) {
        node.setAttribute(k, v);
      }
      host.append(node);
      tl.fromTo(node, { attr: { r: r * 0.15 }, opacity: 1 },
        { attr: { r }, opacity: 0, duration, ease: 'power2.out', immediateRender: true });
    } else {
      const s = section.getBoundingClientRect(), e = el.getBoundingClientRect();
      const k = s.width / 1920 || 1;
      const x = (e.left - s.left) / k + cx, y = (e.top - s.top) / k + cy;
      node = document.createElement('div');
      node.className = 'mo ring';
      node.style.cssText = `position:absolute; left:${x - r}px; top:${y - r}px; width:${2 * r}px; height:${2 * r}px;`
        + `border:${width}px solid ${color}; border-radius:50%; box-sizing:border-box; pointer-events:none; z-index:5`;
      section.append(node);
      tl.fromTo(node, { scale: 0.15, opacity: 1 },
        { scale: 1, opacity: 0, duration, ease: 'power2.out', immediateRender: true });
    }
    S(section).rings.push(node);
    return tl;
  }

  function count(el, from, to, format = v => String(Math.round(v)), { duration = 0.9, ease = 'power1.out' } = {}) {
    const section = el.closest('section');
    if (!originals.has(el)) originals.set(el, [...el.childNodes]);
    S(section).counts.add(el);
    const original = originals.get(el);
    const value = { v: from };
    el.textContent = format(from);
    return gsap.timeline()
      .to(value, { v: to, duration, ease, onUpdate: () => { el.textContent = format(value.v); } })
      .call(() => el.replaceChildren(...original));
  }

  // Endless loops (convoy dots, pulses): not part of isPlaying/complete, killed on reset and on leaving.
  function ambient(section, animation) {
    S(section).ambient.push(animation);
    if (reduced || still || print) animation.pause();
    return animation;
  }

  const ctx = { gsap, rise, ring, count, ambient, reduced };

  // ---- rendering ----------------------------------------------------------------------------------

  function run(section, tl) {
    if (!tl) return;
    if (tl.paused()) tl.paused(false);
    if (reduced || !(tl.duration() > 0)) { tl.progress(1, false); return; }
    active.push({ section, tl });
  }

  const finish = tl => { if (tl) tl.progress(1, false); };
  const enterTl = section => (S(section).def.enter ? S(section).def.enter(section, ctx) : rise(section));
  const stepTl = (section, i) => (S(section).def.step ? S(section).def.step(section, i, ctx) : null);
  const visibleSteps = section => S(section).steps.filter(s => s.classList.contains('visible')).length;

  function stopAmbient(section) {
    const st = S(section);
    st.ambient.forEach(a => a.kill());
    st.ambient = [];
  }

  function reset(section) {
    const st = S(section);
    active = active.filter(a => {
      if (a.section !== section) return true;
      a.tl.kill();
      return false;
    });
    stopAmbient(section);
    st.rings.forEach(node => node.remove());
    st.rings = [];
    st.counts.forEach(el => el.replaceChildren(...originals.get(el)));
    const ins = section.querySelectorAll(IN);
    gsap.set(ins, { clearProps: 'translate' });
    if (st.def.reset) st.def.reset(section, ctx);
    else gsap.set(ins, { opacity: 0 });
    st.rendered = 0;
  }

  function playEnter(section) {
    reset(section);
    run(section, enterTl(section));
  }

  function showAt(section, k) {
    reset(section);
    finish(enterTl(section));
    for (let i = 1; i <= k; i++) finish(stepTl(section, i));
    S(section).rendered = k;
  }

  const showFinal = section => showAt(section, S(section).def.steps.length);
  const frozen = () => still || print || overview;

  function isPlaying() {
    active = active.filter(a => a.tl.progress() < 1);
    return active.length > 0;
  }

  function complete() {
    const playing = active;
    active = [];
    playing.forEach(a => a.tl.progress(1, false));
  }

  function completeSection(section) {
    active = active.filter(a => {
      if (a.section !== section) return true;
      a.tl.progress(1, false);
      return false;
    });
  }

  // ---- route wipe ---------------------------------------------------------------------------------

  const wipe = document.createElement('div');
  wipe.id = 'wipe';
  wipe.className = 'mo';
  wipe.setAttribute('aria-hidden', 'true');
  wipe.style.cssText = 'position:fixed; inset:0; z-index:40; pointer-events:none; visibility:hidden';
  wipe.innerHTML = '<svg viewBox="0 0 1920 1080" preserveAspectRatio="xMidYMid slice" width="100%" height="100%">'
    + '<path d="M-80 700 C 420 520, 760 900, 1180 640 S 1760 420, 2000 500" fill="none" stroke="#C2410C"'
    + ' stroke-width="40" stroke-linecap="round"/></svg>';
  document.body.append(wipe);

  function playWipe() {
    if (reduced || frozen()) return;
    const path = wipe.querySelector('path');
    const tl = gsap.timeline()
      .set(wipe, { visibility: 'visible' }, 0)
      .fromTo(path, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.42, ease: 'power2.inOut', immediateRender: true }, 0)
      .to(path, { drawSVG: '100% 100%', duration: 0.28, ease: 'power2.in' }, 0.42)
      .set(wipe, { visibility: 'hidden' }, 0.7);
    run(null, tl);
  }

  // ---- reveal events ------------------------------------------------------------------------------

  function onSlideChanged() {
    const previous = current;
    const section = Reveal.getCurrentSlide();
    if (!section || !slides.has(section)) return;
    if (previous && previous !== section) {
      completeSection(previous);
      stopAmbient(previous);
    }
    current = section;
    if (frozen()) { showFinal(section); return; }
    if (previous === section) { syncSteps(section); return; }
    const k = visibleSteps(section);
    const forward = !previous || sections.indexOf(section) > sections.indexOf(previous);
    if (forward && k === 0) playEnter(section);
    else showAt(section, k);
    if (forward && previous && previous.dataset.section !== section.dataset.section) playWipe();
  }

  function syncSteps(section) {
    const st = S(section);
    const k = visibleSteps(section);
    if (k === st.rendered) return;
    if (k === st.rendered + 1) {
      complete();
      st.rendered = k;
      run(section, stepTl(section, k));
    } else {
      showAt(section, k);
    }
  }

  function onFragment(event) {
    const section = event.fragment && event.fragment.closest('section');
    if (!section || section !== current || frozen()) return;
    syncSteps(section);
  }

  function onReady() {
    for (const section of sections) {
      const def = S(section).def;
      if (def.setup) def.setup(section, ctx);
    }
    current = Reveal.getCurrentSlide();
    if (still || print) sections.forEach(showFinal);
    else if (current && slides.has(current)) {
      const k = visibleSteps(current);
      if (k) showAt(current, k); else playEnter(current);
    }
    Reveal.on('slidechanged', onSlideChanged);
    Reveal.on('fragmentshown', onFragment);
    Reveal.on('fragmenthidden', onFragment);
    Reveal.on('overviewshown', () => { overview = true; sections.forEach(showFinal); });
    Reveal.on('overviewhidden', () => {
      overview = false;
      current = Reveal.getCurrentSlide();
      if (current) showAt(current, visibleSteps(current));
    });
  }

  // ---- click guard --------------------------------------------------------------------------------
  // reveal's keyboard, touch and speaker-window handlers call the *internal* deck object, which only a
  // plugin's init() receives; window.Reveal is a separate copy. Both get wrapped.

  function guard(api) {
    for (const name of GUARDED) {
      const original = api[name];
      if (typeof original !== 'function' || original.motionGuarded) continue;
      const wrapped = function guardedNavigation(...args) {
        if (isPlaying()) { complete(); return undefined; }
        return original.apply(this, args);
      };
      wrapped.motionGuarded = true;
      api[name] = wrapped;
    }
  }

  Reveal.registerPlugin({ id: 'motion-guard', init(internal) { guard(internal); guard(Reveal); } });
  Reveal.on('ready', onReady);

  const api = {
    isPlaying,
    complete,
    state: () => ({ slide: current ? current.id : '', step: current ? visibleSteps(current) : 0 }),
    duration(id, i) {
      const section = document.getElementById(id);
      if (!section || !slides.has(section)) throw new Error(`duration: no slide '${id}'`);
      const tl = i === 0 ? enterTl(section) : stepTl(section, i);
      const seconds = tl ? tl.duration() : 0;
      if (tl) tl.kill();
      completeSection(section);
      showAt(section, frozen() ? S(section).def.steps.length : S(section).rendered);
      return seconds;
    },
  };
  if (window.__deck) window.__deck.motion = api;
  return api;
}
