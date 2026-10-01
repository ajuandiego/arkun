# The Bio-Curator Codex: Art Direction & Gemini Prompts Guide

> **In-World Lore Justification:** All visual artifacts in the novel represent recovered pages from **The Glass Vault** and the personal leather-bound journals of **Chief Bio-Curator Gideon Cross** and **Dr. Tsunari Thorne**. They are preserved field sketches, anatomical autopsies, and cartographic projections drafted by hand using manual drafting tools (dividers, compasses, brass rulers, and sepia ink) to prevent digital EMP corruption.

---

## 1. Master Aesthetic Anchor: The Renaissance Codex Style

To maintain perfect visual consistency across all image generations in Gemini, every prompt uses a shared stylistic foundation inspired by **Leonardo da Vinci’s anatomical manuscripts**, **Renaissance cartography**, and **early 19th-century naturalist field journals**.

```
[ WARM SEPIA PARCHMENT ] + [ GRAPHITE & IRON-GALL INK ] + [ GEOMETRIC COMPASS/RULER GUIDES ] + [ SELECTIVE WATERCOLOR WASHES ]
```

### Key Visual Pillars
1. **The Surface:** Aged, heavy vellum or fibrous parchment with natural imperfections—light foxing, subtle coffee/tea-staining, deckled paper edges, and warm creamy-amber undertones.
2. **The Linework:** Crisp, layered graphite pencil sketches combined with fine dark sepia and iron-gall ink cross-hatching. Drafted with visible manual construction lines: faint compass arcs, intersecting ruler guidelines, coordinate grids, and proportional ratio brackets.
3. **Marginalia & Technical Callouts:** Microscopic technical cursive notes, anatomical dimension arrows, Greek/Latin taxonomic labeling, scale bars, and geometric drafting markings framing the subject.
4. **Selective Color Palette (The "Living Ledger" Tint):** NOT fully rendered modern digital art. The linework remains dominant, overlaid with delicate, translucent watercolor washes:
   * **Amber / Ocher:** Atmospheric haze, desert dust, sulfur vents.
   * **Copper / Molten Gold / Crimson:** Phoenix vascular tracks, heat auras, plumage accents.
   * **Chartreuse / Emerald:** Green Dome biosystems, Dromaeon eyes, silica plant life.
   * **Basalt Gray / Iron Rust:** Chimeric armor plates, ruins, nanocarbon claws.

---

## 2. Gemini Prompting Tips & Best Practices

When submitting these prompts to Gemini (or Imagen 3):
1. **Maintain the Style Anchor:** Do not remove the medium keywords (`da Vinci codex`, `graphite pencil sketch on aged vellum`, `compass guidelines`, `ruler construction marks`).
2. **Avoid "CGI / 3D Render" Drift:** If Gemini attempts to generate smooth digital renders, add the negative modifier:
   > *"No 3D digital rendering, no glossy textures, no anime styling, no modern computer graphics, no photographic realism."*
3. **Aspect Ratio Recommendations:**
   * **World & Regional Maps:** `16:9` or `3:2` (Landscape)
   * **Anatomical Strain Studies & Character Portraits:** `3:4` or `2:3` (Portrait)
   * **City Cross-Sections & Planetary Globes:** `1:1` or `4:3`

---

## 3. Directory Structure

*   [01_planetary_and_world_maps.md](file:///Users/diego/oned/book/07_prompts/01_planetary_and_world_maps.md) — Planetary globe from orbit & the Post-Storm World Map projection.
*   [02_city_and_location_maps.md](file:///Users/diego/oned/book/07_prompts/02_city_and_location_maps.md) — Sector 09, Eden Dome Alpha, The Glass Vault, High Aerie, Redoubt Station 14, and The Grand Sump Cistern (Temple of The Enlightened).
*   [03_chimeric_strains_codex.md](file:///Users/diego/oned/book/07_prompts/03_chimeric_strains_codex.md) — Bestiary plates of the 5 primordial beasts (original prehistoric and mythical lineages).
*   [04_character_sketches.md](file:///Users/diego/oned/book/07_prompts/04_character_sketches.md) — Vitruvian & field sketches of Tsunari Thorne, Vram Tyage, Gideon Cross, Ren, The Vaelen Simulacrum autopsy, The Forger, Caelia (The Promised Bride), and Commander Malakar (Ember-Prime).
*   [05_human_mutations/](file:///Users/diego/oned/book/07_prompts/05_human_mutations/README.md) — Detailed human mutation codex for all 5 strains, depicting **male and female bodies** in both **Resting State** and **Enhanced (Fight-or-Flight) State**.
