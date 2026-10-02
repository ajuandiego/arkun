/**
 * The Storm-Born Cycle — Interactive 3D Book Controller
 */

class NovelReader {
  constructor() {
    this.currentMode = localStorage.getItem('reader_mode') || 'volume'; // 'volume' | 'chapter'
    this.currentBookId = 'book1';
    this.books = [];
    this.bookMeta = {};
    this.chapters = [];
    this.currentChapterIndex = 0;
    this.pageFlip = null;
    this.chapterPageMap = []; // { chapterIndex, startPage, title }
    this.themes = ['parchment', 'ivory', 'obsidian', 'amber-haze'];
    this.themeNames = {
      'parchment': 'Imperial Parchment',
      'ivory': 'Classic Ivory',
      'obsidian': 'Obsidian Vault (Dark)',
      'amber-haze': 'Amber Haze (Sector 09)'
    };
    this.currentTheme = localStorage.getItem('reader_theme') || 'parchment';
    this.fontSizes = [15.5, 17, 18.5, 20.5];
    this.fontIndex = parseInt(localStorage.getItem('reader_font_index') || '1', 10);

    this.init();
  }

  async init() {
    this.applyTheme(this.currentTheme);
    this.applyFontSize(this.fontIndex);
    this.setupEventListeners();
    await this.loadBooksAndChapters();
    await this.renderBook();
  }

  applyTheme(theme) {
    this.currentTheme = theme;
    if (theme === 'parchment') {
      document.body.removeAttribute('data-theme');
    } else {
      document.body.setAttribute('data-theme', theme);
    }
    localStorage.setItem('reader_theme', theme);
  }

  cycleTheme() {
    const idx = (this.themes.indexOf(this.currentTheme) + 1) % this.themes.length;
    const newTheme = this.themes[idx];
    this.applyTheme(newTheme);
    this.showToast(`Theme: ${this.themeNames[newTheme]}`);
  }

  applyFontSize(idx) {
    this.fontIndex = Math.max(0, Math.min(this.fontSizes.length - 1, idx));
    const size = this.fontSizes[this.fontIndex];
    document.documentElement.style.setProperty('--font-size-base', `${size}px`);
    localStorage.setItem('reader_font_index', this.fontIndex);
  }

  async loadBooksAndChapters() {
    try {
      const bRes = await fetch('/api/books');
      this.books = await bRes.json();
      if (this.books.length > 0) {
        this.bookMeta = this.books[0];
        document.getElementById('header-series').innerText = this.bookMeta.series || 'The Storm-Born Cycle';
        document.getElementById('header-book-title').innerText = this.bookMeta.title || 'A Spark in the Rust';
      }

      const cRes = await fetch(`/api/books/${this.currentBookId}/chapters`);
      const cData = await cRes.json();
      this.chapters = cData.chapters || [];

      this.populateChapterSelect();
      this.populateDrawerTOC();
    } catch (err) {
      console.error('Failed to load books and chapters:', err);
      this.showToast('Error loading chapters.');
    }
  }

  populateChapterSelect() {
    const select = document.getElementById('chapter-select');
    select.innerHTML = '';
    this.chapters.forEach((chap, idx) => {
      const opt = document.createElement('option');
      opt.value = idx;
      opt.innerText = chap.title;
      select.appendChild(opt);
    });
    select.value = this.currentChapterIndex;
  }

  populateDrawerTOC() {
    const list = document.getElementById('drawer-chapters-list');
    list.innerHTML = '';

    this.chapters.forEach((chap, idx) => {
      const card = document.createElement('div');
      card.className = `drawer-chapter-card ${idx === this.currentChapterIndex ? 'active' : ''}`;
      card.dataset.index = idx;

      card.innerHTML = `
        <div class="drawer-card-title">${chap.title}</div>
        <div class="drawer-card-meta">
          <span>POV: ${chap.pov}</span>
          <span>•</span>
          <span>${chap.wordCount.toLocaleString()} words</span>
          <span>•</span>
          <span>${chap.readingTimeMinutes} min read</span>
        </div>
      `;

      card.addEventListener('click', () => {
        this.closeDrawer();
        if (this.currentMode === 'volume') {
          // Find start page in map
          const mapped = this.chapterPageMap.find(m => m.chapterIndex === idx);
          if (mapped && this.pageFlip) {
            this.pageFlip.turnToPage(mapped.startPage);
          }
        } else {
          this.currentChapterIndex = idx;
          document.getElementById('chapter-select').value = idx;
          this.renderBook();
        }
      });

      list.appendChild(card);
    });
  }

  calculateBookDimensions() {
    const stage = document.getElementById('book-stage');
    const availableHeight = stage.clientHeight - 40;
    const availableWidth = stage.clientWidth - 80;

    // Minimum page width 560px, maintaining realistic trade novel ratio (~1:1.44)
    const MIN_PAGE_WIDTH = 560;
    const RATIO = 1.44;

    let singleWidth = MIN_PAGE_WIDTH;

    // Scale up if plenty of room on high-res displays
    const candidateWidth = Math.floor(availableWidth / 2);
    if (candidateWidth > MIN_PAGE_WIDTH && candidateWidth * RATIO <= availableHeight) {
      singleWidth = Math.min(700, candidateWidth);
    }

    const height = Math.round(singleWidth * RATIO);

    return {
      width: singleWidth,
      height: height
    };
  }

  async renderBook() {
    const flipbookContainer = document.getElementById('flipbook');
    const bookWrapper = document.getElementById('book-wrapper');

    if (this.pageFlip) {
      try {
        this.pageFlip.destroy();
      } catch (e) {
        console.warn('Destroy error:', e);
      }
      flipbookContainer.innerHTML = '';
    }

    this.showToast('Binding pages...');

    // 1. Calculate book dimensions first so the paginator knows exact available text dimensions
    const dims = this.calculateBookDimensions();
    const totalBookWidth = dims.width * 2;

    // Explicitly set dimensions on the flipbook container
    flipbookContainer.style.width = `${totalBookWidth}px`;
    flipbookContainer.style.height = `${dims.height}px`;
    bookWrapper.style.setProperty('--single-page-width', `${dims.width}px`);

    // Available text content area:
    // Width: page width minus inner padding (36px outer + 50px spine gutter = 86px)
    const contentWidth = dims.width - 86;
    // Height: page height minus vertical chrome (top padding 34px + header 46px + footer 36px + bottom padding 30px = 146px)
    // 152px gives a safe 6px breathing margin above the footer line
    const maxBodyHeight = dims.height - 152;

    window.bookPaginator.setMeasureWidth(contentWidth);
    window.bookPaginator.setMaxPageHeight(maxBodyHeight);

    // 2. Build pages with the exact measurements
    let pagesHtml = [];
    this.chapterPageMap = [];

    if (this.currentMode === 'volume') {
      pagesHtml = await this.buildFullVolumePages();
    } else {
      pagesHtml = await this.buildSingleChapterPages(this.currentChapterIndex);
    }

    flipbookContainer.innerHTML = pagesHtml.join('\n');

    // Initialize St.PageFlip in 2-page spread mode with 560px+ width
    this.pageFlip = new St.PageFlip(flipbookContainer, {
      width: dims.width,
      height: dims.height,
      size: "fixed",
      minWidth: 560,
      maxWidth: 800,
      minHeight: 780,
      maxHeight: 1200,
      maxShadowOpacity: 0.5,
      showCover: true,
      mobileScrollSupport: false,
      usePortrait: false, // Always two-page spread
      flippingTime: 600,
      startZIndex: 5,
      drawShadow: true,
      showPageCorners: true
    });

    const pageElements = flipbookContainer.querySelectorAll('.page');
    this.pageFlip.loadFromHTML(pageElements);

    this.setupPageFlipEvents();

    // Check for saved reading position
    const savedKey = `reader_pos_${this.currentMode}_${this.currentBookId}_${this.currentChapterIndex}`;
    const savedPage = parseInt(localStorage.getItem(savedKey) || '0', 10);
    if (savedPage > 0 && savedPage < pageElements.length) {
      setTimeout(() => {
        this.pageFlip.turnToPage(savedPage);
        this.showToast(`Resumed at Page ${savedPage + 1}`);
      }, 300);
    }

    this.updateControls(0, pageElements.length);
  }

  setupPageFlipEvents() {
    this.pageFlip.on('flip', (e) => {
      const pageIndex = e.data;
      const totalPages = this.pageFlip.getPageCount();

      // Audio feedback
      window.soundEngine.playPageFlip(e.direction || 'forward');

      // Update UI
      this.updateControls(pageIndex, totalPages);

      // Save position
      const savedKey = `reader_pos_${this.currentMode}_${this.currentBookId}_${this.currentChapterIndex}`;
      localStorage.setItem(savedKey, pageIndex);
    });

    this.pageFlip.on('init', (e) => {
      this.updateControls(0, this.pageFlip.getPageCount());
    });
  }

  updateControls(currentIndex, totalPages) {
    const curEl = document.getElementById('current-page');
    const totEl = document.getElementById('total-pages');
    const scrubber = document.getElementById('page-scrubber');
    const badge = document.getElementById('chapter-badge');
    const timeLeft = document.getElementById('read-time-left');

    curEl.innerText = currentIndex + 1;
    totEl.innerText = totalPages;

    scrubber.max = totalPages - 1;
    scrubber.value = currentIndex;

    // Dynamic book stack edge thicknesses
    const stackLeft = document.getElementById('stack-left');
    const stackRight = document.getElementById('stack-right');
    const leftWidth = Math.max(2, Math.round(((currentIndex + 1) / totalPages) * 16));
    const rightWidth = Math.max(2, Math.round(((totalPages - currentIndex) / totalPages) * 16));
    stackLeft.style.width = `${leftWidth}px`;
    stackRight.style.width = `${rightWidth}px`;

    // Center closed book on front cover or back cover
    const bookWrapper = document.getElementById('book-wrapper');
    if (currentIndex === 0) {
      bookWrapper.classList.add('cover-closed-front');
      bookWrapper.classList.remove('cover-closed-back');
      stackLeft.style.opacity = '0';
      stackRight.style.opacity = '1';
    } else if (currentIndex >= totalPages - 1) {
      bookWrapper.classList.add('cover-closed-back');
      bookWrapper.classList.remove('cover-closed-front');
      stackLeft.style.opacity = '1';
      stackRight.style.opacity = '0';
    } else {
      bookWrapper.classList.remove('cover-closed-front', 'cover-closed-back');
      stackLeft.style.opacity = '1';
      stackRight.style.opacity = '1';
    }

    // Active Chapter Identification
    if (this.currentMode === 'volume') {
      let activeChap = this.chapters[0];
      for (let i = this.chapterPageMap.length - 1; i >= 0; i--) {
        if (currentIndex >= this.chapterPageMap[i].startPage) {
          activeChap = this.chapters[this.chapterPageMap[i].chapterIndex];
          break;
        }
      }
      if (activeChap) {
        badge.innerText = activeChap.title;
        const estPagesRemaining = Math.max(0, totalPages - currentIndex);
        const estMinRemaining = Math.max(1, Math.round(estPagesRemaining * 0.8));
        timeLeft.innerText = `${estMinRemaining} min left in book`;
      }
    } else {
      const chap = this.chapters[this.currentChapterIndex];
      if (chap) {
        badge.innerText = chap.title;
        const estPagesRemaining = Math.max(0, totalPages - currentIndex);
        const estMinRemaining = Math.max(1, Math.round(estPagesRemaining * 0.8));
        timeLeft.innerText = `${estMinRemaining} min left in chapter`;
      }
    }
  }

  async buildFullVolumePages() {
    const pages = [];
    const fullRes = await fetch(`/api/books/${this.currentBookId}/full`);
    const fullData = await fullRes.json();
    const allChapters = fullData.chapters || [];

    // Page 0: FRONT COVER (Hardcover, Recto)
    pages.push(`
      <div class="page page-cover-front" data-density="hard">
        <div class="cover-art-container" style="background-image: url('/assets/cover.jpg')"></div>
        <div class="cover-overlay">
          <div class="cover-filigree-border"></div>
          <div>
            <div class="cover-series-title">❖ THE STORM-BORN CYCLE ❖</div>
            <div class="cover-badge" style="margin-top: 8px;">BOOK ONE // VOLUME ARCHIVE</div>
          </div>
          <div style="flex: 1;"></div>
          <div>
            <div class="cover-author">EDEN DOME ALPHA RESTRICTED ARCHIVE</div>
            <div style="font-size: 10px; color: var(--gold-light); margin-top: 4px; letter-spacing: 2px;">YEAR 40 AS // 2072 CE</div>
          </div>
        </div>
      </div>
    `);

    // Page 1: INSIDE FRONT COVER (Hardcover marbled endpaper, Verso)
    pages.push(`
      <div class="page page-endpaper page-verso" data-density="hard">
        <div class="page-gutter-shadow"></div>
      </div>
    `);

    // Page 2: HALF TITLE & COLOPHON (Soft, Recto)
    pages.push(`
      <div class="page page-recto" data-density="soft">
        <div class="page-inner page-title-spread">
          <div class="page-gutter-shadow"></div>
          <div class="title-page-crest">❖</div>
          <div class="title-page-series">The Storm-Born Cycle // Series Classification</div>
          <div style="font-family: var(--font-display); font-size: 13px; color: var(--text-secondary); margin-bottom: 20px;">DIRECTORATE ARCHIVE CLEARANCE: LEVEL 9</div>
          <p style="font-family: var(--font-serif); font-size: 12.5px; line-height: 1.6; color: var(--text-secondary); max-width: 300px; text-align: center;">
            This volume contains declassified neural data streams, intercepted Vaelen transmissions, and personal audio transcripts recovered from the Sector 09 perimeter conduit incident.
          </p>
          <div class="colophon-meta">
            FIRST EDITION • PUBLISHED IN EDEN DOME ALPHA<br>
            CHRONO: 40 YEARS AFTER THE STORM<br>
            RESTRICTED DISTRIBUTION TO BASELINE BIOLOGY
          </div>
        </div>
      </div>
    `);

    // Page 3: FULL TITLE PAGE (Soft, Verso)
    pages.push(`
      <div class="page page-verso" data-density="soft">
        <div class="page-inner page-title-spread">
          <div class="page-gutter-shadow"></div>
          <div class="title-page-series">THE STORM-BORN CYCLE — BOOK 1</div>
          <div class="title-page-main">A SPARK IN THE RUST</div>
          <div class="title-page-rule"></div>
          <div class="title-page-logline">
            "A hunted hacker with sickle-claw reflexes. A winged soldier with a burning fever. One touch that changes the fate of Earth."
          </div>
          <div style="font-family: var(--font-display); font-size: 11px; letter-spacing: 3px; color: var(--gold-accent);">
            THE COMPLETE TEN-CHAPTER VOLUME
          </div>
        </div>
      </div>
    `);

    // Page 4: TABLE OF CONTENTS (Placeholder, Recto)
    let tocPlaceholderIndex = pages.length;
    pages.push(''); // Reserved for TOC spread

    // Page 5: DRAMATIS PERSONAE / WORLD OVERVIEW (Soft, Verso)
    pages.push(`
      <div class="page page-verso" data-density="soft">
        <div class="page-inner">
          <div class="page-gutter-shadow"></div>
          <header class="page-header">
            <span class="header-series">THE STORM-BORN CYCLE // DOSSIER</span>
          </header>
          <main class="page-body" style="font-size: 13.5px; line-height: 1.55;">
            <h2 style="text-align: center; margin-bottom: 14px;">DRAMATIS PERSONAE</h2>
            <p><strong>Dr. Tsunari Thorne</strong> — Field bio-hacker of Sector 09. Dromaeon spliced with sickle-claw reflexes and sensory syrinx. Keeper of the stolen <em>Lazarus Key</em>.</p>
            <p style="margin-top: 10px;"><strong>Commander Vram Tyage</strong> — Aeros-Legion 7 Supreme Commander. Simurgh-spliced chimeric warrior with hollow titanium bones, 14-foot primary quills, and a burning 106°F solar furnace.</p>
            <p style="margin-top: 10px;"><strong>Director Corvus</strong> — Overseer of Eden Dome Alpha Culture Labs and the atmospheric terraforming initiative.</p>
            <p style="margin-top: 10px;"><strong>The Vaelen</strong> — Extraterrestrial oligarchs occupying the upper mesospheric Spires, methodically siphoning human air.</p>
          </main>
          <footer class="page-footer">
            <span class="page-number">v</span>
            <span class="footer-fleuron">✦</span>
            <span></span>
          </footer>
        </div>
      </div>
    `);

    // Page 6+: PAGINATE ALL CHAPTERS (Starting on Page 6, Recto)
    let currentGlobalPage = 1;

    for (let c = 0; c < allChapters.length; c++) {
      const chap = allChapters[c];

      // Ensure every chapter starts on a Recto page (even index in StPageFlip)
      if (pages.length % 2 !== 0) {
        pages.push(`
          <div class="page page-verso" data-density="soft">
            <div class="page-inner" style="display: flex; align-items: center; justify-content: center;">
              <div class="page-gutter-shadow"></div>
              <div style="color: var(--text-dim); font-size: 16px;">❖</div>
            </div>
          </div>
        `);
      }

      this.chapterPageMap.push({
        chapterIndex: c,
        startPage: pages.length,
        title: chap.title,
        pov: chap.pov,
        bookPageNum: currentGlobalPage
      });

      // Prepare chapter header & epigraph
      let chapterHtml = `
        <div class="chapter-start-banner">
          <div style="font-family: var(--font-display); font-size: 11px; letter-spacing: 3px; color: var(--gold-accent); text-align: center; margin-bottom: 4px;">
            ${chap.title.toUpperCase()}
          </div>
          <div style="font-size: 11px; color: var(--text-dim); text-align: center; margin-bottom: 12px;">
            POINT OF VIEW // ${chap.pov.toUpperCase()}
          </div>
        </div>
      `;

      if (chap.epigraph) {
        chapterHtml += `<blockquote>${chap.epigraph}</blockquote><hr>`;
      }

      // Add chapter narrative body
      const cleanNarrativeHtml = chap.html
        .replace(/<h1[^>]*>.*?<\/h1>/i, '') // remove markdown h1
        .replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/i, '') // remove epigraph quote (already handled)
        .replace(/<hr\s*\/?>/i, '');

      chapterHtml += cleanNarrativeHtml;

      const paginatedPages = window.bookPaginator.paginateHtml(chapterHtml, {
        bookTitle: 'THE STORM-BORN CYCLE',
        chapterTitle: chap.title
      }, currentGlobalPage, pages.length);

      pages.push(...paginatedPages);
      currentGlobalPage += paginatedPages.length;
    }

    // Now inject the rendered Table of Contents on Page 4
    const tocItemsHtml = this.chapterPageMap.map(m => `
      <li class="toc-item" onclick="window.novelReader.jumpToPage(${m.startPage})">
        <span class="toc-chapter-name">${m.title}</span>
        <span class="toc-pov-tag">${m.pov}</span>
        <span class="toc-dots"></span>
        <span class="toc-page-num">${m.bookPageNum}</span>
      </li>
    `).join('\n');

    pages[tocPlaceholderIndex] = `
      <div class="page toc-page page-recto" data-density="soft">
        <div class="page-inner">
          <div class="page-gutter-shadow"></div>
          <h2 class="toc-title">TABLE OF CONTENTS</h2>
          <ul class="toc-list">
            ${tocItemsHtml}
          </ul>
        </div>
      </div>
    `;

    // 7. BOOK 2 TEASER / EPILOGUE (Soft)
    pages.push(`
      <div class="page page-verso" data-density="soft">
        <div class="page-inner page-title-spread">
          <div class="title-page-crest">❖</div>
          <div class="title-page-series">THE STORM-BORN CYCLE — BOOK TWO</div>
          <div class="title-page-main" style="font-size: 20px;">THE IRON CHRYSALIS</div>
          <div class="title-page-rule"></div>
          <p style="font-family: var(--font-serif); font-size: 13px; line-height: 1.6; color: var(--text-secondary); text-align: center; max-width: 320px;">
            "To save a dying planet, they must cross the burning wastelands. But the deepest enemy wears the face of the family they trust."
          </p>
          <div style="font-family: var(--font-display); font-size: 11px; letter-spacing: 2px; color: var(--gold-accent); margin-top: 24px;">
            CONTINUE THE REBELLION IN VOLUME TWO
          </div>
        </div>
      </div>
    `);

    // 8. INSIDE BACK COVER (Hardcover marbled endpaper)
    pages.push(`
      <div class="page page-endpaper" data-density="hard"></div>
    `);

    // 9. BACK COVER (Hardcover)
    pages.push(`
      <div class="page page-cover-back" data-density="hard">
        <div class="cover-filigree-border"></div>
        <div class="back-blurb">
          <h3>A SPARK IN THE RUST</h3>
          <p style="margin-bottom: 12px;">
            In Year 40 AS, Earth belongs to an alien empire that bought the atmosphere from corporate oligarchs and is systematically phasing out human air.
          </p>
          <p style="margin-bottom: 12px;">
            When rogue Dromaeon-spliced bio-hacker <strong>Dr. Tsunari Thorne</strong> steals the mathematical proof of humanity's impending extinction, the regime unleashes its supreme weapon: <strong>Commander Vram Tyage</strong>, a Simurgh-spliced soldier burning with a lethal 106°F solar furnace.
          </p>
          <p>
            Forced into a volatile rogue alliance after crashing into the feral Rust Barrens, the two lethal combatants must survive wild transgenic packs, defect from an empire, and defend the ancient secrets of The Glass Vault before the sky turns to ash.
          </p>
        </div>
        <div class="back-barcode">
          <div class="barcode-lines">|||||| | ||||| |||| | |||||</div>
          <div class="isbn-meta">
            VAELEN ARCHIVE: 978-0-9842-072-1<br>
            CATEGORY: BIOPUNK ROMANTASY
          </div>
        </div>
      </div>
    `);

    return pages;
  }

  async buildSingleChapterPages(chapterIndex) {
    const chapMeta = this.chapters[chapterIndex];
    const chapRes = await fetch(`/api/books/${this.currentBookId}/chapter/${chapMeta.filename}`);
    const chapData = await chapRes.json();

    const pages = [];

    // Front Cover (Page 0, Recto)
    pages.push(`
      <div class="page page-cover-front" data-density="hard">
        <div class="cover-art-container" style="background-image: url('/assets/cover.jpg')"></div>
        <div class="cover-overlay">
          <div class="cover-filigree-border"></div>
          <div>
            <div class="cover-series-title">❖ THE STORM-BORN CYCLE ❖</div>
            <div class="cover-badge" style="margin-top: 6px;">${chapData.title.toUpperCase()}</div>
          </div>
          <div style="flex: 1;"></div>
          <div>
            <div class="cover-author">POV // ${chapData.pov.toUpperCase()}</div>
            <div style="font-size: 10px; color: var(--gold-light); margin-top: 4px;">${chapData.wordCount.toLocaleString()} WORDS • ${chapData.readingTimeMinutes} MIN READ</div>
          </div>
        </div>
      </div>
    `);

    // Inside Front (Page 1, Verso)
    pages.push(`
      <div class="page page-endpaper page-verso" data-density="hard">
        <div class="page-gutter-shadow"></div>
      </div>
    `);

    // Title / Epigraph page
    let chapterHtml = `
      <div class="chapter-start-banner" style="text-align: center; margin-bottom: 20px;">
        <h1 style="font-family: var(--font-display); font-size: 22px; color: var(--text-primary); margin-bottom: 6px;">
          ${chapData.title}
        </h1>
        <div style="font-family: var(--font-ui); font-size: 12px; color: var(--gold-accent); letter-spacing: 2px;">
          POINT OF VIEW // ${chapData.pov.toUpperCase()}
        </div>
      </div>
    `;

    if (chapData.epigraph) {
      chapterHtml += `<blockquote>${chapData.epigraph}</blockquote><hr>`;
    }

    const cleanNarrativeHtml = chapData.html
      .replace(/<h1[^>]*>.*?<\/h1>/i, '')
      .replace(/<blockquote[^>]*>[\s\S]*?<\/blockquote>/i, '')
      .replace(/<hr\s*\/?>/i, '');

    chapterHtml += cleanNarrativeHtml;

    const paginated = window.bookPaginator.paginateHtml(chapterHtml, {
      bookTitle: 'A SPARK IN THE RUST',
      chapterTitle: chapData.title
    }, 1, pages.length);

    pages.push(...paginated);

    // Inside Back
    pages.push(`
      <div class="page page-endpaper" data-density="hard"></div>
    `);

    // Back Cover
    const nextChap = this.chapters[chapterIndex + 1];
    pages.push(`
      <div class="page page-cover-back" data-density="hard">
        <div class="cover-filigree-border"></div>
        <div class="back-blurb">
          <h3>CHAPTER COMPLETE</h3>
          <p style="margin-bottom: 16px;">
            You have reached the end of <strong>${chapData.title}</strong>.
          </p>
          ${nextChap ? `
            <div style="background: rgba(196, 154, 69, 0.15); border: 1px solid var(--gold-accent); border-radius: 8px; padding: 14px; text-align: center; margin-top: 20px;">
              <div style="font-size: 11px; letter-spacing: 2px; color: var(--gold-light); margin-bottom: 6px;">UP NEXT</div>
              <div style="font-family: var(--font-display); font-size: 15px; font-weight: 700; color: #fff; margin-bottom: 10px;">${nextChap.title}</div>
              <button onclick="window.novelReader.loadChapter(${chapterIndex + 1})" class="mode-btn active" style="padding: 6px 16px; cursor: pointer;">
                Begin Next Chapter ➔
              </button>
            </div>
          ` : `
            <p style="text-align: center; color: var(--gold-light);">You have finished Book 1: A Spark in the Rust.</p>
          `}
        </div>
        <div class="back-barcode">
          <div class="barcode-lines">|||| ||| ||||||| |||</div>
          <div class="isbn-meta">THE STORM-BORN CYCLE</div>
        </div>
      </div>
    `);

    return pages;
  }

  jumpToPage(pageNum) {
    if (this.pageFlip) {
      this.pageFlip.turnToPage(pageNum);
    }
  }

  loadChapter(idx) {
    if (idx >= 0 && idx < this.chapters.length) {
      this.currentChapterIndex = idx;
      document.getElementById('chapter-select').value = idx;
      if (this.currentMode === 'volume') {
        const mapped = this.chapterPageMap.find(m => m.chapterIndex === idx);
        if (mapped && this.pageFlip) {
          this.pageFlip.turnToPage(mapped.startPage);
          return;
        }
      }
      this.renderBook();
    }
  }

  setupEventListeners() {
    // Mode toggle
    const volBtn = document.getElementById('mode-volume');
    const chapBtn = document.getElementById('mode-chapter');

    volBtn.addEventListener('click', () => {
      if (this.currentMode !== 'volume') {
        this.currentMode = 'volume';
        volBtn.classList.add('active');
        chapBtn.classList.remove('active');
        localStorage.setItem('reader_mode', 'volume');
        this.renderBook();
      }
    });

    chapBtn.addEventListener('click', () => {
      if (this.currentMode !== 'chapter') {
        this.currentMode = 'chapter';
        chapBtn.classList.add('active');
        volBtn.classList.remove('active');
        localStorage.setItem('reader_mode', 'chapter');
        this.renderBook();
      }
    });

    if (this.currentMode === 'chapter') {
      chapBtn.classList.add('active');
      volBtn.classList.remove('active');
    } else {
      volBtn.classList.add('active');
      chapBtn.classList.remove('active');
    }

    // Chapter Select dropdown
    document.getElementById('chapter-select').addEventListener('change', (e) => {
      const idx = parseInt(e.target.value, 10);
      this.loadChapter(idx);
    });

    // Navigation arrows
    document.getElementById('btn-prev').addEventListener('click', () => {
      if (this.pageFlip) this.pageFlip.flipPrev();
    });

    document.getElementById('btn-next').addEventListener('click', () => {
      if (this.pageFlip) this.pageFlip.flipNext();
    });

    // Scrubber
    document.getElementById('page-scrubber').addEventListener('input', (e) => {
      const targetPage = parseInt(e.target.value, 10);
      if (this.pageFlip) {
        this.pageFlip.turnToPage(targetPage);
      }
    });

    // Theme toggle button
    document.getElementById('btn-theme').addEventListener('click', () => {
      this.cycleTheme();
    });

    // Font size controls
    document.getElementById('btn-font-dec').addEventListener('click', () => {
      this.applyFontSize(this.fontIndex - 1);
      this.showToast(`Font Size: ${this.fontSizes[this.fontIndex]}px`);
      this.renderBook();
    });

    document.getElementById('btn-font-inc').addEventListener('click', () => {
      this.applyFontSize(this.fontIndex + 1);
      this.showToast(`Font Size: ${this.fontSizes[this.fontIndex]}px`);
      this.renderBook();
    });

    // Audio toggle
    const audioBtn = document.getElementById('btn-audio');
    const audioIcon = document.getElementById('audio-icon');
    audioBtn.addEventListener('click', () => {
      const enabled = window.soundEngine.toggle();
      audioIcon.innerText = enabled ? '🔊' : '🔇';
      audioBtn.classList.toggle('active', enabled);
      this.showToast(enabled ? 'Page Flip Sound: On' : 'Page Flip Sound: Muted');
    });

    // Table of Contents Drawer
    document.getElementById('btn-toc').addEventListener('click', () => {
      this.openDrawer();
    });

    document.getElementById('drawer-close').addEventListener('click', () => {
      this.closeDrawer();
    });

    document.getElementById('toc-backdrop').addEventListener('click', (e) => {
      if (e.target.id === 'toc-backdrop') {
        this.closeDrawer();
      }
    });

    // Shortcuts modal
    document.getElementById('btn-help').addEventListener('click', () => {
      document.getElementById('shortcuts-modal').classList.add('open');
    });

    document.getElementById('modal-close-btn').addEventListener('click', () => {
      document.getElementById('shortcuts-modal').classList.remove('open');
    });

    document.getElementById('shortcuts-modal').addEventListener('click', (e) => {
      if (e.target.id === 'shortcuts-modal') {
        document.getElementById('shortcuts-modal').classList.remove('open');
      }
    });

    // Fullscreen toggle
    document.getElementById('btn-fullscreen').addEventListener('click', () => {
      this.toggleFullscreen();
    });

    // Global Keyboard Navigation
    window.addEventListener('keydown', (e) => {
      // Don't trigger shortcuts if focus is inside an input or select
      if (['input', 'select', 'textarea'].includes(document.activeElement.tagName.toLowerCase())) {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
        case 'l':
        case 'PageDown':
          e.preventDefault();
          if (this.pageFlip) this.pageFlip.flipNext();
          break;
        case 'ArrowLeft':
        case 'j':
        case 'PageUp':
          e.preventDefault();
          if (this.pageFlip) this.pageFlip.flipPrev();
          break;
        case 't':
        case 'T':
          this.toggleDrawer();
          break;
        case 'm':
        case 'M':
          document.getElementById('btn-audio').click();
          break;
        case 'c':
        case 'C':
          this.cycleTheme();
          break;
        case 'f':
        case 'F':
          this.toggleFullscreen();
          break;
        case 'Escape':
          this.closeDrawer();
          document.getElementById('shortcuts-modal').classList.remove('open');
          break;
      }
    });

    // Window Resize debounce
    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        if (this.pageFlip) {
          const dims = this.calculateBookDimensions();
          // Update container dimensions
          this.renderBook();
        }
      }, 350);
    });
  }

  toggleDrawer() {
    const backdrop = document.getElementById('toc-backdrop');
    backdrop.classList.toggle('open');
  }

  openDrawer() {
    document.getElementById('toc-backdrop').classList.add('open');
  }

  closeDrawer() {
    document.getElementById('toc-backdrop').classList.remove('open');
  }

  toggleFullscreen() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch((err) => {
        console.warn('Fullscreen request failed:', err);
      });
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
  }

  showToast(message) {
    const toast = document.getElementById('reader-toast');
    toast.innerText = message;
    toast.classList.add('visible');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      toast.classList.remove('visible');
    }, 2400);
  }
}

// Global initialization
window.addEventListener('DOMContentLoaded', () => {
  window.novelReader = new NovelReader();
});
