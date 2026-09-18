# OpenPattern engineering rules

1. Reutiliza un motor existente antes de crear uno nuevo.
2. No acoples `GridEngine` a crochet, cuentas, knitting o punto de cruz. Las técnicas son adapters/configuración.
3. La representación matemática del patrón nunca depende de la UI.
4. El editor debe poder funcionar offline.
5. El procesamiento de imagen ocurre en cliente cuando sea posible.
6. No representar cada celda como un componente DOM/React independiente.
7. Todo formato persistente lleva `schemaVersion`.
8. Los patrones antiguos deben migrarse; nunca se rompen silenciosamente.
9. No añadir una dependencia si la plataforma web o la biblioteca estándar lo resuelven de forma razonable.
10. Los cambios de comportamiento llevan una prueba reproducible.
11. Seguridad, accesibilidad, validación y prevención de pérdida de datos no se simplifican por reducir código.
12. Antes de construir una abstracción, demostrar al menos dos consumidores reales o una necesidad explícita del roadmap.

## Motores previstos

- Grid Engine
- Symbol Engine
- Sequence Engine
- Thread/Graph Engine
- Measurement Engine
- Geometry Engine

Sólo Grid Engine se implementa en esta primera fase.
