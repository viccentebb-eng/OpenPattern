# Constraints

## Rendimiento

- Evitar una celda = un nodo DOM.
- El grid se renderiza en Canvas.
- Conversión de imágenes grandes se moverá a Web Worker antes de producción.
- Medir antes de introducir WebGL/WebGPU.

## Compatibilidad

- Todo documento persistido incluye `schemaVersion`.
- Nuevas versiones del esquema deben incluir migración.
- Técnica desconocida debe poder abrirse en modo lectura básica cuando el grid sea compatible.

## Seguridad

- Nada de secretos en cliente.
- Imágenes y archivos deben validarse antes de subida al servidor.
- Marketplace, auth y comunidad quedan fuera del núcleo del editor.

## Producto

- Editor base gratuito.
- No bloquear exportación básica detrás de pago.
- Marketplace opcional y donaciones son capas separadas.
