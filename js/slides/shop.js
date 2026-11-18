// Motion for the 'shop' slide. See js/motion.js for MotionDef and ctx.
//
// Enter: the two shop photos rise, the concept phone (with its ต้นแบบ badge) slides in from the right.
// Click 1: the projection svg draws (small outline on the phone, then the dashed lines), the shop card
// zooms from the small outline's box to its own box, then its own outline draws.
// Click 2: the label and the three .fact.prow rows stagger in.
//
// The zoom geometry is read from the live layout (the svg's rects and the card's box) when it plays.
// The card keeps its inline `transform`; the zoom uses the separate CSS `translate` / `scale`
// properties, which compose with it and are cleared at the end.

const CARD = '[id="28ad3da5"]';
const EASE = 'power3.out';
const lineEnds = new WeakMap(); // line -> its original { x2, y2 }

const parts = section => {
  const svg = section.querySelector('svg.in3');
  const rects = svg ? [...svg.querySelectorAll('rect')] : [];
  const area = r => (+r.getAttribute('width') || 0) * (+r.getAttribute('height') || 0);
  rects.sort((a, b) => area(a) - area(b)); // smallest: the card on the phone; largest: the card's outline
  return {
    svg,
    small: rects.length > 1 ? rects[0] : null,
    big: rects.length ? rects[rects.length - 1] : null,
    lines: svg ? [...svg.querySelectorAll('line')] : [],
    card: section.querySelector(CARD),
    stack: section.querySelector('.stack.in3'),
  };
};

const rowsOf = stack => (stack ? [...stack.children] : []);

function clearZoom(card) {
  if (!card) return;
  card.style.removeProperty('translate');
  card.style.removeProperty('scale');
}

// translate/scale (in CSS px) that put the card, at rest, onto `target`'s box. null if not measurable.
function zoomFrom(section, card, target) {
  clearZoom(card);
  const s = section.getBoundingClientRect();
  const k = s.width / (section.offsetWidth || 1920);
  const b = card.getBoundingClientRect();
  const t = target.getBoundingClientRect();
  if (!(k > 0 && b.width > 0 && b.height > 0 && t.width > 0 && t.height > 0)) return null;
  // Find the transform origin by probing: with scale 2, left' = 2·left − origin.
  card.style.scale = '2';
  const p = card.getBoundingClientRect();
  card.style.removeProperty('scale');
  const ox = 2 * b.left - p.left, oy = 2 * b.top - p.top;
  const sx = t.width / b.width, sy = t.height / b.height;
  return {
    sx, sy,
    tx: (t.left - ox - sx * (b.left - ox)) / k,
    ty: (t.top - oy - sy * (b.top - oy)) / k,
  };
}

export default {
  id: 'shop',
  steps: ['ซูมการ์ดร้าน', 'ร้านได้อะไร'],

  setup(section) {
    for (const line of parts(section).lines) {
      lineEnds.set(line, { x2: line.getAttribute('x2'), y2: line.getAttribute('y2') });
    }
  },

  reset(section, ctx) {
    const { gsap } = ctx;
    const p = parts(section);
    gsap.set(section.querySelectorAll('.in1, .in2'), { opacity: 0 });
    gsap.set([p.svg, p.stack].filter(Boolean), { opacity: 1 });
    if (p.svg) {
      const shapes = p.svg.querySelectorAll('rect, line');
      gsap.set(shapes, { opacity: 0, clearProps: 'stroke-dasharray,stroke-dashoffset' });
      for (const line of p.lines) {
        const end = lineEnds.get(line);
        if (end) { line.setAttribute('x2', end.x2); line.setAttribute('y2', end.y2); }
      }
    }
    gsap.set(rowsOf(p.stack), { opacity: 0 });
    if (p.card) { clearZoom(p.card); gsap.set(p.card, { opacity: 0 }); }
  },

  enter(section, ctx) {
    const { gsap } = ctx;
    const photos = section.querySelector('.in1');
    const phone = section.querySelector('.in2');
    const tl = gsap.timeline();
    if (photos) {
      tl.fromTo(photos, { opacity: 0, translate: '0px 24px' },
        { opacity: 1, translate: '0px 0px', duration: 0.7, ease: EASE, immediateRender: true }, 0.08);
    }
    if (phone) {
      tl.fromTo(phone, { opacity: 0, translate: '40px 0px' },
        { opacity: 1, translate: '0px 0px', duration: 0.8, ease: EASE, immediateRender: true }, 0.35);
    }
    tl.set([photos, phone].filter(Boolean), { clearProps: 'translate' });
    return tl;
  },

  step(section, i, ctx) {
    const { gsap } = ctx;
    const p = parts(section);
    const tl = gsap.timeline();

    if (i === 1) {
      if (p.small) {
        tl.set(p.small, { opacity: 1 }, 0)
          .fromTo(p.small, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.32, ease: 'power2.inOut' }, 0);
      }
      // Dashed lines grow from their start point (DrawSVG would overwrite their dash pattern).
      p.lines.forEach(line => {
        const end = lineEnds.get(line) || { x2: line.getAttribute('x2'), y2: line.getAttribute('y2') };
        tl.set(line, { opacity: 1 }, 0.24)
          .fromTo(line, { attr: { x2: line.getAttribute('x1'), y2: line.getAttribute('y1') } },
            { attr: { x2: +end.x2, y2: +end.y2 }, duration: 0.34, ease: 'power2.out' }, 0.24);
      });

      if (p.card) {
        const z = { q: 0 };
        let g;
        const render = () => {
          if (z.q >= 1 || !g) { clearZoom(p.card); return; }
          const q = z.q;
          p.card.style.translate = `${g.tx * (1 - q)}px ${g.ty * (1 - q)}px`;
          p.card.style.scale = `${g.sx + (1 - g.sx) * q} ${g.sy + (1 - g.sy) * q}`;
        };
        tl.call(() => {
          g = p.small ? zoomFrom(section, p.card, p.small) : null;
          z.q = 0;
          render();
        }, null, 0);
        tl.to(p.card, { opacity: 1, duration: 0.18, ease: 'power1.out' }, 0.46)
          .to(z, { q: 1, duration: 0.5, ease: EASE, onUpdate: render, onComplete: render }, 0.46)
          .call(() => { z.q = 1; render(); }, null, 0.96);
      }

      if (p.big && p.big !== p.small) {
        tl.set(p.big, { opacity: 1 }, 0.86)
          .fromTo(p.big, { drawSVG: '0% 0%' }, { drawSVG: '0% 100%', duration: 0.29, ease: 'power2.inOut' }, 0.86);
      }
      const drawn = [p.small, p.big].filter(Boolean);
      if (drawn.length) tl.set(drawn, { clearProps: 'stroke-dasharray,stroke-dashoffset' }, '>');
      return tl;
    }

    if (i === 2) {
      const rows = rowsOf(p.stack);
      if (rows.length) {
        tl.fromTo(rows, { opacity: 0, translate: '0px 14px' },
          { opacity: 1, translate: '0px 0px', duration: 0.5, ease: EASE, stagger: 0.14, immediateRender: true }, 0)
          .set(rows, { clearProps: 'translate' });
      }
      return tl;
    }
    return tl;
  },
};
