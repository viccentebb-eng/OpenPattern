# Third-party research and reused ideas

OpenPattern intentionally evaluates existing open-source work before reimplementing complex craft engines.

## JBead

- Repository: https://github.com/damianbrunold/jbead
- License: GPL-3.0-or-later
- Relevant parts: bead crochet rope draft/corrected/simulation views, arbitrary palettes, bead symbols, repeat detection, bead lists, JBB/DBB formats and print/export workflow.
- OpenPattern use today: product/behavior research only. No JBead GPL source is vendored.
- Direct source reuse remains gated by OpenPattern's final root license.

## cl-beads

- Repository: https://github.com/shamazmazum/cl-beads
- License: BSD-2-Clause
- Relevant parts: JBead-compatible rope document model, corrected and simulated rope coordinate transforms, reading line/ruler behavior and JBB compatibility.
- OpenPattern use today: the bead crochet rope geometry in `src/geometry/bead-rope.mjs` is an independent JavaScript adaptation of the documented BSD coordinate models, with attribution retained here and in source comments.

## gilesknap/peyote-pattern

- Repository: https://github.com/gilesknap/peyote-pattern
- License: Apache-2.0
- Relevant parts: even/odd-count flat peyote row staggering, active-column logic, working-row direction, SVG pattern/fabric views, progress tracking.
- OpenPattern use: the flat peyote layout in `src/geometry/bead-layout.mjs` is an independent JavaScript adaptation of the documented row/column model, with attribution retained here and in source comments.

## CrochetPhoto2Pattern

- Repository: https://github.com/paulkooer/CrochetPhoto2Pattern
- License: MIT
- Relevant parts: amigurumi shaping, gauge-aware round generation, validation, ring charts, structure geometry and CrochetPARADE export.
- OpenPattern use today: conceptual/algorithmic reference for the parametric amigurumi controls. CrochetPARADE remains the canonical parser/graph/render backend.

## CrochetPARADE

- Repository: https://codeberg.org/crochetparade/CrochetPARADE
- Mirror inspected: https://github.com/stassev/CrochetPARADE
- License: GPL-3.0-or-later
- Relevant parts: crochet normalization, parser, IR, compiler, stitch graph, Pyodide browser bridge, SVG/3D pipeline.
- OpenPattern use today: canonical crochet engine boundary. OpenPattern now emits CrochetPARADE DSL through `src/crochet/crochetparade-adapter.mjs`; GPL source is not vendored yet.
- Before direct integration: decide OpenPattern's root license and keep CrochetPARADE behind a dedicated adapter/worker boundary.

## ratpi-studio/svg-pattern-generator

- Repository: https://github.com/ratpi-studio/svg-pattern-generator
- License: MIT
- Relevant parts: polar-coordinate helpers and parametric rosette/mandala/radial generation.
- OpenPattern use today: conceptual reference for the radial Geometry Engine. The bead-node topology in OpenPattern is original and bead-specific.

## rinad12/GridBead

- Repository: https://github.com/rinad12/GridBead
- License: MIT
- Relevant parts: square/brick/peyote hit testing, bead-canvas interaction, zoom/pan and editor workflow.
- OpenPattern use today: interaction reference. OpenPattern already has its own Canvas editor and geometry hit testing.

## maxcleme/beadifier

- Repository: https://github.com/maxcleme/beadifier
- License: MIT
- Relevant parts: image conversion, Lab colour model, render/export pipeline, usage counts.
- Planned use: evaluate its colour/export code before expanding Materials Engine.

## cornelk/beadmachine

- Repository: https://github.com/cornelk/beadmachine
- License: MIT
- Relevant parts: CIEDE2000 colour matching, filters and bead statistics.
- Planned use: reference or port the colour-difference implementation instead of writing ΔE00 from scratch.

## ya-chang/bead-pattern-generator

- Repository: https://github.com/ya-chang/bead-pattern-generator
- License: MIT
- Relevant parts: browser-only CIEDE2000, background removal with edge protection, colour merging and SVG/CSV export.
- Planned use: evaluate for Conversion Studio cleanup and Materials Engine.

## LunarXuan/Pindo

- Repository: https://github.com/LunarXuan/Pindo
- License: GPL-3.0
- Relevant parts: local-first image-to-pattern pipeline, pattern recognition, multiple bead palettes, crop/cleanup and export.
- Planned use: research now; direct source reuse depends on OpenPattern's final licensing decision.

## Rule

1. Prefer a mature compatible open-source engine over rewriting it.
2. Keep external engines behind adapters.
3. Record license and attribution before copying code.
4. Do not copy code from repositories without an explicit compatible license.
5. Keep OpenPattern's persistent format independent from any one third-party engine.
