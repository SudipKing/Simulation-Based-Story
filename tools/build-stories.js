#!/usr/bin/env node
/**
 * Converts the lightweight story markup in stories/source/*.txt into the HTML
 * fragment the reader displays (stories/<id>.html).
 *
 * Markup:
 *   #B BOOK ONE|Title|Years     -> book heading (h1)
 *   #C Chapter title            -> chapter heading (h2)
 *   #E quote line(s)            -> epigraph (extra lines become the attribution)
 *   #T 1|Text                   -> timeline row
 *   *  (alone on a line)        -> scene break
 *   *text*                      -> italics
 *
 * Usage: node tools/build-stories.js <story-id> <source-file...>
 *   e.g. node tools/build-stories.js saga-of-metallica stories/source/p1.txt ...
 */
const fs = require('fs');
const path = require('path');

const [id, ...files] = process.argv.slice(2);
if (!id || !files.length) {
  console.error('Usage: node tools/build-stories.js <story-id> <source-file...>');
  process.exit(1);
}

const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = s => esc(s).replace(/\*([^*]+)\*/g, '<em>$1</em>');

const raw = files.map(f => fs.readFileSync(f, 'utf8')).join('\n\n').replace(/\r/g, '');
const blocks = raw.split(/\n\s*\n/).map(b => b.trim()).filter(Boolean);

const out = [];
let timeline = [];
const flush = () => {
  if (!timeline.length) return;
  out.push('<table class="timeline"><tbody>' +
    timeline.map(([y, t]) => `<tr><th>Year ${esc(y)}</th><td>${inline(t)}</td></tr>`).join('') +
    '</tbody></table>');
  timeline = [];
};

for (const b of blocks) {
  if (b.startsWith('#T ')) {
    for (const l of b.split('\n')) {
      const m = l.replace(/^#T\s+/, '').split('|');
      timeline.push([m[0], m.slice(1).join('|')]);
    }
    continue;
  }
  flush();
  if (b.startsWith('#B ')) {
    const [num, title, years] = b.slice(3).split('|');
    out.push(`<h1 class="book"><span class="book-num">${esc(num)}</span><span class="book-title">${esc(title || '')}</span>` +
      (years ? `<small>${esc(years)}</small>` : '') + '</h1>');
  } else if (b.startsWith('#C ')) {
    out.push(`<h2>${esc(b.slice(3).trim())}</h2>`);
  } else if (b.startsWith('#E ')) {
    const lines = b.slice(3).split('\n');
    out.push('<blockquote class="epigraph"><p>' + inline(lines[0]) + '</p>' +
      lines.slice(1).map(l => `<cite>${inline(l)}</cite>`).join('') + '</blockquote>');
  } else if (b === '*') {
    out.push('<hr class="scene">');
  } else {
    out.push('<p>' + inline(b.replace(/\n/g, ' ')) + '</p>');
  }
}
flush();

const dest = path.join('stories', `${id}.html`);
fs.writeFileSync(dest, out.join('\n') + '\n');
const words = out.join(' ').replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
console.log(`wrote ${dest} (${words} words)`);
