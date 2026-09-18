# Arquitectura

## Principio

Una técnica no es una aplicación separada. Es una combinación de motores y una vista especializada.

Technique Adapter:
- Grid Engine
- Symbol Engine
- Sequence Engine
- Thread/Graph Engine
- Geometry/Layout Engine
- Measurement Engine
- Materials Engine

## Workspace Shell

OpenPattern usa tres zonas: herramientas y Conversion Studio, lienzo central e inspector técnico.

El inspector cambia según la técnica sin duplicar el editor. Contiene Pattern Viewer, opciones de renderer, guías, coordenadas, modo seguimiento, paleta, leyenda e historial.

## Grid Engine

Mantiene una cuadrícula universal para colorwork, cross stitch, bead loom, C2C y otras técnicas compatibles.

## Technique Renderers

El dato no cambia; cambia cómo se representa:
- Cross stitch: cruces, símbolos o ambos.
- Bead loom: cuenta plana o realista, perfil físico, hueco central y etiquetas.
- Knitting colorwork: bloque, V o símbolo.
- C2C: bloque con guía diagonal.
- Tapestry: celdas de color.

Los perfiles iniciales de cuentas guardan dimensiones aproximadas. Los códigos comerciales pertenecen al Materials Engine.

## Geometry/Layout Engine

Resolverá topologías que no son una cuadrícula rectangular: peyote desplazado, brick, estrellas y warped squares, triángulos, medallones, rosettes, huichol/netting, círculos, arcos, componentes reutilizables y thread paths.

No se debe falsificar estas técnicas dibujándolas sobre una cuadrícula cuadrada.

## Symbol Engine

Los puntos de crochet y knitting no son píxeles. Cada símbolo tendrá tipo, orientación, escala, conexiones, fila/vuelta, semántica, leyenda y texto equivalente.

Permitirá rows, rounds, freeform, agrupaciones, indicadores y charts múltiples.

## Sequence Engine

Representará filas, vueltas, repeticiones, aumentos/disminuciones, conteos, word charts e instrucciones escritas. También validará matemáticas e inconsistencias.

## Crochet Graph + 2D/3D

Camino previsto: instrucciones -> parser -> stitch graph -> validación -> chart SVG -> layout 2D/3D.

Nodos = puntos/conexiones. Aristas = tramos de hilo/conexiones.

## Conversion Studio

Flujo: imagen -> resize -> ajustes -> limpieza -> cuantización -> grid universal -> renderer técnico.

La fuente permanece en memoria durante la sesión para regenerar sin volver a subir.

## Materials Engine

Mantendrá catálogos reales y separados del renderer: DMC, Anchor, Miyuki, TOHO, Preciosa, hilos, acabados, formas, dimensiones e inventario.

El matching de color deberá usar espacio perceptual; no se inventarán códigos por RGB.

## Persistencia

Local-first: IndexedDB -> sync opcional -> PostgreSQL/object storage.
