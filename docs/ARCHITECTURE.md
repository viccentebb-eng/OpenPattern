# Arquitectura

## Principio

Una técnica no es una aplicación separada. Es una combinación de capacidades sobre motores compartidos.

```text
Technique Adapter
    |
    +-- Grid
    +-- Symbols
    +-- Sequence
    +-- Thread/Graph
    +-- Measurements
    +-- Geometry
    +-- Materials
```

## Pattern Core

Responsable de:

- formato persistente;
- schemaVersion;
- metadata;
- paleta;
- grid;
- validación común.

No conoce la UI.

## Grid Engine

Responsable de operaciones de celdas:

- lectura/escritura;
- fill;
- flood fill;
- espejo;
- futuras selecciones y transformaciones.

## Technique Registry

Cada técnica declara capacidades y reglas. En esta fase:

- tapestry-crochet
- c2c-crochet
- bead-loom
- cross-stitch
- knitting-colorwork

## Image Pipeline

```text
Image
 -> resize/sample
 -> palette extraction
 -> nearest color mapping
 -> universal grid
 -> technique adapter
```

El algoritmo inicial usa distancia RGB por simplicidad. El roadmap contempla Lab/CIEDE2000 y paletas físicas reales.

## Persistencia futura

Local-first:

```text
IndexedDB -> sync opcional -> PostgreSQL / object storage
```

El editor debe seguir siendo útil sin cuenta ni conexión.
