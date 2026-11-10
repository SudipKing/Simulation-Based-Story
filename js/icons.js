/* Story emblems: hand-drawn SVG icons on a 64x64 grid, stroked in gold. */
(function () {
  'use strict';
  const S = 'fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"';
  const ICONS = {
    bow: { label: 'Bow', svg:
      `<g ${S}><path d="M22 6 Q58 32 22 58"/><path d="M22 6 L22 58" stroke-width="1.6"/><path d="M10 32 H52"/><path d="M52 32 l-7 -5 M52 32 l-7 5"/><path d="M10 32 l-5 -4 M10 32 l-5 4 M16 32 l-5 -4 M16 32 l-5 4"/></g>` },
    sword: { label: 'Sword', svg:
      `<g ${S}><path d="M32 6 L38 40 H26 Z"/><path d="M32 12 V36" stroke-width="1.5"/><path d="M18 40 H46"/><path d="M32 40 V52"/><circle cx="32" cy="56" r="3.5"/></g>` },
    crown: { label: 'Crown', svg:
      `<g ${S}><path d="M8 46 L12 20 L24 32 L32 14 L40 32 L52 20 L56 46 Z"/><path d="M8 52 H56"/><circle cx="12" cy="18" r="2.4"/><circle cx="32" cy="12" r="2.4"/><circle cx="52" cy="18" r="2.4"/></g>` },
    shield: { label: 'Shield', svg:
      `<g ${S}><path d="M32 6 L54 14 V32 Q54 50 32 58 Q10 50 10 32 V14 Z"/><path d="M32 6 V58" stroke-width="1.6"/><path d="M10 28 H54" stroke-width="1.6"/></g>` },
    tower: { label: 'Tower', svg:
      `<g ${S}><path d="M18 58 V24 H46 V58 Z"/><path d="M14 24 V14 H21 V18 H27 V14 H37 V18 H43 V14 H50 V24"/><path d="M28 58 V46 Q32 40 36 46 V58"/><path d="M32 30 V34"/></g>` },
    tree: { label: 'Elder tree', svg:
      `<g ${S}><path d="M32 58 V38"/><path d="M32 46 L22 38 M32 42 L42 34"/><path d="M32 10 C14 10 8 28 20 36 C14 44 26 50 32 44 C38 50 50 44 44 36 C56 28 50 10 32 10 Z"/></g>` },
    skull: { label: 'Skull', svg:
      `<g ${S}><path d="M14 30 C14 14 22 8 32 8 C42 8 50 14 50 30 C50 36 46 38 44 40 V50 H20 V40 C18 38 14 36 14 30 Z"/><circle cx="24" cy="30" r="5"/><circle cx="40" cy="30" r="5"/><path d="M32 36 L29 42 H35 Z"/><path d="M26 50 V44 M32 50 V46 M38 50 V44" stroke-width="2"/></g>` },
    flame: { label: 'Flame', svg:
      `<g ${S}><path d="M32 6 C34 18 48 24 48 40 C48 52 40 58 32 58 C24 58 16 52 16 40 C16 32 22 28 24 20 C28 24 30 24 30 28 C34 22 34 14 32 6 Z"/><path d="M32 58 C26 58 24 50 28 44 C30 40 32 38 32 34 C38 40 40 50 32 58 Z" stroke-width="2"/></g>` },
    anvil: { label: 'Anvil', svg:
      `<g ${S}><path d="M8 20 H48 C52 20 56 22 58 26 C54 30 48 30 44 30 H38 V38 C38 42 42 44 44 48 V52 H20 V48 C22 44 26 42 26 38 V30 H20 C14 30 8 26 8 20 Z"/><path d="M14 56 H50"/></g>` },
    scroll: { label: 'Scroll', svg:
      `<g ${S}><path d="M16 10 H46 C50 10 52 13 52 16 V48 C52 53 49 56 45 56 H18 C14 56 12 53 12 50 V18"/><path d="M12 18 C12 12 20 12 20 18"/><path d="M22 22 H42 M22 30 H42 M22 38 H36" stroke-width="2"/></g>` },
    dragon: { label: 'Dragon', svg:
      `<g ${S}><path d="M10 44 C14 30 26 30 30 22 C32 14 40 10 46 14 L54 12 L50 20 C52 26 48 30 44 30 C40 34 36 44 28 48 C22 52 14 52 10 44 Z"/><path d="M30 26 C24 20 16 18 8 22 C14 24 18 28 22 32"/><circle cx="46" cy="18" r="1.4" fill="currentColor"/></g>` },
    moon: { label: 'Moon', svg:
      `<g ${S}><path d="M44 8 C28 10 18 22 18 36 C18 48 26 56 38 56 C44 56 50 54 54 50 C38 52 30 42 32 28 C33 20 38 12 44 8 Z"/><path d="M50 14 l2 5 l5 1 l-4 3 l1 5 l-4 -3 l-5 2 l2 -5 Z" stroke-width="1.8"/></g>` }
  };

  function svg(name, size) {
    const i = ICONS[name] || ICONS.scroll;
    return `<svg class="emblem" viewBox="0 0 64 64" width="${size || 64}" height="${size || 64}" role="img" aria-label="${i.label}">${i.svg}</svg>`;
  }

  window.Icons = { ICONS: ICONS, svg: svg, names: Object.keys(ICONS) };
})();
