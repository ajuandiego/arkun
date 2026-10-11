const fs = require('fs');
const path = require('path');

function chaptersDir(root) {
  return path.join(root, 'story', 'stolen_breath', 'chapters');
}

function listChapters(root) {
  const dir = chaptersDir(root);
  if (!fs.existsSync(dir)) return [];
  return fs.readdirSync(dir, { withFileTypes: true })
    .filter((entry) => {
      if (!entry.isDirectory()) return false;
      const file = path.join(dir, entry.name, 'manuscript.md');
      if (!fs.existsSync(file)) return false;
      return fs.readFileSync(file, 'utf8').trim().startsWith('#');
    })
    .map((entry) => entry.name)
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function contentPath(root, filename) {
  const id = path.basename(filename).replace(/\.md$/, '');
  return path.join(chaptersDir(root), id, 'manuscript.md');
}

module.exports = { listChapters, contentPath };
