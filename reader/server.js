const express = require('express');
const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

// Configure marked options with Biopunk Terminal Renderer
const terminalRenderer = {
  code({ text }) {
    return `<div class="terminal-panel"><div class="terminal-header"><span class="terminal-status-dot">●</span> console.out</div><pre class="terminal-body"><code>${text}</code></pre></div>\n\n`;
  }
};

marked.use({
  gfm: true,
  breaks: true,
  renderer: terminalRenderer
});

const app = express();
// Default to non-typical port 7429 to avoid collision with standard 3000/8080/5173/etc
const PORT = parseInt(process.env.PORT, 10) || 7429;

const ROOT_DIR = path.resolve(__dirname, '..');
const MANUSCRIPT_DIR = path.join(ROOT_DIR, '09_manuscript');

// Serve vendor files (e.g. page-flip)
app.use('/vendor/page-flip.browser.js', (req, res) => {
  const pageFlipPath = path.join(__dirname, 'node_modules/page-flip/dist/js/page-flip.browser.js');
  res.sendFile(pageFlipPath);
});

// Serve static assets from public/
app.use(express.static(path.join(__dirname, 'public')));

// Helper to count words
function countWords(str) {
  return (str || '').trim().split(/\s+/).filter(Boolean).length;
}

// Split a chapter's opening quote into the passage and its source line.
// Source lines either lead the quote (audio-log headers) or follow it (em-dash attributions).
function splitEpigraph(quoteLines) {
  const lines = quoteLines.map(line => line.trim()).filter(Boolean);
  if (lines.length === 0) {
    return { epigraph: '', epigraphDescription: '' };
  }
  if (lines.length === 1) {
    return { epigraph: lines[0], epigraphDescription: '' };
  }

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

function renderEpigraphHtml(markdown) {
  if (!markdown) return '';
  return marked.parseInline(markdown);
}

// Helper to parse chapter info
function parseChapterMetadata(rawContent, filename) {
  const lines = rawContent.split('\n');
  let title = filename.replace(/\.md$/, '').replace(/_/g, ' ');
  let pov = 'Omniscient';
  let epigraph = '';
  let epigraphDescription = '';

  // Check first header
  for (let i = 0; i < Math.min(lines.length, 10); i++) {
    const line = lines[i].trim();
    if (line.startsWith('# ')) {
      title = line.replace(/^#\s*/, '').trim();
      if (title.includes('//')) {
        const parts = title.split('//').map(p => p.trim());
        pov = parts[1] || pov;
      }
      break;
    }
  }

  // Check for blockquote epigraph
  let inQuote = false;
  let quoteLines = [];
  for (let i = 0; i < Math.min(lines.length, 25); i++) {
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
    epigraph = renderEpigraphHtml(split.epigraph);
    epigraphDescription = renderEpigraphHtml(split.epigraphDescription);
  }

  const words = countWords(rawContent);
  const readingTimeMinutes = Math.max(1, Math.round(words / 220));
  const isInterlude = filename.includes('interlude') || filename.includes('addendum') || pov.toLowerCase() === 'interlude';

  return {
    filename,
    title,
    pov,
    epigraph,
    epigraphDescription,
    wordCount: words,
    readingTimeMinutes,
    isInterlude
  };
}

// Get Book metadata
function getBookInfo(bookId = 'book1') {
  let title = 'Book 1: Stolen Breath';
  let series = 'The Arkun Cycle';
  let tagline = 'In a world choked by copper dust, every breath has a price. One touch that changes the fate of Earth.';
  let synopsis = 'High above the toxic smog of Dome Alpha, Lord Vram commands the sky with wings built for war, while a lethal electrical storm consumes his mind. In the rust-slicked alleys below, Tsunari survives by her claws. When they meet, her touch acts as a living ground wire—silencing his agony and sparking an alliance that will tear the sky apart.';

  const pitchFile = path.join(ROOT_DIR, 'pitch.md');
  if (fs.existsSync(pitchFile)) {
    try {
      const pitchText = fs.readFileSync(pitchFile, 'utf8');
      if (pitchText.includes('Book 1: *Stolen Breath*')) {
        title = 'Book 1: Stolen Breath';
      }
    } catch (e) {
      console.warn('Could not read pitch.md:', e.message);
    }
  }

  return {
    id: bookId,
    title,
    series,
    tagline,
    synopsis,
    author: 'J.D. Alfaro',
    year: '40 AS (2072 CE)'
  };
}

// API: List books
app.get('/api/books', (req, res) => {
  try {
    if (!fs.existsSync(MANUSCRIPT_DIR)) {
      return res.json([]);
    }
    const entries = fs.readdirSync(MANUSCRIPT_DIR, { withFileTypes: true });
    const books = entries
      .filter(e => e.isDirectory())
      .map(e => {
        const bookInfo = getBookInfo(e.name);
        const bookPath = path.join(MANUSCRIPT_DIR, e.name);
        const chapterFiles = fs.readdirSync(bookPath).filter(f => f.endsWith('.md'));
        return {
          ...bookInfo,
          chapterCount: chapterFiles.length
        };
      });
    res.json(books);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Helper to get ordered manuscript files (natural alphabetical sort with chapter_XXb_addendum_XX)
function getOrderedManuscriptFiles(bookDir) {
  if (!fs.existsSync(bookDir)) return [];
  const files = fs.readdirSync(bookDir).filter(f => f.endsWith('.md'));
  
  // Natural sort cleanly puts chapter_10b_addendum_01 between chapter_10 and chapter_11
  return files.sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

// API: List chapters for a book
app.get('/api/books/:bookId/chapters', (req, res) => {
  const { bookId } = req.params;
  const bookDir = path.join(MANUSCRIPT_DIR, bookId);

  if (!fs.existsSync(bookDir)) {
    return res.status(404).json({ error: `Book '${bookId}' not found.` });
  }

  try {
    const files = getOrderedManuscriptFiles(bookDir);

    const chapters = files.map((filename, index) => {
      const fullPath = path.join(bookDir, filename);
      const content = fs.readFileSync(fullPath, 'utf8');
      const meta = parseChapterMetadata(content, filename);
      return {
        index: index + 1,
        ...meta
      };
    });

    res.json({
      book: getBookInfo(bookId),
      chapters
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get single chapter with HTML & Markdown
app.get('/api/books/:bookId/chapter/:filename', (req, res) => {
  const { bookId, filename } = req.params;
  const safeFilename = path.basename(filename);
  const chapterPath = path.join(MANUSCRIPT_DIR, bookId, safeFilename);

  if (!fs.existsSync(chapterPath)) {
    return res.status(404).json({ error: `Chapter '${safeFilename}' not found.` });
  }

  try {
    const rawMarkdown = fs.readFileSync(chapterPath, 'utf8');
    const meta = parseChapterMetadata(rawMarkdown, safeFilename);
    const html = marked.parse(rawMarkdown);

    res.json({
      ...meta,
      html,
      rawMarkdown
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Get all chapters for a book combined (for Full Volume reading)
app.get('/api/books/:bookId/full', (req, res) => {
  const { bookId } = req.params;
  const bookDir = path.join(MANUSCRIPT_DIR, bookId);

  if (!fs.existsSync(bookDir)) {
    return res.status(404).json({ error: `Book '${bookId}' not found.` });
  }

  try {
    const files = getOrderedManuscriptFiles(bookDir);

    let totalWords = 0;
    const chapters = files.map((filename, index) => {
      const fullPath = path.join(bookDir, filename);
      const rawMarkdown = fs.readFileSync(fullPath, 'utf8');
      const meta = parseChapterMetadata(rawMarkdown, filename);
      totalWords += meta.wordCount;
      const html = marked.parse(rawMarkdown);
      return {
        index: index + 1,
        ...meta,
        html
      };
    });

    res.json({
      book: getBookInfo(bookId),
      totalWords,
      totalReadingTimeMinutes: Math.round(totalWords / 220),
      chapters
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Download compiled EPUB3 file
app.get('/api/books/:bookId/download/epub', (req, res) => {
  const { bookId } = req.params;
  const epubPath = path.join(__dirname, 'books', bookId, 'Stolen_Breath.epub');

  if (fs.existsSync(epubPath)) {
    res.download(epubPath, 'Stolen_Breath.epub');
  } else {
    res.status(404).json({ error: 'EPUB file not found. Run npm run build:epub first.' });
  }
});

// Fallback to index.html for SPA routes
app.use((req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start the server
app.listen(PORT, '0.0.0.0', () => {
  console.log('====================================================');
  console.log('📖 THE ARKUN CYCLE — 3D BOOK SIMULATION READER');
  console.log('----------------------------------------------------');
  console.log(`🚀 Serving on non-typical port: ${PORT}`);
  console.log(`🌐 Local URL:  http://localhost:${PORT}`);
  console.log(`📚 Manuscripts: ${MANUSCRIPT_DIR}`);
  console.log('====================================================');
});
