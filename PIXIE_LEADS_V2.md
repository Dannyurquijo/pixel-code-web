# Pixie Leads V2

Estado: desarrollo local en `feature/pixie-leads-memory-v2`. No desplegado.

## Arquitectura

```text
Visitante
  ↓
Widget Pixie (`index.html` + `assets/js/home.js`)
  ↓
SessionManager + ConversationStore (localStorage; fallback en memoria)
  ↓ JSON con session_id + historial completo
Netlify Function (`netlify/functions/chat.js`)
  ├─ contexto limitado → LLM
  ├─ historial completo → LeadAnalyzer
  ├─ evento + score → NotificationPolicy
  └─ payload V2 + campos legacy → Make webhook
                                      └─ Gmail actual / Telegram futuro
```

El contexto del LLM y el historial comercial son independientes. El modelo recibe como máximo los últimos 20 mensajes para controlar tokens. El navegador conserva todos los mensajes de la sesión y el backend usa esa conversación completa para CRM, auditoría y Make.

## Session ID y memoria

- Formato: `px_<timestamp>_<hex aleatorio>`.
- Clave de sesión: `du:pixie:session:v2`.
- Clave de conversación: `du:pixie:conversation:v2:<session_id>`.
- Duración: 24 horas desde la última actividad. Después se crea una sesión nueva.
- Recargar la página conserva sesión, mensajes y estado de notificación.
- Borrar datos del navegador, usar otro dispositivo o bloquear `localStorage` elimina esa persistencia. Si `localStorage` falla, Pixie conserva memoria solo mientras permanezca abierta la pestaña.
- El servidor firma criptográficamente el historial y el estado de notificaciones. Si un visitante altera el contexto guardado, el backend lo descarta y continúa únicamente con el mensaje actual.
- La entrada queda acotada a 128 KB y a los 80 mensajes saneados más recientes para evitar consumo de recursos sin límite.
- Para pruebas manuales se puede ejecutar `PixieV2.startNewSession()` en la consola del navegador.

Esta persistencia es un fallback adecuado para la infraestructura actual. La interfaz del backend ya recibe una conversación normalizada, por lo que posteriormente puede sustituirse `localStorage` por Postgres, Supabase, Redis u otra base sin cambiar el contrato de Make.

## Detección de leads

El analizador es determinista: nunca pide al modelo que invente campos. Extrae solo información escrita por el usuario:

- nombre;
- email;
- teléfono;
- empresa;
- servicio de interés;
- problema;
- presupuesto;
- urgencia;
- timeline;
- ciudad.

Todo valor desconocido es `null`, nunca `""`.

### Scoring editable

| Criterio | Puntos |
|---|---:|
| Solicita información comercial o menciona un servicio | 20 |
| Describe una necesidad empresarial concreta | 20 |
| Menciona empresa o contexto de negocio | 15 |
| Comparte email o teléfono | 15 |
| Pregunta precio o inversión | 10 |
| Solicita cotización, reunión o contacto humano | 10 |
| Expresa urgencia | 10 |

Clasificación: 0–29 visitante; 30–59 lead potencial; 60–79 lead calificado; 80–100 lead prioritario. El umbral se controla con `PIXIE_LEAD_THRESHOLD`.

## Eventos y anti-spam

Eventos posibles:

- `lead_detected`;
- `contact_information_captured`;
- `quote_requested`;
- `meeting_requested`;
- `human_contact_requested`;
- `high_intent_detected`.

No se notifica por cada mensaje. La misma sesión queda bloqueada durante 10 minutos, salvo que aparezca contacto nuevo, el score aumente 20 puntos o surja un evento comercial de mayor valor. Cada notificación incluye un `event_id` determinista para facilitar deduplicación posterior en Make.

## Payload Make

```json
{
  "event": "contact_information_captured",
  "event_id": "evt_px_1723456789_a8f3d91_7_6fc8a201",
  "session_id": "px_1723456789_a8f3d91",
  "lead_detected": true,
  "lead_score": 80,
  "lead_classification": "lead prioritario",
  "lead_reason": "Solicita información comercial; Describe una necesidad empresarial concreta; Menciona una empresa o contexto de negocio; Comparte información de contacto; Solicita cotización, reunión o contacto humano",
  "name": null,
  "email": "juan@empresa.com",
  "phone": null,
  "company": "Empresa XYZ",
  "service_interest": "Automatización de procesos",
  "problem": "Quiero implementar IA para atención a clientes",
  "budget": null,
  "urgency": null,
  "timeline": null,
  "city": null,
  "lead": {
    "name": null,
    "email": "juan@empresa.com",
    "phone": null,
    "company": "Empresa XYZ",
    "service_interest": "Automatización de procesos",
    "lead_score": 80
  },
  "origin": {
    "website": "dupixelcode.com",
    "page_url": "https://dupixelcode.com/",
    "source": "Pixie",
    "campaign": null
  },
  "latest_message": {
    "user": "Mi correo es juan@empresa.com",
    "pixie": "Gracias. El equipo dará seguimiento a tu solicitud."
  },
  "conversation": [
    { "role": "user", "content": "Hola", "timestamp": "2026-09-17T15:00:00.000Z" },
    { "role": "assistant", "content": "¡Hola! ¿En qué puedo ayudarte?", "timestamp": "2026-09-17T15:00:02.000Z" }
  ],
  "conversation_text": "💬 CONVERSACIÓN PIXIE\n👤 Cliente:\nHola\n🤖 Pixie:\n¡Hola! ¿En qué puedo ayudarte?",
  "metadata": {
    "created_at": "2026-09-17T15:00:00.000Z",
    "updated_at": "2026-09-17T15:05:00.000Z",
    "message_count": 7
  },
  "mensaje_cliente": "Mi correo es juan@empresa.com",
  "respuesta_pixie": "Gracias. El equipo dará seguimiento a tu solicitud.",
  "origen": "Chatbot Pixie · dupixelcode.com"
}
```

Los tres campos finales mantienen funcionando el correo actual de Make durante la migración.

## Variables de entorno

| Variable | Uso |
|---|---|
| `GEMINI_API_KEY` | Credencial del modelo, solo backend |
| `MAKE_PIXIE_WEBHOOK_URL` | Webhook V2 preferido |
| `MAKE_WEBHOOK_URL` | Nombre legacy compatible |
| `PIXIE_LEAD_THRESHOLD` | Umbral, predeterminado 30 |
| `PIXIE_WEBHOOK_ENABLED` | Interruptor de envío |
| `PIXIE_WEBHOOK_DEBOUNCE_MINUTES` | Ventana anti-spam, predeterminada 10 |
| `PIXIE_WEBHOOK_TIMEOUT_MS` | Timeout, predeterminado 5000 ms |
| `PIXIE_STATE_SECRET` | Secreto aleatorio largo para firmar el historial. Recomendado en producción; mientras no exista, el servidor usa la credencial del modelo como respaldo HMAC sin exponerla. |
| `PIXIE_DEBUG_PAYLOAD` | Payload de depuración solo fuera de producción |

No se guardan secretos en frontend ni en Git.

## Debug local

En Netlify Dev, establecer `PIXIE_DEBUG_PAYLOAD=true` y abrir la web con `?pixie_debug=1`. La respuesta del backend incluirá `debug_payload` y el frontend lo mostrará en consola. El backend bloquea este campo cuando `CONTEXT=production`.

## Manejo de errores y logging

- Un fallo del webhook no altera la respuesta del chat.
- El webhook tiene timeout y `try/catch`.
- Los logs incluyen `session_id`, evento, `event_id` y timestamp, pero no payloads, mensajes, credenciales ni datos de contacto.
- Claves, tokens, contraseñas, encabezados de autorización y secuencias similares a tarjetas se redactan antes de persistir o enviar la conversación. La URL enviada omite query string y fragmentos.
- `/api/chat` limita 12 solicitudes por minuto por IP y dominio, exige JSON y valida el origen en producción. La ruta directa de la función queda deshabilitada mediante la ruta personalizada de Netlify.
- Mensajes esperados: `Session created`, `Message stored`, `Lead detected`, `Sending webhook`, `Webhook success`, `Webhook failed`.

## Pruebas

Ejecutar:

```bash
npm test
```

Las pruebas cubren conversación no comercial, pregunta de precio, negocio con problema, captura de email, historial largo, fallo del webhook, recarga, sesión nueva, valores `null` y debounce.

## Cambios posteriores en Make

El escenario actual es Webhook → Gmail y solo mapea `mensaje_cliente`, `respuesta_pixie` y `origen`. Después de aprobar y desplegar V2:

1. Volver a determinar la estructura de datos del webhook con un payload V2 de prueba.
2. Actualizar Gmail para usar datos del lead y `conversation_text`.
3. Agregar un Router después del webhook.
4. Mantener una rama Gmail y crear una rama Telegram con la conexión existente.
5. Opcional: agregar Data Store/CRM y deduplicar por `event_id`.
6. No eliminar los campos legacy hasta confirmar varias ejecuciones correctas.

## Reversión

No hay despliegue ni push. Para descartar todo el trabajo V2, cambiar a `main` sin conservar la rama o eliminar la rama local después de guardar cualquier cambio que se quiera mantener. No usar comandos destructivos mientras existan cambios sin commit. En producción, el último commit previo a V2 sigue siendo `dace5d1`.
