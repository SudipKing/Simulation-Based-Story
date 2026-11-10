#!/usr/bin/env node
/**
 * Adds an exported chronicle bundle to the library.
 * Usage: node tools/import-bundle.js path/to/story.chronicle.json
 * Writes stories/<id>.html and adds the entry to stories/library.json.
 */
const fs = require('fs');
const path = require('path');

const file = process.argv[2];
if (!file) { console.error('Usage: node tools/import-bundle.js <bundle.chronicle.json>'); process.exit(1); }

const bundle = JSON.parse(fs.readFileSync(file, 'utf8'));
if (!bundle.entry || !bundle.html) { console.error('Not a chronicle bundle.'); process.exit(1); }

const root = path.join(__dirname, '..', 'stories');
const libPath = path.join(root, 'library.json');
const lib = JSON.parse(fs.readFileSync(libPath, 'utf8'));

const entry = bundle.entry;
entry.id = entry.id.replace(/-[a-z0-9]{6,}$/, '') || entry.id; // drop the browser's uniqueness suffix
entry.file = `${entry.id}.html`;

fs.writeFileSync(path.join(root, entry.file), bundle.html.trim() + '\n');
lib.stories = lib.stories.filter(s => s.id !== entry.id).concat(entry);
fs.writeFileSync(libPath, JSON.stringify(lib, null, 2) + '\n');
console.log(`Added "${entry.title}" as stories/${entry.file}. Commit and push to publish.`);
