// Test fixture, loaded by js/app.js only under ?fixture: `hands` gets 2 click steps of 600 ms each.
// Each step moves a .mo marker 100 px, so a step's finished state is easy to read back.
import { registerMotion } from '../../js/motion.js';

const IN = '.in1, .in2, .in3, .in4, .in5';

registerMotion({
  id: 'hands',
  steps: ['ขั้นทดสอบที่หนึ่ง', 'ขั้นทดสอบที่สอง'],
  setup(section) {
    const marker = document.createElement('div');
    marker.className = 'mo fixture-marker';
    marker.style.cssText = 'position:absolute; left:0; top:0; width:20px; height:20px; background:#C2410C';
    section.append(marker);
  },
  step(section, i, ctx) {
    return ctx.gsap.timeline().to(section.querySelector('.fixture-marker'), { x: i * 100, duration: 0.6, ease: 'none' });
  },
  reset(section, ctx) {
    ctx.gsap.set(section.querySelector('.fixture-marker'), { x: 0 });
    ctx.gsap.set(section.querySelectorAll(IN), { opacity: 0 });
  },
});
