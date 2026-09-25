# Migración segura de Make

Estado verificado el 24 de septiembre de 2026:

- `Pixie`: activo, conexiones de Gmail y Telegram sanas, webhook sin autenticación.
- `Webinnars`: inactivo, conexiones de Google Sheets y Gmail sanas, webhook sin autenticación.
- No se encontró un escenario específico para el formulario general de contacto.
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
- `MAKE_WEBINAR_WEBHOOK_URL`
- `MAKE_WEBINAR_API_KEY`
- `MAKE_CONTACT_WEBHOOK_URL`
- `MAKE_CONTACT_API_KEY`
- `PIXIE_STATE_SECRET` con un valor aleatorio independiente de `GEMINI_API_KEY`

## Secuencia sin interrupción

1. Duplicar cada escenario que esté activo y mantener el duplicado desactivado.
2. Crear un webhook nuevo con autenticación por API key; no reutilizar la URL expuesta históricamente.
3. Conservar en el payload los nombres actualmente consumidos por Make. Los endpoints implementados mantienen `Nombre`, `Email`, `Telefono`, `Empresa`, `Servicio_Interes`, `Mensaje` y los campos de evento correspondientes.
4. Para contacto general, crear un escenario separado o una ruta explícita cuyo evento sea `project_inquiry`; no mezclarlo silenciosamente con el webinar.
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

