// Motion for the 'product' slide: the four beta screens arrive one per click, each led by its arrow.
// The flow helpers are shared with setup.js, which runs the same pattern.

const LIFT = '0px 24px';

// A column slides up 24 px and fades in.
export function columnIn(tl, gsap, el, at) {
  return tl.fromTo(el, { opacity: 0, translate: LIFT },
    { opacity: 1, translate: '0px 0px', duration: 0.6, ease: 'power3.out', immediateRender: true }, at);
}

// An x-shape arrow draws left to right: the shaft, then the chevron from its tip outwards.
export function arrowIn(tl, gsap, arrow, at) {
  const shaft = arrow.querySelector('.shaft');
  const head = arrow.querySelector('.head');
  tl.fromTo(arrow, { opacity: 0 }, { opacity: 1, duration: 0.01, immediateRender: true }, at);
  if (shaft) {
    tl.fromTo(shaft, { drawSVG: '0% 0%' },
      { drawSVG: '0% 100%', duration: 0.36, ease: 'power2.inOut', immediateRender: true }, at);
  }
  if (head) {
    tl.fromTo(head, { drawSVG: '50% 50%', opacity: 0 },
      { drawSVG: '0% 100%', opacity: 1, duration: 0.22, ease: 'power2.out', immediateRender: true }, at + 0.28);
  }
  return tl;
}

// Back to the original look: no inline opacity, translate or dash pattern left behind.
export function settle(tl, gsap, els, arrows) {
  tl.set(els, { clearProps: 'opacity,translate' });
  for (const arrow of arrows) {
    tl.set(arrow, { clearProps: 'opacity' });
    tl.set(arrow.querySelectorAll('path'), { clearProps: 'opacity,strokeDasharray,strokeDashoffset' });
  }
  return tl;
}

const cols = section => [...section.querySelectorAll('.flowrow > .stepcol')];
const arrows = section => [...section.querySelectorAll('.flowrow > x-shape.arrow')];

export default {
  id: 'product',
  steps: ['2 · เข้าร่วม', '3 · ออกเดินทาง', '4 · ถึงบ้าน'],

  reset(section, { gsap }) {
    gsap.set(cols(section), { opacity: 0 });
    gsap.set(arrows(section), { opacity: 0 });
  },

  enter(section, { gsap }) {
    const tl = gsap.timeline();
    const first = cols(section)[0];
    columnIn(tl, gsap, first, 0.08);
    return settle(tl, gsap, [first], []);
  },

  step(section, i, { gsap }) {
    const tl = gsap.timeline();
    const arrow = arrows(section)[i - 1];
    const col = cols(section)[i];
    arrowIn(tl, gsap, arrow, 0);
    columnIn(tl, gsap, col, 0.3);
    return settle(tl, gsap, [col], [arrow]);
  },
};
