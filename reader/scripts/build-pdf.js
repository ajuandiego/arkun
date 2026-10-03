/**
 * PDF Compiler for The Arkun Cycle: Stolen Breath
 * Generates both:
 * 1. Trade Paperback Edition (6" x 9") - Typeset book layout with cover, drop-caps, and ornaments
 * 2. Editorial Manuscript Edition (8.5" x 11" US Letter) - Clean format for screen reading and AI uploads
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const { marked } = require('marked');

const ROOT_DIR = path.resolve(__dirname, '../..');
const MANUSCRIPT_DIR = path.join(ROOT_DIR, '09_manuscript', 'book1');
const OUTPUT_DIR_MANUSCRIPT = path.join(ROOT_DIR, '09_manuscript');
const OUTPUT_DIR_READER = path.join(ROOT_DIR, 'reader', 'books', 'book1');
const COVER_PATH = path.join(ROOT_DIR, 'reader', 'public', 'assets', 'cover_kdp_highres.jpg');
const BACK_COVER_PATH = path.join(ROOT_DIR, 'reader', 'public', 'assets', 'back_cover_kdp_highres.jpg');

fs.mkdirSync(OUTPUT_DIR_MANUSCRIPT, { recursive: true });
fs.mkdirSync(OUTPUT_DIR_READER, { recursive: true });

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

const BOOK_META = {
  title: 'Stolen Breath',
  series: 'The Arkun Cycle',
  volume: '1',
  author: 'J.D. Alfaro',
  publisher: 'J.D. Alfaro',
  rights: '© 2026 J.D. Alfaro. All rights reserved.'
};

function xmlEscape(str) {
  if (!str) return '';
  return str
    .replace(/&(?!(amp|lt|gt|quot|apos|#\d+|#x[0-9a-fA-F]+);)/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
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

  let bodyMarkdown = rawMarkdown
    .replace(/^#\s+[^\n]+/m, '')
    .replace(/^>[\s\S]*?(?=\n\s*\*\*\*|\n\n[^\s>])/m, '')
    .replace(/^\s*\*\*\*\s*$/m, '')
    .trim();

  let bodyHtml = marked.parse(bodyMarkdown);

  // Drop-cap on first narrative paragraph
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
    bodyHtml,
    wordCount: rawMarkdown.trim().split(/\s+/).length
  };
}

function generateHTML(chapters, pageSize = 'trade') {
  const isTrade = pageSize === 'trade';
  const pageCss = isTrade
    ? `@page { size: 6in 9in; margin: 0.75in 0.65in 0.85in 0.65in; }`
    : `@page { size: 8.5in 11in; margin: 1in 1in 1in 1in; }`;

  const coverBase64 = fs.existsSync(COVER_PATH)
    ? `data:image/jpeg;base64,${fs.readFileSync(COVER_PATH).toString('base64')}`
    : '';

  const backCoverBase64 = fs.existsSync(BACK_COVER_PATH)
    ? `data:image/jpeg;base64,${fs.readFileSync(BACK_COVER_PATH).toString('base64')}`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${BOOK_META.title} — ${BOOK_META.author}</title>
<style>
@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@600;700;800&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');

${pageCss}

* {
  box-sizing: border-box;
}

body {
  font-family: 'Lora', Georgia, 'Times New Roman', serif;
  font-size: ${isTrade ? '10pt' : '11pt'};
  line-height: ${isTrade ? '1.55' : '1.65'};
  color: #1a1a1a;
  background-color: #ffffff;
  margin: 0;
  padding: 0;
  text-align: justify;
  text-justify: inter-word;
}

/* Page Break Controls */
.page-break-before {
  page-break-before: always;
  break-before: page;
}

.no-break {
  page-break-inside: avoid;
  break-inside: avoid;
}

/* Cover Section */
.cover-page {
  page-break-before: avoid;
  page-break-after: always;
  break-after: page;
  width: 100%;
  height: 100vh;
  margin: 0;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #0d0c0a;
}

.cover-page img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}

/* Title Page */
.titlepage {
  text-align: center;
  padding: 18% 5% 5% 5%;
  page-break-before: always;
  break-before: page;
}

.titlepage-series {
  font-family: 'Cinzel', Georgia, serif;
  font-size: 1.1em;
  letter-spacing: 4px;
  color: #8c7d6b;
  text-transform: uppercase;
  margin-bottom: 1.2em;
}

.titlepage-title {
  font-family: 'Cinzel', Georgia, serif;
  font-size: 2.8em;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 2.5px;
  margin: 0 0 0.2em 0;
}

.titlepage-subtitle {
  font-size: 1.2em;
  color: #c49a45;
  font-style: italic;
  margin-bottom: 2.5em;
}

.titlepage-rule {
  width: 80px;
  height: 2px;
  background: #c49a45;
  margin: 2em auto;
}

.titlepage-logline {
  font-style: italic;
  font-size: 1.05em;
  color: #444;
  max-width: 85%;
  margin: 0 auto 3em auto;
  line-height: 1.7;
}

.titlepage-author {
  font-family: 'Cinzel', Georgia, serif;
  font-size: 1.5em;
  letter-spacing: 3px;
  color: #1a1a1a;
  text-transform: uppercase;
  font-weight: 700;
  margin-top: 2em;
}

.titlepage-colophon {
  font-size: 0.85em;
  color: #777;
  line-height: 1.8;
  margin-top: 4em;
}

/* Copyright Section */
.copyright-section {
  font-size: 0.85em;
  line-height: 1.75;
  color: #4a4237;
  padding: 12% 5% 5% 5%;
  page-break-before: always;
  break-before: page;
}

.copyright-section p {
  text-indent: 0;
  margin-bottom: 1em;
}

.advisory-box {
  margin: 2em 0;
  padding: 1.2em 1.4em;
  border: 1px solid #c49a45;
  border-left: 4px solid #c49a45;
  background: #fcfbf9;
  border-radius: 4px;
}

.advisory-header {
  font-family: 'Cinzel', Georgia, serif;
  font-size: 0.95em;
  font-weight: 700;
  color: #1a1a1a;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  margin-bottom: 0.4em;
}

.advisory-rating {
  font-weight: bold;
  color: #b91c1c;
  font-size: 0.88em;
  letter-spacing: 1px;
  margin-bottom: 0.6em;
}

/* Dedication */
.dedication-section {
  text-align: center;
  padding: 30% 8% 0 8%;
  page-break-before: always;
  break-before: page;
}

.dedication-recipient {
  font-family: 'Cinzel', Georgia, serif;
  font-size: 1.4em;
  letter-spacing: 3px;
  color: #c49a45;
  text-transform: uppercase;
  margin-bottom: 1em;
}

.dedication-rule {
  width: 45px;
  height: 1px;
  background: #c49a45;
  margin: 1.2em auto 2.2em auto;
}

.dedication-text {
  font-style: italic;
  font-size: 1.1em;
  line-height: 2.1;
  color: #2b2b2b;
  margin: 1em 0;
  text-indent: 0;
}


/* Chapter Headers */
.chapter-header {
  text-align: center;
  margin-top: 10%;
  margin-bottom: 2em;
  page-break-before: always;
  break-before: page;
}

.chapter-title {
  font-family: 'Cinzel', Georgia, serif;
  font-size: 1.8em;
  color: #1a1a1a;
  margin: 0 0 0.35em 0;
  letter-spacing: 2px;
  font-weight: 700;
  text-transform: uppercase;
}

.chapter-character {
  font-family: 'Cinzel', Georgia, serif;
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
  font-family: 'Lora', Georgia, 'Times New Roman', serif;
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
  font-family: 'Lora', Georgia, 'Times New Roman', serif;
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

/* Narrative Body */
p {
  margin: 0;
  text-indent: 1.6em;
  orphans: 2;
  widows: 2;
}

p.has-dropcap {
  text-indent: 0;
}

.dropcap {
  float: left;
  font-family: 'Cinzel', Georgia, serif;
  font-size: 3.4em;
  line-height: 0.8;
  padding-top: 0.1em;
  padding-right: 0.15em;
  padding-bottom: 0.05em;
  color: #c49a45;
  font-weight: bold;
}

.scene-break {
  text-align: center;
  color: #c49a45;
  font-size: 0.9em;
  letter-spacing: 6px;
  margin: 2em 0;
  page-break-inside: avoid;
  break-inside: avoid;
}

/* Biopunk Terminal */
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
  padding: 4px 10px;
  font-family: "Courier New", Courier, monospace;
  font-size: 0.75em;
  letter-spacing: 1.2px;
  color: #dfc187;
  text-transform: lowercase;
}

.terminal-status-dot {
  color: #22c55e;
  font-size: 0.85em;
  margin-right: 4px;
}

.terminal-panel pre {
  margin: 0;
  padding: 0.8em 1em;
  background: transparent;
  white-space: pre-wrap;
  word-wrap: break-word;
}

.terminal-panel code {
  font-family: "Courier New", Courier, monospace;
  font-size: 0.85em;
  line-height: 1.5;
  color: #38e07b;
  text-transform: lowercase;
}

/* Back Matter Styles */
.backmatter-section {
  page-break-before: always;
  break-before: page;
}

.review-box {
  text-align: center;
  padding: 16% 8% 5% 8%;
  page-break-before: always;
  break-before: page;
}

.review-badge {
  font-family: 'Cinzel', Georgia, serif;
  font-size: 1.3em;
  letter-spacing: 2px;
  color: #c49a45;
  text-transform: uppercase;
  margin-bottom: 0.8em;
  font-weight: 700;
}

.stars {
  color: #c49a45;
  font-size: 1.4em;
  letter-spacing: 4px;
  margin-bottom: 1.2em;
}

.review-text {
  font-size: 1.05em;
  line-height: 1.8;
  color: #2b2b2b;
  margin-bottom: 1.5em;
  text-indent: 0;
}

.teaser-header {
  text-align: center;
  margin-top: 10%;
  margin-bottom: 2em;
  page-break-before: always;
  break-before: page;
}

.teaser-series {
  font-size: 0.9em;
  letter-spacing: 3px;
  color: #8c7d6b;
  text-transform: uppercase;
  margin-bottom: 0.4em;
}

.teaser-title {
  font-family: 'Cinzel', Georgia, serif;
  font-size: 2.2em;
  color: #1a1a1a;
  letter-spacing: 2px;
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

</style>
</head>
<body>

<!-- Front Cover -->
${coverBase64 ? `
<div class="cover-page">
  <img src="${coverBase64}" alt="Front Cover" />
</div>
` : ''}

<!-- Title Page -->
<section class="titlepage">
  <div class="titlepage-series">${BOOK_META.series} — Book One</div>
  <h1 class="titlepage-title">${BOOK_META.title}</h1>
  <div class="titlepage-subtitle">A Biopunk Romantasy Novel</div>
  <div class="titlepage-rule"></div>
  <div class="titlepage-logline">
    "He was engineered to kill. She was bred to survive. One breathless touch that changes the sky forever."
  </div>
  <div class="titlepage-author">By ${BOOK_META.author}</div>
  <div class="titlepage-colophon">
    Chrono: Year 40 AS (2072 CE)<br />
    First Edition: October 2026<br />
    ${BOOK_META.rights}
  </div>
</section>

<!-- Copyright & Advisory -->
<section class="copyright-section">
  <h2 style="font-family: 'Cinzel', Georgia, serif; font-size: 1.3em; letter-spacing: 2px; margin-bottom: 0.2em;">${BOOK_META.title}</h2>
  <div style="color: #c49a45; font-style: italic; margin-bottom: 1.5em;">${BOOK_META.series} — Book One</div>
  <hr style="width: 50px; height: 1px; background: #c49a45; margin: 1.5em 0; border: none;" />

  <p>Copyright © 2026 by J.D. Alfaro.</p>
  <p>All rights reserved. No part of this publication may be reproduced, stored in a retrieval system, or transmitted in any form or by any means—electronic, mechanical, photocopying, recording, scanning, or otherwise—without prior written permission of the author.</p>
  <p><strong>First Edition: October 2026</strong><br />
  Published by J.D. Alfaro<br />
  Cover Art &amp; Interior Typography: The Arkun Cycle Studio</p>

  <p><strong>Publisher's Note:</strong> This novel is a work of fiction. Names, characters, places, organizations, and incidents are either the product of the author's imagination or are used fictitiously. Any resemblance to actual persons, living or dead, business establishments, events, or locales is entirely coincidental.</p>

  <div class="advisory-box">
    <div class="advisory-header">Mature Reader Guidance</div>
    <div class="advisory-rating">RATED 18+ FOR ADULT AUDIENCES</div>
    <p style="font-size: 0.9em; line-height: 1.6; margin: 0; text-indent: 0; color: #4a4237;">
      <em>Stolen Breath</em> is a high-heat biopunk romantasy written for mature audiences. It contains explicit, descriptive sexual encounters (open door), graphic fantasy violence, biological body horror, trauma recovery, high-stakes peril, and strong language. Reader discretion is advised.
    </p>
  </div>
</section>

<!-- Dedication -->
<section class="dedication-section">
  <div class="dedication-recipient">For Zuni</div>
  <div class="dedication-rule"></div>
  <p class="dedication-text">To the one who makes every breath in my life count.</p>
  <p class="dedication-text">I hope you find my devotion and love between these lines.</p>
  <p class="dedication-text">Forever will never be enough to share this life with you.</p>
  <div style="margin-top: 3em; color: #c49a45; font-size: 1.2em;">❖</div>
</section>

<!-- Chapters -->
${chapters.map(c => `
  <section class="chapter-block">
    <header class="chapter-header">
      <h1 class="chapter-title">${xmlEscape(c.displayTitle.toUpperCase())}</h1>
      ${c.displayCharacter ? `<div class="chapter-character">${xmlEscape(c.displayCharacter.toUpperCase())}</div>` : ''}
    </header>

    ${c.epigraph ? `
    <div class="epigraph-container">
      <blockquote class="epigraph-quote">${c.epigraph}</blockquote>
      ${c.epigraphDescription ? `<p class="epigraph-description">${c.epigraphDescription}</p>` : ''}
      <div class="epigraph-divider">❖ &nbsp; ❖ &nbsp; ❖</div>
    </div>
    ` : ''}

    <div class="chapter-body">
      ${c.bodyHtml}
    </div>
  </section>
`).join('\n')}

<!-- Back Matter: Acknowledgments -->
<section class="backmatter-section">
  <header class="chapter-header">
    <h1 class="chapter-title">AUTHOR'S NOTE &amp; ACKNOWLEDGMENTS</h1>
    <div class="chapter-character">J.D. ALFARO</div>
  </header>
  <div class="chapter-body" style="padding: 0 5%;">
    <p class="has-dropcap"><span class="dropcap">B</span>uilding the shattered skies and scorched dunes of Arkun began with a simple question: what happens when two engineered survivors—each weaponized by trauma, duty, and genetic design—find salvation in the very touch they were taught to fear? Bringing Tsunari and Vram's story into the world has been an exhilarating, demanding, and deeply transformative voyage.</p>
    <p>To my partner, Zuni: thank you for being my constant anchor, my first sounding board, and the quiet heart behind every word. Your faith in this world breathed life into it when the pages were dark. Every sentence carries the quiet imprint of your love.</p>
    <p>To my early readers and critique partners: thank you for challenging me to sharpen the blades, deepen the tension, and never hold back on the heat or the emotional cost. Your honest feedback helped forge <em>Stolen Breath</em> into the fierce, visceral tale it needed to be.</p>
    <p>To the vibrant Romantasy community: thank you for embracing stories where unapologetic romance and high-stakes speculative fiction collide. Readers like you make epic worlds like Arkun possible.</p>
    <p>And finally, to you—the reader: thank you for walking the dangerous catwalks of Sector 09 with Tsunari and soaring through the storm with Vram. If this story stirred your pulse, kept you reading past midnight, or made your breath catch, then every late night and rewound line was worth it.</p>
  </div>
</section>

<!-- Back Matter: Reviews -->
<section class="review-box">
  <div class="review-badge">Did Stolen Breath Steal Yours?</div>
  <div style="width: 60px; height: 2px; background: #c49a45; margin: 1.2em auto 2em auto;"></div>
  <div class="stars">★ ★ ★ ★ ★</div>
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

<!-- Back Matter: Book 2 Teaser -->
<section class="backmatter-section">
  <div class="teaser-header">
    <div class="teaser-series">${BOOK_META.series} • Book Two</div>
    <h1 class="teaser-title">Crown of Salt</h1>
    <div style="color: #c49a45; font-style: italic;">Coming Soon</div>
  </div>
  <div class="teaser-hook" style="margin-top: 2.5em; font-size: 1.1em; line-height: 1.8;">
    "Fourteen months until outdoor air kills everything that breathes. Thirty days until the glass dome of Eden Alpha becomes Sora's tomb. And eighty miles of scorching, caustic salt between the hunter and the captive."
  </div>
  <div style="text-align: center; margin-top: 3.5em; font-family: 'Cinzel', Georgia, serif; letter-spacing: 2px; color: #c49a45; font-size: 0.95em;">
    THE ARKUN CYCLE WILL RETURN IN<br />
    <strong>BOOK TWO: CROWN OF SALT</strong>
  </div>
</section>


<!-- Back Cover -->
${backCoverBase64 ? `
<div class="cover-page page-break-before">
  <img src="${backCoverBase64}" alt="Back Cover" />
</div>
` : ''}

</body>
</html>`;
}

async function compilePDF() {
  console.log('========================================================');
  console.log('⚡ THE ARKUN CYCLE — PDF COMPILER');
  console.log('========================================================');

  const files = fs.readdirSync(MANUSCRIPT_DIR)
    .filter(f => f.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  console.log(`📖 Processing ${files.length} sections for PDF generation...`);

  let chapterCounter = 0;
  let totalWords = 0;
  const chapters = files.map((file, i) => {
    const isInterlude = file.includes('interlude');
    if (!isInterlude) chapterCounter++;
    const raw = fs.readFileSync(path.join(MANUSCRIPT_DIR, file), 'utf8');
    const parsed = parseChapter(raw, file, i + 1, chapterCounter);
    totalWords += parsed.wordCount;
    return parsed;
  });

  console.log(`📊 Total Word Count: ${totalWords.toLocaleString()} words`);

  const chromePath = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  if (!fs.existsSync(chromePath)) {
    throw new Error(`Google Chrome not found at ${chromePath}`);
  }

  // 1. Generate Trade Edition (6" x 9")
  console.log('📘 Generating Trade Paperback Edition (6" x 9")...');
  const tradeHtml = generateHTML(chapters, 'trade');
  const tempTradeHtml = path.join(OUTPUT_DIR_READER, 'temp_trade_print.html');
  fs.writeFileSync(tempTradeHtml, tradeHtml, 'utf8');

  const tradePdfManuscript = path.join(OUTPUT_DIR_MANUSCRIPT, 'Stolen_Breath_Trade_6x9.pdf');
  const tradePdfReader = path.join(OUTPUT_DIR_READER, 'Stolen_Breath_Trade_6x9.pdf');

  execSync(`"${chromePath}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${tradePdfManuscript}" "${tempTradeHtml}"`);
  fs.copyFileSync(tradePdfManuscript, tradePdfReader);
  fs.unlinkSync(tempTradeHtml);

  const statsTrade = fs.statSync(tradePdfManuscript);
  const sizeMBTrade = (statsTrade.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Trade PDF created: ${tradePdfManuscript} (${sizeMBTrade} MB)`);

  // 2. Generate Editorial Manuscript Edition (8.5" x 11" Letter)
  console.log('📄 Generating Editorial Manuscript Edition (8.5" x 11" Letter)...');
  const letterHtml = generateHTML(chapters, 'letter');
  const tempLetterHtml = path.join(OUTPUT_DIR_READER, 'temp_letter_print.html');
  fs.writeFileSync(tempLetterHtml, letterHtml, 'utf8');

  const letterPdfManuscript = path.join(OUTPUT_DIR_MANUSCRIPT, 'Stolen_Breath_Editorial_Letter.pdf');
  const letterPdfReader = path.join(OUTPUT_DIR_READER, 'Stolen_Breath_Editorial_Letter.pdf');

  execSync(`"${chromePath}" --headless=new --disable-gpu --no-pdf-header-footer --print-to-pdf="${letterPdfManuscript}" "${tempLetterHtml}"`);
  fs.copyFileSync(letterPdfManuscript, letterPdfReader);
  fs.unlinkSync(tempLetterHtml);

  const statsLetter = fs.statSync(letterPdfManuscript);
  const sizeMBLetter = (statsLetter.size / (1024 * 1024)).toFixed(2);
  console.log(`✅ Editorial Letter PDF created: ${letterPdfManuscript} (${sizeMBLetter} MB)`);

  console.log('========================================================');
  console.log('🎉 ALL PDFS COMPILED SUCCESSFULLY!');
  console.log('========================================================');
}

compilePDF().catch(err => {
  console.error('❌ PDF Compilation failed:', err);
  process.exit(1);
});
