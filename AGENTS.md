# The Arkun Cycle: Master Blueprint

**Author:** J.D. Alfaro  
**Active book:** Book 1, *Stolen Breath*  
**Series:** *Stolen Breath*, *Crown of Salt*, *Unleashed*

`canon/` wins when files disagree. `canon/concept.md` is an early blueprint and loses to the other files in that folder. `canon/pitch.md` is the public series pitch. The prose on the page is `manuscript/book1/`. Each `canon` folder has a README that names the file to open. A README does not restate the lore.

## 1. Core Premise & Logline

* **Genre:** Adult biopunk romantasy / high-stakes sci-fi. 18+.
* **Logline:** In Year 40 AS, an alien empire is phasing out human air. Rogue Dromaeon-spliced bio-hacker Dr. Tsunari Thorne steals the proof of humanity's extinction. The regime sends Commander Vram Tyage, a Simurgh-spliced soldier whose body runs a lethal solar fever. One accidental touch silences that fever. To keep her alive he must defect, and burn the sky the empire sold.
* **Book 1 question:** Can Tsunari and Vram turn a hunt into a chosen alliance in time to expose the extinction clock, without corporate pardon or cult worship owning either of them.
* **Target audience & tone:** Adult, character-driven, visceral. Gritty biopunk set against sensory romance. High-stakes survival braided to an enemies-to-lovers bond. The language stays grounded: water, air, ammunition, shelter, and keeping each other breathing.

## 2. Thematic Elements

* **Primary theme:** Autonomy against conditioning. Engineered weapons and hunted survivors reclaim mind, body, and name, refusing both Apex Bio and the Enlightened.
* **Secondary motifs:** Fire and shadow (his furnace, her cool Null-Resonance). Romance earned through competence, not fate. Truth against the dome's lie. Scarcity, the lee, the leash, shifting loyalties.
* **Emotional arc (trilogy):** Biological resentment and hostage leverage, then competence parity and a blood compact (*Stolen Breath*). Uncaged devotion tested by betrayal and separation (*Crown of Salt*). Sovereign equals who break the extinction checkmate and lead the migration to the Verdant Cradle (*Unleashed*).
* **Book 1 ending:** They choose each other against Corvus and the Forger, and Sector 09's immediate battle turns. The aerosol cure, the Spire rescue, and the Verdant Cradle belong to later books. The Gospel of the Slag interlude is the hook into *Crown of Salt*.

## 3. Style & Prose Guide

Read `canon/style/voice.md`, `canon/style/sensory.md`, and `canon/style/glossary.md` before drafting or line-editing.

* **Point of view:** Alternating first person, one lead per chapter. Chapter headers name the POV (`Chapter N // Tsunari` or `Chapter N // Vram`). Tsunari thinks in hazard, telemetry, and leverage. Vram thinks in sight lines, heat, and her micro-movements. Tsune is the field name. Tsunie is Vram's private diminutive only.
* **Tense:** Present.
* **Prose style:**
  * Show the body. Emotion lands as heat, claw, breath, and scent, not as a labeled feeling.
  * Keep Tsunari dangerous. Even pinned, she is measuring leverage.
  * Once Vram breaks conditioning, his loyalty does not go lukewarm.
  * Put world explanation inside survival or intimacy. Do not pause for a lecture.
  * Speak the glossary names (*the Choke*, *the lee*, *the leash*). Do not coin a synonym for a term that already exists.
  * Use a plain word when a plain word will do. A lab term for a simple thing is a miss: muscle, not transgenic muscle. A strike, not a kinetic strike.
  * Keep the page moving. Put description inside talk, a thought, a sound, or a change. Two people in a scene should speak. A quiet stretch is a thought or a sound, not a catalog of the room.
  * Say the thing. Do not open with a denial and then the real sentence ("It is not X. It is Y."). Cut the denial.
  * **Avoid AI clichés:** No "a testament to," "delve into," "unlocking a world of," or thesaurus melodrama. Keep the sentence punchy and physical.

Five strains stay distinct: Gryphon, Lindwurm, Simurgh, Fenris, Dromaeon. Abilities do not migrate. Arkun is the break of conditioning into a personal ability, not a generic power-up.

## 4. Directory & File Structure

Reference these paths when generating or editing. Do not invent `/outline/`, `/lore/`, or `/chapters/`. The bible is `canon/`. Open the folder README, then the file it names.

* `canon/pitch.md`: series logline and the three book pitches.
* `canon/concept.md`: early premise. Use only when the other canon files are silent.
* `canon/world/`: calendar, air, society, geography, the Cradle, politics, factions, and the living systems under `life/`.
* `canon/characters/`: one file per person. The index is `canon/characters/README.md`.
* `canon/romance/`: bond mechanics and heat. The tether is heat, nerve, and leverage, not a mystical mate mark.
* `canon/places/locations_and_sensory.md`: what a location smells, sounds, and feels like.
* `canon/plot/`: trilogy shape, the dual track, and the three book breakdowns. Book 1 is `canon/plot/book1/`, four part files, 44 chapters, five interludes.
* `canon/style/`: voice, sensory palette, format, and the glossary.
* `assets/prompts/`: image-generation prompts and the codex art direction. Not prose canon.
* `assets/media/`: reference images (characters, strains, places). Not prose canon.
* `manuscript/`: active drafts. Edit chapter files, not the compiled export, unless asked.
  * `book1/chapter_NN.md` and interludes such as `chapter_10b_interlude_the_glass_moth.md`
  * `dedication.md`
  * `Stolen_Breath_Full_Manuscript.md` and `.txt` are builds. `reader/scripts/` regenerates them.
* `reviews/`: editorial reviews, `ledger.csv`, and `NNN_apply.md` checklists.
* `kdp/`: Kindle metadata (description, keywords, categories, biography, back-cover copy). Do not spoil the ending, the brand, or the abduction in store copy.
* `reader/`: local reader and build scripts (`build-epub.js`, `build-pdf.js`, `build-editorial-manuscript.js`). EPUB source under `reader/books/book1/epub_source/` is generated from the manuscript.
* `.cursor/rules/`: editorial passes. Load the matching rule when reviewing or applying a review.

Book 1 shape in `canon/plot/book1/`:

* Part I, chapters 1 to 10: the theft, the hunt, the first touch. Scarcity.
* Part II, chapters 11 to 22: secret captivity, then defection. The vassal empire.
* Part III, chapters 23 to 34: wasteland, cult, sump. Wasteland faith.
* Part IV, chapters 35 to 44: the Glass Vault, the siege, the compact that opens Book 2.

A later ring dumped into an early part is a spoiler.

## 5. Agent Operating Rules

When drafting or editing:

1. **Context check.** Before prose, read the POV character sheet, `canon/romance/romance_engine.md` if the scene touches the bond, the chapter's job in `canon/plot/book1/`, and the location entry in `canon/places/locations_and_sensory.md`.
2. **Continuity first.** Match established lore, travel time, injuries, objects, names, and who already knows what. Fever follows the last skin contact unless the page gives a new cause. Fixed ages unless a canon file says otherwise: Year 40 AS is 2072 CE; Tsunari is 26; Vram is 28; both are Storm-Born.
3. **Incremental drafting.** Draft scene by scene or beat by beat. Do not write an entire chapter in one unrefined block.
4. **Smallest edit.** When fixing a review or a note, change the smallest span that makes the problem false on a reread. Do not polish the prose around it.
5. **Spoilers.** Book 1 may aim at later payoffs. It must not complete the aerosol cure, the Spire rescue, Jeffrey Thorne's survival as a finished reveal, or the journey to the Verdant Cradle.
6. **Reviews.** Writing a review follows `.cursor/rules/editorial-review.mdc` and the category rules beside it (story line, plot, characters, romance, dialogue, continuity, world and sensory, redundancy, spoilers, chapter transitions). Applying a review follows `.cursor/rules/editorial-apply.mdc`: the ledger names the only manuscript file, and canon conflicts get asked before they are rewritten. A book-wide repeated word, or a lab word used for a simple thing, is a Redundancy finding, not a nit.
7. **Canon updates.** If the user authorizes a bible change, update the matching file under `canon/` so the manuscript and the canon stay aligned. A fact has one home. Point to it. Do not copy it into a second file.
