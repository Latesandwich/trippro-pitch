// The artifact viewer's custom elements, rebuilt: <x-icon name="..."> and <x-shape kind="...">.
// Icon drawings: Lucide (https://lucide.dev), ISC licence, (c) Lucide Contributors.

const SVG_NS = 'http://www.w3.org/2000/svg';

const ICONS = {
  Search: '<circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/>',
  Users: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/>'
    + '<path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
  Star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  Clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  Warning: '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/>'
    + '<path d="M12 9v4"/><path d="M12 17h.01"/>',
  Activity: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
};

function svg(viewBox, inner, extra = '') {
  const el = document.createElementNS(SVG_NS, 'svg');
  el.setAttribute('viewBox', viewBox);
  el.setAttribute('width', '100%');
  el.setAttribute('height', '100%');
  el.setAttribute('fill', 'none');
  el.setAttribute('stroke', 'currentColor');
  el.setAttribute('stroke-linecap', 'round');
  el.setAttribute('stroke-linejoin', 'round');
  el.setAttribute('aria-hidden', 'true');
  if (extra) el.setAttribute('preserveAspectRatio', extra);
  el.style.display = 'block';
  el.style.overflow = 'visible';
  el.innerHTML = inner;
  return el;
}

class XIcon extends HTMLElement {
  connectedCallback() {
    if (this.firstElementChild) return;
    const drawing = ICONS[this.getAttribute('name')];
    if (!drawing) return;
    const icon = svg('0 0 24 24', drawing);
    icon.setAttribute('stroke-width', '2');
    this.append(icon);
  }
}

// arrow-right: a line with a chevron head, drawn in the colour the stylesheet gives the shape's
// background (deck.css paints `.arrow` orange), so the box itself stays clear.
class XShape extends HTMLElement {
  connectedCallback() {
    if (this.firstElementChild) return;
    if (this.getAttribute('kind') !== 'arrow-right') return;
    const paint = getComputedStyle(this).backgroundColor;
    const shape = svg('0 0 40 20',
      '<path class="shaft" d="M2 10 H37"/><path class="head" d="M29 3 L37 10 L29 17"/>', 'none');
    shape.setAttribute('stroke-width', '3');
    if (paint && paint !== 'rgba(0, 0, 0, 0)' && paint !== 'transparent') {
      shape.style.color = paint;
      this.style.background = 'none';
    }
    this.append(shape);
  }
}

if (!customElements.get('x-icon')) customElements.define('x-icon', XIcon);
if (!customElements.get('x-shape')) customElements.define('x-shape', XShape);
