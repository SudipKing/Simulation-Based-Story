(function () {
  'use strict';

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var view = $('#view');
  var LS_UPLOADS = 'sbs.uploads.v1';
  var LS_READER = 'sbs.reader.v1';
  var LS_POS = 'sbs.pos.';
  var PEOPLE = ['elf', 'human', 'dwarf', 'orc', 'croc', 'cat', 'skeleton', 'pumpkin'];

  // ---------- tiny helpers ----------
  function h(tag, attrs, kids) {
    var el = document.createElement(tag);
    Object.keys(attrs || {}).forEach(function (k) {
      var v = attrs[k];
      if (v === false || v == null) return;
      if (k === 'class') el.className = v;
      else if (k === 'html') el.innerHTML = v;
      else if (k.slice(0, 2) === 'on') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v === true ? '' : v);
    });
    [].concat(kids == null ? [] : kids).forEach(function (c) {
      if (c == null || c === false) return;
      el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    });
    return el;
  }
  function safeJSON(s, fallback) { try { return JSON.parse(s); } catch (e) { return fallback; } }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); return true; } catch (e) { return false; } }
  function slug(s) { return (s || 'story').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 48) || 'story'; }
  function hash(s) { var x = 2166136261; for (var i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); } return x >>> 0; }
  function readTime(words) { return words ? Math.max(1, Math.round(words / 230)) + ' min read' : ''; }
  function toast(msg) {
    var t = h('div', { class: 'toast', role: 'status' }, msg);
    document.body.appendChild(t);
    setTimeout(function () { t.remove(); }, 3600);
  }

  // ---------- data ----------
  var cache = { lib: null, html: {} };

  function getUploads() { return safeJSON(lsGet(LS_UPLOADS), []) || []; }
  function saveUploads(list) { return lsSet(LS_UPLOADS, JSON.stringify(list)); }

  function loadLibrary() {
    if (cache.lib) return Promise.resolve(cache.lib);
    return fetch('stories/library.json', { cache: 'no-cache' })
      .then(function (r) { if (!r.ok) throw new Error('HTTP ' + r.status); return r.json(); })
      .then(function (j) { cache.lib = j.stories || []; return cache.lib; });
  }
  function allStories() {
    return loadLibrary().then(function (lib) {
      var local = getUploads().map(function (u) { return Object.assign({}, u, { local: true }); });
      return lib.concat(local);
    });
  }
  function storyHtml(s) {
    if (s.local) return Promise.resolve(s.html);
    if (cache.html[s.id]) return Promise.resolve(cache.html[s.id]);
    return fetch('stories/' + s.file).then(function (r) {
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.text();
    }).then(function (t) { cache.html[s.id] = t; return t; });
  }

  // ---------- routing ----------
  function route() {
    var parts = (location.hash || '#/').replace(/^#\/?/, '').split('/');
    window.scrollTo(0, 0);
    document.body.classList.remove('reading');
    var prog = $('.progress'); if (prog) prog.remove();
    document.querySelectorAll('.navlink').forEach(function (a) { a.classList.remove('active'); });
    if (parts[0] === 'read' && parts[1]) {
      renderReader(decodeURIComponent(parts[1]), parts[2] != null ? parseInt(parts[2], 10) : null);
    } else if (parts[0] === 'about') {
      var n = $('[data-nav="about"]'); if (n) n.classList.add('active');
      renderAbout();
    } else {
      var l = $('[data-nav="library"]'); if (l) l.classList.add('active');
      renderLibrary();
    }
    document.title = 'The Simulated Chronicles';
  }

  // ---------- library ----------
  function renderLibrary() {
    view.innerHTML = '';
    view.appendChild(h('div', { class: 'loading' }, 'Unrolling the maps…'));
    allStories().then(function (stories) {
      view.innerHTML = '';
      view.appendChild(buildHero());
      var wrap = h('div', { class: 'wrap' });
      wrap.appendChild(h('h2', { class: 'section-title', id: 'library' }, 'The Library'));
      wrap.appendChild(h('div', { class: 'rule', 'aria-hidden': 'true' }, h('span', {}, '◆')));
      wrap.appendChild(h('p', { class: 'section-sub' }, 'Each chronicle is a tale told from a living simulation. Choose an emblem to begin.'));
      var shelf = h('div', { class: 'shelf' });
      stories.forEach(function (s) { shelf.appendChild(buildCard(s)); });
      shelf.appendChild(h('button', { class: 'card card-add', type: 'button', onclick: openUpload },
        [h('span', { class: 'plus', 'aria-hidden': 'true' }, '+'),
         h('h3', {}, 'Add a Chronicle'),
         h('p', { class: 'tag' }, 'Upload a story from your own simulation: Word, text or Markdown.')]));
      wrap.appendChild(shelf);
      view.appendChild(wrap);
      view.focus({ preventScroll: true });
    }).catch(function (err) {
      view.innerHTML = '';
      view.appendChild(h('div', { class: 'empty' }, [
        h('p', {}, 'The library could not be opened.'),
        h('p', { style: 'font-family:var(--font-body);letter-spacing:0' },
          location.protocol === 'file:'
            ? 'Browsers block local file loading. Serve this folder instead, for example: python -m http.server 8000'
            : String(err.message || err))
      ]));
    });
  }

  function buildHero() {
    var map = h('div', { class: 'hero-map', 'aria-hidden': 'true' });
    var base = h('canvas'), walk = h('canvas');
    map.appendChild(base); map.appendChild(walk);
    var W = 256, H = 144;
    var tiles = Pixel.drawWorld(base, { w: W, h: H, seed: 725 });
    walk.width = W; walk.height = H;
    Pixel.wander(walk, tiles, W, H, ['elf', 'elf', 'dwarf', 'dwarf', 'dwarf', 'orc', 'croc', 'croc', 'cat', 'human', 'pumpkin', 'skeleton'], 11);
    return h('section', { class: 'hero' }, [
      map,
      h('div', { class: 'hero-text' }, [
        h('div', { class: 'hero-kicker' }, 'Tales from simulated worlds'),
        h('h1', {}, 'The Simulated Chronicles'),
        h('p', {}, 'Watch a world rise and fall, then read how it happened. Every story here began as a living simulation.')
      ])
    ]);
  }

  function buildCard(s) {
    var cover = h('canvas', { 'aria-hidden': 'true' });
    Pixel.drawCover(cover, s.seed || hash(s.id), s.factions || []);
    var chips = [];
    if (s.local) chips.push(h('span', { class: 'chip local' }, 'Your upload'));
    if (s.simulation) chips.push(h('span', { class: 'chip' }, s.simulation));
    if (s.years) chips.push(h('span', { class: 'chip' }, s.years));
    var rt = readTime(s.words); if (rt) chips.push(h('span', { class: 'chip' }, rt));

    var link = h('a', { class: 'card', href: '#/read/' + encodeURIComponent(s.id), 'aria-label': 'Read ' + s.title }, [
      h('div', { class: 'card-cover' }, cover),
      h('div', { class: 'seal', html: Icons.svg(s.icon, 58) }),
      h('div', { class: 'card-body' }, [
        h('h3', {}, s.title),
        s.tagline ? h('p', { class: 'tag' }, s.tagline) : null,
        h('div', { class: 'chips' }, chips),
        h('div', { class: 'card-cta' }, 'Begin reading')
      ])
    ]);
    var wrap = h('div', { class: 'card-wrap' }, link);
    var tools = h('div', { class: 'card-tools' });
    if (s.download) {
      tools.appendChild(h('a', { class: 'tool', href: 'stories/' + s.download, download: s.download, title: 'Download the Word file' }, 'Word'));
    }
    if (s.local) {
      tools.appendChild(h('button', { class: 'tool', type: 'button', title: 'Export a bundle you can add to the repo', onclick: function () { exportBundle(s); } }, 'Export'));
      tools.appendChild(h('button', { class: 'tool danger', type: 'button', title: 'Remove this upload', onclick: function () {
        if (!confirm('Remove "' + s.title + '" from this browser?')) return;
        saveUploads(getUploads().filter(function (u) { return u.id !== s.id; }));
        toast('Removed.'); renderLibrary();
      } }, 'Delete'));
    }
    if (tools.children.length) wrap.appendChild(tools);
    return wrap;
  }

  // ---------- about ----------
  function renderAbout() {
    view.innerHTML = '';
    var row = h('div', { class: 'sprite-row' });
    PEOPLE.forEach(function (n) {
      row.appendChild(h('figure', {}, [Pixel.spriteCanvas(n, 6), n]));
    });
    view.appendChild(h('article', { class: 'prose' }, [
      h('h1', {}, 'About the Chronicles'),
      h('p', {}, 'These stories begin as simulations. A god-game like WorldBox runs a world for centuries, and the chronicle of what happened (the wars, the plagues, the monsters that nobody planned) is turned into a novel-length tale.'),
      row,
      h('p', {}, 'The art here is drawn in the style of WorldBox: pixel terrain, little villages, and the peoples of the simulation. All of it is generated in code, so it is original to this site. Each story gets a landscape seeded from its own name and the peoples that appear in it.'),
      h('h2', {}, 'Add your own story'),
      h('p', {}, 'Use "Add a Chronicle" to upload a Word, text or Markdown file. It is saved in your own browser, and nobody else can see it. To add a story to the library for everyone, use the Export button on your upload and follow the steps in the README.'),
      h('h2', {}, 'Reading'),
      h('p', {}, 'Use the arrow keys to turn chapters. Your place is remembered. You can change the page theme and the text size from the bar above each chapter.')
    ]));
  }

  // ---------- reader ----------
  var readerState = null;

  function splitSections(html) {
    var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    var sections = [], cur = null, book = null;
    [].slice.call(doc.body.children).forEach(function (el) {
      var tag = el.tagName;
      if (tag === 'H1') {
        var t = el.querySelector('.book-title'), n = el.querySelector('.book-num');
        var label = t ? ((n ? n.textContent + ': ' : '') + t.textContent) : el.textContent.trim();
        book = label;
        cur = { title: t ? t.textContent : label, book: label, parts: [el.outerHTML], bookOnly: true };
        sections.push(cur);
      } else if (tag === 'H2') {
        if (cur && cur.bookOnly) { cur.title = el.textContent.trim(); cur.bookOnly = false; cur.parts.push(el.outerHTML); }
        else { cur = { title: el.textContent.trim(), book: book, parts: [el.outerHTML] }; sections.push(cur); }
      } else {
        if (!cur) { cur = { title: 'The Story', book: null, parts: [] }; sections.push(cur); }
        // short lines right after a book heading (subtitle, year range) stay with it
        if (!(cur.bookOnly && el.textContent.trim().length < 70)) cur.bookOnly = false;
        cur.parts.push(el.outerHTML);
      }
    });
    return sections;
  }

  function renderReader(id, secParam) {
    view.innerHTML = '';
    view.appendChild(h('div', { class: 'loading' }, 'Opening the book…'));
    allStories().then(function (stories) {
      var s = stories.filter(function (x) { return x.id === id; })[0];
      if (!s) { view.innerHTML = ''; view.appendChild(h('div', { class: 'empty' }, 'That chronicle could not be found.')); return; }
      return storyHtml(s).then(function (html) {
        var sections = splitSections(html);
        if (!sections.length) sections = [{ title: s.title, book: null, parts: ['<p>This story is empty.</p>'] }];
        var idx = secParam;
        if (idx == null || isNaN(idx)) {
          var saved = safeJSON(lsGet(LS_POS + s.id), null);
          idx = saved && saved.sec != null ? saved.sec : 0;
        }
        idx = Math.max(0, Math.min(sections.length - 1, idx));
        readerState = { story: s, sections: sections, idx: idx };
        drawReader();
      });
    }).catch(function (err) {
      view.innerHTML = '';
      view.appendChild(h('div', { class: 'empty' }, 'The book could not be opened. ' + (err && err.message ? err.message : '')));
    });
  }

  function readerPrefs() { return Object.assign({ theme: 'parchment', size: 20 }, safeJSON(lsGet(LS_READER), {}) || {}); }

  function drawReader() {
    var st = readerState, s = st.story, prefs = readerPrefs();
    view.innerHTML = '';
    document.title = s.title + ' · The Simulated Chronicles';

    var reader = h('div', { class: 'reader', 'data-theme': prefs.theme });
    reader.style.setProperty('--read-size', prefs.size + 'px');

    // table of contents
    var toc = h('nav', { class: 'toc', id: 'toc', 'aria-label': 'Chapters' });
    toc.appendChild(h('div', { class: 'toc-title' }, [h('div', { class: 'seal', html: Icons.svg(s.icon, 34) }), h('h2', {}, s.title)]));
    var lastBook = '__none__';
    st.sections.forEach(function (sec, i) {
      if (sec.book && sec.book !== lastBook) { toc.appendChild(h('div', { class: 'toc-book' }, sec.book)); }
      lastBook = sec.book;
      toc.appendChild(h('a', { class: 'toc-link' + (i === st.idx ? ' current' : ''), href: '#/read/' + encodeURIComponent(s.id) + '/' + i, 'aria-current': i === st.idx ? 'page' : null }, sec.title));
    });

    // bar
    var bar = h('div', { class: 'reader-bar' }, [
      h('div', { class: 'group' }, [
        h('button', { class: 'btn toc-toggle', type: 'button', 'aria-controls': 'toc', 'aria-expanded': 'false', onclick: toggleToc }, '☰ Chapters'),
        h('a', { class: 'btn', href: '#/' }, '← Library')
      ]),
      h('div', { class: 'group' }, [
        h('button', { class: 'btn', type: 'button', 'aria-label': 'Smaller text', onclick: function () { setPref('size', Math.max(15, readerPrefs().size - 1)); } }, 'A−'),
        h('button', { class: 'btn', type: 'button', 'aria-label': 'Larger text', onclick: function () { setPref('size', Math.min(30, readerPrefs().size + 1)); } }, 'A+'),
        h('button', { class: 'btn', type: 'button', onclick: function () {
          var order = ['parchment', 'sepia', 'night'], cur = readerPrefs().theme;
          setPref('theme', order[(order.indexOf(cur) + 1) % order.length]);
        } }, '◐ Theme')
      ])
    ]);

    var sec = st.sections[st.idx];
    var page = h('article', { class: 'page', id: 'page', html: sec.parts.join('\n') });

    var prev = st.sections[st.idx - 1], next = st.sections[st.idx + 1];
    var pager = h('div', { class: 'pager' }, [
      prev ? h('a', { class: 'btn prev', href: '#/read/' + encodeURIComponent(s.id) + '/' + (st.idx - 1) }, h('span', {}, [h('small', {}, '← Previous'), h('span', { class: 't' }, prev.title)])) : h('span'),
      next ? h('a', { class: 'btn next', href: '#/read/' + encodeURIComponent(s.id) + '/' + (st.idx + 1) }, h('span', {}, [h('small', {}, 'Next →'), h('span', { class: 't' }, next.title)])) : null
    ]);

    reader.appendChild(toc);
    reader.appendChild(h('div', { class: 'stage' }, [bar, page, pager]));
    view.appendChild(reader);
    document.body.classList.add('reading');
    document.body.appendChild(h('div', { class: 'progress', 'aria-hidden': 'true' }));

    lsSet(LS_POS + s.id, JSON.stringify({ sec: st.idx }));
    var cur = $('.toc-link.current', toc);
    if (cur) toc.scrollTop = Math.max(0, cur.offsetTop - 140);
    window.scrollTo(0, 0);
    updateProgress();
  }

  function setPref(k, v) {
    var p = readerPrefs(); p[k] = v; lsSet(LS_READER, JSON.stringify(p));
    var r = $('.reader'); if (!r) return;
    r.setAttribute('data-theme', p.theme);
    r.style.setProperty('--read-size', p.size + 'px');
  }
  function toggleToc() {
    var toc = $('#toc'); if (!toc) return;
    var open = toc.classList.toggle('open');
    var btn = $('.toc-toggle'); if (btn) btn.setAttribute('aria-expanded', String(open));
    var scrim = $('.scrim');
    if (open && !scrim) {
      document.body.appendChild(h('div', { class: 'scrim', onclick: toggleToc }));
    } else if (!open && scrim) scrim.remove();
  }
  function updateProgress() {
    var bar = $('.progress'); if (!bar) return;
    var page = $('#page'); if (!page) return;
    var rect = page.getBoundingClientRect();
    var total = rect.height - window.innerHeight * 0.6;
    var pct = total > 0 ? Math.min(1, Math.max(0, -rect.top / total)) : 1;
    bar.style.width = (pct * 100).toFixed(1) + '%';
  }
  window.addEventListener('scroll', updateProgress, { passive: true });
  window.addEventListener('resize', updateProgress);
  document.addEventListener('keydown', function (e) {
    if (!readerState || !$('.reader')) return;
    if (/input|textarea|select/i.test((e.target.tagName || ''))) return;
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    var i = readerState.idx, id = encodeURIComponent(readerState.story.id);
    if (e.key === 'ArrowRight' && i < readerState.sections.length - 1) location.hash = '#/read/' + id + '/' + (i + 1);
    if (e.key === 'ArrowLeft' && i > 0) location.hash = '#/read/' + id + '/' + (i - 1);
  });

  // ---------- parsing uploads ----------
  var ALLOWED = { H1: 1, H2: 1, H3: 1, H4: 1, P: 1, EM: 1, I: 1, STRONG: 1, B: 1, U: 1, BLOCKQUOTE: 1, UL: 1, OL: 1, LI: 1, HR: 1, BR: 1, TABLE: 1, TBODY: 1, THEAD: 1, TR: 1, TD: 1, TH: 1, SUP: 1, SUB: 1, CITE: 1 };
  var DROP = { SCRIPT: 1, STYLE: 1, IFRAME: 1, OBJECT: 1, EMBED: 1, LINK: 1, META: 1, IMG: 1, SVG: 1, FORM: 1, INPUT: 1, BUTTON: 1, TEXTAREA: 1, VIDEO: 1, AUDIO: 1, CANVAS: 1 };

  function sanitize(html) {
    var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    function clean(node) {
      [].slice.call(node.childNodes).forEach(function (c) {
        if (c.nodeType === 3) return;
        if (c.nodeType !== 1) { c.remove(); return; }
        if (DROP[c.tagName]) { c.remove(); return; }
        clean(c);
        if (!ALLOWED[c.tagName]) {
          while (c.firstChild) node.insertBefore(c.firstChild, c);
          c.remove();
        } else {
          [].slice.call(c.attributes).forEach(function (a) {
            if (!((c.tagName === 'TD' || c.tagName === 'TH') && (a.name === 'colspan' || a.name === 'rowspan'))) c.removeAttribute(a.name);
          });
        }
      });
    }
    clean(doc.body);
    return doc.body.innerHTML;
  }

  function esc(s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  function inlineMd(s) {
    return esc(s).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*([^*\n]+)\*/g, '$1<em>$2</em>').replace(/(^|\s)_([^_\n]+)_(?=\s|[.,;:!?]|$)/g, '$1<em>$2</em>');
  }

  function textToHtml(text) {
    var blocks = text.replace(/\r/g, '').split(/\n\s*\n/).map(function (b) { return b.trim(); }).filter(Boolean);
    var out = [];
    blocks.forEach(function (b) {
      var m;
      if (/^(\*\s*){3,}$|^-{3,}$|^_{3,}$|^={3,}$/.test(b)) out.push('<hr class="scene">');
      else if ((m = b.match(/^(#{1,4})\s+(.+)$/)) && b.indexOf('\n') < 0) out.push('<h' + m[1].length + '>' + inlineMd(m[2]) + '</h' + m[1].length + '>');
      else if (/^>\s?/.test(b)) out.push('<blockquote><p>' + inlineMd(b.replace(/^>\s?/gm, '').replace(/\n/g, ' ')) + '</p></blockquote>');
      else out.push('<p>' + inlineMd(b.replace(/\n/g, ' ')) + '</p>');
    });
    return autoHeadings(out.join('\n'));
  }

  // Promote short "Chapter 3: …" style paragraphs to headings when a story has none.
  function autoHeadings(html) {
    var doc = new DOMParser().parseFromString('<body>' + html + '</body>', 'text/html');
    if (doc.querySelector('h1, h2')) return html;
    [].slice.call(doc.body.querySelectorAll('p')).forEach(function (p) {
      var t = p.textContent.trim();
      if (t.length > 0 && t.length < 90 && !/[.!?]$/.test(t)) {
        var tag = /^(book|part)\b/i.test(t) ? 'h1' : (/^(chapter|prologue|epilogue|interlude)\b/i.test(t) ? 'h2' : null);
        if (tag) { var el = doc.createElement(tag); el.textContent = t; p.replaceWith(el); }
      }
    });
    return doc.body.innerHTML;
  }

  function countWords(html) {
    return html.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  }

  function fileToHtml(file) {
    var ext = (file.name.split('.').pop() || '').toLowerCase();
    if (ext === 'docx') {
      if (!window.mammoth) return Promise.reject(new Error('The Word reader could not load. Check your connection, or save the file as .txt or .md.'));
      return file.arrayBuffer().then(function (buf) { return mammoth.convertToHtml({ arrayBuffer: buf }); })
        .then(function (r) { return autoHeadings(sanitize(r.value)); });
    }
    if (ext === 'html' || ext === 'htm') return file.text().then(function (t) { return autoHeadings(sanitize(t)); });
    if (ext === 'txt' || ext === 'md' || ext === 'markdown' || file.type.indexOf('text/') === 0) return file.text().then(textToHtml);
    return Promise.reject(new Error('That file type is not supported. Use .docx, .txt, .md or .html.'));
  }

  // ---------- upload dialog ----------
  var dlg = $('#uploadDialog'), pending = null;

  function buildPickers() {
    var ep = $('#emblemPicker'); ep.innerHTML = '';
    Icons.names.forEach(function (n, i) {
      ep.appendChild(h('label', { title: Icons.ICONS[n].label }, [
        h('input', { type: 'radio', name: 'emblem', value: n, checked: i === 0 }),
        h('span', { class: 'opt', html: Icons.svg(n, 40) })
      ]));
    });
    var pp = $('#peoplePicker'); pp.innerHTML = '';
    PEOPLE.forEach(function (n) {
      var cv = Pixel.spriteCanvas(n, 2);
      pp.appendChild(h('label', {}, [
        h('input', { type: 'checkbox', name: 'people', value: n, checked: ['elf', 'dwarf', 'human'].indexOf(n) >= 0 }),
        h('span', { class: 'opt' }, [cv, n])
      ]));
    });
  }

  function msg(t, ok) { var m = $('#formMsg'); m.textContent = t || ''; m.className = 'form-msg' + (ok ? ' ok' : ''); }

  function openUpload() {
    pending = null; $('#uploadForm').reset(); buildPickers(); msg('');
    $('#dropFile').hidden = true; $('#dropFile').textContent = '';
    if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  }
  function closeUpload() { if (dlg.close) dlg.close(); else dlg.removeAttribute('open'); }

  function takeFile(file) {
    if (!file) return;
    msg('Reading ' + file.name + '…', true);
    fileToHtml(file).then(function (html) {
      var words = countWords(html);
      if (words < 20) throw new Error('That file looks empty.');
      pending = { html: html, words: words };
      var d = $('#dropFile'); d.hidden = false; d.textContent = '✔ ' + file.name + ' · ' + words.toLocaleString() + ' words';
      var t = $('#fTitle');
      if (!t.value.trim()) t.value = file.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      msg('');
    }).catch(function (e) { pending = null; msg(e.message || 'Could not read that file.'); });
  }

  $('#openUpload').addEventListener('click', openUpload);
  $('#closeUpload').addEventListener('click', closeUpload);
  $('#cancelUpload').addEventListener('click', closeUpload);
  $('#fileInput').addEventListener('change', function (e) { takeFile(e.target.files[0]); });
  var drop = $('#drop');
  ['dragenter', 'dragover'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); }); });
  ['dragleave', 'drop'].forEach(function (ev) { drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); }); });
  drop.addEventListener('drop', function (e) { if (e.dataTransfer.files.length) takeFile(e.dataTransfer.files[0]); });
  dlg.addEventListener('click', function (e) { if (e.target === dlg) closeUpload(); });

  $('#uploadForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var title = $('#fTitle').value.trim();
    if (!pending) { msg('Choose a story file first.'); return; }
    if (!title) { msg('Give the chronicle a title.'); $('#fTitle').focus(); return; }
    var icon = ($('input[name=emblem]:checked') || {}).value || 'scroll';
    var people = [].slice.call(document.querySelectorAll('input[name=people]:checked')).map(function (i) { return i.value; });
    var id = slug(title) + '-' + Date.now().toString(36);
    var entry = {
      id: id, title: title, tagline: $('#fTag').value.trim(), icon: icon,
      simulation: $('#fSim').value.trim(), years: $('#fYears').value.trim(),
      factions: people, seed: hash(id) % 100000, words: pending.words, html: pending.html
    };
    var list = getUploads(); list.push(entry);
    if (!saveUploads(list)) { msg('Your browser has no room left for this story. Delete an upload and try again.'); return; }
    closeUpload();
    toast('“' + title + '” added to the library.');
    if (/^#\/?$|^$/.test(location.hash)) renderLibrary(); else location.hash = '#/';
  });

  function exportBundle(s) {
    var entry = Object.assign({}, s); delete entry.html; delete entry.local;
    entry.file = s.id + '.html';
    var blob = new Blob([JSON.stringify({ version: 1, entry: entry, html: s.html }, null, 2)], { type: 'application/json' });
    var a = h('a', { href: URL.createObjectURL(blob), download: s.id + '.chronicle.json' });
    document.body.appendChild(a); a.click(); a.remove();
    toast('Exported. See the README to add it to the repo.');
  }

  window.addEventListener('hashchange', route);
  route();
})();
