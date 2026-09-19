# OpenPattern

Plataforma web abierta para diseñar, convertir y compartir patrones de crochet, beadwork, punto de cruz, knitting y otras técnicas textiles/manuales.

## Estado actual

OpenPattern ya incluye:

- Canvas editor con pincel, borrador, fill, zoom/pan y undo/redo.
- Conversion Studio con regeneración, brillo, contraste, saturación y limpieza de rejilla clara.
- Pattern Viewer, guías, coordenadas y seguimiento por fila.
- Crochet Studio visual con layouts radial, granny/cuadrado y libre.
- Biblioteca inicial de símbolos de crochet con edición directa.
- Inserción, selección, drag, conexión, duplicado, rotación, escala, vuelta y color por puntada.
- Patrón escrito ↔ chart para sintaxis común en inglés/español.
- Plantillas de círculo, granny square y flor.
- Exportación SVG de charts crochet.
- Renderers específicos para Tapestry, C2C, Cross Stitch, Knitting Colorwork y Bead Loom.
- Bead renderer plano/realista con perfiles físicos aproximados.
- Geometry Engine experimental para:
  - Flat Peyote
  - Peyote Star
  - Bead Rosette / Mandala
- Pintura directa de cuentas en layouts no rectangulares.
- Recorrido de hilo y numeración opcional en geometrías bead.
- Leyendas y conteos por color.
- Autosave local.
- Exportación de proyecto `.openpattern.json`.

## Arquitectura

OpenPattern separa el formato del patrón de su representación:

```text
Pattern Core
├─ Grid Engine
├─ Geometry/Layout Engine
├─ Symbol Engine
├─ Sequence Engine
├─ Thread/Graph Engine
├─ Measurement Engine
└─ Materials Engine
```

Las técnicas usan adapters y renderers; no son aplicaciones separadas.

## Ejecutar

```bash
npm test
python -m http.server 4173
```

Después abre:

`http://localhost:4173/web/`

## Open source reuse

Antes de reimplementar motores complejos, OpenPattern evalúa repositorios compatibles. Consulta:

- `THIRD_PARTY.md`
- `docs/RESEARCH_NOTES.md`
- `docs/ARCHITECTURE.md`
- `docs/ROADMAP.md`

Entre los proyectos estudiados están CrochetPARADE, peyote-pattern, GridBead, Beadifier, beadmachine y otros.

## Próximos bloques

1. Thread Path editor para bead geometries.
2. Selección rectangular / copy / paste / move.
3. Materials Engine con DMC, Miyuki, TOHO y Preciosa.
4. Peyote/Brick/RAW/Herringbone con topologías reales.
5. Symbol Engine para crochet y knitting.
6. Sequence/Validation Engine.
7. Exportación técnica PDF/SVG.
8. Comunidad y marketplace.
