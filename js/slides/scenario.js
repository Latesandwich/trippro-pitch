// Motion for the 'scenario' slide. See js/motion.js for MotionDef and ctx.
// The real ride, one moment per click: the fuel stop, the confusing junction, the wrong turn (counts to 1.6 km).

const IN = '.in1, .in2, .in3, .in4, .in5';
const rows = section => [...section.querySelectorAll('.fact.prow')];

// Row i rises in: the same 16 px, calm rise the deck uses for its blocks.
function rowIn(ctx, row) {
  return ctx.gsap.fromTo(row, { opacity: 0, y: 16 },
    { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out', immediateRender: true, clearProps: 'opacity,transform' });
}

export default {
  id: 'scenario',
  steps: ['แวะหาปั๊มน้ำมัน', 'เจอแยกก่อสร้าง', 'หลุดเส้นทาง 1.6 กม.'],

  reset(section, ctx) {
    ctx.gsap.set(section.querySelectorAll(IN), { opacity: 0 });
    ctx.gsap.set(rows(section), { opacity: 0 });
  },

  step(section, i, ctx) {
    const { gsap } = ctx;
    const row = rows(section)[i - 1];
    const icon = row.querySelector('.pi');
    const tl = gsap.timeline().add(rowIn(ctx, row), 0);

    if (i === 1) {
      // Search: a short look-around wiggle, settling back to rest.
      tl.set(icon, { transformOrigin: '50% 50%' }, 0)
        .to(icon, { keyframes: { rotation: [-16, 12, -7, 3, 0] }, duration: 0.65, ease: 'sine.inOut' }, 0.3)
        .set(icon, { clearProps: 'transform,transformOrigin' });
    } else if (i === 2) {
      // Warning: blinks twice.
      tl.to(icon, { keyframes: { opacity: [0.15, 1, 0.15, 1] }, duration: 0.7, ease: 'none' }, 0.3)
        .set(icon, { clearProps: 'opacity' });
    } else if (i === 3) {
      // Activity: the pulse line traces itself, while the distance counts 0 -> 1.6.
      const line = icon.querySelector('path');
      if (line) {
        tl.fromTo(line, { drawSVG: '0%' }, {
          drawSVG: '100%', duration: 0.6, ease: 'power2.inOut', immediateRender: true,
          clearProps: 'strokeDasharray,strokeDashoffset',
        }, 0.05);
      }
      const sub = row.querySelector('p.sub');
      const text = sub.textContent;
      const m = /(\d+(?:\.\d+)?)/.exec(text);
      if (m) {
        const head = text.slice(0, m.index), tail = text.slice(m.index + m[1].length);
        const to = Number(m[1]), places = (m[1].split('.')[1] || '').length;
        tl.add(ctx.count(sub, 0, to, v => head + v.toFixed(places) + tail, { duration: 0.85, ease: 'power2.out' }), 0.2);
      }
    }
    return tl;
  },
};
