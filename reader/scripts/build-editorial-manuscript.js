/**
 * Compiles the entire book into a single clean Markdown (.md) and Plain Text (.txt) file
 * specifically designed for upload into LLMs (Claude, ChatGPT, Gemini, NotebookLM)
 * for editorial review, continuity checking, and beta feedback.
 */

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '../..');
const MANUSCRIPT_DIR = path.join(ROOT_DIR, '09_manuscript', 'book1');
const OUTPUT_DIR = path.join(ROOT_DIR, '09_manuscript');

function compileManuscript() {
  console.log('Compiling single-file editorial manuscript...');

  const files = fs.readdirSync(MANUSCRIPT_DIR)
    .filter(f => f.endsWith('.md'))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  let fullContent = [];

  // 1. Title & Front Matter
  fullContent.push(`# STOLEN BREATH`);
  fullContent.push(`*A Biopunk Romantasy Novel*`);
  fullContent.push(`*The Arkun Cycle — Book One*`);
  fullContent.push(`By J.D. Alfaro\n`);
  fullContent.push(`---\n`);

  // 2. Copyright & Content Advisory
  fullContent.push(`## Copyright & Content Advisory`);
  fullContent.push(`Copyright © 2026 by J.D. Alfaro. All rights reserved.`);
  fullContent.push(`This is a work of fiction. Names, characters, places, and incidents are either the product of the author's imagination or are used fictitiously.\n`);
  fullContent.push(`**MATURITY RATING: 18+ (ADULT AUDIENCES)**`);
  fullContent.push(`*Content Guidance:* Stolen Breath contains explicit consensual sexual encounters, dark themes, bio-engineering body horror, graphic violence, captivity, and strong language. Reader discretion is advised.\n`);
  fullContent.push(`---\n`);

  // 3. Dedication
  fullContent.push(`## Dedication`);
  fullContent.push(`*For Zuni*`);
  fullContent.push(`To the one who makes every breath in my life count.`);
  fullContent.push(`I hope you find my devotion and love between these lines.`);
  fullContent.push(`Forever will never be enough to share this life with you.\n`);
  fullContent.push(`---\n`);

  // 4. Chapters & Interludes
  let totalWords = 0;
  files.forEach(file => {
    const raw = fs.readFileSync(path.join(MANUSCRIPT_DIR, file), 'utf8');
    const wordCount = raw.trim().split(/\s+/).filter(Boolean).length;
    totalWords += wordCount;

    fullContent.push(raw.trim());
    fullContent.push(`\n---\n`);
  });

  // 5. Back Matter
  fullContent.push(`## Author's Note & Acknowledgments`);
  fullContent.push(`Building the shattered skies and scorched dunes of Arkun began with a simple question: what happens when two engineered survivors—each weaponized by trauma, duty, and genetic design—find salvation in the very touch they were taught to fear? Bringing Tsunari and Vram's story into the world has been an exhilarating, demanding, and deeply transformative voyage.`);
  fullContent.push(`To my partner, Zuni: thank you for being my constant anchor, my first sounding board, and the quiet heart behind every word. Your faith in this world breathed life into it when the pages were dark. Every sentence carries the quiet imprint of your love.`);
  fullContent.push(`To my early readers and critique partners: thank you for challenging me to sharpen the blades, deepen the tension, and never hold back on the heat or the emotional cost. Your honest feedback helped forge Stolen Breath into the fierce, visceral tale it needed to be.`);
  fullContent.push(`To the vibrant Romantasy community: thank you for embracing stories where unapologetic romance and high-stakes speculative fiction collide. Readers like you make epic worlds like Arkun possible.`);
  fullContent.push(`And finally, to you—the reader: thank you for walking the dangerous catwalks of Sector 09 with Tsunari and soaring through the storm with Vram. If this story stirred your pulse, kept you reading past midnight, or made your breath catch, then every late night and rewound line was worth it.\n`);
  fullContent.push(`---\n`);

  fullContent.push(`## Sneak Peek: Crown of Salt (The Arkun Cycle — Book Two)`);
  fullContent.push(`*Fourteen months until outdoor air kills everything that breathes. Thirty days until the glass dome of Eden Alpha becomes Sora's tomb. And eighty miles of scorching, caustic salt between the rebels and the cure.*\n`);
  fullContent.push(`The thermals over the Great Cleave smelled of boiling salt and distant lightning.`);
  fullContent.push(`From three thousand feet above the southern flats, the world looked like a shattered porcelain plate crusted with dried blood. The high towers of Eden Alpha were behind us now—distant needles of frosted crystal mocking the poisoned wastes below. But the horizon ahead offered no sanctuary.`);
  fullContent.push(`Beside me, the steady, rhythmic beating of obsidian and gold wings broke through the high-altitude silence. Vram flew close enough that the radiant heat of his Simurgh crest bathed my face in warmth, keeping the sub-zero bite of the troposphere from numbing my skin.`);
  fullContent.push(`His jaw was tight, his silver-flecked eyes scanning the cloud banks for Consortium hunter-squadrons. Ten years of military conditioning did not die easily; he still read the sky as a kill-box.`);
  fullContent.push(`Through the flight link, his voice entered my mind—rough, deep, and steady as bedrock.`);
  fullContent.push(`*Turbulence coming off the salt ridges,* he signaled, his wingtip dipping by a fraction of an inch to shield me from a shearing updraft. *Stay on my flank, Tsune. When we hit the perimeter, we drop like stones.*`);
  fullContent.push(`I gripped the harness, my carbon claws humming against the reinforced leather.`);
  fullContent.push(`*They know we're coming, Vram,* I answered through the bond, feeling the electric pulse of his blood resonate with mine. *Corvus has fortified the lower labs.*`);
  fullContent.push(`A dark, lethal smile curved the Commander's lips against the rushing wind.`);
  fullContent.push(`*Let him build his walls,* Vram whispered into the sky. *He's never seen us hungry.*\n`);
  fullContent.push(`---\n`);

  fullContent.push(`## About the Author: J.D. Alfaro`);
  fullContent.push(`J.D. Alfaro is a storyteller specializing in dark romantasy, high-stakes speculative fiction, and biopunk adventures. He weaves complex worldbuilding with visceral tension, lethal heroines, morally gray protectors, and scorching, open-door passion.`);
  fullContent.push(`When he isn't plotting rebellions, choreographing aerial dogfights, or tuning the emotional frequency of engineered souls, he can be found exploring rugged wilderness trails, drinking absurd amounts of black coffee, and daydreaming beneath the stars.\n`);

  const mdText = fullContent.join('\n\n');
  const mdPath = path.join(OUTPUT_DIR, 'Stolen_Breath_Full_Manuscript.md');
  const txtPath = path.join(OUTPUT_DIR, 'Stolen_Breath_Full_Manuscript.txt');

  fs.writeFileSync(mdPath, mdText, 'utf8');
  fs.writeFileSync(txtPath, mdText, 'utf8');

  const stats = fs.statSync(mdPath);
  const sizeKB = (stats.size / 1024).toFixed(1);

  console.log('✅ Editorial Manuscript Generated!');
  console.log(`📄 Markdown: ${mdPath} (${sizeKB} KB)`);
  console.log(`📄 Plaintext: ${txtPath} (${sizeKB} KB)`);
  console.log(`🔤 Word count: ${totalWords.toLocaleString()} words across ${files.length} sections`);
}

compileManuscript();
