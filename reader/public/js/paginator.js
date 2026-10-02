/**
 * Book Paginator Engine
 * Converts raw Markdown / HTML into authentic book pages with drop caps,
 * running headers, outer page numbers, and spine gutter shadows.
 *
 * Ensures pages are richly packed with text all the way to the bottom margin,
 * splitting overflowing paragraphs across page turns using binary search
 * over word tokens with widow/orphan protection and balanced HTML tags.
 */

class BookPaginator {
  constructor() {
    this.measureEl = null;
    this.measureWidth = 474;
    this.maxPageHeight = 950; // Max vertical height in px for page body text
  }

  ensureMeasureContainer() {
    if (!this.measureEl) {
      this.measureEl = document.createElement('div');
      this.measureEl.id = 'paginator-measure';
      this.measureEl.className = 'page-content-measure';
      this.measureEl.style.width = `${this.measureWidth}px`;
      document.body.appendChild(this.measureEl);
    }
  }

  setMeasureWidth(width = 474) {
    this.measureWidth = width;
    this.ensureMeasureContainer();
    this.measureEl.style.width = `${width}px`;
  }

  setMaxPageHeight(height = 660) {
    this.maxPageHeight = height;
  }

  /**
   * Split HTML content into authentic book pages that fill the available page space.
   *
   * @param {string} rawHtml - Rendered HTML of the chapter
   * @param {object} metadata - { bookTitle, chapterTitle }
   * @param {number} startingBookPageNum - Printed page number for footer (1, 2, 3...)
   * @param {number} startingGlobalPageIndex - StPageFlip index (odd = verso/left, even = recto/right)
   */
  paginateHtml(rawHtml, metadata = {}, startingBookPageNum = 1, startingGlobalPageIndex = 0) {
    this.ensureMeasureContainer();
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = rawHtml;

    const pages = [];
    let currentPageElements = [];
    this.measureEl.innerHTML = '';

    // Build the queue of elements to paginate
    const queue = [];
    const children = Array.from(tempDiv.children);
    let isFirstParagraph = true;

    for (let i = 0; i < children.length; i++) {
      const node = children[i];
      const tagName = node.tagName.toLowerCase();

      // Skip top h1 if already in chapter banner
      if (tagName === 'h1' && i === 0) {
        continue;
      }

      // Add drop-cap to first narrative paragraph
      if (tagName === 'p' && isFirstParagraph && !node.closest('blockquote')) {
        const text = node.innerHTML.trim();
        if (text.length > 1) {
          const firstChar = text.charAt(0);
          const rest = text.slice(1);
          node.classList.add('has-dropcap');
          node.innerHTML = `<span class="dropcap">${firstChar}</span>${rest}`;
        }
        isFirstParagraph = false;
      }

      queue.push({
        html: node.outerHTML,
        tagName: tagName,
        isSplitNext: false,
        hasDropCap: node.classList.contains('has-dropcap')
      });
    }

    // Process each element from the queue
    while (queue.length > 0) {
      const item = queue.shift();
      const prevHtml = this.measureEl.innerHTML;
      this.measureEl.innerHTML = prevHtml + item.html;

      // Check if it fits within the page height budget
      if (this.measureEl.scrollHeight <= this.maxPageHeight) {
        currentPageElements.push(item.html);
        continue;
      }

      // Element overflows the available page height!
      // If it's a paragraph, attempt to split it to pack the remaining space on this page
      if (item.tagName === 'p') {
        const splitResult = this.trySplitParagraph(prevHtml, item);
        if (splitResult) {
          // Part 1 fills the remaining space of the current page
          currentPageElements.push(splitResult.part1Html);

          // Finalize and push the filled page
          const globalIdx = startingGlobalPageIndex + pages.length;
          const bookNum = startingBookPageNum + pages.length;
          pages.push(this.createPageHtml(currentPageElements, metadata, bookNum, globalIdx));

          // Reset page container for next page
          currentPageElements = [];
          this.measureEl.innerHTML = '';

          // Unshift Part 2 to the front of the queue to begin the next page
          queue.unshift({
            html: splitResult.part2Html,
            tagName: 'p',
            isSplitNext: true,
            hasDropCap: false
          });
          continue;
        }
      }

      // If we cannot split (or element is not a paragraph) and there is content on this page:
      if (currentPageElements.length > 0) {
        // Finalize current page
        const globalIdx = startingGlobalPageIndex + pages.length;
        const bookNum = startingBookPageNum + pages.length;
        pages.push(this.createPageHtml(currentPageElements, metadata, bookNum, globalIdx));

        // Reset measurement for the new page
        currentPageElements = [];
        this.measureEl.innerHTML = '';

        // Push this item back to queue to be placed at the top of the next page
        queue.unshift(item);
        continue;
      }

      // If we are already on an empty page and a single block exceeds maxPageHeight:
      // Place it to prevent infinite loop
      currentPageElements.push(item.html);
      const globalIdx = startingGlobalPageIndex + pages.length;
      const bookNum = startingBookPageNum + pages.length;
      pages.push(this.createPageHtml(currentPageElements, metadata, bookNum, globalIdx));

      currentPageElements = [];
      this.measureEl.innerHTML = '';
    }

    // Flush any remaining elements on the final page
    if (currentPageElements.length > 0) {
      const globalIdx = startingGlobalPageIndex + pages.length;
      const bookNum = startingBookPageNum + pages.length;
      pages.push(this.createPageHtml(currentPageElements, metadata, bookNum, globalIdx));
    }

    this.measureEl.innerHTML = '';
    return pages;
  }

  /**
   * Split a paragraph so part1 fills the remaining height on the current page,
   * and part2 continues seamlessly onto the next page.
   *
   * Uses binary search over word tokens with HTML tag balance and widow/orphan protection.
   */
  trySplitParagraph(prevHtml, item) {
    const innerHtml = this.extractParagraphInner(item.html);
    const tokens = this.tokenizeHtml(innerHtml);

    // Collect indices of genuine word tokens (excluding tags and whitespace)
    const wordTokenIndices = [];
    for (let i = 0; i < tokens.length; i++) {
      const tok = tokens[i];
      if (!tok.startsWith('<') && tok.trim().length > 0) {
        wordTokenIndices.push(i);
      }
    }

    const totalWords = wordTokenIndices.length;
    // Need enough words for at least a line on both pages
    if (totalWords < 10) {
      return null;
    }

    // Widow and orphan rules: at least 5 words for part1, at least 5 words for part2
    // If drop cap is present in part1, need at least 10 words so text wraps around the drop cap
    const minWordsPart1 = item.hasDropCap ? 10 : 5;
    const minWordsPart2 = 5;

    if (totalWords < minWordsPart1 + minWordsPart2) {
      return null;
    }

    let low = minWordsPart1;
    let high = totalWords - minWordsPart2;
    let bestSplitWordIndex = -1;

    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const tokenIdx = wordTokenIndices[mid];
      const { part1Html } = this.buildSplitParts(tokens, tokenIdx);

      let part1Class = 'split-para-cont';
      if (item.hasDropCap) {
        part1Class = 'has-dropcap split-para-cont';
      } else if (item.isSplitNext) {
        part1Class = 'split-para-next split-para-cont';
      }

      const testHtml = prevHtml + `<p class="${part1Class}">${part1Html}</p>`;
      this.measureEl.innerHTML = testHtml;

      if (this.measureEl.scrollHeight <= this.maxPageHeight) {
        // Fits! Try packing more words onto this page
        bestSplitWordIndex = mid;
        low = mid + 1;
      } else {
        // Overflowed, try fewer words
        high = mid - 1;
      }
    }

    if (bestSplitWordIndex === -1) {
      // Even minWordsPart1 could not fit in the remaining space
      return null;
    }

    // Build final split HTML with balanced tags
    const bestTokenIdx = wordTokenIndices[bestSplitWordIndex];
    const { part1Html, part2Html } = this.buildSplitParts(tokens, bestTokenIdx);

    let part1Class = 'split-para-cont';
    if (item.hasDropCap) {
      part1Class = 'has-dropcap split-para-cont';
    } else if (item.isSplitNext) {
      part1Class = 'split-para-next split-para-cont';
    }

    const part2Class = 'split-para-next';

    return {
      part1Html: `<p class="${part1Class}">${part1Html}</p>`,
      part2Html: `<p class="${part2Class}">${part2Html.trimStart()}</p>`
    };
  }

  /**
   * Extract inner HTML from a <p>...</p> string
   */
  extractParagraphInner(html) {
    const match = html.match(/^<p[^>]*>([\s\S]*)<\/p>$/i);
    return match ? match[1] : html;
  }

  /**
   * Tokenize HTML into an array of tags, words, and whitespace
   */
  tokenizeHtml(html) {
    const tokens = [];
    const regex = /(<[^>]+>|[^\s<]+|\s+)/g;
    let match;
    while ((match = regex.exec(html)) !== null) {
      tokens.push(match[0]);
    }
    return tokens;
  }

  /**
   * Split token array at splitTokenIdx and ensure all open HTML tags are closed in part1
   * and reopened at the beginning of part2.
   */
  buildSplitParts(tokens, splitTokenIdx) {
    const openTags = [];
    for (let i = 0; i <= splitTokenIdx; i++) {
      const tok = tokens[i];
      if (tok.startsWith('<') && tok.endsWith('>')) {
        if (tok.startsWith('</')) {
          openTags.pop();
        } else if (!tok.endsWith('/>') && !tok.startsWith('<br') && !tok.startsWith('<img') && !tok.startsWith('<hr')) {
          const match = tok.match(/<([a-zA-Z0-9]+)/);
          if (match) {
            openTags.push(tok);
          }
        }
      }
    }

    const part1Tokens = tokens.slice(0, splitTokenIdx + 1);
    const part2Tokens = tokens.slice(splitTokenIdx + 1);

    // Close any tags left open in part 1
    const closingTags = [];
    for (let i = openTags.length - 1; i >= 0; i--) {
      const match = openTags[i].match(/<([a-zA-Z0-9]+)/);
      if (match) {
        closingTags.push(`</${match[1]}>`);
      }
    }

    const part1Html = part1Tokens.join('') + closingTags.join('');
    const part2Html = openTags.join('') + part2Tokens.join('');

    return { part1Html, part2Html };
  }

  /**
   * Wrap elements into an authentic page spread with running header, content, and footer
   */
  createPageHtml(elementStrings, metadata, bookPageNum, globalPageIndex) {
    // In StPageFlip with showCover: true:
    // Odd globalPageIndex is ALWAYS on the left (verso).
    // Even globalPageIndex is ALWAYS on the right (recto).
    const isLeft = (globalPageIndex % 2 !== 0);
    const sideClass = isLeft ? 'page-verso' : 'page-recto';

    const headerText = isLeft
      ? `<span class="header-series">${metadata.bookTitle || 'THE STORM-BORN CYCLE'}</span>`
      : `<span class="header-chapter">${metadata.chapterTitle || ''}</span>`;

    const footerNumber = `<span class="page-number">${bookPageNum}</span>`;

    return `
      <div class="page page-content-leaf ${sideClass}" data-page="${bookPageNum}" data-density="soft">
        <div class="page-inner">
          <div class="page-gutter-shadow"></div>
          <header class="page-header">
            ${headerText}
          </header>
          <main class="page-body">
            ${elementStrings.join('\n')}
          </main>
          <footer class="page-footer">
            ${isLeft ? footerNumber + '<span class="footer-fleuron">✦</span><span></span>' : '<span></span><span class="footer-fleuron">✦</span>' + footerNumber}
          </footer>
        </div>
      </div>
    `;
  }
}

window.bookPaginator = new BookPaginator();
