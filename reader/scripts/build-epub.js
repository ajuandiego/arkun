/**
 * Markdown to EPUB3 Compiler for The Arkun Cycle
 * Generates an official, validated EPUB3 ebook file from manuscript markdown chapters.
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');
const JSZip = require('jszip');

// Configure marked
marked.setOptions({
  gfm: true,
  breaks: true
});

const ROOT_DIR = path.resolve(__dirname, '../..');
const MANUSCRIPT_DIR = path.join(ROOT_DIR, '09_manuscript', 'book1');
const OUTPUT_DIR = path.join(__dirname, '..', 'books', 'book1');
const COVER_PATH = path.join(__dirname, '..', 'public', 'assets', 'cover.jpg');

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
  description: 'In a world choked by copper dust, every breath has a price. High above the toxic smog of Dome Alpha, Lord Vram commands the sky with wings built for war, while a lethal electrical storm consumes his mind. In the rust-slicked alleys below, Tsunari survives by her claws. When they meet, her touch acts as a living ground wire—silencing his agony and sparking an alliance that will tear the sky apart.',
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

// Parse individual markdown chapter
function parseChapter(rawMarkdown, filename, index) {
  const lines = rawMarkdown.split('\n');
  let title = `Chapter ${index}`;
  let pov = 'Omniscient';
  let epigraph = '';

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
    epigraphDescription = quoteLines.slice(0, 1).join(' '); //should be the first element of quoteLines array
    epigraph = quoteLines.slice(1).join(' '); //should be the rest of the elements of quoteLines array
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
    filename,
    title,
    pov,
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

.chapter-number {
  font-size: 0.9em;
  letter-spacing: 3px;
  color: #8c7d6b;
  text-transform: uppercase;
  margin-bottom: 0.4em;
}

.chapter-title {
  font-size: 1.8em;
  color: #1a1a1a;
  margin: 0.2em 0 0.4em 0;
}

.chapter-pov {
  font-size: 0.85em;
  letter-spacing: 2px;
  color: #c49a45;
  text-transform: uppercase;
  font-weight: 600;
}

/* Epigraph / Audio Logs / Codex */
aside.doc-epigraph, .epigraph-box {
  margin: 2em 1.5em 2.5em 1.5em;
  padding: 1em 1.4em;
  border-left: 3px solid #c49a45;
  background: #fbf9f4;
  font-style: italic;
  font-size: 0.92em;
  line-height: 1.55;
  color: #4a4237;
  page-break-inside: avoid;
  break-inside: avoid;
}

.epigraph-label {
  font-style: normal;
  font-size: 0.78em;
  letter-spacing: 1.5px;
  text-transform: uppercase;
  color: #8c7d6b;
  margin-bottom: 0.6em;
  font-weight: 600;
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

/* Monospace Terminal Code */
pre, code {
  font-family: "Courier New", Courier, monospace;
  font-size: 0.88em;
}

pre {
  background: #f4f2ee;
  border: 1px solid #e2ddd5;
  padding: 0.8em 1em;
  margin: 1.4em 0;
  border-radius: 4px;
  overflow-x: auto;
  white-space: pre-wrap;
  word-wrap: break-word;
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
`;
}

// Generate XHTML for Chapter
function generateChapterXHTML(chapter) {
  return `<?xml version="1.0" encoding="utf-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="en" lang="en">
<head>
  <meta charset="utf-8" />
  <title>${xmlEscape(chapter.title)} — ${xmlEscape(BOOK_META.title)}</title>
  <link rel="stylesheet" type="text/css" href="../styles/book.css" />
</head>
<body epub:type="bodymatter">
  <section role="doc-chapter" epub:type="chapter" class="chapter chapter-${chapter.index}">
    <header class="chapter-header">
      <div class="chapter-number">Chapter ${chapter.index}</div>
      <h1 class="chapter-title">${xmlEscape(chapter.title)}</h1>
      <div class="chapter-pov">Point of View // ${xmlEscape(chapter.pov)}</div>
    </header>

    ${chapter.epigraph ? `
    <aside role="doc-epigraph" epub:type="epigraph" class="doc-epigraph">
      <div class="epigraph-label">${chapter.pov.toLowerCase().includes('vram') ? 'Tactical Dossier // Codex' : 'Neural Intercept // Audio Log'}</div>
      <blockquote>${chapter.epigraph}</blockquote>
      <p class="epigraph-description">${chapter.epigraphDescription}</p>
    </aside>
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
      "A hunted hacker with sickle-claw reflexes. A winged soldier with a burning fever. One touch that changes the fate of Earth."
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

// Generate EPUB2 NCX (nav.ncx) for backwards compatibility
function generateNCX(chapters) {
  let playOrder = 1;
  const navPoints = [];

  navPoints.push(`
    <navPoint id="np-title" playOrder="${playOrder++}">
      <navLabel><text>Title Page</text></navLabel>
      <content src="titlepage.xhtml"/>
    </navPoint>
  `);

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
function generateOPF(chapters) {
  const manifestItems = [
    `<item id="ncx" href="nav.ncx" media-type="application/x-dtbncx+xml"/>`,
    `<item id="style" href="styles/book.css" media-type="text/css"/>`,
    `<item id="cover-image" href="assets/cover.jpg" media-type="image/jpeg" properties="cover-image"/>`,
    `<item id="cover" href="cover.xhtml" media-type="application/xhtml+xml"/>`,
    `<item id="titlepage" href="titlepage.xhtml" media-type="application/xhtml+xml"/>`,
  ];

  const spineItems = [
    `<itemref idref="cover" linear="no"/>`,
    `<itemref idref="titlepage"/>`,
    `<itemref idref="dossier"/>`,
  ];

  chapters.forEach(c => {
    const id = `chap_${String(c.index).padStart(2, '0')}`;
    const href = `chapters/chapter_${String(c.index).padStart(2, '0')}.xhtml`;
    manifestItems.push(`<item id="${id}" href="${href}" media-type="application/xhtml+xml"/>`);
    spineItems.push(`<itemref idref="${id}"/>`);
  });

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

  // 1. Read Manuscript Chapters
  if (!fs.existsSync(MANUSCRIPT_DIR)) {
    throw new Error(`Manuscript directory not found at: ${MANUSCRIPT_DIR}`);
  }

  const files = fs.readdirSync(MANUSCRIPT_DIR)
    .filter(f => f.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  console.log(`📖 Found ${files.length} chapters in ${MANUSCRIPT_DIR}`);

  let totalWords = 0;
  const chapters = files.map((file, i) => {
    const raw = fs.readFileSync(path.join(MANUSCRIPT_DIR, file), 'utf8');
    const parsed = parseChapter(raw, file, i + 1);
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

  // Cover image
  let coverData = null;
  if (fs.existsSync(COVER_PATH)) {
    coverData = fs.readFileSync(COVER_PATH);
    zip.file('OEBPS/assets/cover.jpg', coverData);
  } else {
    console.warn('⚠️ Cover image not found at', COVER_PATH);
  }

  // Cover & Frontmatter XHTML
  zip.file('OEBPS/cover.xhtml', generateCoverXHTML());
  zip.file('OEBPS/titlepage.xhtml', generateTitlePageXHTML());

  // Chapters XHTML
  chapters.forEach(c => {
    const filename = `chapter_${String(c.index).padStart(2, '0')}.xhtml`;
    const xhtml = generateChapterXHTML(c);
    zip.file(`OEBPS/chapters/${filename}`, xhtml);
  });

  // Navigation
  zip.file('OEBPS/nav.ncx', generateNCX(chapters));

  // OPF Package Document
  zip.file('OEBPS/content.opf', generateOPF(chapters));

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
  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'cover.xhtml'), generateCoverXHTML());
  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'titlepage.xhtml'), generateTitlePageXHTML());
  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'nav.ncx'), generateNCX(chapters));
  fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'content.opf'), generateOPF(chapters));

  chapters.forEach(c => {
    const filename = `chapter_${String(c.index).padStart(2, '0')}.xhtml`;
    fs.writeFileSync(path.join(EPUB_SOURCE_DIR, 'OEBPS', 'chapters', filename), generateChapterXHTML(c));
  });

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
