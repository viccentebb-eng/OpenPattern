# Roadmap OpenPattern

## Fase 0 — Fundaciones ✅
Pattern Core, Grid Engine, schema v1, Technique Registry y pruebas.

## Fase 1 — Studio base (en progreso)

### Entregado
- editor Canvas;
- pincel, borrador y fill;
- zoom/pan;
- undo/redo e historial;
- autosave local;
- Conversion Studio;
- regeneración manual/automática;
- brillo/contraste/saturación;
- limpieza de rejilla gris clara;
- UI de tres paneles;
- Pattern Viewer;
- guías y coordenadas;
- modo seguimiento;
- inspector específico por técnica;
- bead renderer plano/realista;
- perfiles básicos Miyuki/TOHO;
- cross stitch: color, símbolo o ambos;
- knitting colorwork: bloque/V/símbolo;
- Geometry Engine experimental;
- Flat Peyote;
- Peyote Star;
- Rosette/Mandala;
- Bead Crochet Rope con vistas borrador, patrón de trabajo y cuerda terminada;
- recorrido de hilo y numeración en layouts geométricos;
- repetición automática inicial para bead crochet rope;
- conteos y leyenda técnica.

### Siguiente inmediato
- selección rectangular;
- copiar/pegar/mover selección;
- eyedropper;
- line/rectangle/shape tools;
- mirror drawing en vivo;
- trim automático;
- crop de imagen;
- remover fondo robusto;
- capas;
- reference image / tracing;
- importación .openpattern;
- IndexedDB;
- PWA/offline.

## Fase 2 — Conversion + Materials Engine

### Conversión
- sRGB -> Lab;
- CIEDE2000;
- area sampling;
- cartoon/photo modes;
- dithering;
- edge-preserving downscale;
- detección y eliminación de fondo;
- limpieza de ruido;
- merge de colores similares;
- pattern recognition desde charts existentes;
- detección de rejillas;
- Web Worker para conversiones grandes.

### Materiales
- DMC / Anchor;
- Miyuki / TOHO / Preciosa;
- Perler / Hama / Artkal / MARD;
- código, acabado, forma, tamaño y transparencia;
- filtros por fabricante/acabado;
- matching perceptual;
- sustituciones;
- inventario personal;
- beads-per-pack;
- estimación de paquetes;
- shopping list.

## Fase 3 — Beadwork Engine

### 3A. Grids y stitches lineales
- loom / square stitch;
- flat peyote even/odd;
- peyote 1–9 drop;
- brick 1–3 drop;
- row shift;
- word charts;
- reading line;
- seguimiento bead-by-bead.

### 3B. Geometry / radial
- triangle;
- warped square;
- peyote star;
- medallion;
- rosette;
- circular netting;
- Huichol-style layouts;
- círculos/arcos;
- simetría 2/4/5/6/8 vías;
- componentes reutilizables;
- bead shapes mixtas;
- rotación individual;
- templates paramétricos.

### 3C. Bead crochet ropes — JBead parity
- circumference editor;
- draft view;
- corrected/work view;
- finished-rope simulation;
- rotation/shift;
- arbitrary palette;
- symbols per color;
- repeat detection;
- bead run list / stringing sequence;
- reading line;
- bead counts;
- print rope diagram;
- JBB import/export;
- DB-BEAD compatibility research;
- image -> rope pattern;
- automatic repeat tiling;
- seamless repeat validator.

### 3D. Thread Graph avanzado
- custom thread path editor;
- añadir/quitar/reordenar conexiones;
- RAW;
- cubic RAW;
- herringbone / Ndebele;
- tubular peyote;
- gourd stitch;
- netting;
- fringe;
- bead embroidery;
- component assembly;
- validación de conexiones;
- instrucciones paso a paso;
- numeración automática.

## Fase 4 — Crochet Engine

### Color/grid crochet
- tapestry crochet;
- graphgan;
- C2C;
- filet crochet;
- mosaic crochet;
- overlay mosaic crochet;
- intarsia crochet;
- colorwork circular.

### Symbol Engine
- biblioteca internacional de símbolos;
- chain, slip stitch, sc, hdc, dc, tr;
- increases/decreases;
- front/back loop;
- front/back post;
- clusters, popcorn, puff;
- custom stitches;
- rows;
- rounds;
- freeform;
- rotación/escalado;
- agrupación;
- wedge guides;
- indicadores;
- varios charts por documento;
- leyenda automática.

### Sequence / Validation
- instrucciones escritas;
- terminología US / UK / ES;
- repeticiones;
- stitch counts;
- amigurumi;
- pattern checker;
- detección de errores matemáticos;
- texto <-> símbolo.

## Fase 5 — Crochet Graph + 2D/3D
- adapter CrochetPARADE;
- parser formal;
- stitch graph;
- custom stitch definitions;
- SVG chart automático;
- vínculo texto <-> puntada;
- preview 2D;
- preview 3D;
- análisis de tensión/topología;
- export 3D futuro.

## Fase 6 — Knitting Engine
- colorwork / Fair Isle;
- intarsia;
- mosaic knitting;
- knit/purl/slip;
- yarn over;
- aumentos/disminuciones;
- cables;
- lace;
- brioche;
- empty cells;
- filas de ancho variable;
- símbolos custom;
- replace-all;
- instrucciones;
- pattern checker;
- leyenda automática.

## Fase 7 — Embroidery / Thread crafts
- cross stitch completo;
- backstitch;
- fractional stitches;
- French knots;
- blackwork;
- embroidery grid;
- friendship bracelets / alpha patterns;
- kumihimo;
- macramé;
- tablet weaving;
- bolillo / bobbin-lace research.

Estas técnicas entran mediante adapters nuevos; no deben inflar el Grid Engine si requieren grafos o geometrías diferentes.

## Fase 8 — Exportación profesional
- PNG;
- SVG;
- PDF;
- CSV/XLSX de materiales;
- Letter/A4;
- print preview;
- multipágina/paneles;
- chart + leyenda + materiales;
- word chart;
- stringing sequence;
- rope diagram;
- notas;
- branding;
- QR al proyecto compartido.

## Fase 9 — Comunidad
- perfiles;
- proyectos públicos/privados;
- follows;
- likes;
- comentarios;
- colecciones;
- tags por técnica;
- remixes/forks;
- versiones;
- testers;
- CAL/KAL/Bead Along;
- grupos;
- chats;
- galerías de trabajos terminados.

## Fase 10 — Marketplace
- patrones gratis/pago;
- donaciones;
- comisión pequeña;
- licencias de patrón;
- previews protegidos;
- actualizaciones a compradores;
- bundles;
- perfiles de diseñadores;
- ventas de materiales opcionales vía enlaces externos.

## Regla de arquitectura

Antes de programar un motor complejo:

1. buscar implementación open source mantenida;
2. revisar licencia;
3. reutilizar o portar sólo si es compatible;
4. encapsularla detrás de un adapter;
5. mantener el formato OpenPattern independiente del motor externo;
6. añadir tests antes de activar la técnica en producción.
