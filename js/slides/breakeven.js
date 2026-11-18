// Motion for the 'breakeven' slide. See js/motion.js for MotionDef and ctx.
//
// Enter: the cost row's label fades in and its two .seg grow from the left (clip-path wipe, so the
// text inside is never squashed), the .beline draws downward, then the จุดคุ้มทุน tag appears.
// Clicks 1-3: rows 2, 3, 4 (label with its blocks, left to right). Click 3 then shows p.body (฿0).

const EASE = 'power3.out';
const HIDE_LEFT = 'inset(0% 100% 0% 0%)';
const HIDE_DOWN = 'inset(0% 0% 100% 0%)';
const SHOWN = 'inset(0% 0% 0% 0%)';

const parts = section => {
  const rows = [...section.querySelectorAll('.brow')];
  return {
    rows,
    labels: rows.map(row => row.querySelector('.blab')).filter(Boolean),
    segs: [...section.querySelectorAll('.seg')],
    blocks: rows.map(row => [...row.querySelectorAll('.blk')]),
    line: section.querySelector('.beline'),
    tag: section.querySelector('.tag.acc'),
    body: section.querySelector('p.body'),
  };
};

function showRow(tl, row, labelOf, blocks, span) {
  if (labelOf) {
    tl.fromTo(labelOf, { opacity: 0, translate: '-12px 0px' },
      { opacity: 1, translate: '0px 0px', duration: 0.4, ease: EASE, immediateRender: true }, 0)
      .set(labelOf, { clearProps: 'translate' }, 0.4);
  }
  if (blocks.length) {
    const each = blocks.length > 1 ? span / (blocks.length - 1) : 0;
    tl.fromTo(blocks, { opacity: 0, clipPath: HIDE_LEFT },
      { opacity: 1, clipPath: SHOWN, duration: 0.28, ease: 'power2.out', stagger: each, immediateRender: true }, 0.08)
      .set(blocks, { clearProps: 'clipPath' });
  }
  return tl;
}

export default {
  id: 'breakeven',
  steps: ['17 ทริป Pro', '10 แก๊งรายเดือน', '5 ร้าน'],

  reset(section, ctx) {
    const { gsap } = ctx;
    const p = parts(section);
    gsap.set(section.querySelectorAll('.in1'), { opacity: 1 });
    gsap.set([...p.labels, ...p.blocks.flat(), p.line, p.tag, p.body].filter(Boolean), { opacity: 0, clearProps: 'clipPath' });
    gsap.set(p.segs, { clipPath: HIDE_LEFT });
  },

  enter(section, ctx) {
    const { gsap } = ctx;
    const p = parts(section);
    const tl = gsap.timeline();
    const costLabel = p.rows[0] && p.rows[0].querySelector('.blab');
    if (costLabel) {
      tl.fromTo(costLabel, { opacity: 0, translate: '-12px 0px' },
        { opacity: 1, translate: '0px 0px', duration: 0.45, ease: EASE, immediateRender: true }, 0.1)
        .set(costLabel, { clearProps: 'translate' }, 0.55);
    }
    // The two segments read as one bar filling up: ease in on the first, out on the last.
    p.segs.forEach((seg, j) => {
      const last = j === p.segs.length - 1;
      tl.fromTo(seg, { clipPath: HIDE_LEFT }, {
        clipPath: SHOWN, duration: 0.42, ease: last ? 'power2.out' : 'power1.in', immediateRender: true,
      }, 0.2 + j * 0.42);
    });
    if (p.segs.length) tl.set(p.segs, { clearProps: 'clipPath' }, 0.2 + p.segs.length * 0.42);
    if (p.line) {
      tl.fromTo(p.line, { opacity: 1, clipPath: HIDE_DOWN },
        { clipPath: SHOWN, duration: 0.5, ease: 'power2.out', immediateRender: false }, 1.0)
        .set(p.line, { clearProps: 'clipPath' }, 1.5);
    }
    if (p.tag) tl.fromTo(p.tag, { opacity: 0 }, { opacity: 1, duration: 0.35, ease: 'power1.out', immediateRender: false }, 1.4);
    return tl;
  },

  step(section, i, ctx) {
    const { gsap } = ctx;
    const p = parts(section);
    const row = p.rows[i];
    const tl = gsap.timeline();
    if (!row) return tl;
    const blocks = p.blocks[i] || [];
    showRow(tl, row, row.querySelector('.blab'), blocks, Math.min(0.8, 0.09 * (blocks.length - 1)));
    if (i === 3 && p.body) {
      tl.fromTo(p.body, { opacity: 0, translate: '0px 12px' },
        { opacity: 1, translate: '0px 0px', duration: 0.4, ease: EASE, immediateRender: false }, '>-0.05')
        .set(p.body, { clearProps: 'translate' });
    }
    return tl;
  },
};
