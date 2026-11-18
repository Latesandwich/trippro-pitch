// Motion for the 'team' slide. See js/motion.js for MotionDef and ctx.
// Enter: the 4 member stacks rise 0.12 s apart.
import { riseEase } from '../motion.js';

export default {
  id: 'team',
  steps: [],
  enter(section, ctx) {
    const members = [...section.querySelectorAll('.team > .stack')];
    const tl = ctx.gsap.timeline();
    members.forEach((el, j) => {
      tl.fromTo(el, { opacity: 0, translate: '0px 16px' },
        { opacity: 1, translate: '0px 0px', duration: 0.52, ease: riseEase, immediateRender: true }, 0.08 + 0.12 * j);
    });
    tl.set(members, { clearProps: 'opacity,translate' });
    return tl;
  },
};
