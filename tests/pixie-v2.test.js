const test = require('node:test');
const assert = require('node:assert/strict');

const { analyzeLead, selectEvent } = require('../netlify/functions/pixie/lead-analyzer');
const { buildPayload } = require('../netlify/functions/pixie/payload-builder');
const { shouldNotify } = require('../netlify/functions/pixie/notification-policy');
const PixieSession = require('../assets/js/pixie/session-manager');
const PixieStore = require('../assets/js/pixie/conversation-store');

const at = (index) => new Date(Date.UTC(2026, 8, 17, 15, 0, index)).toISOString();
const msg = (role, content, index = 0) => ({ role, content, timestamp: at(index) });

class FakeStorage {
  constructor() { this.data = new Map(); }
  getItem(key) { return this.data.has(key) ? this.data.get(key) : null; }
  setItem(key, value) { this.data.set(key, String(value)); }
  removeItem(key) { this.data.delete(key); }
}

test('TEST 1: conversación normal no genera un lead', () => {
  const lead = analyzeLead([msg('user', 'Hola, gracias. Solo estaba saludando.')]);
  assert.equal(lead.lead_detected, false);
  assert.equal(selectEvent(lead), null);
});

test('TEST 2: una pregunta de precio eleva la intención', () => {
  const lead = analyzeLead([msg('user', '¿Cuánto cuesta desarrollar un chatbot?')]);
  assert.ok(lead.lead_score >= 30);
  assert.equal(lead.service_interest, 'Agentes y chatbots de IA');
  assert.equal(lead.intent.asks_price, true);
});

test('TEST 3: empresa con problema de automatización se identifica', () => {
  const lead = analyzeLead([msg('user', 'Tengo una empresa y quiero automatizar la atención al cliente.')]);
  assert.equal(lead.lead_detected, true);
  assert.equal(lead.service_interest, 'Automatización de procesos');
  assert.ok(lead.lead_score >= 50);
});

test('TEST 4: el correo se extrae y activa captura de contacto', () => {
  const lead = analyzeLead([msg('user', 'Mi correo es ejemplo@email.com')]);
  assert.equal(lead.email, 'ejemplo@email.com');
  assert.equal(selectEvent(lead), 'contact_information_captured');
});

test('TEST 5: el payload conserva todos los mensajes de una conversación larga', () => {
  const conversation = Array.from({ length: 12 }, (_, index) => msg(index % 2 ? 'assistant' : 'user', `Mensaje ${index + 1}`, index));
  const lead = analyzeLead([...conversation, msg('user', 'Quiero una cotización para automatizar mi empresa. Mi correo es juan@empresa.com', 13)]);
  const complete = [...conversation, msg('user', 'Quiero una cotización para automatizar mi empresa. Mi correo es juan@empresa.com', 13), msg('assistant', 'Claro, revisemos tu operación.', 14)];
  const payload = buildPayload({ event: selectEvent(lead), sessionId: 'px_1723456789_a8f3d91', lead, conversation: complete, latestUser: complete.at(-2).content, latestPixie: complete.at(-1).content, origin: { page_url: 'https://dupixelcode.com/' }, createdAt: complete[0].timestamp, updatedAt: complete.at(-1).timestamp });
  assert.equal(payload.conversation.length, 14);
  assert.equal(payload.metadata.message_count, 14);
  assert.match(payload.conversation_text, /Mensaje 1/);
  assert.match(payload.conversation_text, /juan@empresa\.com/);
  assert.ok(payload.mensaje_cliente);
  assert.ok(payload.respuesta_pixie);
  assert.ok(payload.origen);
});

test('TEST 6: un fallo del webhook no rompe la respuesta de Pixie', async () => {
  const previousFetch = global.fetch;
  const previousValues = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    MAKE_PIXIE_WEBHOOK_URL: process.env.MAKE_PIXIE_WEBHOOK_URL,
    PIXIE_WEBHOOK_ENABLED: process.env.PIXIE_WEBHOOK_ENABLED
  };
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.MAKE_PIXIE_WEBHOOK_URL = 'https://example.invalid/webhook';
  process.env.PIXIE_WEBHOOK_ENABLED = 'true';
  global.fetch = async (url) => {
    if (String(url).includes('generativelanguage.googleapis.com')) {
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Podemos analizar tu proceso.' }] } }] }) };
    }
    throw new Error('webhook offline');
  };
  delete require.cache[require.resolve('../netlify/functions/chat')];
  const { handler } = require('../netlify/functions/chat');
  const response = await handler({ httpMethod: 'POST', body: JSON.stringify({ message: 'Quiero cotizar un chatbot para mi empresa', session_id: 'px_1723456789_a8f3d91', conversation: [msg('user', 'Quiero cotizar un chatbot para mi empresa')] }) });
  const body = JSON.parse(response.body);
  assert.equal(response.statusCode, 200);
  assert.equal(body.reply, 'Podemos analizar tu proceso.');
  assert.equal(body.notification.sent, false);
  global.fetch = previousFetch;
  Object.entries(previousValues).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  });
});

test('TEST 7: recargar conserva sesión e historial en localStorage', () => {
  const storage = new FakeStorage();
  const sessionA = PixieSession.getOrCreate(storage, { now: 1000 });
  const storeA = PixieStore.create({ storage, session: sessionA, greeting: 'Hola' });
  storeA.append({ role: 'user', content: 'Necesito automatizar ventas', timestamp: at(1) });
  const sessionB = PixieSession.getOrCreate(storage, { now: 2000 });
  const storeB = PixieStore.create({ storage, session: sessionB, greeting: 'Hola' });
  assert.equal(sessionB.session_id, sessionA.session_id);
  assert.equal(storeB.get().messages.length, 2);
});

test('TEST 8: una sesión nueva no mezcla el historial anterior', () => {
  const storage = new FakeStorage();
  const first = PixieSession.getOrCreate(storage, { now: 1000 });
  const firstStore = PixieStore.create({ storage, session: first, greeting: 'Hola' });
  firstStore.append({ role: 'user', content: 'Mensaje privado de la primera sesión', timestamp: at(1) });
  const second = PixieSession.reset(storage, { now: 2000 });
  const secondStore = PixieStore.create({ storage, session: second, greeting: 'Hola' });
  assert.notEqual(second.session_id, first.session_id);
  assert.equal(secondStore.get().messages.length, 1);
  assert.doesNotMatch(JSON.stringify(secondStore.get()), /Mensaje privado/);
});

test('TEST 9: los campos desconocidos son null y nunca cadenas vacías', () => {
  const lead = analyzeLead([msg('user', 'Quiero información sobre automatización')]);
  ['name', 'email', 'phone', 'company', 'budget', 'timeline', 'city'].forEach((field) => assert.equal(lead[field], null));
  assert.equal(Object.values(lead).includes(''), false);
});

test('Debounce: evita duplicados pero permite contacto nuevo o aumento significativo', () => {
  const lead = analyzeLead([msg('user', 'Tengo una empresa y quiero cotizar automatización. Mi correo es hola@empresa.com')]);
  const first = shouldNotify({ event: selectEvent(lead), lead, previous: {}, now: 100000 });
  assert.equal(first.notify, true);
  const duplicate = shouldNotify({ event: selectEvent(lead), lead, previous: { last_sent_at: new Date(100000).toISOString(), last_score: lead.lead_score, last_event: selectEvent(lead), contact_fingerprint: first.contact_fingerprint }, now: 101000 });
  assert.equal(duplicate.notify, false);
});

test('Seguridad: secretos y datos financieros se redactan antes del payload', () => {
  const conversation = [
    msg('user', 'Quiero cotizar un chatbot. api_key=sk-1234567890abcdef y tarjeta 4111 1111 1111 1111'),
    msg('assistant', 'No compartas información sensible.', 1)
  ];
  const lead = analyzeLead(conversation);
  const payload = buildPayload({ event: 'quote_requested', sessionId: 'px_1723456789_a8f3d91', lead, conversation, latestUser: conversation[0].content, latestPixie: conversation[1].content, origin: { page_url: 'https://dupixelcode.com/' }, createdAt: conversation[0].timestamp, updatedAt: conversation[1].timestamp });
  const serialized = JSON.stringify(payload);
  assert.doesNotMatch(serialized, /sk-1234567890abcdef/);
  assert.doesNotMatch(serialized, /4111 1111 1111 1111/);
  assert.match(serialized, /REDACTADO/);
});

test('Criterio final: Make recibe sesión, lead, contacto e historial completo', async () => {
  const previousFetch = global.fetch;
  const previousValues = {
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    MAKE_PIXIE_WEBHOOK_URL: process.env.MAKE_PIXIE_WEBHOOK_URL,
    PIXIE_WEBHOOK_ENABLED: process.env.PIXIE_WEBHOOK_ENABLED
  };
  let receivedPayload = null;
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.MAKE_PIXIE_WEBHOOK_URL = 'https://example.invalid/pixie';
  process.env.PIXIE_WEBHOOK_ENABLED = 'true';
  global.fetch = async (url, options = {}) => {
    if (String(url).includes('generativelanguage.googleapis.com')) {
      return { ok: true, status: 200, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Gracias. El equipo dará seguimiento a tu solicitud.' }] } }] }) };
    }
    receivedPayload = JSON.parse(options.body);
    return { ok: true, status: 200, json: async () => ({ ok: true }) };
  };
  delete require.cache[require.resolve('../netlify/functions/chat')];
  const { handler } = require('../netlify/functions/chat');
  const conversation = [
    msg('user', 'Hola.', 0),
    msg('assistant', '¡Hola! ¿En qué puedo ayudarte?', 1),
    msg('user', 'Tengo una empresa de manufactura.', 2),
    msg('assistant', 'Perfecto. ¿Qué problema buscas resolver?', 3),
    msg('user', 'Quiero implementar IA para atención a clientes.', 4),
    msg('assistant', 'Podemos revisar el proceso y las integraciones necesarias.', 5),
    msg('user', '¿Me pueden cotizar?', 6),
    msg('assistant', 'Claro. Si deseas seguimiento puedes compartir un correo.', 7),
    msg('user', 'Mi correo es juan@empresa.com', 8)
  ];
  const response = await handler({ httpMethod: 'POST', body: JSON.stringify({ message: conversation.at(-1).content, session_id: 'px_1723456789_a8f3d91', created_at: conversation[0].timestamp, conversation, page_url: 'https://dupixelcode.com/' }) });
  assert.equal(response.statusCode, 200);
  assert.ok(receivedPayload);
  assert.equal(receivedPayload.session_id, 'px_1723456789_a8f3d91');
  assert.equal(receivedPayload.lead_detected, true);
  assert.ok(receivedPayload.lead_score >= 80);
  assert.equal(receivedPayload.email, 'juan@empresa.com');
  assert.ok(receivedPayload.service_interest);
  assert.equal(receivedPayload.conversation.length, 10);
  assert.match(receivedPayload.conversation_text, /empresa de manufactura/);
  assert.ok(receivedPayload.mensaje_cliente);
  assert.ok(receivedPayload.respuesta_pixie);
  assert.ok(receivedPayload.origen);
  global.fetch = previousFetch;
  Object.entries(previousValues).forEach(([key, value]) => {
    if (value === undefined) delete process.env[key]; else process.env[key] = value;
  });
});
