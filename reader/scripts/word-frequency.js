/**
 * Word counts for the Book 1 manuscript.
 *
 *   node reader/scripts/word-frequency.js
 *   node reader/scripts/word-frequency.js --top 12
 *   node reader/scripts/word-frequency.js --watch
 *   node reader/scripts/word-frequency.js --words pneumatic,obsidian,talon
 *
 * The default lists the words each chapter leans on, then the book.
 * --watch counts the redundancy list. Apex GeneSys, Apex Bio, and the
 * other company labels are left out of "apex". The plain word is counted.
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '../..');
const MANUSCRIPT = path.join(ROOT, 'manuscript', 'book1');

const STOP = new Set(`
a an the and or but if as at by for from in into of on onto to with without within
is are was were be been being am it its this that these those
he she they them his her their i me my we our you your
not no nor so than then too very just
had has have having do does did
would could should will can may might must
there here when where what which who whom
up down out off over under again about across after before
him himself herself themselves
vram tsunari tsune tsunie gideon corvus cassian ferrin rook toby tobyn
boran kira caelia malakar forger chen sora ren mercer lyraen xaevis
`.split(/\s+/).filter(Boolean));

const WATCH = [
  ['iron', /\birons?\b/gi],
  ['steel', /\bsteels?\b/gi],
  ['glass', /\bglass(?:es)?\b/gi],
  ['directorate', /\bdirectorates?\b/gi],
  ['pneumatic', /\bpneumatics?\b/gi],
  ['obsidian', /\bobsidian\b/gi],
  ['tendon', /\btendons?\b/gi],
  ['talon', /\btalons?\b/gi],
  ['transgenic', /\btransgenic\b/gi],
  ['sheer', /\bsheer\b/gi],
  ['calloused', /\bcalloused\b/gi],
  ['synthetic', /\bsynthetics?\b/gi],
  ['carbon', /\bcarbons?\b/gi],
  ['carbonized', /\bcarbonized\b/gi],
  ['apex', /\bapex\b/gi],
];

const APEX_NAME = /\bapex\s+(?:genesys|bio|corporate|executives?|emergency|biosys)\b/i;

function chapters() {
  return fs.readdirSync(MANUSCRIPT)
    .filter((name) => name.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
    .map((name) => ({
      name: name.replace(/\.md$/, ''),
      text: fs.readFileSync(path.join(MANUSCRIPT, name), 'utf8'),
    }));
}

function args(argv) {
  const out = { top: 10, watch: false, words: null };
  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--watch') out.watch = true;
    else if (arg === '--top') out.top = Number(argv[++i]) || 10;
    else if (arg === '--words') {
      out.watch = true;
      out.words = argv[++i].split(',').map((word) => word.trim().toLowerCase()).filter(Boolean);
    }
  }
  return out;
}

function tokens(text) {
  return (text.toLowerCase().match(/[a-z][a-z']*/g) || [])
    .filter((word) => word.length > 2 && !STOP.has(word));
}

function tally(list) {
  const counts = new Map();
  for (const word of list) counts.set(word, (counts.get(word) || 0) + 1);
  return [...counts.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function chapterLabel(name) {
  const match = name.match(/^chapter_(\d+)([a-z])?/i);
  if (!match) return name;
  return match[2] ? `${match[1]}${match[2]}` : match[1];
}

function apexHits(text) {
  const hits = [];
  const re = /\bapex\b/gi;
  let match;
  while ((match = re.exec(text))) {
    const window = text.slice(match.index, match.index + 24);
    hits.push(APEX_NAME.test(window) ? 'name' : 'word');
  }
  return hits;
}

function watchReport(files, only) {
  const patterns = only
    ? WATCH.filter(([label]) => only.includes(label))
    : WATCH;

  for (const [label, re] of patterns) {
    const byChapter = [];
    let total = 0;
    let names = 0;
    for (const file of files) {
      if (label === 'apex') {
        const hits = apexHits(file.text);
        const words = hits.filter((hit) => hit === 'word').length;
        names += hits.filter((hit) => hit === 'name').length;
        if (words) byChapter.push(`${chapterLabel(file.name)}:${words}`);
        total += words;
        continue;
      }
      const found = file.text.match(re);
      if (found) {
        byChapter.push(`${chapterLabel(file.name)}:${found.length}`);
        total += found.length;
      }
    }
    const where = byChapter.length ? byChapter.join(', ') : 'none';
    const note = label === 'apex' ? ` (${names} company names left out)` : '';
    console.log(`${label.padEnd(12)} ${String(total).padStart(4)}${note}`);
    console.log(`             ${where}`);
  }
}

function frequencyReport(files, top) {
  const book = new Map();
  console.log(`Top ${top} words in each chapter. Names and function words are left out.\n`);
  for (const file of files) {
    const ranked = tally(tokens(file.text)).slice(0, top);
    for (const [word, count] of tally(tokens(file.text))) {
      const row = book.get(word) || { count: 0, chapters: 0 };
      row.count += count;
      row.chapters += 1;
      book.set(word, row);
    }
    const line = ranked.map(([word, count]) => `${word} ${count}`).join(', ');
    console.log(`${file.name}`);
    console.log(`  ${line || '(none)'}`);
  }
  const rankedBook = [...book.entries()]
    .sort((a, b) => b[1].count - a[1].count || a[0].localeCompare(b[0]))
    .slice(0, 40);
  console.log('\nBook, top 40');
  for (const [word, row] of rankedBook) {
    console.log(`  ${String(row.count).padStart(4)}  ${word}  (${row.chapters} chapters)`);
  }
}

const options = args(process.argv);
const files = chapters();
if (options.watch) watchReport(files, options.words);
else frequencyReport(files, options.top);
