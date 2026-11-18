// Motion for the 'idea' slide (dark, accent #F08A4B). See js/motion.js for MotionDef and ctx.
// Enter: the headline, body and the handlebar photo rise; the phone screen is still quiet.
// Click 1, the hero moment: the TripPRO notification drops onto the screen, buzzes twice, the app icon
// sends out a ring, then the three proof pills pop in.

const IN = '.in1, .in2, .in3, .in4, .in5';
const ACCENT = '#F08A4B';

// The white notification card: the absolutely positioned block over the photo.
const card = section => [...section.querySelectorAll('.in2 > div')].find(d => d.style.position === 'absolute');
const pills = section => [...section.querySelectorAll('.in4 > p')];

export default {
  id: 'idea',
  steps: ['แจ้งเตือนเด้งบนมือถือ'],

  reset(section, ctx) {
    ctx.gsap.set(section.querySelectorAll(IN), { opacity: 0 });
    ctx.gsap.set([card(section), ...pills(section)], { opacity: 0 });
  },

  step(section, i, ctx) {
    const { gsap } = ctx;
    const note = card(section);
    const icon = note.querySelector('img');
    const tl = gsap.timeline();
    // ring() measures the icon now, at rest, before the card is lifted for the drop. It also draws its
    // first frame as soon as it is built, so its node stays hidden until the ring fires.
    const seen = new Set(section.querySelectorAll('.mo.ring'));
    const ring = ctx.ring(icon, icon.offsetWidth / 2, icon.offsetHeight / 2, ACCENT, { r: 44, duration: 0.6 });
    const node = [...section.querySelectorAll('.mo.ring')].find(n => !seen.has(n));
    if (node) tl.set(node, { opacity: 0 }, 0);

    tl.fromTo(note, { opacity: 0, y: -40 },
      { opacity: 1, y: 0, duration: 0.42, ease: 'power3.out', immediateRender: true }, 0)
      // the phone buzzes: two short shakes of 6 px either way
      .to(note, { keyframes: { x: [6, -6, 6, -6, 0] }, duration: 0.3, ease: 'none' }, 0.42)
      .add(ring, 0.42)
      .fromTo(pills(section), { opacity: 0, scale: 0.86 },
        { opacity: 1, scale: 1, duration: 0.3, ease: 'back.out(1.6)', stagger: 0.08, immediateRender: true }, 0.72)
      .set([note, ...pills(section)], { clearProps: 'opacity,transform' });
    return tl;
  },
};
