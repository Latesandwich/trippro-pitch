// Motion for the 'persona' slide (no clicks). Enter: the photo rises, the name and fact rows stagger in,
// the red top rule of "ต้องการ" draws left to right, then "อยากได้" and "ใช้ทุกวัน" fade in.

const IN = '.in1, .in2, .in3, .in4, .in5';
const ACCENT = '#C2410C';
const UP = { opacity: 1, translate: '0px 0px', ease: 'power3.out', immediateRender: true };

const parts = section => {
  const info = section.querySelector('.in2');
  const needs = section.querySelector('.in3');
  const want = needs.querySelector('.ruled.hot');
  return {
    photo: section.querySelector('.in1'),
    info,
    needs,
    name: info.firstElementChild,
    facts: [...info.querySelectorAll('.fact')],
    want,
    wantText: [...want.children],
    rest: [...needs.children].filter(el => el !== want),
  };
};

const hidden = p => [p.photo, p.name, ...p.facts, ...p.wantText, ...p.rest];

// A 2 px .mo bar laid exactly over the "ต้องการ" top border, so it can draw while the border is hidden.
function placeBar(section, want) {
  let bar = section.querySelector(':scope > .mo.rule-bar');
  if (!bar) {
    bar = document.createElement('div');
    bar.className = 'mo rule-bar';
    bar.setAttribute('aria-hidden', 'true');
    section.append(bar);
  }
  const s = section.getBoundingClientRect();
  const r = want.getBoundingClientRect();
  const k = s.width / 1920 || 1;
  bar.style.cssText = `position:absolute; left:${(r.left - s.left) / k}px; top:${(r.top - s.top) / k}px;`
    + ` width:${r.width / k}px; height:2px; background:${ACCENT}; transform-origin:0 50%;`
    + ' pointer-events:none; opacity:0';
  return r.width > 0 ? bar : null;
}

export default {
  id: 'persona',
  steps: [],

  reset(section, { gsap }) {
    const p = parts(section);
    gsap.set(section.querySelectorAll(IN), { opacity: 0 });
    gsap.set(hidden(p), { opacity: 0, clearProps: 'translate' });
    gsap.set(p.want, { borderTopColor: 'transparent' });
    const bar = section.querySelector(':scope > .mo.rule-bar');
    if (bar) gsap.set(bar, { opacity: 0 });
  },

  enter(section, { gsap }) {
    const p = parts(section);
    const tl = gsap.timeline();
    tl.fromTo([p.info, p.needs], { opacity: 1 }, { opacity: 1, duration: 0.01, immediateRender: true }, 0);
    tl.fromTo(p.photo, { opacity: 0, translate: '0px 24px' }, { ...UP, duration: 0.6 }, 0);
    tl.fromTo(p.name, { opacity: 0, translate: '0px 16px' }, { ...UP, duration: 0.5 }, 0.12);
    tl.fromTo(p.facts, { opacity: 0, translate: '0px 16px' }, { ...UP, duration: 0.5, stagger: 0.1 }, 0.24);
    const bar = placeBar(section, p.want);
    if (bar) {
      tl.fromTo(bar, { opacity: 1, scaleX: 0 },
        { opacity: 1, scaleX: 1, duration: 0.5, ease: 'power2.inOut', immediateRender: false }, 0.6);
    }
    tl.set(p.want, { clearProps: 'borderTopColor' }, 1.1);
    if (bar) tl.set(bar, { opacity: 0 }, 1.1);
    tl.fromTo(p.wantText, { opacity: 0, translate: '0px 12px' }, { ...UP, duration: 0.45 }, 0.85);
    tl.fromTo(p.rest, { opacity: 0, translate: '0px 12px' }, { ...UP, duration: 0.45, stagger: 0.15 }, 1.0);
    tl.set([p.info, p.needs, ...hidden(p)], { clearProps: 'opacity,translate' });
    return tl;
  },
};
