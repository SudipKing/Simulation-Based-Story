/*
 * Pixel art in the style of WorldBox, drawn procedurally.
 * All sprites and terrain here are original, generated in code. To use your own
 * WorldBox screenshots instead, drop images in /assets and see README.md.
 */
(function () {
  'use strict';

  // ---------- seeded random + value noise ----------
  function rng(seed) {
    let s = (seed >>> 0) || 1;
    return function () {
      s += 0x6D2B79F5;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeNoise(seed) {
    const r = rng(seed);
    const N = 256, g = new Float32Array(N * N);
    for (let i = 0; i < g.length; i++) g[i] = r();
    const at = (x, y) => g[((y & 255) * N) + (x & 255)];
    const sm = t => t * t * (3 - 2 * t);
    function value(x, y) {
      const xi = Math.floor(x), yi = Math.floor(y);
      const xf = sm(x - xi), yf = sm(y - yi);
      const a = at(xi, yi), b = at(xi + 1, yi), c = at(xi, yi + 1), d = at(xi + 1, yi + 1);
      return a + (b - a) * xf + (c - a) * yf + (a - b - c + d) * xf * yf;
    }
    return function (x, y) {
      return value(x, y) * 0.55 + value(x * 2.1, y * 2.1) * 0.3 + value(x * 4.3, y * 4.3) * 0.15;
    };
  }

  // ---------- terrain ----------
  const COL = {
    deep:   ['#1b3f8c', '#1d4496'],
    sea:    ['#2a62c9', '#2d68d1'],
    shore:  ['#4f93e6', '#559aee'],
    sand:   ['#e8d28a', '#e2cb80'],
    jungle: ['#2f9a3c', '#329f40'],
    jungleD:['#1f7a2e', '#217f31'],
    ench:   ['#38b98a', '#3cc093'],
    enchD:  ['#2b9a99', '#2da1a0'],
    grass:  ['#6cc04a', '#70c64d'],
    rock:   ['#8a8f99', '#92979f'],
    rockD:  ['#656a75', '#6b707b'],
    snow:   ['#eef4fb', '#e3ecf6'],
    waste:  ['#8a8a2f', '#92922f'],
    wasteD: ['#6e6e22', '#757526'],
    swamp:  ['#4a6a3a', '#4f7040']
  };

  /**
   * Draws a world map onto a canvas, one tile = one pixel (canvas is then scaled
   * up with image-rendering: pixelated). Biome zones follow the lore: Rocklands
   * in the northwest, wasteland in the northeast, Enchanted Wood in the middle,
   * jungle in the east, and a river that splits the land after the Age of Tears.
   */
  function drawWorld(canvas, opts) {
    opts = opts || {};
    const W = opts.w || 192, H = opts.h || 108;
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');
    const img = ctx.createImageData(W, H);
    const seed = opts.seed || 1;
    const noise = makeNoise(seed);
    const detail = makeNoise(seed + 99);
    const biomeNoise = makeNoise(seed + 7);
    const split = opts.river !== false;

    const hex = h => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
    const put = (i, c) => { img.data[i] = c[0]; img.data[i + 1] = c[1]; img.data[i + 2] = c[2]; img.data[i + 3] = 255; };

    const tiles = new Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const nx = x / W, ny = y / H;
        // island falloff so the world is a continent in an ocean
        const dx = (nx - 0.5) * 1.9, dy = (ny - 0.5) * 2.1;
        const fall = Math.min(1, Math.sqrt(dx * dx + dy * dy));
        let h = noise(x / 22, y / 22) * 1.15 - fall * 0.72 + 0.28;
        // diagonal river (Age of Tears), from the NE shore toward the SW
        if (split) {
          const line = (nx - 0.38) * 1.0 + (ny - 0.5) * 0.9; // diagonal axis
          const rd = Math.abs(line - (detail(x / 18, y / 18) - 0.5) * 0.12);
          if (rd < 0.028 && h > 0.3) h = 0.29;
        }
        let kind;
        if (h < 0.18) kind = 'deep';
        else if (h < 0.28) kind = 'sea';
        else if (h < 0.32) kind = 'shore';
        else if (h < 0.35) kind = 'sand';
        else {
          // biome by region with noisy edges
          const b = biomeNoise(x / 14, y / 14) * 0.18;
          const rocky = (1 - nx) * 1.0 + (1 - ny) * 1.0 + b;      // NW corner
          const waste = nx * 1.0 + (1 - ny) * 1.0 + b;            // NE corner
          const jung  = nx * 1.0 + ny * 0.8 + b;                  // east/southeast
          if (rocky > 1.52 && nx < 0.4 && ny < 0.45) kind = h > 0.72 ? 'snow' : (h > 0.58 ? 'rock' : 'rockD');
          else if (waste > 1.6 && nx > 0.62 && ny < 0.4) kind = (detail(x / 6, y / 6) > 0.55) ? 'wasteD' : 'waste';
          else if (nx < 0.64 && ny > 0.2) kind = (detail(x / 8, y / 8) > 0.6) ? 'enchD' : 'ench';
          else if (jung > 1.15) kind = (detail(x / 7, y / 7) > 0.55) ? 'jungleD' : 'jungle';
          else kind = 'grass';
          if (h > 0.8 && kind !== 'snow' && kind !== 'rock' && kind !== 'rockD') kind = 'rock';
        }
        tiles[y * W + x] = kind;
        const c = hex(COL[kind][((x * 7 + y * 13) % 11 === 0) ? 1 : 0]);
        put((y * W + x) * 4, c);
      }
    }
    ctx.putImageData(img, 0, 0);

    // trees, hills and little sprites sprinkled on top
    const r = rng(seed * 31 + 5);
    ctx.globalAlpha = 1;
    const px = (x, y, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, 1, 1); };
    for (let y = 1; y < H - 1; y++) {
      for (let x = 1; x < W - 1; x++) {
        const k = tiles[y * W + x];
        const roll = r();
        if (k === 'ench' && roll < 0.07) { px(x, y, '#1c7d6c'); px(x, y - 1, '#7ae8c4'); }
        else if (k === 'enchD' && roll < 0.1) { px(x, y, '#2a6f8f'); px(x, y - 1, '#b9a2ff'); }
        else if ((k === 'jungle' || k === 'jungleD') && roll < 0.12) { px(x, y, '#145a22'); px(x, y - 1, '#46c452'); }
        else if (k === 'grass' && roll < 0.04) { px(x, y, '#2f8f2f'); }
        else if ((k === 'rock' || k === 'rockD') && roll < 0.08) { px(x, y, '#4d515a'); px(x, y - 1, '#c5cad2'); }
        else if ((k === 'waste' || k === 'wasteD') && roll < 0.05) { px(x, y, '#3c3c12'); }
        else if (k === 'sea' && roll < 0.015) { px(x, y, '#7bb2f2'); }
      }
    }

    // villages: tiny pixel houses clustered on land
    if (opts.villages !== false) {
      const spots = opts.villageSpots || [
        [0.44, 0.5], [0.52, 0.62], [0.3, 0.42], [0.2, 0.2], [0.78, 0.18], [0.7, 0.6], [0.58, 0.4], [0.82, 0.74]
      ];
      spots.forEach(function (s, i) {
        const vx = Math.floor(s[0] * W), vy = Math.floor(s[1] * H);
        const k = tiles[vy * W + vx];
        if (k === 'deep' || k === 'sea' || k === 'shore') return;
        const roofs = ['#c0392b', '#d9a441', '#8e5a2b', '#9b59b6'];
        for (let j = 0; j < 4; j++) {
          const hx = vx + (j % 2) * 3 - 1, hy = vy + Math.floor(j / 2) * 3 - 1;
          px(hx, hy, roofs[(i + j) % 4]); px(hx + 1, hy, roofs[(i + j) % 4]);
          px(hx, hy + 1, '#e9dcc0'); px(hx + 1, hy + 1, '#e9dcc0');
        }
      });
    }
    return tiles;
  }

  // ---------- creature sprites ----------
  // Each creature is built from small palette-driven pixel maps. '.' is empty.
  const PAL = {
    skin: '#f0c9a0', skinD: '#d8a679', elfSkin: '#f4dcc0', dwarfSkin: '#e3a883',
    orc: '#6ea23a', orcD: '#4c7a22', croc: '#4e9a4a', crocD: '#2f6a32', crocB: '#cfd98a',
    cat: '#d9913a', catD: '#a8641f', bone: '#e8e4d4', boneD: '#9c9684',
    pump: '#e8821c', pumpD: '#a84f0a', stem: '#3d8a2a',
    eye: '#16130e', white: '#ffffff'
  };

  function parse(map, pal) {
    return map.map(function (row) { return row.split('').map(function (ch) { return pal[ch] || null; }); });
  }

  const SPRITES = {
    // 10x12 humanoids built from shared shape with per-race palette
    elf: parse([
      '...GGGG...',
      '..GGGGGG..',
      '.sGGGGGGs.',
      's.GsssGGs.',
      '..sesses..',
      '...ssss...',
      '..bbbbbb..',
      '.sbbbbbbs.',
      '.sbbbbbbs.',
      '..bbbbbb..',
      '..bb..bb..',
      '..kk..kk..'
    ], { G: '#2f9a5a', s: PAL.elfSkin, e: PAL.eye, b: '#3dbb7a', k: '#6b4a2a' }),
    human: parse([
      '..hhhhhh..',
      '.hhhhhhhh.',
      '.hsssssh..',
      '..seses...',
      '..ssssss..',
      '...ssss...',
      '..bbbbbb..',
      '.sbbbbbbs.',
      '.sbbbbbbs.',
      '..bbbbbb..',
      '..bb..bb..',
      '..kk..kk..'
    ], { h: '#6b3f1d', s: PAL.skin, e: PAL.eye, b: '#c0392b', k: '#4a3320' }),
    dwarf: parse([
      '..HHHHHH..',
      '.HHHHHHHH.',
      '.HsssssSH.',
      '.HseseseH.',
      '.HsssssSH.',
      '.RRRRRRRR.',
      '.RRRRRRRR.',
      'sRRbbbbRRs',
      '.RRbbbbRR.',
      '..bbbbbb..',
      '..bb..bb..',
      '.kkk..kkk.'
    ], { H: '#7a8896', s: PAL.dwarfSkin, S: PAL.dwarfSkin, e: PAL.eye, R: '#b5472e', b: '#6a6f7a', k: '#3a3026' }),
    orc: parse([
      '...oooo...',
      '..oooooo..',
      '.ooeooeoo.',
      '.ooooooOo.',
      '.owoooowo.',
      '..oooooo..',
      '.bbbbbbbb.',
      'obbbbbbbbo',
      'obbbbbbbbo',
      '..bbbbbb..',
      '..oo..oo..',
      '.kkk..kkk.'
    ], { o: PAL.orc, O: PAL.orcD, e: '#e8d020', w: PAL.white, b: '#5a4a3a', k: '#2a2018' }),
    skeleton: parse([
      '...wwww...',
      '..wwwwww..',
      '..wkwwkw..',
      '..wwwwww..',
      '...wkkw...',
      '....ww....',
      '..wwwwww..',
      '.w.wwww.w.',
      '.w.w..w.w.',
      '...wwww...',
      '...w..w...',
      '..ww..ww..'
    ], { w: PAL.bone, k: '#2a2820' }),
    cat: parse([
      '.c......c.',
      '.cc....cc.',
      '.cccccccc.',
      'cceccecccc',
      'cccnccccc.',
      '.cccccccc.',
      '..cccccc..',
      '.cccccccc.',
      '.cc.cc.cc.',
      '.cc.cc.cc.',
      '.dd.dd.dd.',
      '..........'
    ], { c: PAL.cat, d: PAL.catD, e: '#2a2820', n: '#e86a8a' }),
    croc: parse([
      '..........',
      '.cc.......',
      'cccc..ccc.',
      'ceccccccccc',
      'cccccccccccc',
      'cwcwcccddcc.',
      '.bbbbbbbbb.',
      '..cc.cc.cc.',
      '..dd.dd.dd.',
      '..........',
      '..........',
      '..........'
    ], { c: PAL.croc, d: PAL.crocD, b: PAL.crocB, e: '#f0d020', w: PAL.white }),
    unicorn: parse([
      '.y........',
      '..y.......',
      '..ww......',
      '.wwwp.....',
      'wewwpp....',
      'wwwwppwww.',
      '..wwwwwwwp',
      '..wwwwwwwp',
      '..wwwwwww.',
      '..w.w.w.w.',
      '..w.w.w.w.',
      '..g.g.g.g.'
    ], { w: '#f4f0fa', p: '#a06ad8', y: '#f2c94c', e: PAL.eye, g: '#8a7fa0' }),
    pumpkin: parse([
      '.....ss...',
      '.....s....',
      '..pppsppp.',
      '.pppppppp.',
      'ppeppppepp',
      'pppppppppp',
      'pdpwwwwpdp',
      'ppdwppwdpp',
      '.pppppppp.',
      '..pdppdp..',
      '..........',
      '..........'
    ], { p: PAL.pump, d: PAL.pumpD, s: PAL.stem, e: '#2a1a05', w: '#f6d55c' })
  };
  // croc rows must be consistent widths – normalise any ragged rows
  Object.keys(SPRITES).forEach(function (k) {
    const w = Math.max.apply(null, SPRITES[k].map(function (r) { return r.length; }));
    SPRITES[k] = SPRITES[k].map(function (r) { while (r.length < w) r.push(null); return r; });
  });

  function drawSprite(ctx, name, x, y, scale) {
    const sp = SPRITES[name];
    if (!sp) return;
    scale = scale || 1;
    for (let j = 0; j < sp.length; j++) {
      for (let i = 0; i < sp[j].length; i++) {
        const c = sp[j][i];
        if (c) { ctx.fillStyle = c; ctx.fillRect(x + i * scale, y + j * scale, scale, scale); }
      }
    }
  }

  function spriteCanvas(name, scale) {
    const sp = SPRITES[name];
    const c = document.createElement('canvas');
    c.width = sp[0].length * scale; c.height = sp.length * scale;
    drawSprite(c.getContext('2d'), name, 0, 0, scale);
    c.className = 'sprite';
    c.setAttribute('role', 'img');
    c.setAttribute('aria-label', name);
    return c;
  }

  /** Small themed landscape strip used behind each story icon. */
  function drawCover(canvas, seed, factions) {
    const tiles = drawWorld(canvas, { w: 96, h: 56, seed: seed, river: false, villages: false });
    const ctx = canvas.getContext('2d');
    const r = rng(seed + 3);
    (factions || []).slice(0, 5).forEach(function (f, i) {
      for (let tries = 0; tries < 40; tries++) {
        const x = 6 + Math.floor(r() * 74), y = 16 + Math.floor(r() * 30);
        const k = tiles[y * 96 + x];
        if (k && k !== 'deep' && k !== 'sea' && k !== 'shore') { drawSprite(ctx, f, x, y, 1); break; }
      }
    });
  }

  /** Animated sprites wandering along the hero map. */
  function wander(canvas, tiles, W, H, names, seed) {
    const ctx = canvas.getContext('2d');
    const r = rng(seed);
    const walkers = names.map(function (n) {
      for (let t = 0; t < 400; t++) {
        const x = Math.floor(r() * (W - 14)), y = Math.floor(r() * (H - 16));
        const k = tiles[(y + 11) * W + x + 5];
        if (k && k !== 'deep' && k !== 'sea' && k !== 'shore') return { n: n, x: x, y: y, dx: r() < 0.5 ? -1 : 1, dy: 0 };
      }
      return null;
    }).filter(Boolean);
    function step() {
      ctx.clearRect(0, 0, W, H);
      walkers.forEach(function (w) {
        if (Math.random() < 0.08) { w.dx = [-1, 0, 1][Math.floor(Math.random() * 3)]; w.dy = [-1, 0, 1][Math.floor(Math.random() * 3)]; }
        const nx = w.x + w.dx, ny = w.y + w.dy;
        const k = tiles[(ny + 11) * W + nx + 5];
        if (nx > 1 && ny > 1 && nx < W - 12 && ny < H - 14 && k && k !== 'deep' && k !== 'sea' && k !== 'shore') { w.x = nx; w.y = ny; }
        else { w.dx = -w.dx; w.dy = -w.dy; }
        drawSprite(ctx, w.n, w.x, w.y, 1);
      });
    }
    step();
    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    setInterval(step, 260);
  }

  window.Pixel = { drawWorld: drawWorld, drawSprite: drawSprite, spriteCanvas: spriteCanvas, drawCover: drawCover, wander: wander, SPRITES: SPRITES };
})();
