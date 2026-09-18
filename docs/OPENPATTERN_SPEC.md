# OpenPattern v1 — borrador

Documento JSON mínimo:

```json
{
  "schemaVersion": 1,
  "techniqueId": "tapestry-crochet",
  "title": "Mi patrón",
  "grid": {
    "width": 3,
    "height": 2,
    "cells": [0, 1, 0, 1, 1, 0]
  },
  "palette": [
    { "id": "c0", "name": "Blanco", "rgb": [255,255,255] },
    { "id": "c1", "name": "Negro", "rgb": [0,0,0] }
  ],
  "metadata": {
    "createdAt": "ISO-8601",
    "updatedAt": "ISO-8601"
  }
}
```

Reglas iniciales:

- `cells.length === width * height`.
- Cada celda guarda el índice de la paleta.
- `schemaVersion` es obligatorio.
- `techniqueId` referencia al registry; una técnica desconocida no invalida el grid.
