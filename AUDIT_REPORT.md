# AUDIT REPORT — DU Pixel Code

Fecha: 2026-09-23  
Alcance: repositorio `.deploy-repo`, rama `main`, sitio público `https://dupixelcode.com/`  
Modo: auditoría defensiva, no destructiva, sin cambios de producción  
Commit/estado: árbol limpio al iniciar; no se creó rama ni commit

## Executive Summary

El sitio tiene una portada visualmente consistente, una propuesta de valor comprensible y una base técnica más sólida en los componentes recientes: el Business Scan compila, pasa typecheck y sus 23 pruebas; las funciones de Pixie y Business Scan limitan tamaño, validan entradas, restringen orígenes, aplican rate limiting de plataforma y evitan exponer errores internos. HTTPS y los headers globales básicos están activos.

La calidad no es uniforme. Conviven una portada moderna, una aplicación React/Vite y numerosas páginas heredadas con JavaScript inline, dependencias CDN en runtime, metadata incompleta y flujos todavía configurados con placeholders. El riesgo inmediato más importante es un webhook de Make expuesto en HTML público y en el historial Git. El endpoint puede ser invocado directamente por terceros para generar spam, costos o datos contaminados; se clasifica como incidente `HIGH / P0` y debe rotarse o revocarse antes de reutilizarse tras un proxy server-side.

No se verificaron vulnerabilidades `CRITICAL`, SQL injection, SSRF, path traversal, bypass de autenticación ni exposición de claves privadas. Tampoco existe autenticación o sesión privilegiada en el alcance público auditado. Sí se confirmaron cobertura CSP parcial, un enlace de privacidad ausente en un formulario que captura datos personales, tres fallos de conversión evidentes y una regresión de observabilidad: Cloudflare intenta cargar un beacon que la CSP bloquea.

Baseline Lighthouse 12.8.2 de una sola corrida: móvil `77/100` Performance, LCP `3.5 s`, FCP `3.3 s`; escritorio `85/100`, LCP `1.5 s`, FCP `1.5 s`. Accessibility y SEO obtuvieron `100` en la portada auditada, pero esa puntuación no representa las páginas heredadas y no elimina hallazgos manuales. No existe evidencia de campo suficiente para INP/Core Web Vitals reales.

## Scope, Evidence and Limitations

Inspeccionado directamente:

- Código fuente, historial Git, configuración Netlify, lockfile y artefactos Vite.
- Sitio público, headers HTTP, sitemap, rutas, consola, DOM, escritorio/tablet/móvil y teclado.
- Lighthouse de laboratorio móvil/escritorio, build temporal, typecheck, tests y `pnpm audit`.
- Secret scanning defensivo de archivos actuales e historial, sin imprimir valores.

No inspeccionado por falta de acceso de sólo lectura:

- Dashboard y variables reales de Netlify; logs y configuración del deploy.
- Reglas Cloudflare, Analytics/Web Analytics y configuración del beacon.
- Proyecto Supabase, esquema, RLS, backups y retención.
- Escenario Make receptor del webhook, validación, permisos y costos.
- Consola Gemini, cuotas, restricciones de clave y política de datos.
- GitHub branch protection, secret scanning, Dependabot y Actions.
- Datos de campo CrUX/Search Console; INP real y conversiones reales.

La ausencia de evidencia en esos sistemas se marca `REQUIERE VERIFICACIÓN`; no se interpreta como configuración segura o insegura.

## Architecture Detected

Tecnología verificada:

- Frontend principal: HTML5, CSS y JavaScript nativo multipágina.
- Subaplicación `/diagnostico/`: React 19.3 + TypeScript 5.9 + Vite 8.3.
- Backend: Netlify Functions (`/api/chat`, `/api/business-scan`).
- IA: Google Gemini 2.5 Flash vía servidor.
- Persistencia opcional: Supabase REST con service-role exclusivamente server-side.
- Automatización: Make vía webhook server-side para Pixie y un webhook público heredado para webinar.
- Hosting/CDN observado: Netlify configurado en repositorio; respuesta pública servida detrás de Cloudflare.
- Package manager: pnpm 11.19.0; Node >=22.12.
- Autenticación: no detectada en el alcance público.
- Cookies de aplicación: no detectadas; Pixie usa `localStorage` y `sessionStorage`.
- Analytics: eventos a `window.dataLayer`, sin consumidor verificable; beacon Cloudflare bloqueado por CSP.

Mapa de datos:

```text
Usuario
  ├─ Portada/páginas HTML → Pixie (localStorage, 24 h)
  │                         ↓ POST /api/chat
  │                         Netlify Function → Gemini
  │                                           └→ Make (lead calificado)
  └─ /diagnostico/ (React)
                            ↓ POST /api/business-scan
                            Netlify Function → motor por reglas
                                             ├→ Gemini (opcional)
                                             └→ Supabase REST (opcional)

Página webinar heredada ── POST directo del navegador → Make
```

## Baseline

### Lighthouse y red — portada

| Métrica | Móvil | Escritorio | Evidencia/nota |
|---|---:|---:|---|
| Performance | 77 | 85 | Lighthouse 12.8.2, una corrida, 2026-09-23 |
| Accessibility | 100 | 100 | Sólo portada; complementado con revisión manual |
| Best Practices | 93 | 93 | Falla por CSP/Cloudflare e issue de nombre accesible |
| SEO | 100 | 100 | Sólo portada |
| FCP | 3.3 s | 1.5 s | Laboratorio |
| LCP | 3.5 s | 1.5 s | Laboratorio |
| CLS | 0 | 0.017 | Laboratorio |
| TBT | 170 ms | 0 ms | Laboratorio |
| Speed Index | 6.1 s | 2.4 s | Laboratorio |
| TTI | 3.9 s | 1.5 s | Laboratorio |
| TTFB del documento/LCP | 901 ms | 380 ms | Fase reportada por Lighthouse |
| Transferencia total | 250 KiB | 254 KiB | 19 requests |
| JavaScript transferido | 20.5 KiB | 23.4 KiB | 10 requests; 49.8 KiB sin comprimir |
| Fuentes | 71 KiB | 71 KiB | 2 fuentes + CSS Google Fonts |
| Imagen principal descargada | 126.5 KiB | 126.7 KiB | Logo cuadrado 1024×1024 mostrado a 42–46 px |
| INP / CWV de campo | No medido | No medido | Requiere RUM/CrUX/Search Console |

Lighthouse atribuye 74–75% del LCP al retraso de render, no a la descarga del elemento: el LCP es el texto del H1. Detectó `1,080 ms` de ahorro potencial en recursos render-blocking y `125 KiB` de ahorro al dimensionar el logo.

### Responsive y ejecución

- Viewports observados: 1280×720, 768×1024 y 390×844.
- Sin overflow horizontal confirmado en los tres tamaños.
- Sin errores de consola en navegación interactiva normal del navegador de auditoría.
- Altura de documento: 14,499 px desktop, 17,590 px tablet y 20,763 px móvil.
- Widget Pixie móvil: aproximadamente 216×89 px, fijo en esquina inferior.
- Navegación por teclado: skip link primero; foco visible `1.6 px` dorado; secuencia coherente.
- Sitemap: 8/8 URLs respondieron `200`; tiempos observados 341–533 ms, sin redirecciones.
- Portada pública: `200`, 34,583 bytes sin comprimir, CSP/HSTS/XFO/XCTO/Referrer/Permissions/COOP presentes.

### Calidad de build y dependencias

- `node --test`: 23/23 pruebas pasan.
- TypeScript `--noEmit`: pasa.
- Build Vite temporal: pasa; 220 módulos.
- Bundle diagnóstico: entrada 244.47 KiB (77.16 KiB gzip), CSS 13.61 KiB; chunks PDF/html2canvas diferidos suman carga adicional sólo al exportar.
- `pnpm audit --prod`: 0 vulnerabilidades conocidas en 67 dependencias transitivas auditadas.
- Obsoletas sin deprecación: `@google/genai` 2.23→2.24; tipos React 19.2→19.3; `@types/node` 24→26 y TypeScript 5.9→7 son mayores y no deben actualizarse sin validación.

## Critical Findings

No hay hallazgos `CRITICAL` confirmados. Existe un incidente `HIGH / P0` (`SEC-001`) que requiere contención prioritaria.

## Findings

### SEC-001 — Endpoint-capability de Make expuesto

- **Categoría:** Seguridad / secretos / abuso
- **Severidad:** HIGH
- **Confianza:** CONFIRMADO
- **Prioridad:** P0
- **Ubicación:** `webinarlanding.html:195`; historial Git
- **Archivo/componente:** formulario de registro al webinar
- **Descripción:** el navegador envía directamente a una URL de webhook con identificador no revocable desde el cliente. El patrón aparece también en múltiples commits.
- **Evidencia:** escaneo actual e histórico detectó `https://hook.eu1.make.com/nqz3b…****`; no se reprodujo el valor completo ni se invocó el endpoint.
- **Impacto:** spam, contaminación de leads, consumo de operaciones/costo y pérdida de disponibilidad del flujo.
- **Solución propuesta:** revocar/rotar el webhook, eliminarlo del cliente, crear Function proxy con esquema estricto, límites, honeypot/Turnstile, rate limit e idempotencia. Considerar limpieza del historial sólo tras coordinar impacto.
- **Esfuerzo:** M
- **Riesgo del cambio:** MEDIUM; el formulario queda temporalmente inactivo si se rota antes de desplegar el proxy.
- **Método de verificación:** secreto anterior devuelve rechazo; bundle/HTML/historial activo no contienen el nuevo valor; pruebas de validación/rate limit; envío legítimo llega una sola vez.

### SEC-002 — CSP parcial y scripts de terceros sin fijación

- **Categoría:** Seguridad / supply chain / navegador
- **Severidad:** HIGH
- **Confianza:** CONFIRMADO
- **Prioridad:** P1
- **Ubicación:** `netlify.toml:34-50`; `webinarlanding.html:7-10`; `landing*.html`; `cursos.html`; otras páginas heredadas
- **Archivo/componente:** headers y páginas multipágina
- **Descripción:** CSP se aplica sólo a `/`, `/index.html` y `/diagnostico/*`; `servicios.html` y `webinarlanding.html` responden sin CSP. Varias páginas cargan Tailwind runtime y Lucide desde CDN y usan inline scripts/handlers. No se observó SRI.
- **Evidencia:** headers públicos: portada/diagnóstico `CSP=true`, servicios/webinar `CSP=false`; 42 inline event handlers en HTML.
- **Impacto:** menor defensa ante XSS y compromiso de CDN; ampliar CSP después puede romper páginas por el volumen de inline code.
- **Solución propuesta:** inventariar por ruta, mover JS/CSS inline a archivos propios, empaquetar dependencias, eliminar Tailwind runtime, usar nonce/hash si queda inline y aplicar CSP homogénea en report-only antes de enforcement.
- **Esfuerzo:** L
- **Riesgo del cambio:** HIGH; CSP estricta sin migración previa rompería UI/formularios.
- **Método de verificación:** CSP Evaluator, DevTools sin violaciones, e2e por página, ninguna carga de JS no autorizada.

### SEC-003 — Conversaciones almacenadas en localStorage sin borrado visible

- **Categoría:** Privacidad / almacenamiento del navegador
- **Severidad:** MEDIUM
- **Confianza:** CONFIRMADO
- **Prioridad:** P2
- **Ubicación:** `assets/js/pixie/conversation-store.js:6-75`; `session-manager.js:6-57`
- **Archivo/componente:** Pixie
- **Descripción:** la conversación completa, que puede incluir correo/teléfono, se persiste en `localStorage`; la sesión expira lógicamente a 24 h, pero la conversación antigua no se elimina automáticamente y no hay control visible “borrar conversación”.
- **Evidencia:** `setItem` conserva mensajes y state token; sólo `clear()` elimina y no se encontró acción UI que lo invoque.
- **Impacto:** exposición en dispositivos compartidos o ante XSS de mismo origen; retención mayor a la esperada.
- **Solución propuesta:** TTL efectivo en cada registro, purge al iniciar, botón borrar, minimizar PII y documentar almacenamiento.
- **Esfuerzo:** S
- **Riesgo del cambio:** LOW; puede perderse continuidad esperada.
- **Método de verificación:** pruebas con reloj simulado, DevTools Storage y test de borrado explícito.

### SEC-004 — Reutilización condicional de GEMINI_API_KEY como secreto HMAC

- **Categoría:** Seguridad / gestión de claves
- **Severidad:** LOW
- **Confianza:** REQUIERE VERIFICACIÓN
- **Prioridad:** P2
- **Ubicación:** `netlify/functions/pixie/chat-core.js:159`
- **Archivo/componente:** firma de estado Pixie
- **Descripción:** si `PIXIE_STATE_SECRET` no está configurado, la clave Gemini se reutiliza para HMAC. No se pudo comprobar la variable real de Netlify.
- **Evidencia:** fallback `process.env.PIXIE_STATE_SECRET || apiKey`.
- **Impacto:** acoplamiento de rotación y separación de funciones deficiente; no implica extracción de la clave por sí mismo.
- **Solución propuesta:** hacer obligatorio un secreto aleatorio dedicado y fallar de forma controlada si falta.
- **Esfuerzo:** S
- **Riesgo del cambio:** MEDIUM si se despliega sin configurar la variable.
- **Método de verificación:** inventario Netlify, rotación controlada y tests de ausencia/rotación.

### SEC-005 — DOM injection de bajo alcance en demo de suplementos

- **Categoría:** Seguridad / XSS
- **Severidad:** LOW
- **Confianza:** CONFIRMADO
- **Prioridad:** P2
- **Ubicación:** `assets/js/demo-suplementos.js:109`
- **Archivo/componente:** checkout demostrativo
- **Descripción:** el nombre introducido se inserta mediante `innerHTML` sin escape. El flujo es local y no persistente, por lo que el impacto observado es self-XSS, no una explotación remota confirmada.
- **Evidencia:** template literal con `${name}` asignado a `innerHTML`.
- **Impacto:** ejecución de HTML/JS en el contexto del propio visitante; riesgo mayor si la fuente de datos se vuelve compartida.
- **Solución propuesta:** crear nodos y usar `textContent`.
- **Esfuerzo:** XS
- **Riesgo del cambio:** LOW
- **Método de verificación:** payload de prueba renderiza texto literal y CSP/e2e permanecen correctos.

### PRIV-001 — Captura de datos sin enlace funcional al aviso

- **Categoría:** Privacidad / confianza / cumplimiento
- **Severidad:** HIGH
- **Confianza:** CONFIRMADO
- **Prioridad:** P1
- **Ubicación:** `business-scan-src/src/BusinessScan.tsx:10,81-90,123`; `business-scan-analyze.mjs:89-106`
- **Archivo/componente:** Business Scan
- **Descripción:** el paso final exige consentimiento y captura nombre, empresa, email, cargo y WhatsApp, pero `PRIVACY_URL` está vacío, por lo que no se muestra el enlace. Los datos pueden persistirse en Supabase; parte del contenido operativo puede procesarse con Gemini.
- **Evidencia:** constante vacía y render condicional; POST a Supabase con service-role server-side.
- **Impacto:** decisión de consentimiento incompleta, menor confianza y riesgo regulatorio/contractual que debe validar asesoría legal.
- **Solución propuesta:** enlazar aviso versionado, describir finalidades, encargados/procesadores, retención, derechos y contacto; separar consentimiento de seguimiento si aplica.
- **Esfuerzo:** S técnico + revisión legal
- **Riesgo del cambio:** LOW
- **Método de verificación:** enlace visible antes de enviar, accesible por teclado, texto aprobado y registro de versión de consentimiento.

### PERF-001 — LCP móvil lento por retraso de render y trabajo principal

- **Categoría:** Performance / Core Web Vitals
- **Severidad:** HIGH
- **Confianza:** CONFIRMADO
- **Prioridad:** P1
- **Ubicación:** `index.html:20-47`; `assets/js/intro.js`; `ambient-network.js`; `hero-core.js`; CSS de portada
- **Archivo/componente:** introducción, hero y animaciones
- **Descripción:** LCP móvil 3.5 s y FCP 3.3 s; 74% del LCP (2.61 s) es render delay. Lighthouse registra 6.0 s de trabajo de main thread y 170 ms TBT.
- **Evidencia:** Lighthouse móvil Performance 77; LCP es el primer span del H1.
- **Impacto:** primera impresión tardía y posible deterioro de conversión/SEO en dispositivos modestos.
- **Solución propuesta:** mostrar el H1 inmediatamente, no bloquearlo por intro/motion classes, diferir canvases no críticos, mantener fallback estático y perf budget móvil.
- **Esfuerzo:** M
- **Riesgo del cambio:** MEDIUM; puede alterar la dirección visual.
- **Método de verificación:** 5 corridas Lighthouse medianas y prueba en dispositivo limitado; objetivo LCP lab ≤2.5 s sin regresión visual.

### PERF-002 — Logo 1024×1024 servido a 42–46 px

- **Categoría:** Performance / imágenes
- **Severidad:** MEDIUM
- **Confianza:** CONFIRMADO
- **Prioridad:** P1
- **Ubicación:** `index.html:24,33,121`; `du-logo-Cuadrado.png`
- **Archivo/componente:** marca en header/footer/intro
- **Descripción:** imagen de 128,976 bytes mostrada a 42 px; Lighthouse calcula 128,373 bytes desperdiciados (99.5%).
- **Evidencia:** audit `uses-responsive-images`, ahorro estimado 125 KiB.
- **Impacto:** más transferencia y retraso de recursos críticos.
- **Solución propuesta:** variantes AVIF/WebP/PNG de 48/96 px, `srcset`, dimensiones explícitas; conservar original para usos grandes.
- **Esfuerzo:** XS
- **Riesgo del cambio:** LOW
- **Método de verificación:** tamaño transferido, nitidez 1×/2×, Lighthouse sin este hallazgo.

### PERF-003 — Fuentes/CSS render-blocking y caché conservadora

- **Categoría:** Performance / entrega
- **Severidad:** MEDIUM
- **Confianza:** CONFIRMADO
- **Prioridad:** P2
- **Ubicación:** `assets/css/premium-home.css`; `index.html:15`; configuración CDN/hosting
- **Archivo/componente:** Google Fonts y assets
- **Descripción:** Google Fonts y `pixie-mascot.css` bloquean render; Lighthouse estima 1,080 ms. Assets propios versionados sólo reciben `max-age=14400`.
- **Evidencia:** 71 KiB de fuentes, falta preconnect, headers públicos y auditorías de cache/render blocking.
- **Impacto:** FCP/LCP más lentos y revalidaciones frecuentes.
- **Solución propuesta:** self-host/subset de Montserrat o preconnect correcto; critical CSS mínimo; hashes de contenido y `immutable` para assets versionados.
- **Esfuerzo:** M
- **Riesgo del cambio:** MEDIUM por FOIT/FOUT y caching de archivos sin hash.
- **Método de verificación:** waterfall, headers, Lighthouse y actualización controlada de assets.

### UX-001 — Widget flotante invade el viewport móvil

- **Categoría:** UX/UI / Mobile / CRO
- **Severidad:** MEDIUM
- **Confianza:** CONFIRMADO
- **Prioridad:** P2
- **Ubicación:** `assets/js/pixie-widget.js`; `premium-home.css`; `pixie-mascot.css`
- **Archivo/componente:** launcher Pixie
- **Descripción:** en 390×844 ocupa 216×89 px fijo; puede cubrir contenido o CTAs y compite con la acción primaria.
- **Evidencia:** bounding box observado `x=149, y=745`; página móvil mide 20,763 px.
- **Impacto:** obstrucción, fatiga y menor claridad de jerarquía.
- **Solución propuesta:** launcher compacto después del primer scroll/tiempo, zona segura, opción minimizar persistente y test en 320–430 px.
- **Esfuerzo:** S
- **Riesgo del cambio:** LOW; puede reducir aperturas de Pixie.
- **Método de verificación:** capturas por breakpoint, prueba de no solapamiento y eventos de apertura/CTA.

### A11Y-001 — Nombre accesible no contiene el texto visible

- **Categoría:** Accesibilidad
- **Severidad:** MEDIUM
- **Confianza:** CONFIRMADO
- **Prioridad:** P1
- **Ubicación:** `assets/js/pixie-widget.js:6`
- **Archivo/componente:** botón launcher Pixie
- **Descripción:** texto visible “Hola, soy Pixie” no está incluido en `aria-label="Hablar con Pixie…"`.
- **Evidencia:** Lighthouse `label-content-name-mismatch` y nodo exacto.
- **Impacto:** usuarios de control por voz pueden no activar el control con la etiqueta visible.
- **Solución propuesta:** nombre accesible que empiece por el texto visible o retirar `aria-label` y usar texto + descripción adicional.
- **Esfuerzo:** XS
- **Riesgo del cambio:** LOW
- **Método de verificación:** axe/Lighthouse, Voice Control/Dragon y lector de pantalla.

### A11Y-002 — Targets pequeños y zoom deshabilitado en páginas heredadas

- **Categoría:** Accesibilidad / Mobile
- **Severidad:** MEDIUM
- **Confianza:** CONFIRMADO
- **Prioridad:** P1
- **Ubicación:** footer de portada; sliders; `cursos.html:5`; `webinarlanding.html:5`
- **Archivo/componente:** navegación secundaria y metas viewport
- **Descripción:** links/footer de 13 px de alto y sliders de 6 px; algunas páginas usan `maximum-scale=1,user-scalable=no`.
- **Evidencia:** medición DOM y meta viewport en código.
- **Impacto:** dificultad motriz y de baja visión; incumplimiento probable de WCAG 2.2 2.5.8/1.4.4 según contexto.
- **Solución propuesta:** área activa ≥24×24 CSS px (preferible 44×44), track/handle mayor y permitir zoom.
- **Esfuerzo:** S
- **Riesgo del cambio:** LOW
- **Método de verificación:** axe, zoom 200%, teclado/touch y matriz 320–1440 px.

### SEO-001 — SEO correcto en portada, incompleto en páginas heredadas

- **Categoría:** SEO técnico
- **Severidad:** MEDIUM
- **Confianza:** CONFIRMADO
- **Prioridad:** P2
- **Ubicación:** 19 HTML raíz; `sitemap.xml`; rutas limpias y `.html`
- **Archivo/componente:** metadata/indexación
- **Descripción:** 12/19 HTML no tienen meta description ni canonical; sólo portada tiene Schema y Twitter card; sitemap contiene 8 URLs. Variantes limpias y `.html` responden 200, creando duplicados potenciales donde falta canonical.
- **Evidencia:** matriz estática; `/servicios` y `/servicios.html` responden 200; robots/sitemap válidos.
- **Impacto:** indexación inconsistente, snippets pobres y señales divididas.
- **Solución propuesta:** inventario index/noindex, canonicals únicos, redirects 301 a una convención, sitemap generado y metadata OG/Twitter/Schema relevante.
- **Esfuerzo:** M
- **Riesgo del cambio:** MEDIUM; redirects/canonicals incorrectos pueden perder indexación.
- **Método de verificación:** crawler, Search Console, Rich Results y checks de status/canonical.

### CRO-001 — Flujos públicos con placeholders o recursos rotos

- **Categoría:** CRO / QA / confianza
- **Severidad:** HIGH
- **Confianza:** CONFIRMADO
- **Prioridad:** P1
- **Ubicación:** `landing.html:104,123,195`; `pago-exitoso.html:42`; `landing-manuales.html:95,212`; `cursos.html:105,250`
- **Archivo/componente:** formularios, CTA y branding
- **Descripción:** `landing.html` envía a `TU_HASH_AQUI`; pago exitoso enlaza a `52XXXXXXXXXX`; cuatro usos de `pixel&code-logo-landing.png` retornan 404 y dependen de fallback externo.
- **Evidencia:** código y GET público 404 del logo.
- **Impacto:** pérdida directa de leads, ruptura post-conversión y señal de baja confianza.
- **Solución propuesta:** retirar/noindex páginas no listas o completar endpoints/números/activos; añadir pruebas smoke de formularios y links.
- **Esfuerzo:** S–M
- **Riesgo del cambio:** MEDIUM; requiere confirmar destino comercial correcto.
- **Método de verificación:** envío de staging con datos sintéticos autorizados, link checker y 200 del activo.

### CRO-002 — Claims y cálculo requieren evidencia/contexto

- **Categoría:** CRO / marca / confianza
- **Severidad:** MEDIUM
- **Confianza:** CONFIRMADO
- **Prioridad:** P2
- **Ubicación:** `index.html:72,90,93`
- **Archivo/componente:** calculadora y tabla comparativa
- **Descripción:** se muestra “ahorro operativo proyectado · 65%”, “100% propiedad” y “código a medida en Next.js/React”. La portada auditada no usa Next.js y el 65% no muestra fuente/metodología suficiente.
- **Evidencia:** texto visible y arquitectura real.
- **Impacto:** objeciones, riesgo reputacional y menor credibilidad B2B.
- **Solución propuesta:** aclarar que son supuestos editables/ejemplos, mostrar fórmula y rango; formular claims por servicio/entregable, no por tecnología universal.
- **Esfuerzo:** S
- **Riesgo del cambio:** LOW
- **Método de verificación:** revisión legal/comercial y test cualitativo de comprensión.

### OBS-001 — Telemetría incompleta y beacon bloqueado

- **Categoría:** Observabilidad / Analytics
- **Severidad:** MEDIUM
- **Confianza:** CONFIRMADO
- **Prioridad:** P1
- **Ubicación:** `assets/js/home.js:60-72`; CSP en `netlify.toml`; configuración Cloudflare externa
- **Archivo/componente:** dataLayer y beacon
- **Descripción:** se emiten eventos a `dataLayer`, pero no se detectó consumidor. Cloudflare inyecta un beacon desde `static.cloudflareinsights.com` y la CSP lo bloquea, generando error/Issue en Lighthouse.
- **Evidencia:** consola Lighthouse y código.
- **Impacto:** embudo no medible, errores sin monitoreo y Best Practices 93.
- **Solución propuesta:** decidir si se habilita explícitamente Cloudflare Web Analytics con CSP/privacidad o se desactiva; implantar analytics consentido y error monitoring con eventos documentados.
- **Esfuerzo:** M
- **Riesgo del cambio:** MEDIUM por privacidad/CSP.
- **Método de verificación:** consola limpia, dashboard recibe evento sintético y consent mode validado.

### CODE-001 — Dos generaciones técnicas y mantenimiento fragmentado

- **Categoría:** Calidad de código / arquitectura / deuda técnica
- **Severidad:** MEDIUM
- **Confianza:** CONFIRMADO
- **Prioridad:** P2
- **Ubicación:** 19 HTML raíz, 42 handlers inline, `premium-home.css` 382 líneas/65.8 KiB, artefactos `diagnostico/`
- **Archivo/componente:** repositorio completo
- **Descripción:** componentes modernos modulares conviven con páginas heredadas duplicadas/minificadas manualmente. No existe script lint ni e2e; el build generado está versionado.
- **Evidencia:** package scripts, LOC y estructura.
- **Impacto:** fixes repetidos, drift de headers/SEO/accesibilidad y mayor riesgo de regresión.
- **Solución propuesta:** inventario de rutas, layout/partials o generador estático, fuente única para diagnóstico, ESLint/Prettier sólo en código mantenible y pruebas smoke/e2e críticas.
- **Esfuerzo:** L
- **Riesgo del cambio:** HIGH si se reescribe todo; migrar por rutas.
- **Método de verificación:** reducción de duplicación, lint/build/test/e2e en CI y paridad visual.

### INFRA-001 — Controles externos no verificables desde el repositorio

- **Categoría:** Infraestructura / DevSecOps
- **Severidad:** MEDIUM
- **Confianza:** REQUIERE VERIFICACIÓN
- **Prioridad:** P1
- **Ubicación:** Netlify, Cloudflare, Supabase, Make, Gemini y GitHub
- **Archivo/componente:** servicios externos
- **Descripción:** no hay evidencia local suficiente de least privilege, rotación, alertas, RLS, retención, branch protection o backups.
- **Evidencia:** sólo `.env.example` y consumidores de variables; ningún secreto real se leyó.
- **Impacto:** riesgo residual desconocido en sistemas que procesan leads y claves.
- **Solución propuesta:** checklist de lectura con capturas/config export, propietario, fecha de rotación, permisos, logs, alertas y recovery test.
- **Esfuerzo:** M
- **Riesgo del cambio:** LOW durante revisión; cualquier cambio requiere aprobación separada.
- **Método de verificación:** evidencia de consola y pruebas controladas por servicio.

## Security

Controles positivos confirmados:

- HTTPS, HSTS, XFO DENY, XCTO, Referrer-Policy, Permissions-Policy y COOP en páginas.
- CSP estricta en portada y diagnóstico; funciones JSON con `default-src 'none'`.
- Body limits, content-type, allowlist de origen, sanitización y rate limiting en endpoints recientes.
- Estado de conversación firmado con HMAC y comparación timing-safe.
- Redacción de claves comunes y tarjetas antes de payloads.
- Service-role Supabase permanece server-side.
- `pnpm audit --prod` sin CVEs conocidas al momento de la auditoría.

OWASP Top 10: no se confirmó Broken Access Control (no hay recursos autenticados), injection server-side, SSRF, path traversal o IDOR. `SEC-002`, `SEC-005`, gestión de secretos y falta de evidencia externa cubren los riesgos razonables presentes. CSRF no es el control principal para endpoints anónimos sin cookies; abuso/rate limiting sí lo es.

## Performance

La portada no es pesada en bytes (≈250 KiB transferidos), pero demora en presentar texto por la secuencia visual/animación. El mayor quick win es desacoplar el H1 de la intro y reducir el logo. El WebGL usa `powerPreference: low-power`, limita DPR, pausa fuera de viewport y respeta reduced motion: no se justifica eliminarlo sin medir después de optimizar el critical path.

## UX/UI

Fortalezas: jerarquía visual consistente, propuesta central comprensible, navegación clara, CTAs repetidos, estados visuales y estilo coherente. Debilidades: página excesivamente larga en móvil, widget competitivo, claims demasiado absolutos, rutas heredadas con look/tecnología diferentes y páginas inacabadas públicas.

## Mobile

No hay overflow y la navegación cambia a menú. El H1 se adapta a 42.4 px. Deben corregirse overlays, targets pequeños, zoom deshabilitado y longitud/ritmo del contenido.

## CRO

Recorrido actual:

```text
Visita → entiende la integración → explora valor/cálculo → diagnóstico → 6 etapas → contacto obligatorio → resultado
```

La dirección es correcta, pero la confianza cae por placeholders, ausencia de aviso enlazado, claims sin evidencia y falta de prueba social/casos verificables. No se estiman porcentajes de conversión porque no existe analytics verificable.

## SEO

Problemas confirmados: metadata/canonicals incompletos, sitemap parcial, URLs duplicadas potenciales y recursos 404 en páginas de conversión. Oportunidades: schema por tipo de página, OG/Twitter consistentes, sitemap generado e internal linking coherente. La portada aislada obtuvo SEO 100.

## Accessibility

Fortalezas: Lighthouse 100 en portada, skip link, landmarks, teclado/foco visible, reduced motion y labels correctos en el diagnóstico. Pendientes: nombre accesible de Pixie, targets, zoom y revisión completa de páginas heredadas. El 100 automatizado no sustituye lector de pantalla, contraste manual ni flujos completos.

## Code Quality and Architecture

Los módulos de backend recientes son pequeños y testeables; el motor de diagnóstico separa reglas y validación. La deuda está concentrada en HTML heredado, estilos monolíticos/minificados, duplicación y falta de lint/e2e. No se recomienda una reescritura estética: migrar primero rutas activas con riesgo comercial.

## Dependencies

No se propone actualización mayor automática. Candidatas post-aprobación:

- `@google/genai` 2.23.0 → 2.24.0: patch/minor pequeño, validar API y tests.
- Tipos React 19.2 → 19.3: sólo junto con typecheck.
- `@types/node` 24 → 26 y TypeScript 5.9 → 7: posponer; cambios mayores sin beneficio inmediato demostrado.
- Lighthouse temporal no fue agregado al proyecto.

## Infrastructure

Netlify construye con pnpm y publica el root. Cloudflare está delante y modifica/inserta al menos email protection/beacon. La CSP no contempla el beacon. Supabase y Make son opcionales por variables, excepto el webhook heredado directo. No existe evidencia local de CI/CD GitHub.

## Technical Debt

- 19 HTML raíz con niveles dispares de calidad.
- 42 handlers inline.
- Metadata y headers mantenidos manualmente por ruta.
- Páginas inacabadas accesibles públicamente.
- Sin lint, e2e, link checker ni budgets en scripts.
- Artefactos de build versionados y source app separado.
- Analytics/event taxonomy sin implementación verificable.

## Scorecard

| Área | Puntuación | Sustento principal |
|---|---:|---|
| Seguridad | 58 | Controles fuertes en Functions y headers básicos; webhook expuesto, CSP parcial y CDN runtime |
| Performance | 77 | Lighthouse móvil 77 / desktop 85; LCP móvil 3.5 s, main thread 6 s, 250 KiB |
| UX/UI | 76 | Jerarquía y propuesta claras; longitud, overlay y heterogeneidad heredada |
| Mobile | 72 | Sin overflow, menú correcto; widget, targets y zoom |
| SEO | 73 | Portada 100; 12/19 páginas sin description/canonical y sitemap parcial |
| Accesibilidad | 78 | Portada automatizada 100 y buen teclado; issues manuales y páginas heredadas |
| CRO | 62 | CTA/diagnóstico sólidos; formularios rotos, claims y privacidad reducen confianza |
| Calidad de código | 70 | 23 tests + typecheck; sin lint/e2e, inline/duplicación |
| Arquitectura | 72 | Separación razonable en módulos nuevos; stack mixto y rutas fragmentadas |
| Mantenibilidad | 61 | Múltiples fuentes/estilos y build generado versionado |
| Observabilidad | 38 | dataLayer sin consumidor, beacon bloqueado, sin error monitoring verificable |
| Preparación para producción | 57 | Build/tests pasan; P0, páginas inacabadas, privacidad e infraestructura no verificadas |

Las puntuaciones son una síntesis trazable de hallazgos, no una medición universal. La portada por sí sola puntúa mejor que el sistema completo.

## Recommended Improvements

1. Contener `SEC-001` y restaurar el formulario mediante proxy validado.
2. Retirar/noindex flujos inacabados o completar placeholders.
3. Enlazar y versionar el aviso de privacidad antes de captura.
4. Hacer visible el H1 sin esperar intro; optimizar logo y fonts.
5. Corregir nombre accesible, targets y zoom.
6. Resolver decisión Cloudflare Analytics/CSP y activar observabilidad mínima.
7. Migrar CSP por etapas y retirar CDN runtime/inline code.
8. Unificar URL canónica, metadata y sitemap.
9. Añadir lint, e2e/smoke, link checker y budgets a CI.
10. Revisar controles externos con acceso de sólo lectura.

## Files Proposed for Modification — post approval only

- `webinarlanding.html`
- Nueva Function proxy, por ejemplo `netlify/functions/webinar-register.mjs`
- `netlify.toml`
- `index.html`
- `assets/js/intro.js`, `assets/js/home.js`, `assets/js/pixie-widget.js`
- `assets/css/premium-home.css`, `assets/css/pixie-mascot.css`
- `du-logo-Cuadrado.png` y nuevas variantes optimizadas
- `business-scan-src/src/BusinessScan.tsx`, `styles.css`
- `assets/js/pixie/conversation-store.js`, `session-manager.js`
- `assets/js/demo-suplementos.js`
- `landing.html`, `landing-manuales.html`, `cursos.html`, `pago-exitoso.html`
- HTML indexables restantes, `robots.txt`, `sitemap.xml`
- `package.json`, tests y posible `.github/workflows/ci.yml`

La lista es propuesta; se reducirá al alcance que el usuario apruebe.

## Implementation Roadmap

- **P0:** rotar/revocar webhook; proxy server-side; preservar formulario con rollback.
- **P1:** privacidad, flujos rotos, LCP/logo, accesibilidad principal, observabilidad y revisión externa.
- **P2:** CSP gradual, almacenamiento Pixie, SEO multipágina, fonts/cache, claims y deuda priorizada.
- **P3:** migración de layouts/componentes, e2e ampliado, budgets y refactor por rutas.
- **P4:** mejoras estéticas y experimentos sólo con datos de conversión.

Detalle temporal en `IMPROVEMENT_PLAN.md`.

## Expected Impact

- Menor superficie de abuso y costos inesperados.
- LCP móvil potencialmente dentro de rango “good” tras validar varias corridas.
- Menos transferencia crítica (≈125 KiB sólo por logo).
- Formularios y post-conversión confiables.
- Consentimiento más informado y menor riesgo de privacidad.
- Cobertura SEO y accesibilidad más consistente.
- Menor probabilidad de regresión mediante CI/e2e.

No se prometen porcentajes de conversión ni mejoras CWV hasta reauditar.

## Risks

- Rotar el webhook sin proxy listo interrumpe registros.
- CSP global prematura rompe inline scripts/CDNs.
- Cambiar URLs sin redirects correctos afecta SEO.
- Self-host de fonts o cache `immutable` mal versionado causa regresiones visuales.
- Compactar Pixie puede reducir engagement aunque mejore usabilidad.
- Refactor masivo de HTML aumenta el riesgo; se recomienda migración incremental.
- Cambios de privacidad requieren validación legal, no sólo técnica.

## Verification Plan

Tras aprobación e implementación:

1. Crear `audit/security-performance-improvements` desde el estado actual.
2. Guardar este baseline y ejecutar bloque por bloque: build, typecheck, tests, lint/e2e añadidos.
3. Secret scan actual + historial; confirmar revocación sin imprimir secretos.
4. Lighthouse: mínimo 5 corridas móvil/escritorio y comparar medianas.
5. HTTP: headers, cache, redirects, sitemap, links y 404.
6. Security: schema/rate limit/origin/size/honeypot/idempotencia y CSP report-only/enforced.
7. Responsive: 320, 375, 390, 768, 1024 y 1440 px.
8. Accessibility: axe, teclado completo, zoom 200%, reduced motion y lector de pantalla.
9. CRO: smoke test de staging con datos sintéticos autorizado; no probar producción sin aprobación explícita.
10. Validar dashboards externos y registrar evidencia de cada servicio.
11. Generar `FINAL_AUDIT_REPORT.md` con antes/después, pendientes y riesgos residuales.

## Checkpoint

Auditoría, medición, documentación, priorización y propuesta completadas. No se modificó código ejecutable ni producción. La implementación queda detenida hasta recibir exactamente:

`APROBADO – EJECUTA LAS MEJORAS`
