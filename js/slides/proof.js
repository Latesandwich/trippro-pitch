// Motion for the 'proof' slide (dark, accent #F08A4B). See js/motion.js for MotionDef and ctx.
// Enter: the three real screens rise in order. Click 1: one rider leaves the route and exactly three people
// are alerted (leader, the rider, sweeper); the two grey riders are left alone. Click 2: the rider rides
// back onto the line and the result, ~5 minutes, is revealed.

const SVG_NS = 'http://www.w3.org/2000/svg';
const IN = '.in1, .in2, .in3, .in4, .in5';
const ACCENT = '#F08A4B';
const GREY = '#8E929A';
const OFF = [160, 150];
const ALERTED = [[40, 22], OFF, [40, 200]];
const ENDS = [ALERTED[0], ALERTED[2]];
const MASK_ID = 'proof-trail-mask';

const svgOf = section => section.querySelector('.diag svg');
const trail = svg => svg.querySelector('path[stroke-dasharray]');
const at = (svg, [x, y]) => [...svg.querySelectorAll(':scope > circle:not(.mo)')]
  .filter(c => Number(c.getAttribute('cx')) === x && Number(c.getAttribute('cy')) === y);
const halo = (svg, p) => at(svg, p).find(c => c.hasAttribute('fill-opacity'));
const core = (svg, p) => at(svg, p).find(c => !c.hasAttribute('fill-opacity'));
// The rider's label is the one placed furthest right, next to the off-route point.
const riderLabel = section => [...section.querySelectorAll('.diag > p.label')]
  .reduce((a, b) => (parseFloat(b.style.left) > parseFloat(a.style.left) ? b : a));
const result = section => section.querySelector('.ruled.hot');

// The dot rides the dashed trail, then the last 12 px to the off-route point (the trail stops at its edge).
const route = svg => `${trail(svg).getAttribute('d')} L ${OFF[0]} ${OFF[1]}`;

// Overlays live inside the convoy svg with class `mo`, so the layout checks skip them: the travelling dot,
// and a mask whose solid stroke is drawn to uncover the dashed trail behind the dot (drawSVG on the dashed
// path itself would replace its dashes).
function overlays(svg) {
  let dot = svg.querySelector('circle.mo.dot');
  if (!dot) {
    const defs = document.createElementNS(SVG_NS, 'defs');
    defs.setAttribute('class', 'mo');
    defs.innerHTML = `<mask id="${MASK_ID}" maskUnits="userSpaceOnUse" x="-20" y="-20" width="380" height="264">`
      + `<path d="${trail(svg).getAttribute('d')}" fill="none" stroke="#fff" stroke-width="10"/></mask>`;
    svg.prepend(defs);
    dot = document.createElementNS(SVG_NS, 'circle');
    dot.setAttribute('class', 'mo dot');
    for (const [k, v] of Object.entries({ cx: 0, cy: 0, r: 12, fill: ACCENT })) dot.setAttribute(k, v);
    svg.append(dot);
  }
  return { dot, maskPath: svg.querySelector(`#${MASK_ID} path`) };
}

const originals = new WeakMap(); // core circle -> its original { r, fill }

export default {
  id: 'proof',
  steps: ['คันหนึ่งหลุด แจ้งคนนำ คนหลง คนท้าย', 'กลับเข้าเส้นทาง ~5 นาที'],

  setup(section) {
    const svg = svgOf(section);
    for (const p of ENDS) {
      const c = core(svg, p);
      originals.set(c, { r: c.getAttribute('r'), fill: c.getAttribute('fill') });
    }
  },

  reset(section, ctx) {
    const { gsap } = ctx;
    const svg = svgOf(section);
    const { dot } = overlays(svg);
    gsap.set(section.querySelectorAll(IN), { opacity: 0 });
    // Before the alert: no trail, nobody lit; the leader and sweeper look like any other rider.
    trail(svg).removeAttribute('mask');
    gsap.set([trail(svg), ...ALERTED.map(p => halo(svg, p)), ...at(svg, OFF), riderLabel(section), result(section)],
      { opacity: 0 });
    gsap.set(svg, { clearProps: 'overflow' });
    for (const p of ENDS) gsap.set(core(svg, p), { attr: { r: 9, fill: GREY } });
    gsap.set(dot, { opacity: 0, x: 0, y: 0, attr: { r: 12, fill: ACCENT } });
  },

  step(section, i, ctx) {
    const { gsap } = ctx;
    const svg = svgOf(section);
    const { dot, maskPath } = overlays(svg);
    const path = trail(svg);
    const tl = gsap.timeline();

    if (i === 1) {
      const lit = [...ALERTED.map(p => halo(svg, p)), ...at(svg, OFF), riderLabel(section)];
      const cores = ENDS.map(p => core(svg, p));
      tl.set(svg, { overflow: 'visible' }, 0)
        .set(path, { opacity: 1, attr: { mask: `url(#${MASK_ID})` } }, 0)
        .set(dot, { motionPath: { path: route(svg), start: 0, end: 0 } }, 0)
        .fromTo(dot, { opacity: 0 }, { opacity: 1, duration: 0.12, ease: 'power1.out', immediateRender: false }, 0)
        // One rider leaves the route; the dashed trail is uncovered behind it.
        .to(dot, { motionPath: { path: route(svg), start: 0, end: 1 }, duration: 0.5, ease: 'power2.inOut' }, 0.06)
        .fromTo(maskPath, { drawSVG: '0%' },
          { drawSVG: '100%', duration: 0.46, ease: 'power2.inOut', immediateRender: true }, 0.06)
        // The alert: leader, rider and sweeper light up together, three rings at once.
        .fromTo(lit, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power2.out', immediateRender: false }, 0.56)
        .to(cores, { attr: { r: 12, fill: ACCENT }, duration: 0.25, ease: 'power2.out' }, 0.56);
      // ring() draws its first frame as soon as it is built; keep the rings hidden until they fire.
      const seen = new Set(svg.querySelectorAll('.mo.ring'));
      for (const [x, y] of ALERTED) tl.add(ctx.ring(svg, x, y, ACCENT, { r: 34, duration: 0.6 }), 0.56);
      tl.set([...svg.querySelectorAll('.mo.ring')].filter(n => !seen.has(n)), { opacity: 0 }, 0);
      const end = tl.duration();
      for (const c of cores) tl.set(c, { attr: originals.get(c) }, end);
      tl.set([path, ...lit], { clearProps: 'opacity' }, end)
        .call(() => path.removeAttribute('mask'))
        .set(svg, { clearProps: 'overflow' });
      return tl;
    }

    // Click 2: the rider rides the trail back to the line, turning grey like any rider; the result rises.
    const box = result(section);
    const num = box.querySelector('.num');
    tl.to(dot, { motionPath: { path: route(svg), start: 1, end: 0 }, duration: 0.6, ease: 'power2.inOut' }, 0)
      .to(dot, { attr: { r: 9, fill: GREY }, duration: 0.3, ease: 'power2.out' }, 0.4)
      // ...and merges into the convoy, leaving the diagram exactly as drawn.
      .to(dot, { opacity: 0, duration: 0.3, ease: 'power1.in' }, 0.65)
      .fromTo(box, { opacity: 0, y: 16 },
        { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', immediateRender: false, clearProps: 'opacity,transform' }, 0.35);
    const text = num.textContent;
    const m = /(\d+)/.exec(text);
    if (m) {
      const head = text.slice(0, m.index), tail = text.slice(m.index + m[1].length);
      tl.add(ctx.count(num, 1, Number(m[1]), v => head + Math.round(v) + tail, { duration: 0.7, ease: 'power2.out' }), 0.4);
    }
    return tl;
  },
};
