// Motion for the 'setup' slide: mount, tap, map arrive one per click (the product pattern); the last
// click also brings in the "ระหว่างขี่" panel with a slow pulse dot beside its lead line.
import { arrowIn, columnIn, settle } from './product.js';

const ACCENT = '#C2410C';

const cols = section => [...section.querySelectorAll('.flowrow > .stack:not(.ruled)')];
const arrows = section => [...section.querySelectorAll('.flowrow > x-shape.arrow')];
const panel = section => section.querySelector('.flowrow > .ruled.hot');

// An absolute .mo span at the end of the panel's lead text: with no top/left it sits at its static
// position, right after the last character, so it needs no measuring.
function makePulse(section) {
  const lead = panel(section) && panel(section).querySelector('p.lead');
  if (!lead || lead.querySelector('.mo.pulse')) return;
  const pulse = document.createElement('span');
  pulse.className = 'mo pulse';
  pulse.setAttribute('aria-hidden', 'true');
  pulse.style.cssText = 'position:absolute; width:12px; height:12px; margin:calc(0.5lh - 6px) 0 0 12px;'
    + ' pointer-events:none';
  const dot = 'position:absolute; inset:0; border-radius:50%; background:' + ACCENT;
  pulse.innerHTML = `<span class="halo" style="${dot}; opacity:0"></span><span class="dot" style="${dot}"></span>`;
  lead.append(pulse);
}

const halo = section => section.querySelector('.mo.pulse .halo');

export default {
  id: 'setup',
  steps: ['2 · กดเริ่มแชร์', '3 · เปิดแผนที่ + ระหว่างขี่'],

  setup(section) {
    makePulse(section);
  },

  reset(section, { gsap }) {
    gsap.set([...cols(section), panel(section)], { opacity: 0 });
    gsap.set(arrows(section), { opacity: 0 });
    if (halo(section)) gsap.set(halo(section), { scale: 1, opacity: 0 });
  },

  enter(section, { gsap }) {
    const tl = gsap.timeline();
    const first = cols(section)[0];
    columnIn(tl, gsap, first, 0.08);
    return settle(tl, gsap, [first], []);
  },

  step(section, i, ctx) {
    const { gsap } = ctx;
    const tl = gsap.timeline();
    const arrow = arrows(section)[i - 1];
    const col = cols(section)[i];
    const els = [col];
    arrowIn(tl, gsap, arrow, 0);
    columnIn(tl, gsap, col, 0.3);
    if (i === 2) {
      const hot = panel(section);
      els.push(hot);
      columnIn(tl, gsap, hot, 0.5);
      const ring = halo(section);
      if (ring) {
        tl.call(() => ctx.ambient(section, gsap.fromTo(ring, { scale: 1, opacity: 0.45 },
          { scale: 2.8, opacity: 0, duration: 2, ease: 'power2.out', repeat: -1, repeatDelay: 0.6 })));
      }
    }
    return settle(tl, gsap, els, [arrow]);
  },
};
