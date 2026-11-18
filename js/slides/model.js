// Motion for the 'model' slide. See js/motion.js for MotionDef and ctx.
//
// Enter: the flywheel ring draws, its arrowheads, the 4 node dots and the 4 .tag labels pop in, then
// the hub. Clicks 1-3: the .price rows appear in DOM order. After click 3 an orange .mo dot circles
// the flywheel every 6 s (ambient loop, killed on reset and on leaving the slide).

const EASE = 'power3.out';
const ORBIT_S = 6;
const SVG_NS = 'http://www.w3.org/2000/svg';
const STEPS = ['ฟรี', '฿149 / ทริป', '฿200–1k ร้านริมทาง'];
const radii = new WeakMap(); // node circle -> its original r

const parts = section => {
  const svg = section.querySelector('.diag svg');
  const circles = svg ? [...svg.querySelectorAll('circle:not(.mo)')] : [];
  const r = c => +c.getAttribute('r') || 0;
  const ring = circles.reduce((a, c) => (!a || r(c) > r(a) ? c : a), null);
  return {
    svg,
    ring,
    nodes: circles.filter(c => c !== ring),
    arrows: svg ? [...svg.querySelectorAll('polygon')] : [],
    tags: [...section.querySelectorAll('.diag .tag')],
    hub: section.querySelector('.diag .hub'),
    prices: [...section.querySelectorAll('.price')],
  };
};

function startOrbit(section, ctx) {
  const { gsap } = ctx;
  const { svg, ring } = parts(section);
  section.querySelectorAll('.mo.orbit').forEach(n => n.remove());
  if (!svg || !ring) return;
  const cx = +ring.getAttribute('cx'), cy = +ring.getAttribute('cy'), r = +ring.getAttribute('r');
  const dot = document.createElementNS(SVG_NS, 'circle');
  dot.setAttribute('class', 'mo orbit');
  for (const [k, v] of Object.entries({ cx: 0, cy: 0, r: 8, fill: '#C2410C', stroke: '#F5F4F0', 'stroke-width': 3 })) {
    dot.setAttribute(k, v);
  }
  svg.append(dot);
  // Clockwise from the top, the way the arrowheads point.
  const path = `M${cx},${cy - r} A${r},${r} 0 1 1 ${cx},${cy + r} A${r},${r} 0 1 1 ${cx},${cy - r}`;
  gsap.set(dot, { opacity: 0, x: cx, y: cy - r });
  ctx.ambient(section, gsap.to(dot, { opacity: 1, duration: 0.6, ease: 'power1.out' }));
  ctx.ambient(section, gsap.to(dot, { motionPath: { path }, duration: ORBIT_S, ease: 'none', repeat: -1 }));
}

export default {
  id: 'model',
  steps: STEPS,

  setup(section) {
    for (const node of parts(section).nodes) radii.set(node, node.getAttribute('r'));
  },

  reset(section, ctx) {
    const { gsap } = ctx;
    const p = parts(section);
    section.querySelectorAll('.mo.orbit').forEach(n => n.remove());
    gsap.set(section.querySelectorAll('.in1, .in2'), { opacity: 1 });
    gsap.set(p.prices, { opacity: 0 });
    const hidden = [p.ring, ...p.nodes, ...p.arrows, ...p.tags, p.hub].filter(Boolean);
    gsap.set(hidden, { opacity: 0 });
    if (p.ring) gsap.set(p.ring, { clearProps: 'stroke-dasharray,stroke-dashoffset' });
    for (const node of p.nodes) if (radii.has(node)) node.setAttribute('r', radii.get(node));
  },

  enter(section, ctx) {
    const { gsap } = ctx;
    const p = parts(section);
    const tl = gsap.timeline();
    if (p.ring) {
      tl.set(p.ring, { opacity: 1 }, 0.1)
        .fromTo(p.ring, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.8, ease: 'power2.inOut' }, 0.1)
        .set(p.ring, { clearProps: 'stroke-dasharray,stroke-dashoffset' });
    }
    if (p.arrows.length) tl.to(p.arrows, { opacity: 1, duration: 0.3, ease: 'power1.out', stagger: 0.06 }, 0.7);
    p.nodes.forEach((node, j) => {
      const r = +(radii.get(node) || node.getAttribute('r'));
      tl.set(node, { opacity: 1 }, 0.55 + j * 0.1)
        .fromTo(node, { attr: { r: 0 } }, { attr: { r }, duration: 0.45, ease: 'back.out(2.2)' }, 0.55 + j * 0.1);
    });
    if (p.tags.length) {
      tl.fromTo(p.tags, { opacity: 0, translate: '0px 10px' },
        { opacity: 1, translate: '0px 0px', duration: 0.45, ease: EASE, stagger: 0.1, immediateRender: true }, 0.75)
        .set(p.tags, { clearProps: 'translate' });
    }
    if (p.hub) tl.to(p.hub, { opacity: 1, duration: 0.45, ease: 'power1.out' }, 1.2);
    return tl;
  },

  step(section, i, ctx) {
    const { gsap } = ctx;
    const row = parts(section).prices[i - 1];
    const tl = gsap.timeline();
    if (row) {
      tl.fromTo(row, { opacity: 0, translate: '0px 18px' },
        { opacity: 1, translate: '0px 0px', duration: 0.6, ease: EASE, immediateRender: true }, 0)
        .set(row, { clearProps: 'translate' });
    }
    if (i === STEPS.length) tl.call(() => startOrbit(section, ctx), null, '>');
    return tl;
  },
};
