# OpenPattern Starter

Starter técnico para una plataforma web abierta de patrones textiles y manualidades.

## Objetivos de esta fase

- Un solo formato de patrón para varias técnicas.
- Grid Engine compartido por crochet de color, bead loom, punto de cruz y knitting colorwork.
- Conversión inicial de imagen/pixel art a patrón.
- Sin dependencias de runtime.
- Funciona en navegador.
- Base preparada para Symbol, Sequence, Thread/Graph, Measurement y Geometry engines.

## Ejecutar

```bash
npm test
python -m http.server 4173
```

Después abre:

`http://localhost:4173/web/`

## Qué incluye el demo

1. Selección de técnica.
2. Subir fotografía o pixel art.
3. Elegir ancho del patrón y número máximo de colores.
4. Convertir a cuadrícula.
5. Pintar celdas manualmente.
6. Espejar horizontalmente.
7. Exportar un patrón JSON compatible con el esquema OpenPattern v1 inicial.

## Próximo paso

Añadir guardado local con IndexedDB, undo/redo, zoom/pan, selección, paletas físicas y exportación PDF/SVG.
