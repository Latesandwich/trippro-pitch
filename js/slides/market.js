// Motion for the 'market' slide. See js/motion.js for MotionDef and ctx.
// Enter: the park list rises, the bars grow from 0 to their widths (staggered) and their values count up.
// Step 1: the right column rises and its two figures count up.
import { riseEase } from '../motion.js';

const widths = new WeakMap(); // .hbar -> its original inline width

// A count-up formatter that ends on the element's own text, e.g. "2.14 ล้าน", "865,000", "56 ล้าน".
function counter(el) {
  const m = el.textContent.trim().match(/^([\d,]+(?:\.(\d+))?)(.*)$/);
  if (!m) return null;
  const decimals = m[2] ? m[2].length : 0;
  const grouped = m[1].includes(',');
  const target = Number(m[1].replace(/,/g, ''));
  const suffix = m[3];
  const format = v => v.toLocaleString('en-US',
    { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: grouped }) + suffix;
  return { target, format };
}

function countUp(ctx, el, opts) {
  const c = counter(el);
  return c ? ctx.count(el, 0, c.target, c.format, opts) : null;
}

function riseIn(tl, el, at) {
  tl.fromTo(el, { opacity: 0, translate: '0px 16px' },
    { opacity: 1, translate: '0px 0px', duration: 0.52, ease: riseEase, immediateRender: true }, at);
}

export default {
  id: 'market',
  steps: ['56 ล้าน และ 402,364'],
  enter(section, ctx) {
    const { gsap } = ctx;
    const list = section.querySelector('.in1');
    const bars = [...section.querySelectorAll('.hbar')];
    const tl = gsap.timeline();
    riseIn(tl, list, 0.08);
    bars.forEach((bar, i) => {
      if (!widths.has(bar)) widths.set(bar, bar.style.width);
      const at = 0.3 + i * 0.1;
      tl.fromTo(bar, { width: '0px' }, { width: widths.get(bar), duration: 0.9, ease: 'power3.out', immediateRender: true }, at);
      const value = countUp(ctx, bar.nextElementSibling, { duration: 0.9, ease: 'power3.out' });
      if (value) tl.add(value, at);
    });
    tl.set(list, { clearProps: 'opacity,translate' });
    return tl;
  },
  step(section, i, ctx) {
    const { gsap } = ctx;
    const column = section.querySelector('.in2');
    const tl = gsap.timeline();
    riseIn(tl, column, 0);
    [...column.querySelectorAll('.num')].forEach((num, j) => {
      const value = countUp(ctx, num, { duration: 0.9, ease: 'power2.out' });
      if (value) tl.add(value, 0.1 + 0.12 * j);
    });
    tl.set(column, { clearProps: 'opacity,translate' });
    return tl;
  },
};
