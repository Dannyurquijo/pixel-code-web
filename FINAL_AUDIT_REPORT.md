# Final Audit Report

Fecha de reauditoría: 25 de septiembre de 2026
Rama: `audit/security-performance-improvements`  
Estado: cambios implementados y verificados localmente; producción no modificada.

## Estado inicial

- Webhook de webinar expuesto en frontend e historial Git.
- Webhooks de Make verificables sin autenticación.
- Formulario general con destino placeholder y flujo roto.
- Pixie reutilizaba la clave de Gemini como secreto de firma cuando faltaba `PIXIE_STATE_SECRET`.
- Historial de Pixie persistente sin expiración ni borrado visible.
- LCP móvil 3.5 s y Lighthouse Performance 77; escritorio 85.
- Páginas heredadas con zoom bloqueado, referencias de logo rotas y número de WhatsApp placeholder.
- Aviso de privacidad incompleto y no enlazado desde Business Scan.
- 23 pruebas automatizadas.

## Cambios realizados

### Seguridad y Make

- Se eliminó el envío directo navegador → Make.
- Se añadieron `/api/webinar-register` y `/api/contact-register` como Functions server-to-server.
- Se aplicaron esquema cerrado, normalización, límites de tamaño, origen permitido, honeypot, consentimiento, rate limit, timeout y respuestas sin caché.
- La autenticación de Make usa `x-make-apikey`; la clave nunca forma parte del payload.
- Pixie exige `MAKE_PIXIE_API_KEY` para notificar y ya no reutiliza `GEMINI_API_KEY` para firmar estado.
- Sin `PIXIE_STATE_SECRET`, Pixie sigue respondiendo pero descarta estado cliente no confiable y no emite token firmado.
- Se incorporaron IDs de evento para trazabilidad e idempotencia downstream.
- Se desactivó el Pixie heredado y se activó `DUPC — Web Intake Seguro (Pixie, Contacto y Webinar)` con un único webhook autenticado, seis rutas filtradas y conexiones sanas a Google Sheets, Gmail y Telegram.
- Las credenciales de Make se seleccionan como un par atómico. Webinar, contacto y manuales ignoran las variables antiguas para evitar combinar la URL de un escenario con la clave de otro.
- Se verificaron cuatro ejecuciones sintéticas de extremo a extremo: Pixie, webinar, contacto y manual; todas terminaron correctamente con tres operaciones cada una.
- Se documentó la rotación atómica en `MAKE_SECURITY_MIGRATION.md`.

### Privacidad

- Nuevo aviso integral enlazable en `/privacidad.html`, con responsable, domicilio, categorías de datos, finalidades, proveedores, IA, conservación y ejercicio de derechos ARCO.
- Business Scan muestra el enlace antes del consentimiento.
- Pixie limita el historial local a 40 mensajes, depura conversaciones de más de 30 días y ofrece “Eliminar conversación”.
- Se retiró logging cliente por mensaje.
- Se añadieron `/terminos.html` y `/cookies.html`, enlazados entre sí y desde el control persistente de privacidad.
- Todas las entradas públicas cargan un panel de consentimiento común: aparece sólo cuando no existe una decisión guardada y puede reabrirse después.
- El sitio declara que actualmente no activa cookies publicitarias ni analítica opcional propia; el almacenamiento esencial se documenta por nombre y finalidad.
- Se añadió un velo de carga global limitado a una vez por sesión de navegador, con salida automática y soporte para `prefers-reduced-motion`.
- El formulario heredado de cursos dejó de enviar datos a FormSubmit y ahora usa `/api/contact-register`, consentimiento explícito, honeypot y estados accesibles.
- La descarga de manuales dejó de enviar datos directamente a FormSubmit; usa `/api/manual-register`, reutiliza el canal autenticado de contacto y conserva la descarga si la notificación falla.

### Performance y experiencia

- Intro inicial reducida de 1.85 s a 0.76 s; salida reducida de 0.76 s a 0.36 s.
- El H1 deja de esperar la secuencia de animación para pintarse.
- La hoja de Google Fonts se solicita desde HTML con `preconnect`, evitando la cadena serial de `@import`.
- Assets versionados y caché semanal; chunks con hash del Business Scan usan caché inmutable anual.
- El launcher de Pixie se compacta en móvil después de iniciar el scroll.
- Targets del footer y sliders ampliados.

### Accesibilidad, SEO y CRO

- Nombre accesible de Pixie alineado con el texto visible.
- Zoom restaurado en páginas que lo bloqueaban.
- Labels e IDs explícitos, autocompletado, límites de longitud y estados de error accesibles en formularios.
- Se corrigió un sink de `innerHTML` con contenido controlado por usuario.
- Formularios de webinar y proyecto muestran error sin perder la página y redirigen sólo al recibir `202 Accepted`.
- Canonicals/descriptions añadidos a rutas comerciales; páginas transaccionales marcadas `noindex`.
- Sitemap ampliado y referencias locales rotas corregidas.
- WhatsApp placeholder sustituido por el número oficial ya usado por el sitio.

## Archivos principales modificados

- `netlify/functions/webinar-register.mjs`
- `netlify/functions/contact-register.mjs`
- `netlify/functions/manual-register.mjs`
- `netlify/functions/pixie/chat-core.js`
- `netlify/functions/pixie/make-webhook.js`
- `assets/js/webinar-registration.js`
- `assets/js/contact-registration.js`
- `assets/js/pixie/conversation-store.js`
- `assets/js/home.js`, `assets/js/intro.js`, `assets/js/demo-suplementos.js`
- `assets/css/premium-home.css`, `assets/css/conversion-modules.css`
- `assets/css/site-consent.css`, `assets/css/legal.css`, `assets/js/site-consent.js`
- `webinarlanding.html`, `cursolanding.html`, `landing.html`, `index.html`, `privacidad.html`, `terminos.html`, `cookies.html`
- `business-scan-src/src/BusinessScan.tsx`
- `netlify.toml`, `.env.example`, `sitemap.xml`
- pruebas de Pixie, webinar y contacto.

## Vulnerabilidades corregidas

| ID | Antes | Después | Verificación |
|---|---|---|---|
| SEC-001 | Webhook Make expuesto en frontend | URL sólo en entorno servidor; frontend llama `/api/webinar-register` | escaneo de secretos + pruebas endpoint |
| SEC-002 | Formularios sin controles server-side uniformes | origen, tamaño, tipo, esquema, honeypot, consentimiento y rate limit | 7 pruebas de formularios |
| SEC-003 | Secreto Gemini reutilizado para firma | secreto independiente; fail-safe sin confianza cliente | pruebas Pixie y revisión de código |
| SEC-004 | Sink `innerHTML` con nombre de usuario | nodos DOM y `textContent` | revisión estática |
| PRIV-001 | Historial local indefinido | máximo 40 mensajes, retención 30 días y borrado visible | prueba automatizada |

## Performance antes/después

Lighthouse 12.8.2, una corrida por perfil. El “antes” corresponde a producción auditada el 23 de septiembre; el “después” a servidor local el 24 de septiembre. Por ser entornos distintos, sirve como evidencia direccional y debe repetirse en el deploy preview.

| Métrica | Móvil antes | Móvil después | Desktop antes | Desktop después |
|---|---:|---:|---:|---:|
| Performance | 77 | 85 | 85 | 94 |
| Accessibility | 100 | 100 | 100 | 100 |
| Best Practices | 93 | 100 | 93 | 100 |
| SEO portada | 100 | 100 | 100 | 100 |
| FCP | 3.3 s | 2.8 s | 1.5 s | 1.0 s |
| LCP | 3.5 s | 3.0 s | 1.5 s | 1.1 s |
| TBT | 170 ms | 0 ms | 0 ms | 10 ms |
| CLS | 0 | 0 | 0.017 | 0.017 |
| Requests | 19 | 17 | 19 | 17 |

El peso local fue 371 KiB frente a 250–254 KiB de producción. No se declara mejora de transferencia porque el servidor local no aplicó la misma compresión/CDN y el logo de 129 KiB sigue pendiente de reemplazo visual validado.

## Tests ejecutados

- `node --test --test-isolation=none ...`: **42/42 pasan**.
- TypeScript `tsc`: **pasa**.
- Vite production build: **pasa**, 220 módulos transformados.
- `pnpm audit --prod --audit-level low`: **0 vulnerabilidades conocidas**.
- Escaneo local de referencias `href/src`: **0 rotas**.
- Escaneo de placeholders/webhooks/secrets actuales: sin webhook Make ni placeholders confirmados en código ejecutable; los valores sintéticos de tests permanecen intencionalmente.
- Deploy Preview de Netlify `6ab73d0e4ef124000804777d`: build y reglas **pasan**; portada y páginas de privacidad, términos, cookies, manuales y cursos responden `200`.
- `/api/manual-register` en preview rechaza un payload vacío con `400` antes de intentar una entrega downstream.
- QA visual local: banner visible en primer acceso, preferencia persistente entre páginas, control para reabrirla, aviso integral renderizado y **0 errores o warnings de consola** en la revisión.
- La primera prueba E2E detectó que el entorno de preview no aportaba `DEPLOY_PRIME_URL` a la Function y el propio origen era rechazado. Se corrigió con comparación estricta contra el origen de la URL solicitada y se añadieron regresiones para Pixie, webinar, contacto, manuales y Business Scan; orígenes externos continúan rechazados.
- Una segunda prueba E2E detectó que variables antiguas podían mezclar una URL de contacto con la clave consolidada. Se sustituyeron por un único par atómico y la repetición devolvió `202` en webinar, contacto y manual; Pixie devolvió `200` con notificación enviada. Make registró cuatro ejecuciones `success`, sin ejecuciones incompletas.

## Dependencias modificadas

Ninguna. Se evitó introducir paquetes y no se realizaron actualizaciones mayores automáticas.

## Problemas pendientes y riesgos residuales

1. **P0 operativo:** habilitar `MAKE_PIXIE_WEBHOOK_URL`, `MAKE_PIXIE_API_KEY` y `PIXIE_STATE_SECRET` en el contexto Production de Netlify antes de fusionar la rama.
2. **P0 operativo:** fusionar la rama, verificar el deploy del dominio público y repetir smoke tests sin datos reales. El escenario heredado permanece inactivo como rollback; su webhook debe revocarse después del periodo de observación.
3. **P2:** eliminar el runtime de Tailwind/Lucide en páginas heredadas y servir CSS/JS compilado localmente. La CSP de esas páginas aún requiere `unsafe-inline`.
4. **P2:** reemplazar `du-logo-Cuadrado.png`; contiene AVIF bajo extensión PNG y pesa 129 KiB.
5. **P2:** decidir explícitamente si Cloudflare Web Analytics se habilita con consentimiento/CSP o se desactiva; hoy el beacon inyectado puede quedar bloqueado.
6. **P2:** añadir monitorización de errores y pruebas E2E. `dataLayer` no equivale a observabilidad.
7. **P3:** unificar páginas Tailwind heredadas con la arquitectura de assets del sitio principal.
8. **P1 legal/operativo:** obtener revisión profesional del aviso y los términos, confirmar razón o régimen fiscal y RFC que deban mostrarse en contratación electrónica, y documentar plazos reales de conservación por sistema. No se inventaron esos datos.
9. **P2 privacidad:** si se añade una herramienta de analítica o publicidad, incrementar la versión del consentimiento, identificar proveedor y finalidades y volver a solicitar una decisión antes de cargarla.

## Riesgos de implementación

- Publicar sin extender el par consolidado al contexto Production dejaría las notificaciones no disponibles; el merge queda condicionado a esa verificación.
- Repetir pruebas sintéticas de webinar crea filas y correos de prueba; deben identificarse y limpiarse conforme a la política operativa.
- El cache largo sólo se aplica de forma inmutable a chunks con hash; assets no hasheados usan una semana y deben conservar query versionada.
- El aviso de privacidad es una mejora técnica/documental y debe recibir revisión legal si el negocio requiere cumplimiento formal específico.

## Verificación posterior al despliegue

1. Confirmar las tres variables secretas en el contexto Production.
2. Fusionar y verificar el deploy público, headers y páginas legales.
3. Repetir una prueba controlada por endpoint y confirmar una única ejecución en Make y el destino correcto.
4. Lighthouse móvil/escritorio tres veces y reportar la mediana.
5. Revisión de consola, red, CSP, status codes, cookies y headers.
6. Navegación con teclado y lectores de pantalla en portada, formularios y Business Scan.
7. Monitoreo de errores/duplicados durante 24 horas antes de retirar definitivamente los webhooks anteriores.

## Scorecard posterior

| Área | Antes | Después | Sustento |
|---|---:|---:|---|
| Seguridad | 58 | 86 | exposición eliminada, proxy validado, par atómico secreto y webhook autenticado verificado; revocación heredada pendiente |
| Performance | 77 | 85 | Lighthouse móvil; desktop 85 → 94 |
| UX/UI | 76 | 83 | intro más corta, errores visibles, panel de privacidad reutilizable y control de chat |
| Mobile | 72 | 84 | zoom, launcher compacto y targets ampliados |
| SEO | 73 | 84 | metadata, noindex y sitemap; páginas heredadas aún incompletas |
| Accesibilidad | 78 | 89 | Lighthouse 100, labels, nombre accesible, zoom y targets; falta prueba AT completa |
| CRO | 62 | 83 | formularios y destinos verificados en preview, consentimiento claro y estados de error visibles |
| Calidad de código | 70 | 85 | 42 tests, build/typecheck, sink XSS eliminado y controles legales compartidos |
| Arquitectura | 72 | 87 | frontera navegador/Functions/Make, credenciales atómicas y rutas consolidadas por evento |
| Mantenibilidad | 61 | 70 | documentación y tests; deuda Tailwind inline persiste |
| Observabilidad | 38 | 48 | IDs de evento y logs sin PII; falta plataforma de errores |
| Preparación para producción | 57 | 82 | preview y E2E verdes; falta extender secretos a Production, fusionar y verificar el dominio |

## Matriz final

| Área | Antes | Después | Evidencia |
|---|---|---|---|
| Security | Webhook público y secreto compartido | proxy autenticado, validado y fail-safe | tests + escaneo + revisión Make |
| Performance | móvil 77, LCP 3.5 s | móvil 85, LCP 3.0 s | Lighthouse 12.8.2 |
| SEO | metadata/sitemap parciales | rutas comerciales ampliadas y transaccionales noindex | revisión HTML/sitemap |
| Accessibility | portada 100, fallos manuales | portada 100 + labels, zoom, targets y nombre accesible | Lighthouse + revisión estática |
| UX/UI | intro larga y errores débiles | intro 0.76 s, feedback y control de datos | código + Lighthouse |
| Mobile | zoom bloqueado y widget ancho | zoom habilitado y launcher compacto | revisión responsive |
| CRO | formularios rotos | endpoints y estados funcionales en Deploy Preview | pruebas E2E con Make |
| Code Quality | 23 tests | 42 tests, build/typecheck/audit limpios | salida de herramientas |
