// Motion for the 'unique' slide. See js/motion.js for MotionDef and ctx.
// Enter: the axes draw, then the three competitor dots drop in with their labels.
// Step 1: TripPRO's corner lights up: quadrant fades in, the accent dot grows with a ring, label appears.

const original = new WeakMap(); // svg element -> its original numeric attributes

function attrs(el, names) {
  if (!original.has(el)) original.set(el, Object.fromEntries(names.map(n => [n, Number(el.getAttribute(n))])));
  return original.get(el);
}

function parts(section) {
  const diag = section.querySelector('.diag');
  const svg = diag.querySelector('svg');
  const circles = [...svg.querySelectorAll(':scope > circle:not(.mo)')];
  const tags = [...diag.querySelectorAll('.tag')];
  return {
    diag, svg,
    rect: svg.querySelector(':scope > rect'),
    axes: [...svg.querySelectorAll(':scope > line')],
    heads: [...svg.querySelectorAll(':scope > path')],
    grey: circles.slice(0, 3),
    accent: circles.slice(3), // halo r=40, dot r=20, both at (1540,90)
    axisTags: tags.slice(0, 4),
    dotTags: tags.slice(4, 7), // intercom, biker apps, live location: same order as the grey dots
    lead: diag.querySelector('.lead.acc'),
  };
}

export default {
  id: 'unique',
  steps: ['TripPRO มุมขวาบน'],
  enter(section, ctx) {
    const { gsap } = ctx;
    const p = parts(section);
    gsap.set([p.rect, ...p.accent, p.lead], { opacity: 0 });

    const tl = gsap.timeline();
    tl.set(p.diag, { opacity: 1 }, 0);
    tl.fromTo(p.axes, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.7, ease: 'power2.inOut', immediateRender: true }, 0.05);
    tl.fromTo(p.heads, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power1.out', immediateRender: true }, 0.65);
    tl.fromTo(p.axisTags, { opacity: 0 }, { opacity: 1, duration: 0.4, ease: 'power1.out', stagger: 0.06, immediateRender: true }, 0.35);
    p.grey.forEach((dot, i) => {
      const at = 0.8 + i * 0.12;
      const { cy } = attrs(dot, ['cy']);
      tl.fromTo(dot, { opacity: 0, attr: { cy: cy - 20 } },
        { opacity: 1, attr: { cy }, duration: 0.5, ease: 'power3.out', immediateRender: true }, at);
      tl.fromTo(p.dotTags[i], { opacity: 0, translate: '0px -20px' },
        { opacity: 1, translate: '0px 0px', duration: 0.5, ease: 'power3.out', immediateRender: true }, at);
    });
    tl.set(p.axes, { clearProps: 'strokeDasharray,strokeDashoffset' });
    tl.set([p.diag, ...p.heads, ...p.grey, ...p.axisTags, ...p.dotTags], { clearProps: 'opacity,translate' });
    return tl;
  },
  step(section, i, ctx) {
    const { gsap } = ctx;
    const p = parts(section);
    const [halo, dot] = p.accent;
    const tl = gsap.timeline();
    tl.fromTo(p.rect, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out', immediateRender: true }, 0);
    tl.fromTo(dot, { opacity: 1, attr: { r: 0 } },
      { attr: { r: attrs(dot, ['r']).r }, duration: 0.5, ease: 'back.out(1.8)', immediateRender: true }, 0.1);
    tl.fromTo(halo, { opacity: 1, attr: { r: 0 } },
      { attr: { r: attrs(halo, ['r']).r }, duration: 0.7, ease: 'power3.out', immediateRender: true }, 0.2);
    tl.add(ctx.ring(p.svg, 1540, 90, '#C2410C', { r: 72, duration: 0.9 }), 0.15);
    tl.fromTo(p.lead, { opacity: 0, translate: '12px 0px' },
      { opacity: 1, translate: '0px 0px', duration: 0.5, ease: 'power3.out', immediateRender: true }, 0.4);
    tl.set([p.rect, halo, dot, p.lead], { clearProps: 'opacity,translate' });
    return tl;
  },
};
