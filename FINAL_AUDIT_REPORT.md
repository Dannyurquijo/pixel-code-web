# Final Audit Report

Fecha de reauditoría: 24 de septiembre de 2026  
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
- Se verificó Make de forma read-only: Pixie activo/sano; Webinar inactivo/sano; ambos webhooks actuales sin autenticación. No se alteraron escenarios activos ni secretos de producción.
- Se documentó la rotación atómica en `MAKE_SECURITY_MIGRATION.md`.

### Privacidad

- Nuevo aviso integral enlazable en `/privacidad.html`.
- Business Scan muestra el enlace antes del consentimiento.
- Pixie limita el historial local a 40 mensajes, depura conversaciones de más de 30 días y ofrece “Eliminar conversación”.
- Se retiró logging cliente por mensaje.

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
- `netlify/functions/pixie/chat-core.js`
- `netlify/functions/pixie/make-webhook.js`
- `assets/js/webinar-registration.js`
- `assets/js/contact-registration.js`
- `assets/js/pixie/conversation-store.js`
- `assets/js/home.js`, `assets/js/intro.js`, `assets/js/demo-suplementos.js`
- `assets/css/premium-home.css`, `assets/css/conversion-modules.css`
- `webinarlanding.html`, `landing.html`, `index.html`, `privacidad.html`
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

- `node --test --test-isolation=none ...`: **29/29 pasan**.
- TypeScript `tsc`: **pasa**.
- Vite production build: **pasa**, 220 módulos transformados.
- `pnpm audit --prod --audit-level low`: **0 vulnerabilidades conocidas**.
- Escaneo local de referencias `href/src`: **0 rotas**.
- Escaneo de placeholders/webhooks/secrets actuales: sin webhook Make ni placeholders confirmados en código ejecutable; los valores sintéticos de tests permanecen intencionalmente.

## Dependencias modificadas

Ninguna. Se evitó introducir paquetes y no se realizaron actualizaciones mayores automáticas.

## Problemas pendientes y riesgos residuales

1. **P0 operativo:** rotar los webhooks de Make y configurar API keys/variables en un deploy preview. El código nuevo no debe publicarse antes de este paso porque los formularios fallarán de forma segura si faltan secretos.
2. **P1:** validar el flujo real de una inscripción, un contacto y una alerta Pixie con datos sintéticos; confirmar rechazo sin API key y ausencia de duplicados.
3. **P2:** eliminar el runtime de Tailwind/Lucide en páginas heredadas y servir CSS/JS compilado localmente. La CSP de esas páginas aún requiere `unsafe-inline`.
4. **P2:** reemplazar `du-logo-Cuadrado.png`; contiene AVIF bajo extensión PNG y pesa 129 KiB.
5. **P2:** decidir explícitamente si Cloudflare Web Analytics se habilita con consentimiento/CSP o se desactiva; hoy el beacon inyectado puede quedar bloqueado.
6. **P2:** añadir monitorización de errores y pruebas E2E. `dataLayer` no equivale a observabilidad.
7. **P3:** unificar páginas Tailwind heredadas con la arquitectura de assets del sitio principal.

## Riesgos de implementación

- Rotar un webhook sin cambiar primero las variables de staging puede perder notificaciones.
- Activar el escenario de webinar sin una prueba sintética puede crear filas o correos duplicados.
- El cache largo sólo se aplica de forma inmutable a chunks con hash; assets no hasheados usan una semana y deben conservar query versionada.
- El aviso de privacidad es una mejora técnica/documental y debe recibir revisión legal si el negocio requiere cumplimiento formal específico.

## Verificación posterior al despliegue

1. Deploy preview con secretos nuevos.
2. Prueba negativa sin API key y prueba positiva por cada endpoint.
3. Confirmar una única ejecución en Make y destino correcto.
4. Lighthouse móvil/escritorio tres veces y reportar la mediana.
5. Revisión de consola, red, CSP, status codes, cookies y headers.
6. Navegación con teclado y lectores de pantalla en portada, formularios y Business Scan.
7. Monitoreo de errores/duplicados durante 24 horas antes de retirar definitivamente los webhooks anteriores.

## Scorecard posterior

| Área | Antes | Después | Sustento |
|---|---:|---:|---|
| Seguridad | 58 | 82 | exposición eliminada del cliente, validación server-side, secretos separados; rotación Make pendiente |
| Performance | 77 | 85 | Lighthouse móvil; desktop 85 → 94 |
| UX/UI | 76 | 82 | intro más corta, errores visibles, privacidad y control de chat |
| Mobile | 72 | 84 | zoom, launcher compacto y targets ampliados |
| SEO | 73 | 84 | metadata, noindex y sitemap; páginas heredadas aún incompletas |
| Accesibilidad | 78 | 89 | Lighthouse 100, labels, nombre accesible, zoom y targets; falta prueba AT completa |
| CRO | 62 | 78 | formularios reparados localmente y consentimiento claro; falta validación real de Make |
| Calidad de código | 70 | 83 | 29 tests, build/typecheck, sink XSS eliminado |
| Arquitectura | 72 | 82 | frontera navegador/Functions/Make y secretos server-side |
| Mantenibilidad | 61 | 70 | documentación y tests; deuda Tailwind inline persiste |
| Observabilidad | 38 | 48 | IDs de evento y logs sin PII; falta plataforma de errores |
| Preparación para producción | 57 | 74 | controles y pruebas listos; secretos/rotación y deploy preview pendientes |

## Matriz final

| Área | Antes | Después | Evidencia |
|---|---|---|---|
| Security | Webhook público y secreto compartido | proxy autenticado, validado y fail-safe | tests + escaneo + revisión Make |
| Performance | móvil 77, LCP 3.5 s | móvil 85, LCP 3.0 s | Lighthouse 12.8.2 |
| SEO | metadata/sitemap parciales | rutas comerciales ampliadas y transaccionales noindex | revisión HTML/sitemap |
| Accessibility | portada 100, fallos manuales | portada 100 + labels, zoom, targets y nombre accesible | Lighthouse + revisión estática |
| UX/UI | intro larga y errores débiles | intro 0.76 s, feedback y control de datos | código + Lighthouse |
| Mobile | zoom bloqueado y widget ancho | zoom habilitado y launcher compacto | revisión responsive |
| CRO | formularios rotos | endpoints y estados funcionales localmente | tests de integración |
| Code Quality | 23 tests | 29 tests, build/typecheck/audit limpios | salida de herramientas |

