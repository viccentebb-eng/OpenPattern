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

Responsable de formato persistente, schemaVersion, metadata, paleta, grid y validación común. No conoce la UI.

## Grid Engine

Responsable de operaciones de celdas: lectura/escritura, fill, flood fill, espejo y futuras selecciones/transformaciones.

## Technique Registry

Cada técnica declara capacidades. El patrón universal no cambia, pero la presentación sí.

En la web, `technique-renderers.mjs` traduce el grid universal a vistas especializadas:
- cross stitch: cruces + símbolos;
- bead loom: cuentas redondeadas;
- knitting colorwork: marca visual de punto;
- C2C: bloque con dirección;
- tapestry crochet: celda sólida.

Los códigos comerciales reales (DMC, Miyuki, TOHO, etc.) son una capa de materiales y no se inventan desde el renderer.

## Conversion Studio

La imagen fuente se conserva en memoria durante la sesión. Cambiar ancho, colores o ajustes vuelve a ejecutar:

```text
Source image
 -> resize/sample
 -> brightness/contrast/saturation
 -> optional light neutral grid cleanup
 -> palette extraction
 -> nearest-color mapping
 -> universal grid
 -> technique renderer
```

El usuario puede regenerar manualmente o activar regeneración automática.

## Persistencia futura

Local-first:

```text
IndexedDB -> sync opcional -> PostgreSQL / object storage
```

El editor debe seguir siendo útil sin cuenta ni conexión.
