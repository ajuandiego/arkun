# The Arkun Cycle: Master Blueprint

**Author:** J.D. Alfaro  
**Active book:** Book 1, *Stolen Breath*  
**Series:** *Stolen Breath*, *Crown of Salt*, *Unleashed*

Numbered canon wins when files disagree. `concept.md` is an early blueprint and loses to `01_world/` through `06_style/` and `05_plot/`. `pitch.md` is the public series pitch. The prose on the page is `09_manuscript/book1/`.

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

Read `06_style/tone_and_sensory_palette.md` and `06_style/glossary_and_terminology.md` before drafting or line-editing.

* **Point of view:** Alternating first person, one lead per chapter. Chapter headers name the POV (`Chapter N // Tsunari` or `Chapter N // Vram`). Tsunari thinks in hazard, telemetry, and leverage. Vram thinks in sight lines, heat, and her micro-movements. Tsune is the field name. Tsunie is Vram's private diminutive only.
* **Tense:** Present.
* **Prose style:**
  * Show the body. Emotion lands as heat, claw, breath, and scent, not as a labeled feeling.
  * Keep Tsunari dangerous. Even pinned, she is measuring leverage.
  * Once Vram breaks conditioning, his loyalty does not go lukewarm.
  * Put world explanation inside survival or intimacy. Do not pause for a lecture.
  * Speak the glossary names (*the Choke*, *the lee*, *the leash*). Do not coin a synonym for a term that already exists.
  * **Avoid AI clichés:** No "a testament to," "delve into," "unlocking a world of," or thesaurus melodrama. Keep the sentence punchy and physical.

Five strains stay distinct: Gryphon, Lindwurm, Simurgh, Fenris, Dromaeon. Abilities do not migrate. Arkun is the break of conditioning into a personal ability, not a generic power-up.

## 4. Directory & File Structure

Reference these paths when generating or editing. Do not invent `/outline/`, `/characters/`, `/lore/`, or `/chapters/`.

* `pitch.md`: series logline and the three book pitches.
* `concept.md`: early premise. Use only when the numbered files are silent. If they conflict, follow the numbered file.
* `01_world/`: history, biosystem and tech, factions, geography.
  * `world_and_history.md`
  * `biosystem_and_tech.md`
  * `factions_and_politics.md`
  * `geography_and_territories.md`
* `02_characters/`: psychology, wounds, voice, relationships.
  * `protagonist_fmc.md` (Tsunari Thorne)
  * `love_interest_mmc.md` (Vram Tyage)
  * `secondary_characters.md`
* `03_romance/`: bond mechanics and heat. The tether is heat, nerve, and leverage, not a mystical mate mark.
  * `romance_engine.md`
  * `tropes_and_heat_profile.md`
* `04_settings/locations_and_sensory.md`: place layout and what a location smells, sounds, and feels like.
* `05_plot/`: outline, act shape, and chapter promises.
  * `trilogy_overview.md`
  * `story_beats_dual_track.md` (external track and romantic track must tighten together)
  * `book1_breakdown.md` (Book 1 chapter promise: four parts, 44 chapters, five interludes)
  * `book2_breakdown.md`
  * `book3_breakdown.md`
* `06_style/`: voice, sensory palette, and terminology.
* `07_prompts/`: image-generation prompts and the codex art direction. Not prose canon.
* `08_media/`: reference images (characters, strains, places). Not prose canon.
* `09_manuscript/`: active drafts. Edit chapter files, not the compiled export, unless asked.
  * `book1/chapter_NN.md` and interludes such as `chapter_10b_interlude_the_glass_moth.md`
  * `dedication.md`
  * `Stolen_Breath_Full_Manuscript.md` and `.txt` are builds. `reader/scripts/` regenerates them.
* `10_reviews/`: editorial reviews, `ledger.csv`, and `NNN_apply.md` checklists.
* `11_kdp/`: Kindle metadata (description, keywords, categories, biography, back-cover copy). Do not spoil the ending, the brand, or the abduction in store copy.
* `reader/`: local reader and build scripts (`build-epub.js`, `build-pdf.js`, `build-editorial-manuscript.js`). EPUB source under `reader/books/book1/epub_source/` is generated from the manuscript.
* `.cursor/rules/`: editorial passes. Load the matching rule when reviewing or applying a review.

Book 1 shape in `05_plot/book1_breakdown.md`:

* Part I, chapters 1 to 10: the theft, the hunt, the first touch. Scarcity.
* Part II, chapters 11 to 22: secret captivity, then defection. The vassal empire.
* Part III, chapters 23 to 34: wasteland, cult, sump. Wasteland faith.
* Part IV, chapters 35 to 44: the Glass Vault, the siege, the compact that opens Book 2.

A later ring dumped into an early part is a spoiler.

## 5. Agent Operating Rules

When drafting or editing:

1. **Context check.** Before prose, read the POV character sheet, `03_romance/romance_engine.md` if the scene touches the bond, the chapter's job in `05_plot/book1_breakdown.md`, and the location entry in `04_settings/locations_and_sensory.md`.
2. **Continuity first.** Match established lore, travel time, injuries, objects, names, and who already knows what. Fever follows the last skin contact unless the page gives a new cause. Fixed ages unless a canon file says otherwise: Year 40 AS is 2072 CE; Tsunari is 26; Vram is 28; both are Storm-Born.
3. **Incremental drafting.** Draft scene by scene or beat by beat. Do not write an entire chapter in one unrefined block.
4. **Smallest edit.** When fixing a review or a note, change the smallest span that makes the problem false on a reread. Do not polish the prose around it.
5. **Spoilers.** Book 1 may aim at later payoffs. It must not complete the aerosol cure, the Spire rescue, Jeffrey Thorne's survival as a finished reveal, or the journey to the Verdant Cradle.
6. **Reviews.** Writing a review follows `.cursor/rules/editorial-review.mdc` and the category rules beside it (story line, plot, characters, romance, dialogue, continuity, world and sensory, spoilers, chapter transitions). Applying a review follows `.cursor/rules/editorial-apply.mdc`: the ledger names the only manuscript file, and canon conflicts get asked before they are rewritten.
7. **Canon updates.** If the user authorizes a bible change, update the matching file under `01_world/` through `06_style/` or `05_plot/` so the manuscript and the canon stay aligned.
