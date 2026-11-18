// Motion for the 'close' slide. See js/motion.js for MotionDef and ctx.
// Enter: eyebrow, headline and tagline rise; the sub line fades; a route draws under the text.
// Ambient (plays once, no loop): slow photo push-in; 5 strung-out dots ride the route and all arrive
// at its end together, a soft pulse marks the arrival, then they hold.
import { riseEase } from '../motion.js';
import { bleedCopy, overlaySvg, slideBox, svgEl, wavePath } from './cover.js';

const ACCENT = '#F08A4B'; // dark slide
const INK = '#141518';
const STARTS = [0, 0.09, 0.2, 0.33, 0.48]; // where each dot starts on the route (the convoy strung out)
const RIDE = 3.8;
const DOTS_AT = 1.4; // seconds after the enter starts

function layer(section) {
  return overlaySvg(section, svg => {
    svg.append(svgEl('path', { class: 'route', fill: 'none', stroke: ACCENT, 'stroke-width': 3, 'stroke-linecap': 'round', opacity: 0.85 }));
    svg.append(svgEl('circle', { class: 'home', cx: 0, cy: 0, r: 13, fill: 'none', stroke: ACCENT, 'stroke-width': 2, opacity: 0 }));
    svg.append(svgEl('circle', { class: 'pulse', cx: 0, cy: 0, r: 10, fill: 'none', stroke: ACCENT, 'stroke-width': 2, opacity: 0 }));
    STARTS.forEach(() => svg.append(svgEl('circle', { class: 'dot', cx: 0, cy: 0, r: 7, fill: ACCENT, stroke: INK, 'stroke-width': 1.5, opacity: 0 })));
  });
}

export default {
  id: 'close',
  steps: [],
  enter(section, ctx) {
    const { gsap } = ctx;
    const rise = ['.eyebrow', 'h2.hero', 'p.tagline'].map(s => section.querySelector(s));
    const sub = section.querySelector('p.sub');

    const svg = layer(section);
    const route = svg.querySelector('.route');
    const home = svg.querySelector('.home');
    const pulse = svg.querySelector('.pulse');
    const dots = [...svg.querySelectorAll('.dot')];
    const text = slideBox(section, sub, true);
    const box = slideBox(section, sub);
    let end = null;
    if (text && box) {
      const y = box.y + box.h + 64;
      const x0 = text.x + 4, x1 = text.x + Math.max(text.w, 600);
      route.setAttribute('d', wavePath(x0, x1, y, 10));
      end = { x: x1, y };
      for (const c of [home, pulse]) { c.setAttribute('cx', x1); c.setAttribute('cy', y); }
    }

    const tl = gsap.timeline();
    rise.forEach((el, j) => {
      tl.fromTo(el, { opacity: 0, translate: '0px 16px' },
        { opacity: 1, translate: '0px 0px', duration: 0.52, ease: riseEase, immediateRender: true }, 0.08 + 0.16 * j);
    });
    tl.fromTo(sub, { opacity: 0 }, { opacity: 1, duration: 0.7, ease: 'power1.out', immediateRender: true }, 0.6);
    tl.fromTo(route, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.9, ease: 'power2.inOut', immediateRender: true }, 0.7);
    tl.fromTo(home, { opacity: 0 }, { opacity: 1, duration: 0.3, ease: 'power1.out', immediateRender: true }, 1.4);
    tl.set([...rise, sub], { clearProps: 'opacity,translate' });

    ctx.ambient(section, gsap.to(bleedCopy(section), { scale: 1.06, duration: 24, ease: 'sine.out' }));

    gsap.set(dots, { opacity: 0 });
    gsap.set(pulse, { opacity: 0, attr: { r: 10 } });
    const arrive = gsap.timeline({ delay: DOTS_AT });
    if (end) {
      dots.forEach((dot, i) => {
        arrive.to(dot, { motionPath: { path: route, align: route, alignOrigin: [0.5, 0.5], start: STARTS[i], end: 1 },
          duration: RIDE, ease: 'power2.inOut' }, 0);
        arrive.fromTo(dot, { opacity: 0 }, { opacity: 1, duration: 0.5, ease: 'power1.out', immediateRender: true }, 0.05 * i);
      });
      arrive.fromTo(pulse, { opacity: 0.9, attr: { r: 10 } }, { opacity: 0, attr: { r: 40 }, duration: 1.1, ease: 'power2.out', immediateRender: false }, RIDE - 0.05);
    }
    const played = ctx.ambient(section, arrive);
    if (played.paused()) played.progress(1); // ?static, ?reduced, print: show the convoy arrived
    return tl;
  },
};
