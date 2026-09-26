# Migración segura de Make

Estado actualizado el 25 de septiembre de 2026:

- El escenario heredado de Pixie quedó desactivado, con su configuración e historial conservados para rollback.
- `Pixie`, `Webinars`, `Contact` y las descargas de manuales se consolidaron en `DUPC — Web Intake Seguro (Pixie, Contacto y Webinar)`, con autenticación por API key y rutas filtradas por evento.
- El escenario consolidado está activo junto con el agente de marketing; esta arquitectura respeta el límite de dos escenarios activos de la cuenta.
- El endpoint `/api/manual-register` reutiliza el canal autenticado de contacto con el evento `manual_download` y un payload minimizado.
- Las URLs de webhook no se documentan porque funcionan como secretos.

## Objetivo

La web nunca debe conocer una URL de Make. El navegador envía datos únicamente a una Function de Netlify; la Function valida, limita y autentica la entrega server-to-server hacia Make.

```text
Navegador → /api/* de Netlify → x-make-apikey → webhook privado de Make → destino
```

## Variables requeridas

Configurar únicamente como secretos del entorno de staging/preview, nunca en Git:

- `MAKE_PIXIE_WEBHOOK_URL`
- `MAKE_PIXIE_API_KEY`
- `PIXIE_STATE_SECRET` con un valor aleatorio independiente de `GEMINI_API_KEY`

`MAKE_SITE_INTAKE_WEBHOOK_URL` y `MAKE_SITE_INTAKE_API_KEY` son un alias opcional y atómico para una futura rotación. Si no se definen, todos los endpoints usan las credenciales consolidadas `MAKE_PIXIE_*`. Las variables antiguas `MAKE_WEBINAR_*` y `MAKE_CONTACT_*` se ignoran para impedir que una URL y una clave de escenarios distintos se combinen accidentalmente.

## Secuencia sin interrupción

1. Mantener el escenario heredado inactivo durante la operación normal y conservarlo sólo para rollback controlado.
2. Usar el webhook consolidado con autenticación por API key; no reutilizar la URL expuesta históricamente.
3. Conservar en el payload los nombres actualmente consumidos por Make. Los endpoints implementados mantienen `Nombre`, `Email`, `Telefono`, `Empresa`, `Servicio_Interes`, `Mensaje` y los campos de evento correspondientes.
4. Separar las rutas dentro del escenario mediante eventos explícitos: `webinar_registration`, `project_inquiry`, `manual_download` y los eventos comerciales de Pixie.
5. Configurar las variables anteriores en un deploy preview de Netlify.
6. Enviar datos sintéticos, verificar una sola fila/correo/notificación y confirmar que un request sin `x-make-apikey` sea rechazado.
7. Activar el escenario nuevo; publicar el código sólo después de esa verificación.
8. Desactivar el escenario anterior y revocar/eliminar su webhook cuando ya no existan ejecuciones en tránsito.
9. Revisar ejecuciones fallidas, duplicados y logs durante las primeras 24 horas.

## Criterios de rollback

- No reinsertar la URL de Make en HTML o JavaScript.
- Si Make falla, mantener la Function y apuntar temporalmente su variable al webhook anterior sólo desde el entorno seguro.
- Pixie debe seguir respondiendo aunque la notificación falle; webinar y contacto deben devolver un error visible sin registrar PII.
- Nunca registrar API keys, cuerpo completo, email o teléfono en logs de aplicación.

## Verificación automatizada disponible

- Origen permitido y `Content-Type` estricto.
- Tamaño máximo de cuerpo.
- Honeypot y esquema cerrado.
- Consentimiento obligatorio.
- Rate limit de plataforma y fallback por instancia.
- Timeout de entrega.
- Idempotency/event ID en headers y payload.
- API key sólo en `x-make-apikey`, nunca en el body.
