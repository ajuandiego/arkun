/**
 * Markdown to EPUB3 Compiler for The Arkun Cycle
 * Generates an official, validated EPUB3 ebook file from manuscript markdown chapters.
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const JSZip = require('jszip');

// Configure marked with Biopunk Terminal Renderer
const terminalRenderer = {
  code({ text }) {
    return `<div class="terminal-panel"><div class="terminal-header"><span class="terminal-status-dot">●</span> console.out</div><pre class="terminal-body"><code>${xmlEscape(text)}</code></pre></div>\n\n`;
  }
};

marked.use({
  gfm: true,
  breaks: true,
  renderer: terminalRenderer
});

const ROOT_DIR = path.resolve(__dirname, '../..');
const MANUSCRIPT_DIR = path.join(ROOT_DIR, '09_manuscript', 'book1');
const OUTPUT_DIR = path.join(__dirname, '..', 'books', 'book1');
const COVER_PATH = path.join(__dirname, '..', 'public', 'assets', 'cover.jpg');
const BACK_COVER_PATH = path.join(__dirname, '..', 'public', 'assets', 'back_cover.jpg');

// Ensure output directories exist
fs.mkdirSync(OUTPUT_DIR, { recursive: true });
const EPUB_SOURCE_DIR = path.join(OUTPUT_DIR, 'epub_source');
fs.mkdirSync(EPUB_SOURCE_DIR, { recursive: true });

// Book Metadata
const BOOK_META = {
  title: 'Stolen Breath',
  series: 'The Arkun Cycle',
  volume: '1',
  author: 'J.D. Alfaro',
  language: 'en-US',
  identifier: 'urn:uuid:8b341f20-9482-40as-arkun-cycle-vol1',
  modified: new Date().toISOString().replace(/\.\d+Z$/, 'Z'),
  date: '2026-10-02',
  description: 'HE WAS ENGINEERED TO KILL. SHE WAS BRED TO SURVIVE. In a dying city where every breath has a price, she owes a debt that can only be paid in blood. Dragged to the high towers to be auctioned to the regime’s deadliest aerial predator, she prepares for slaughter. In a world of monsters, there is no other way. Conditioned for war, his mind is consumed by a lethal electrical storm ticking toward madness. To the regime, he is merciless—untouchable, lethal, and feared. All he has ever known is instinct and cold survival. Until one breathless touch silences the agony in his head. Now, the weapon who answers to no one will burn down the sky before he lets anything happen to her.',
  publisher: 'J.D. Alfaro',
  rights: '© 2026 J.D. Alfaro. All rights reserved.'
};

// Helper: Escape XML entities
function xmlEscape(str) {
  if (!str) return '';
  return str
    .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// Helper: Sanitize HTML to strict XHTML
function toStrictXHTML(html) {
  return html
    .replace(/<hr\s*>/gi, '<hr />')
    .replace(/<br\s*>/gi, '<br />')
    .replace(/<img([^>]*)(?<!\/)>/gi, '<img$1 />')
    .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;');
}

// Split a chapter's opening quote into the passage and its source line
function splitEpigraph(quoteLines) {
  const lines = quoteLines.map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) return { epigraph: '', epigraphDescription: '' };
  if (lines.length === 1) return { epigraph: lines[0], epigraphDescription: '' };

  const isAttribution = (line) => /^[—–-]/.test(line);
  const isQuoted = (line) => /["“]/.test(line);

  const attributionAt = lines.findIndex(isAttribution);
  if (attributionAt > 0) {
    return {
      epigraph: lines.slice(0, attributionAt).join(' '),
      epigraphDescription: lines.slice(attributionAt).join(' ')
    };
  }

  if (!isQuoted(lines[0]) && lines.slice(1).some(isQuoted)) {
    return {
      epigraph: lines.slice(1).join(' '),
      epigraphDescription: lines[0]
    };
  }

  return { epigraph: lines.join(' '), epigraphDescription: '' };
}

// Parse individual markdown chapter or interlude
function parseChapter(rawMarkdown, filename, index, chapterNumber) {
  const isInterlude = filename.includes('interlude') || filename.includes('addendum');
  const lines = rawMarkdown.split('\n');
  let title = isInterlude ? 'Interlude' : `Chapter ${chapterNumber}`;
  let pov = 'Omniscient';
  let epigraph = '';
  let epigraphDescription = '';

  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    if (line.startsWith('# ')) {
      title = line.replace(/^#\s*/, '').trim();
      if (title.includes('//')) {
        const parts = title.split('//').map(p => p.trim());
        title = parts[0];
        pov = parts[1] || pov;
      }
      break;
    }
  }

  // Parse epigraph / audio log
  let inQuote = false;
  let quoteLines = [];
  for (let i = 0; i < Math.min(lines.length, 30); i++) {
    const line = lines[i].trim();
    if (line.startsWith('>')) {
      inQuote = true;
      quoteLines.push(line.replace(/^>\s*/, ''));
    } else if (inQuote && line.length > 0 && !line.startsWith('***')) {
      quoteLines.push(line);
    } else if (inQuote && (line.startsWith('***') || line === '')) {
      break;
    }
  }
  if (quoteLines.length > 0) {
    const split = splitEpigraph(quoteLines);
    epigraph = marked.parseInline(split.epigraph);
    epigraphDescription = marked.parseInline(split.epigraphDescription);
  }

  // Display Title (single heading, no duplication) & Character Name (no 'POINT OF VIEW //', no 'INTERLUDE', no 'OMNISCIENT')
  let displayTitle = isInterlude ? title : `Chapter ${chapterNumber}`;

  let displayCharacter = isInterlude ? '' : pov.replace(/^point of view\s*\/\/\s*/i, '').trim();
  if (displayCharacter.toLowerCase().includes('omniscient') || displayCharacter.toLowerCase().includes('interlude')) {
    displayCharacter = '';
  }

  // Remove top H1, epigraph quote, and divider from narrative body
  let bodyMarkdown = rawMarkdown
    .replace(/^#\s+[^\n]+/m, '')
    .replace(/^>[\s\S]*?(?=\n\s*\*\*\*|\n\n[^\s>])/m, '')
    .replace(/^\s*\*\*\*\s*$/m, '')
    .trim();

  // Convert body to HTML
  let bodyHtml = marked.parse(bodyMarkdown);

  // Add drop-cap to first paragraph
  bodyHtml = bodyHtml.replace(/<p>([\s\S]*?)<\/p>/, (match, pContent) => {
    const trimmed = pContent.trim();
    if (trimmed.length > 1) {
      const firstChar = trimmed.charAt(0);
      const rest = trimmed.slice(1);
      return `<p class="has-dropcap"><span class="dropcap">${firstChar}</span>${rest}</p>`;
    }
    return match;
  });

  // Scene breaks
  bodyHtml = bodyHtml.replace(/<hr\s*\/?>/g, '<div class="scene-break">❖ ❖ ❖</div>');

  return {
    index,
    chapterNumber,
    isInterlude,
    filename,
    title,
    pov,
    displayTitle,
    displayCharacter,
    epigraph,
    epigraphDescription,
    bodyHtml: toStrictXHTML(bodyHtml),
    wordCount: rawMarkdown.trim().split(/\s+/).length
  };
}

// Generate EPUB Stylesheet
function generateCSS() {
  return `/* The Arkun Cycle — EPUB3 Stylesheet */

@charset "utf-8";

body {
  font-family: Georgia, "Times New Roman", serif;
  font-size: 1em;
  line-height: 1.65;
  color: #1a1a1a;
  background-color: #ffffff;
  margin: 5% 6%;
  text-align: justify;
  text-justify: inter-word;
  hyphens: auto;
  -webkit-hyphens: auto;
}

/* Headings */
h1, h2, h3, h4 {
  font-family: "Cinzel", Georgia, serif;
  text-align: center;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1.5px;
  line-height: 1.3;
}

h1 {
  font-size: 1.8em;
  margin-top: 1.5em;
  margin-bottom: 0.3em;
  page-break-before: always;
  break-before: page;
}

h2 {
  font-size: 1.3em;
  color: #c49a45;
  margin-top: 1.8em;
  margin-bottom: 0.8em;
}

/* Chapter header block */
.chapter-header {
  text-align: center;
  margin-bottom: 2em;
  page-break-before: always;
  break-before: page;
}

.chapter-title {
  font-family: "Cinzel", Georgia, serif;
  font-size: 1.8em;
  color: #1a1a1a;
  margin: 0 0 0.35em 0;
  letter-spacing: 2px;
  font-weight: 700;
  text-transform: uppercase;
}

.chapter-character {
  font-family: "Cinzel", Georgia, serif;
  font-size: 0.88em;
  letter-spacing: 3px;
  color: #c49a45;
  text-transform: uppercase;
  font-weight: 600;
}

/* Epigraphs matching the Reader */
.epigraph-container {
  margin: 1.8em 0.5em 2.2em 0.5em;
  page-break-inside: avoid;
  break-inside: avoid;
}

.epigraph-container blockquote {
  font-style: italic;
  font-size: 0.95em;
  line-height: 1.6;
  color: #3e3830;
  border-left: 3px solid #c49a45;
  margin: 0 0 8px 0;
  padding: 10px 18px;
  background: rgba(196, 154, 69, 0.06);
  border-radius: 0 6px 6px 0;
}

.epigraph-description {
  font-style: italic;
  font-size: 0.82em;
  line-height: 1.5;
  color: #776e62;
  text-align: right;
  text-indent: 0;
  margin: 6px 0 16px 15%;
  padding: 0;
}

.epigraph-divider {
  text-align: center;
  color: #c49a45;
  font-size: 11px;
  letter-spacing: 6px;
  margin: 16px 0 24px 0;
}

/* Paragraphs & Indentation */
p {
  margin: 0;
  text-indent: 1.6em;
  orphans: 2;
  widows: 2;
}

p.has-dropcap {
  text-indent: 0;
}

/* Drop Caps */
.dropcap {
  float: left;
  font-size: 3.4em;
  line-height: 0.8;
  padding-top: 0.1em;
  padding-right: 0.15em;
  padding-bottom: 0.05em;
  color: #c49a45;
  font-weight: bold;
}

/* Scene breaks */
.scene-break {
  text-align: center;
  color: #c49a45;
  font-size: 0.9em;
  letter-spacing: 6px;
  margin: 2em 0;
  page-break-inside: avoid;
  break-inside: avoid;
}

/* Biopunk Data-Slate Terminal */
.terminal-panel {
  margin: 1.5em 0;
  background-color: #0d1015;
  border: 1px solid #c49a45;
  border-left: 3px solid #22c55e;
  border-radius: 4px;
  overflow: hidden;
  page-break-inside: avoid;
  break-inside: avoid;
}

.terminal-header {
  background-color: #171b21;
  border-bottom: 1px solid rgba(196, 154, 69, 0.4);
  padding: 5px 10px;
  font-family: "Courier New", Courier, monospace;
  font-size: 0.72em;
  letter-spacing: 1.2px;
  color: #dfc187;
  text-transform: lowercase;
}

.terminal-status-dot {
  color: #22c55e;
  font-size: 0.85em;
  margin-right: 4px;
}

.terminal-panel pre,
pre.terminal-body {
  margin: 0;
  padding: 0.8em 1em;
  background: transparent;
  border: none;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.terminal-panel code,
pre.terminal-body code {
  font-family: "Courier New", Courier, monospace;
  font-size: 0.88em;
  line-height: 1.6;
  color: #38e07b;
  background: transparent;
  padding: 0;
  text-transform: lowercase;
}

/* Fallback Monospace */
pre {
  background: #0d1015;
  border: 1px solid #c49a45;
  border-left: 3px solid #22c55e;
  padding: 0.8em 1em;
  margin: 1.4em 0;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
  color: #38e07b;
  text-transform: lowercase;
}

/* Title Page */
.titlepage {
  text-align: center;
  padding: 10% 5%;
  page-break-before: always;
  break-before: page;
}

.titlepage-series {
  font-size: 0.95em;
  letter-spacing: 4px;
  color: #8c7d6b;
  text-transform: uppercase;
  margin-bottom: 1.2em;
}

.titlepage-title {
  font-size: 2.4em;
  color: #1a1a1a;
  letter-spacing: 2px;
  margin-bottom: 0.3em;
}

.titlepage-subtitle {
  font-size: 1.1em;
  color: #c49a45;
  font-style: italic;
  margin-bottom: 2em;
}

.titlepage-rule {
  width: 80px;
  height: 2px;
  background: #c49a45;
  margin: 2em auto;
}

.titlepage-logline {
  font-style: italic;
  font-size: 0.95em;
  color: #555;
  max-width: 80%;
  margin: 0 auto 3em auto;
  line-height: 1.6;
}

.titlepage-colophon {
  font-size: 0.8em;
  color: #888;
  line-height: 1.8;
  margin-top: 4em;
}

/* Copyright & Content Advisory */
.copyright-section {
  font-size: 0.88em;
  line-height: 1.8;
  color: #4a4237;
  padding: 10% 5% 5% 5%;
  text-align: left;
}

.copyright-section p {
  text-indent: 0;
  margin-bottom: 1.2em;
}

.copyright-title {
  font-family: "Cinzel", Georgia, serif;
  font-size: 1.3em;
  letter-spacing: 2px;
  color: #1a1a1a;
  text-transform: uppercase;
  font-weight: 700;
  margin-bottom: 0.2em;
}

.copyright-series {
  font-size: 0.9em;
  color: #c49a45;
  font-style: italic;
  margin-bottom: 1.5em;
}

.copyright-rule {
  width: 50px;
  height: 1px;
  background: #c49a45;
  margin: 1.5em 0;
}

.advisory-box {
  margin: 2em 0;
  padding: 1.2em 1.4em;
  border: 1px solid #c49a45;
  border-left: 4px solid #c49a45;
  background: #fbf9f4;
  border-radius: 4px;
}

.advisory-header {
  font-family: "Cinzel", Georgia, serif;
  font-size: 0.92em;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 0.4em;
}

.advisory-rating {
  display: inline-block;
  font-weight: bold;
  color: #b91c1c;
  font-size: 0.88em;
  letter-spacing: 1px;
  margin-bottom: 0.8em;
}

/* Review Box */
.review-box {
  text-align: center;
  padding: 15% 8% 5% 8%;
}

.review-badge {
  font-family: "Cinzel", Georgia, serif;
  font-size: 1.25em;
  letter-spacing: 2px;
  color: #c49a45;
  text-transform: uppercase;
  margin-bottom: 0.8em;
  font-weight: 700;
}

.review-rule {
  width: 60px;
  height: 2px;
  background: #c49a45;
  margin: 1.2em auto 2em auto;
}

.review-text {
  font-size: 1.05em;
  line-height: 1.8;
  color: #2b2b2b;
  margin-bottom: 1.5em;
  text-indent: 0;
}

.stars {
  color: #c49a45;
  font-size: 1.4em;
  letter-spacing: 4px;
  margin-bottom: 1.2em;
}

/* Teaser / Sneak Peek */
.teaser-header {
  text-align: center;
  margin-bottom: 2em;
}

.teaser-series {
  font-size: 0.9em;
  letter-spacing: 3px;
  color: #8c7d6b;
  text-transform: uppercase;
  margin-bottom: 0.4em;
}

.teaser-title {
  font-size: 2em;
  color: #1a1a1a;
  letter-spacing: 1.5px;
  margin: 0.2em 0 0.4em 0;
}

.teaser-subtitle {
  font-size: 1em;
  color: #c49a45;
  font-style: italic;
}

.teaser-hook {
  font-style: italic;
  border-left: 3px solid #c49a45;
  padding: 1em 1.5em;
  background: #fbf9f4;
  margin: 2em 0;
  color: #3e3830;
  line-height: 1.7;
}

/* About the Author */
.author-section {
  text-align: center;
  padding: 10% 5%;
}

.author-name {
  font-family: "Cinzel", Georgia, serif;
  font-size: 1.8em;
  letter-spacing: 2px;
  color: #1a1a1a;
  text-transform: uppercase;
  margin-bottom: 0.3em;
}

.author-tagline {
  font-size: 0.95em;
  color: #c49a45;
  font-style: italic;
  margin-bottom: 1.8em;
}

.author-rule {
  width: 50px;
  height: 1px;
  background: #c49a45;
  margin: 1.5em auto;
}

.author-bio {
  text-align: justify;
  max-width: 85%;
  margin: 0 auto 1.5em auto;
  font-size: 0.98em;
  line-height: 1.75;
  color: #333;
  text-indent: 0;
}
`;
}

// Generate XHTML for Chapter or Interlude
function generateChapterXHTML(chapter) {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="utf-8" />
  <title>${xmlEscape(chapter.displayTitle)} — ${xmlEscape(BOOK_META.title)}</title>
  <link rel="stylesheet" type="text/css" href="../styles/book.css" />
</head>
<body epub:type="bodymatter">
  <section role="doc-chapter" epub:type="chapter" class="chapter chapter-${chapter.index}">
    <header class="chapter-header">
      <h1 class="chapter-title">${xmlEscape(chapter.displayTitle.toUpperCase())}</h1>
      ${chapter.displayCharacter ? `<div class="chapter-character">${xmlEscape(chapter.displayCharacter.toUpperCase())}</div>` : ''}
    </header>

    ${chapter.epigraph ? `
    <div class="epigraph-container">
      <blockquote class="epigraph-quote">${chapter.epigraph}</blockquote>
      ${chapter.epigraphDescription ? `<p class="epigraph-description">${chapter.epigraphDescription}</p>` : ''}
      <div class="epigraph-divider">❖ &nbsp; ❖ &nbsp; ❖</div>
    </div>
    ` : ''}

    <div class="chapter-content">
      ${chapter.bodyHtml}
    </div>
  </section>
</body>
</html>`;
}

// Generate Cover XHTML
function generateCoverXHTML() {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="utf-8" />
  <title>Cover — ${xmlEscape(BOOK_META.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles/book.css" />
  <style type="text/css">
    body { margin: 0; padding: 0; text-align: center; background-color: #0d0c0a; }
    img.cover { max-width: 100%; height: 100vh; object-fit: contain; }
  </style>
</head>
<body epub:type="cover">
  <div role="doc-cover" epub:type="cover">
    <img src="assets/cover.jpg" alt="Cover: ${xmlEscape(BOOK_META.title)}" class="cover" />
  </div>
</body>
</html>`;
}

// Generate Back Cover XHTML
function generateBackCoverXHTML() {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="utf-8" />
  <title>Back Cover — ${xmlEscape(BOOK_META.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles/book.css" />
  <style type="text/css">
    body { margin: 0; padding: 0; text-align: center; background-color: #0d0c0a; }
    img.back-cover { max-width: 100%; height: 100vh; object-fit: contain; }
  </style>
</head>
<body epub:type="backmatter">
  <div role="doc-backcover" epub:type="backmatter">
    <img src="assets/back_cover.jpg" alt="Back Cover: ${xmlEscape(BOOK_META.title)}" class="back-cover" />
  </div>
</body>
</html>`;
}

// Generate Title Page XHTML
function generateTitlePageXHTML() {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="utf-8" />
  <title>Title Page — ${xmlEscape(BOOK_META.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles/book.css" />
</head>
<body epub:type="frontmatter">
  <section class="titlepage" role="doc-titlepage" epub:type="titlepage">
    <div class="titlepage-series">${xmlEscape(BOOK_META.series)} — Book One</div>
    <h1 class="titlepage-title">${xmlEscape(BOOK_META.title)}</h1>
    <div class="titlepage-subtitle">A Biopunk Romantasy Novel</div>
    <div class="titlepage-rule"></div>
    <div class="titlepage-logline">
      "He was engineered to kill. She was bred to survive. One breathless touch that changes the sky forever."
    </div>
    <div class="titlepage-colophon">
      ${xmlEscape(BOOK_META.publisher)}<br />
      Chrono: Year 40 AS (2072 CE)<br />
      ${xmlEscape(BOOK_META.rights)}
    </div>
  </section>
</body>
</html>`;
}

// Generate Dedication XHTML
function generateDedicationXHTML() {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="utf-8" />
  <title>Dedication — ${xmlEscape(BOOK_META.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles/book.css" />
  <style type="text/css">
    .dedication-section {
      text-align: center;
      padding: 24% 8% 0 8%;
    }
    .dedication-recipient {
      font-family: "Cinzel", Georgia, serif;
      font-size: 1.35em;
      letter-spacing: 3px;
      color: #c49a45;
      text-transform: uppercase;
      margin-bottom: 1.2em;
    }
    .dedication-rule {
      width: 45px;
      height: 1px;
      background: #c49a45;
      margin: 1.2em auto 2.2em auto;
      opacity: 0.7;
    }
    .dedication-text {
      font-family: Georgia, "Times New Roman", serif;
      font-style: italic;
      font-size: 1.08em;
      line-height: 2.1;
      color: #2b2b2b;
      margin: 1em 0;
      text-indent: 0;
    }
    .dedication-ornament {
      margin-top: 3em;
      color: #c49a45;
      font-size: 1.1em;
    }
  </style>
</head>
<body epub:type="frontmatter">
  <section class="dedication" role="doc-dedication" epub:type="dedication">
    <div class="dedication-section">
      <div class="dedication-recipient">For Zuni</div>
      <div class="dedication-rule"></div>
      <p class="dedication-text">To the one who makes every breath in my life count.</p>
      <p class="dedication-text">I hope you find my devotion and love between these lines.</p>
      <p class="dedication-text">Forever will never be enough to share this life with you.</p>
      <div class="dedication-ornament">❖</div>
    </div>
  </section>
</body>
</html>`;
}

// Generate Copyright & Content Advisory XHTML
function generateCopyrightXHTML() {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="utf-8" />
  <title>Copyright &amp; Content Advisory — ${xmlEscape(BOOK_META.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles/book.css" />
</head>
<body epub:type="frontmatter">
  <section class="copyright-section" role="doc-pagebreak" epub:type="copyright-page">
    <div class="copyright-title">${xmlEscape(BOOK_META.title)}</div>
    <div class="copyright-series">${xmlEscape(BOOK_META.series)} — Book One</div>
    <div class="copyright-rule"></div>

    <p>Copyright &#169; 2026 by J.D. Alfaro.</p>
    <p>All rights reserved. No part of this publication may be reproduced, stored in a retrieval system, or transmitted in any form or by any means—electronic, mechanical, photocopying, recording, scanning, or otherwise—without prior written permission of the author, except for the use of brief quotations in a book review or scholarly article.</p>

    <p><strong>First Edition: October 2026</strong></p>
    <p>Published by J.D. Alfaro<br />
    Cover Art &amp; Interior Typography: The Arkun Cycle Studio<br />
    Series: The Arkun Cycle (Volume 1)<br />
    eBook Identifier: ${xmlEscape(BOOK_META.identifier)}</p>

    <p><strong>Publisher&#39;s Note:</strong> This novel is a work of fiction. Names, characters, places, organizations, and incidents are either the product of the author&#39;s imagination or are used fictitiously. Any resemblance to actual persons, living or dead, business establishments, events, or locales is entirely coincidental.</p>

    <div class="advisory-box">
      <div class="advisory-header">Mature Reader Guidance</div>
      <div class="advisory-rating">RATED 18+ FOR ADULT AUDIENCES</div>
      <p style="font-size: 0.9em; line-height: 1.6; margin: 0; text-indent: 0; color: #4a4237;">
        <em>Stolen Breath</em> is a high-heat biopunk romantasy written for mature audiences. It contains explicit, descriptive sexual encounters (open door), graphic violence, biological body horror, trauma recovery, high-stakes peril, and strong language. Reader discretion is advised.
      </p>
    </div>
  </section>
</body>
</html>`;
}

// Generate Author's Note & Acknowledgments XHTML
function generateAcknowledgmentsXHTML() {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="utf-8" />
  <title>Author&#39;s Note &amp; Acknowledgments — ${xmlEscape(BOOK_META.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles/book.css" />
</head>
<body epub:type="backmatter">
  <section class="chapter" role="doc-acknowledgments" epub:type="acknowledgments">
    <header class="chapter-header">
      <div class="chapter-number">Back Matter</div>
      <h1 class="chapter-title">Author&#39;s Note &amp; Acknowledgments</h1>
      <div class="chapter-pov">Gratitude // J.D. Alfaro</div>
    </header>

    <div class="chapter-content">
      <p class="has-dropcap"><span class="dropcap">B</span>uilding the shattered skies and scorched dunes of Arkun began with a simple question: what happens when two engineered survivors—each weaponized by trauma, duty, and genetic design—find salvation in the very touch they were taught to fear? Bringing Tsunari and Vram&#39;s story into the world has been an exhilarating, demanding, and deeply transformative voyage.</p>

      <p>To my partner, Zuni: thank you for being my constant anchor, my first sounding board, and the quiet heart behind every word. Your faith in this world breathed life into it when the pages were dark. Every sentence carries the quiet imprint of your love.</p>

      <p>To my early readers and critique partners: thank you for challenging me to sharpen the blades, deepen the tension, and never hold back on the heat or the emotional cost. Your honest feedback helped forge <em>Stolen Breath</em> into the fierce, visceral tale it needed to be.</p>

      <p>To the vibrant Romantasy community: thank you for embracing stories where unapologetic romance and high-stakes speculative fiction collide. Readers like you make epic worlds like Arkun possible.</p>

      <p>And finally, to you—the reader: thank you for walking the dangerous catwalks of Sector 09 with Tsunari and soaring through the storm with Vram. If this story stirred your pulse, kept you reading past midnight, or made your breath catch, then every late night and rewound line was worth it.</p>
    </div>
  </section>
</body>
</html>`;
}

// Generate Review Request XHTML
function generateReviewRequestXHTML() {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="utf-8" />
  <title>A Note to the Reader — ${xmlEscape(BOOK_META.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles/book.css" />
</head>
<body epub:type="backmatter">
  <section class="review-box" role="doc-afterword" epub:type="afterword">
    <div class="review-badge">Did Stolen Breath Steal Yours?</div>
    <div class="review-rule"></div>
    <div class="stars">&#9733; &#9733; &#9733; &#9733; &#9733;</div>

    <p class="review-text">
      Reviews are the lifeblood of independent authors. They help fellow romantasy and sci-fi readers discover new stories, support continuing series, and allow authors to keep creating the worlds you love.
    </p>

    <p class="review-text">
      If you enjoyed journeying with Tsunari and Vram, please take two minutes to <strong>leave an honest review or rating on Amazon and Goodreads</strong>.
    </p>

    <p class="review-text" style="font-style: italic; color: #555;">
      Every star, every review, and every recommendation helps the rebellion rise. Thank you for your support!
    </p>
  </section>
</body>
</html>`;
}

// Generate Book Two Teaser XHTML
function generateTeaserXHTML() {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="utf-8" />
  <title>Sneak Peek: Crown of Salt — ${xmlEscape(BOOK_META.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles/book.css" />
</head>
<body epub:type="backmatter">
  <section class="chapter" role="doc-conclusion" epub:type="conclusion">
    <div class="teaser-header">
      <div class="teaser-series">${xmlEscape(BOOK_META.series)} &bull; Book Two</div>
      <h1 class="teaser-title">Crown of Salt</h1>
      <div class="teaser-subtitle">Coming Soon</div>
    </div>

    <div class="teaser-hook" style="margin-top: 3em; font-size: 1.15em; line-height: 1.8;">
      "Fourteen months until outdoor air kills everything that breathes. Thirty days until the glass dome of Eden Alpha becomes Sora's tomb. And eighty miles of scorching, caustic salt between the hunter and the captive."
    </div>

    <div style="text-align: center; margin-top: 3em; font-family: 'Cinzel', Georgia, serif; letter-spacing: 2px; color: #c49a45; font-size: 0.95em;">
      THE ARKUN CYCLE WILL RETURN IN<br />
      <strong>BOOK TWO: CROWN OF SALT</strong>
    </div>
  </section>
</body>
</html>`;
}


// Generate EPUB3 Navigation Document (nav.xhtml)
function generateNavXHTML(chapters, hasBackCover) {
  const chapterItems = chapters.map(c => {
    const filename = `chapters/chapter_${String(c.index).padStart(2, '0')}.xhtml`;
    return `      <li><a href="${filename}">${xmlEscape(c.title)}</a></li>`;
  }).join('\n');

  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="utf-8" />
  <title>Table of Contents — ${xmlEscape(BOOK_META.title)}</title>
  <link rel="stylesheet" type="text/css" href="styles/book.css" />
</head>
<body epub:type="frontmatter">
  <nav epub:type="toc" id="toc" role="doc-toc">
    <h1 class="titlepage-title" style="font-size: 1.8em; margin-bottom: 1.5em;">Table of Contents</h1>
    <ol style="list-style-type: none; padding-left: 0; line-height: 2;">
      <li><a href="titlepage.xhtml">Title Page</a></li>
      <li><a href="copyright.xhtml">Copyright &amp; Advisory</a></li>
      <li><a href="dedication.xhtml">Dedication</a></li>
${chapterItems}
      <li><a href="acknowledgments.xhtml">Author&#39;s Note &amp; Acknowledgments</a></li>
      <li><a href="reviews.xhtml">A Note to the Reader</a></li>
      <li><a href="teaser.xhtml">Sneak Peek: Crown of Salt</a></li>
      ${hasBackCover ? '<li><a href="backcover.xhtml">Back Cover</a></li>' : ''}
    </ol>
  </nav>
</body>
</html>`;
}

// Generate EPUB2 NCX (nav.ncx) for backwards compatibility
function generateNCX(chapters, hasBackCover) {
  let playOrder = 1;
  const navPoints = [];

  navPoints.push(`
    <navPoint id="np-title" playOrder="${playOrder++}">
      <navLabel><text>Title Page</text></navLabel>
      <content src="titlepage.xhtml"/>
    </navPoint>
  `);

  navPoints.push(`
    <navPoint id="np-copyright" playOrder="${playOrder++}">
      <navLabel><text>Copyright &amp; Advisory</text></navLabel>
      <content src="copyright.xhtml"/>
    </navPoint>
  `);

  navPoints.push(`
    <navPoint id="np-dedication" playOrder="${playOrder++}">
      <navLabel><text>Dedication</text></navLabel>
      <content src="dedication.xhtml"/>
    </navPoint>
  `);

  chapters.forEach(c => {
    const filename = `chapters/chapter_${String(c.index).padStart(2, '0')}.xhtml`;
    navPoints.push(`
    <navPoint id="np-chap-${c.index}" playOrder="${playOrder++}">
      <navLabel><text>${xmlEscape(c.title)}</text></navLabel>
      <content src="${filename}"/>
    </navPoint>
    `);
  });

  navPoints.push(`
    <navPoint id="np-acknowledgments" playOrder="${playOrder++}">
      <navLabel><text>Author&#39;s Note &amp; Acknowledgments</text></navLabel>
      <content src="acknowledgments.xhtml"/>
    </navPoint>
  `);

  navPoints.push(`
    <navPoint id="np-reviews" playOrder="${playOrder++}">
      <navLabel><text>A Note to the Reader</text></navLabel>
      <content src="reviews.xhtml"/>
    </navPoint>
  `);

  navPoints.push(`
    <navPoint id="np-teaser" playOrder="${playOrder++}">
      <navLabel><text>Sneak Peek: Crown of Salt</text></navLabel>
      <content src="teaser.xhtml"/>
    </navPoint>
  `);


  if (hasBackCover) {
    navPoints.push(`
    <navPoint id="np-backcover" playOrder="${playOrder++}">
      <navLabel><text>Back Cover</text></navLabel>
      <content src="backcover.xhtml"/>
    </navPoint>
    `);
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<ncx xmlns="http://www.daisy.org/z3986/2005/ncx/" version="2005-1" xml:lang="en">
  <head>
    <meta name="dtb:uid" content="${BOOK_META.identifier}"/>
    <meta name="dtb:depth" content="2"/>
    <meta name="dtb:totalPageCount" content="0"/>
    <meta name="dtb:maxPageNumber" content="0"/>
  </head>
  <docTitle><text>${xmlEscape(BOOK_META.title)}</text></docTitle>
  <docAuthor><text>${xmlEscape(BOOK_META.author)}</text></docAuthor>
  <navMap>
    ${navPoints.join('')}
  </navMap>
</ncx>`;
}

// Generate OPF Package Document (content.opf)
function generateOPF(chapters, hasBackCover) {
  const manifestItems = [
    `<item id="ncx" href="nav.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>`,
    `<item id="style" href="styles/book.css" media-type="text/css"/>`,
    `<item id="cover-image" href="assets/cover.jpg" media-type="image/jpeg" properties="cover-image"/>`,
    `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="copyright" href="copyright.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="dedication" href="dedication.xhtml" media-type="application/xhtml+xml"/>`,
  ];

  chapters.forEach(c => {
    const id = `chap_${String(c.index).padStart(2, '0')}`;
    const href = `chapters/chapter_${String(c.index).padStart(2, '0')}.xhtml`;
    manifestItems.push(`<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`);
  });

  manifestItems.push(
    `<item id="acknowledgments" href="acknowledgments.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="reviews" href="reviews.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="teaser" href="teaser.xhtml" media-type="application/xhtml+xml"/>`
  );

  if (hasBackCover) {
    manifestItems.push(`<item id="back-cover-image" href="assets/back_cover.jpg" media-type="image/jpeg"/>`);
    manifestItems.push(`<item id="backcover" href="backcover.xhtml" media-type="application/xhtml+xml"/>`);
  }

  const spineItems = [
    `<itemref idref="cover" linear="no"/>`,
    `<itemref idref="titlepage"/>`,
    `<itemref idref="copyright"/>`,
    `<itemref idref="dedication"/>`,
  ];

  chapters.forEach(c => {
    const id = `chap_${String(c.index).padStart(2, '0')}`;
    spineItems.push(`<itemref idref="${id}"/>`);
  });

  spineItems.push(
    `<itemref idref="acknowledgments"/>`,
    `<itemref idref="reviews"/>`,
    `<itemref idref="teaser"/>`
  );

  if (hasBackCover) {
    spineItems.push(`<itemref idref="backcover"/>`);
  }

  return `<?xml version="1.0" encoding="utf-8"?>
<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="BookId" xml:lang="en">
  <metadata xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/">
    <dc:identifier id="BookId">${BOOK_META.identifier}</dc:identifier>
    <dc:title>${xmlEscape(BOOK_META.title)}</dc:title>
    <dc:creator>${xmlEscape(BOOK_META.author)}</dc:creator>
    <dc:language>${BOOK_META.language}</dc:language>
    <dc:publisher>${xmlEscape(BOOK_META.publisher)}</dc:publisher>
    <dc:date>${BOOK_META.date}</dc:date>
    <dc:description>${xmlEscape(BOOK_META.description)}</dc:description>
    <dc:rights>${xmlEscape(BOOK_META.rights)}</dc:rights>
    <meta property="dcterms:modified">${BOOK_META.modified}</meta>
    <meta property="belongs-to-collection" id="c01">${xmlEscape(BOOK_META.series)}</meta>
    <meta refines="#c01" property="collection-type">series</meta>
    <meta refines="#c01" property="group-position">${BOOK_META.volume}</meta>
  </metadata>

  <manifest>
    ${manifestItems.join('\n    ')}
  </manifest>

  <spine toc="ncx">
    ${spineItems.join('\n    ')}
  </spine>
</package>`;
}

// MAIN COMPILER FUNCTION
async function buildEPUB() {
  console.log('========================================================');
  console.log('⚡ THE ARKUN CYCLE — EPUB3 COMPILER');
  console.log('========================================================');

  // 1. Read Manuscript Chapters & Addendums
  if (!fs.existsSync(MANUSCRIPT_DIR)) {
    throw new Error(`Manuscript directory not found at: ${MANUSCRIPT_DIR}`);
  }

  // Natural sort cleanly places chapter_10b_addendum_01 between chapter_10 and chapter_11
  const files = fs.readdirSync(MANUSCRIPT_DIR)
    .filter(f => f.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  console.log(`📖 Found ${files.length} sections (${files.filter(f => !f.includes('interlude')).length} chapters + ${files.filter(f => f.includes('interlude')).length} interludes) in ${MANUSCRIPT_DIR}`);

  let totalWords = 0;
  let chapterCounter = 0;
  const chapters = files.map((file, i) => {
    const isInterlude = file.includes('interlude');
    if (!isInterlude) chapterCounter++;
    const raw = fs.readFileSync(path.join(MANUSCRIPT_DIR, file), 'utf8');
    const parsed = parseChapter(raw, file, i + 1, chapterCounter);
    totalWords += parsed.wordCount;
    return parsed;
  });

  console.log(`📊 Total Word Count: ${totalWords.toLocaleString()} words`);

  // 2. Prepare Zip and File Maps
  const zip = new JSZip();

  // mimetype MUST be first, uncompressed
  zip.file('mimetype', 'application/epub+zip', { compression: 'STORE' });

  // META-INF/container.xml
  const containerXml = `<?xml version="1.0" encoding="utf-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
  <rootfiles>
    <rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/>
  </rootfiles>
</container>`;
  zip.file('META-INF/container.xml', containerXml);

  // CSS Stylesheet
  const css = generateCSS();
  zip.file('OEBPS/styles/book.css', css);

  // Cover images
  let coverData = null;
  if (fs.existsSync(COVER_PATH)) {
    coverData = fs.readFileSync(COVER_PATH);
    zip.file('OEBPS/assets/cover.jpg', coverData);
  } else {
    console.warn('⚠️ Cover image not found at', COVER_PATH);
  }

  let backCoverData = null;
  if (fs.existsSync(BACK_COVER_PATH)) {
    backCoverData = fs.readFileSync(BACK_COVER_PATH);
    zip.file('OEBPS/assets/back_cover.jpg', backCoverData);
  }

  // Cover & Frontmatter XHTML
  zip.file('OEBPS/cover.xhtml', generateCoverXHTML());
  zip.file('OEBPS/titlepage.xhtml', generateTitlePageXHTML());
  zip.file('OEBPS/copyright.xhtml', generateCopyrightXHTML());
  zip.file('OEBPS/dedication.xhtml', generateDedicationXHTML());

  // Chapters XHTML
  chapters.forEach(c => {
    const filename = `chapter_${String(c.index).padStart(2, '0')}.xhtml`;
    const xhtml = generateChapterXHTML(c);
    zip.file(`OEBPS/chapters/${filename}`, xhtml);
  });

  // Back Matter XHTML
  zip.file('OEBPS/acknowledgments.xhtml', generateAcknowledgmentsXHTML());
  zip.file('OEBPS/reviews.xhtml', generateReviewRequestXHTML());
  zip.file('OEBPS/teaser.xhtml', generateTeaserXHTML());

  // Back Cover XHTML
  if (backCoverData) {
    zip.file('OEBPS/backcover.xhtml', generateBackCoverXHTML());
  }

  // Navigation (EPUB3 nav.xhtml + EPUB2 nav.ncx)
  zip.file('OEBPS/nav.xhtml', generateNavXHTML(chapters, !!backCoverData));
  zip.file('OEBPS/nav.ncx', generateNCX(chapters, !!backCoverData));

  // OPF Package Document
  zip.file('OEBPS/content.opf', generateOPF(chapters, !!backCoverData));

  // 3. Write Exploded Source Files for Inspection
  console.log('📂 Writing exploded source files to:', EPUB_SOURCE_DIR);
  fs.mkdirSync(path.join(EPUB_SOURCE_DIR, 'META-INF'), { recursive: true });
  fs.mkdirSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'styles'), { recursive: true });
  fs.mkdirSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'assets'), { recursive: true });
  fs.mkdirSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'chapters'), { recursive: true });

  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'mimetype'), 'application/epub+zip');
  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'META-INF', 'container.xml'), containerXml);
  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'styles', 'book.css'), css);
  if (coverData) {
    fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'assets', 'cover.jpg'), coverData);
  }
  if (backCoverData) {
    fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'assets', 'back_cover.jpg'), backCoverData);
    fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'backcover.xhtml'), generateBackCoverXHTML());
  }
  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'cover.xhtml'), generateCoverXHTML());
  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'titlepage.xhtml'), generateTitlePageXHTML());
  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'copyright.xhtml'), generateCopyrightXHTML());
  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'dedication.xhtml'), generateDedicationXHTML());

  chapters.forEach(c => {
    const filename = `chapter_${String(c.index).padStart(2, '0')}.xhtml`;
    fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'chapters', filename), generateChapterXHTML(c));
  });

  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'acknowledgments.xhtml'), generateAcknowledgmentsXHTML());
  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'reviews.xhtml'), generateReviewRequestXHTML());
  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'teaser.xhtml'), generateTeaserXHTML());

  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'nav.xhtml'), generateNavXHTML(chapters, !!backCoverData));
  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'nav.ncx'), generateNCX(chapters, !!backCoverData));
  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'content.opf'), generateOPF(chapters, !!backCoverData));

  // 4. Generate the Compressed EPUB3 Archive
  console.log('📦 Compiling EPUB3 archive...');
  const epubBuffer = await zip.generateAsync({
    type: 'nodebuffer',
    mimeType: 'application/epub+zip',
    compression: 'DEFLATE',
    compressionOptions: { level: 9 }
  });

  const epubOutputFile = path.join(OUTPUT_DIR, 'Stolen_Breath.epub');
  fs.writeFileSync(epubOutputFile, epubBuffer);

  const stats = fs.statSync(epubOutputFile);
  const sizeMB = (stats.size / (1024 * 1024)).toFixed(2);

  console.log('--------------------------------------------------------');
  console.log(`✅ SUCCESS: EPUB3 Generated!`);
  console.log(`📕 File:      ${epubOutputFile}`);
  console.log(`📦 Size:      ${sizeMB} MB (${stats.size.toLocaleString()} bytes)`);
  console.log(`📚 Chapters:  ${chapters.length}`);
  console.log(`🔤 Words:     ${totalWords.toLocaleString()}`);
  console.log('========================================================');
}

// Run if called directly
if (require.main === module) {
  buildEPUB().catch(err => {
    console.error('❌ Build failed:', err);
    process.exit(1);
  });
}

module.exports = { buildEPUB };
