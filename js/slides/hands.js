// Motion for the 'hands' slide: one "what breaks" row per click, each struck through by its red line;
// the last click adds the closing line (p.body.acc).

const IN = '.in1, .in2, .in3, .in4, .in5';

const rows = section => [...section.querySelectorAll('.fact.prow')];
const strike = row => row.querySelector('svg > line');
const body = section => section.querySelector('p.body.acc');

export default {
  id: 'hands',
  // The three .fact.prow texts of slides/hands.html, in order.
  steps: ['ข้อความ ส่งได้ช้า ไม่รู้ตัว', 'โทรไป ก็ไม่มีใครรับ', 'คนหลงกับกลุ่มไม่รู้ว่าขี่กันถึงไหนแล้ว'],

  reset(section, { gsap }) {
    gsap.set(section.querySelectorAll(IN), { opacity: 0 });
    gsap.set([...rows(section), body(section)], { opacity: 0, clearProps: 'translate' });
    gsap.set(rows(section).map(strike), { drawSVG: '0% 0%' });
  },

  step(section, i, { gsap }) {
    const tl = gsap.timeline();
    const row = rows(section)[i - 1];
    const line = strike(row);
    const els = [row];
    tl.fromTo(row, { opacity: 0, translate: '-16px 0px' },
      { opacity: 1, translate: '0px 0px', duration: 0.5, ease: 'power3.out', immediateRender: true }, 0);
    tl.fromTo(line, { drawSVG: '0% 0%' },
      { drawSVG: '0% 100%', duration: 0.42, ease: 'power2.inOut', immediateRender: true }, 0.34);
    if (i === 3) {
      const last = body(section);
      els.push(last);
      tl.fromTo(last, { opacity: 0, translate: '0px 16px' },
        { opacity: 1, translate: '0px 0px', duration: 0.45, ease: 'power3.out', immediateRender: true }, 0.7);
    }
    tl.set(els, { clearProps: 'opacity,translate' });
    tl.set(line, { clearProps: 'strokeDasharray,strokeDashoffset' });
    return tl;
  },
};
