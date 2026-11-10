# Simulation-Based Story: The Simulated Chronicles

A fantasy library for epic stories written from simulated worlds. Each story is an
emblem on the shelf (a bow, a sword, a crown…), set over WorldBox-style pixel art,
and opens into a parchment reader with chapters, themes and remembered progress.

**Stories in the library**

| Emblem | Story | Simulation | Span |
| --- | --- | --- | --- |
| Bow | *The Saga of Metallica and the Shattered Realm* | WorldBox: Elves vs Humans | Year 1 – 725 |

## Run it

It is a static site with no build step. Browsers block `fetch` from `file://`, so serve the folder:

```bash
python -m http.server 8000
```

Then open <http://localhost:8000>.

## Add a story

### Just for you (in the browser)

Click **Add a Chronicle**, drop a `.docx`, `.txt`, `.md` or `.html` file, pick an
emblem and the peoples to show in the cover art. It is stored in your browser only.

Chapters are found from headings. In Word use *Heading 1* for books/parts and *Heading 2*
for chapters. In Markdown use `#` and `##`. Plain text with lines like
`Chapter 3: The Fall` is detected too.

### For everyone (in the repo)

1. On your upload card, click **Export**. You get `<name>.chronicle.json`.
2. Run `node tools/import-bundle.js path/to/<name>.chronicle.json`.
3. Commit `stories/library.json` and the new `stories/<id>.html`.

Or write the entry by hand in `stories/library.json`:

```json
{
  "id": "my-story",
  "title": "My Story",
  "tagline": "One line that sells it.",
  "icon": "sword",
  "simulation": "WorldBox",
  "years": "Year 1 – 300",
  "factions": ["elf", "dwarf", "orc"],
  "seed": 42,
  "words": 12000,
  "file": "my-story.html"
}
```

Emblems: `bow sword crown shield tower tree skull flame anvil scroll dragon moon`.
Peoples for cover art: `elf human dwarf orc croc cat skeleton pumpkin`.

### From the story markup

The saga was written in a small markup (`stories/source/`) and converted with:

```bash
node tools/build-stories.js saga-of-metallica stories/source/p1.txt stories/source/p2.txt stories/source/p3.txt stories/source/p4.txt
```

## About the art

The pixel terrain, villages and creatures are drawn procedurally in `js/pixel.js`, in
the style of WorldBox. They are original to this repo and not WorldBox assets. If you
would rather use your own screenshots or exports from the game, put them in `assets/`
and show them in `buildHero` / `buildCard` in `js/app.js`.

## Publish with GitHub Pages

Repo **Settings → Pages**, choose the branch and the root folder. The site has no build step.

## Layout

```
index.html          page shell and upload dialog
css/style.css       fantasy theme
js/app.js           library, reader, upload parsing and sanitising
js/pixel.js         WorldBox-style pixel world and creature art
js/icons.js         SVG emblems
stories/            library.json, story HTML, source markup, Word files
tools/              build-stories.js, import-bundle.js
```

Word files are read in the browser with [mammoth.js](https://github.com/mwilliamson/mammoth.js)
(loaded from jsDelivr). Uploaded HTML is sanitised before it is stored or shown.
