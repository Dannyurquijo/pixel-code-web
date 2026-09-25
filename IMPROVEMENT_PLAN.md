# IMPROVEMENT PLAN — DU Pixel Code

Fecha: 2026-09-23  
Estado: propuesta; no autorizada para ejecución

## Principios de ejecución

- Rama futura: `audit/security-performance-improvements`.
- Sin cambios directos en producción.
- P0 antes de P1; cambios pequeños, reversibles y verificables.
- Nunca versionar ni imprimir secretos.
- No actualizar dependencias mayores automáticamente.
- Cada bloque exige build, typecheck, tests y checks de seguridad aplicables.

## Quick Wins

| Acción | Prioridad | Esfuerzo | Evidencia de cierre |
|---|---:|---:|---|
| Rotar/revocar webhook público y preparar proxy seguro | P0 | M | Endpoint viejo rechazado; nuevo valor sólo server-side |
| Sustituir logo por variante 48/96 px optimizada | P1 | XS | Lighthouse elimina ≈125 KiB desperdiciados |
| Corregir nombre accesible de Pixie | P1 | XS | Lighthouse/axe sin mismatch |
| Enlazar aviso de privacidad en Business Scan | P1 | S | Link visible antes del consentimiento |
| Corregir `TU_HASH_AQUI`, teléfono placeholder y logo 404 o retirar páginas | P1 | S | smoke/link checker verde |
| Eliminar `user-scalable=no` | P1 | XS | zoom 200% funcional |
| Cambiar DOM injection de suplemento a `textContent` | P2 | XS | payload se muestra literal |
| Resolver beacon Cloudflare: permitirlo conscientemente o desactivarlo | P1 | S | consola/Lighthouse sin error CSP |

## Primeras 24 horas

1. Crear rama y tag/commit de referencia sin incluir secretos.
2. Contener `SEC-001`:
   - revocar/rotar en Make con coordinación;
   - añadir Function proxy con validación de esquema, honeypot, límite de cuerpo, rate limit e idempotencia;
   - eliminar URL del cliente;
   - probar en deploy preview.
3. Despublicar/noindex temporalmente cualquier formulario no funcional si no se puede completar en el mismo bloque.
4. Corregir privacidad enlazada, nombre accesible Pixie, zoom y activos 404.
5. Ejecutar tests existentes, build, typecheck, secret scan y smoke tests.
6. Registrar rollback y evidencia; no desplegar producción sin revisión del usuario.

## 7 días

### Performance

- Desacoplar render del H1 de la intro/animaciones.
- Diferir canvas ambiental/core cuando no sea crítico y mantener fallback.
- Optimizar logo con `srcset`.
- Preconnect o self-host/subset de Montserrat.
- Añadir budget: LCP lab móvil ≤2.5 s, CLS ≤0.1, TBT ≤200 ms, transfer portada ≤200 KiB como objetivo inicial sujeto a validación visual.

### Seguridad y privacidad

- Hacer obligatorio `PIXIE_STATE_SECRET` dedicado.
- TTL/purge y botón borrar conversación Pixie.
- CSP report-only para rutas heredadas; inventario de violaciones.
- Revisar Netlify/Cloudflare/Supabase/Make/Gemini/GitHub con acceso de sólo lectura.
- Confirmar Supabase RLS, tabla, retención, backups y alcance de service role.

### QA, accesibilidad y CRO

- Tests de links, formularios y rutas críticas.
- Axe + teclado + zoom + reduced motion.
- Compactar launcher Pixie en móvil sin solapar CTAs.
- Revisar copy de 65%, “100% propiedad” y stack tecnológico.
- Añadir casos/prueba social sólo con evidencia verificable.

## 30 días

- Migrar páginas activas a un layout/generador compartido.
- Eliminar Tailwind runtime y Lucide CDN de producción; empaquetar assets.
- Aplicar CSP homogénea con nonce/hash o sin inline code.
- Definir convención URL y redirects 301; regenerar sitemap/canonicals.
- Añadir Schema/OG/Twitter por plantilla.
- Implementar analytics consentido, embudo y error monitoring.
- Añadir CI con build, typecheck, unit, lint, e2e, audit, secret scan, link checker y Lighthouse budgets.
- Definir ownership, runbooks, alertas, rotación y prueba de recuperación.

## Backlog

- Migración incremental de páginas de academia/ventas heredadas.
- Design tokens compartidos y reducción de CSS monolítico.
- Pruebas visuales por breakpoint.
- RUM propio o proveedor privacy-aware para CWV/INP reales.
- Revisión de copy y contenidos con Brand/CRO.
- Revisión de PDFs/descargas y headers específicos.
- Estrategia de borrado/retención de leads y solicitudes de derechos.
- Revisión periódica trimestral de dependencias y CSP.
- Evaluación de Three.js/R3F sólo si aporta una mejora demostrable; el WebGL actual es nativo y razonablemente limitado.

## Dependencias propuestas

No se requiere una dependencia nueva para P0. Cualquier propuesta se aprobará por separado.

- Posible minor: `@google/genai` 2.23.0 → 2.24.0, después de tests.
- Tipos React 19.3: opcional, bajo riesgo, no urgente.
- No actualizar todavía TypeScript 7 ni `@types/node` 26.
- Herramientas de CI/lint/e2e: seleccionar sólo tras acordar arquitectura; preferir la mínima superficie.

## Archivos previstos

P0/P1 probablemente tocaría:

- `webinarlanding.html`
- `netlify/functions/webinar-register.mjs` (nuevo)
- `netlify.toml`
- `index.html`
- `assets/js/intro.js`, `home.js`, `pixie-widget.js`
- `assets/js/pixie/conversation-store.js`, `session-manager.js`
- `assets/js/demo-suplementos.js`
- `assets/css/premium-home.css`, `pixie-mascot.css`
- `business-scan-src/src/BusinessScan.tsx`, `styles.css`
- variantes optimizadas de `du-logo-Cuadrado.png`
- `landing.html`, `landing-manuales.html`, `cursos.html`, `pago-exitoso.html`
- tests y `package.json`

P2/P3 ampliaría a HTML indexables, sitemap, CI y layouts compartidos.

## Matriz de riesgo y rollback

| Bloque | Riesgo | Mitigación/rollback |
|---|---|---|
| Rotación webhook | Interrupción de leads | Proxy probado en preview; ventana coordinada; rollback de Function, nunca restaurar secreto expuesto |
| CSP | Ruptura de scripts/estilos | Report-only, inventario y rollout por ruta |
| Performance/motion | Pérdida de dirección visual | flags/clases reversibles y comparación visual |
| URLs/SEO | Pérdida de indexación | mapa 1:1, 301, canonical y crawler antes de deploy |
| Analytics | Privacidad o datos duplicados | consent mode, entorno de prueba y evento idempotente |
| Refactor | Regresión multipágina | migración por ruta, e2e y visual diff |

## Gates de aprobación

No ejecutar ninguna acción hasta recibir `APROBADO – EJECUTA LAS MEJORAS`.

Incluso después de esa aprobación, cambios externos irreversibles o sensibles —rotación de Make, variables Netlify, configuración Cloudflare/Supabase/GitHub— se prepararán y coordinarán explícitamente antes del paso de impacto.
