const {
  cleanText,
  redactSensitive,
  ensureLatestUserMessage,
  sanitizeConversation,
  toLlmContents
} = require('./conversation');
const { analyzeLead, selectEvent } = require('./lead-analyzer');
const { shouldNotify } = require('./notification-policy');
const { buildPayload } = require('./payload-builder');
const { sendMakeWebhook } = require('./make-webhook');
const { buildSystemPrompt } = require('./system-prompt');
const { normalizeNotification, signState, verifyState } = require('./state-security');

const MAX_BODY_BYTES = 128 * 1024;
const LLM_TIMEOUT_MS = 15000;

const SECURITY_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
};

const jsonResponse = (statusCode, body, extraHeaders = {}) => ({
  statusCode,
  headers: { ...SECURITY_HEADERS, ...extraHeaders },
  body: JSON.stringify(body)
});

const header = (headers, name) => {
  if (!headers || typeof headers !== 'object') return null;
  const key = Object.keys(headers).find((item) => item.toLowerCase() === name.toLowerCase());
  return key ? String(headers[key]) : null;
};

const allowedOrigins = () => {
  const values = ['https://dupixelcode.com', 'https://www.dupixelcode.com'];
  [process.env.URL, process.env.DEPLOY_PRIME_URL].forEach((value) => {
    try { if (value) values.push(new URL(value).origin); } catch (_) { /* Ignore invalid platform URLs. */ }
  });
  return new Set(values);
};

const validateRequest = (event) => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { reply: 'Método no permitido.' }, { Allow: 'POST' });

  const rawBody = typeof event.body === 'string' ? event.body : '';
  if (Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
    return jsonResponse(413, { reply: 'La conversación excede el límite permitido.' });
  }

  const contentType = header(event.headers, 'content-type');
  if (contentType && !contentType.toLowerCase().startsWith('application/json')) {
    return jsonResponse(415, { reply: 'El contenido debe enviarse como JSON.' });
  }

  if (event.headers && Object.keys(event.headers).length) {
    const origin = header(event.headers, 'origin');
    const requestHost = (header(event.headers, 'host') || '').split(':')[0].toLowerCase();
    const localRequest = ['localhost', '127.0.0.1', '::1'].includes(requestHost);
    let localOrigin = false;
    try { localOrigin = ['localhost', '127.0.0.1', '::1'].includes(new URL(origin).hostname); } catch (_) { localOrigin = false; }
    if (!origin || (!allowedOrigins().has(origin) && !(localRequest && localOrigin))) {
      return jsonResponse(403, { reply: 'Origen no permitido.' });
    }
  }

  return null;
};

const validSessionId = (value) => typeof value === 'string' && /^px_\d+_[a-f0-9]{6,16}$/i.test(value);
const fallbackSessionId = () => `px_${Date.now()}_${require('node:crypto').randomBytes(5).toString('hex')}`;

const safeCampaign = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  const entries = allowed.map((key) => [key, cleanText(value[key], 120)]).filter(([, item]) => item);
  return entries.length ? Object.fromEntries(entries) : null;
};

const safePageUrl = (value) => {
  try {
    const parsed = new URL(value);
    if (parsed.protocol !== 'https:' || !['dupixelcode.com', 'www.dupixelcode.com'].includes(parsed.hostname)) return null;
    parsed.search = '';
    parsed.hash = '';
    return parsed.toString();
  } catch (_) {
    return null;
  }
};

const getQueretaroContext = (date = new Date()) => {
  const time = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).format(date);
  const hour = Number(time.split(':')[0]);
  return { time, afterHours: hour >= 20 || hour < 8 };
};

const requestLlm = async ({ apiKey, systemPrompt, contents, fetchImpl = global.fetch }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LLM_TIMEOUT_MS);
  try {
    const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { temperature: 0.4, maxOutputTokens: 700 }
      }),
      signal: controller.signal
    });
    const data = await response.json();
    if (!response.ok || data.error) throw new Error('LLM request failed');
    const reply = redactSensitive(cleanText(data.candidates?.[0]?.content?.parts?.[0]?.text, 4000) || '');
    if (!reply) throw new Error('LLM returned an empty reply');
    return reply;
  } finally {
    clearTimeout(timer);
  }
};

exports.handler = async (event) => {
  const rejected = validateRequest(event);
  if (rejected) return rejected;

  const now = new Date();
  const timestamp = now.toISOString();
  let sessionId = null;

  try {
    let body;
    try {
      body = JSON.parse(event.body || '{}');
    } catch (_) {
      return jsonResponse(400, { reply: 'La solicitud contiene JSON inválido.' });
    }
    if (!body || typeof body !== 'object' || Array.isArray(body)) {
      return jsonResponse(400, { reply: 'La solicitud no tiene una estructura válida.' });
    }

    const userMessage = cleanText(body.message, 600);
    if (!userMessage) return jsonResponse(400, { reply: 'Escribe un mensaje para continuar.' });

    sessionId = validSessionId(body.session_id) ? body.session_id : fallbackSessionId();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('LLM unavailable');

    const receivedConversation = sanitizeConversation(body.conversation);
    const lastReceived = receivedConversation.at(-1);
    const previousConversation = lastReceived?.role === 'user' && lastReceived.content === userMessage
      ? receivedConversation.slice(0, -1)
      : receivedConversation;
    const receivedNotification = normalizeNotification(body.notification_state);
    const stateSecret = process.env.PIXIE_STATE_SECRET || apiKey;
    const stateIsTrusted = verifyState({
      token: body.state_token,
      secret: stateSecret,
      sessionId,
      conversation: previousConversation,
      notification: receivedNotification
    });
    if (body.state_token && !stateIsTrusted) {
      console.warn('[PIXIE] Untrusted client state discarded', { session_id: sessionId, timestamp });
    }

    const canonicalConversation = ensureLatestUserMessage(
      stateIsTrusted ? previousConversation : [],
      userMessage,
      timestamp
    );
    const previousNotification = stateIsTrusted ? receivedNotification : normalizeNotification(null);
    const { time, afterHours } = getQueretaroContext(now);
    const reply = await requestLlm({
      apiKey,
      systemPrompt: buildSystemPrompt({ queretaroTime: time, afterHours }),
      contents: toLlmContents(canonicalConversation, 20)
    });
    const completeConversation = [...canonicalConversation, { role: 'assistant', content: reply, timestamp: new Date().toISOString() }];

    const lead = analyzeLead(completeConversation, { threshold: Number(process.env.PIXIE_LEAD_THRESHOLD || 30) });
    const commercialEvent = selectEvent(lead);
    const debounceMinutes = Math.max(1, Number(process.env.PIXIE_WEBHOOK_DEBOUNCE_MINUTES || 10));
    const policy = shouldNotify({
      event: commercialEvent,
      lead,
      previous: previousNotification,
      now: Date.now(),
      debounceMs: debounceMinutes * 60 * 1000
    });

    const createdAt = body.created_at && Number.isFinite(Date.parse(body.created_at))
      ? new Date(body.created_at).toISOString()
      : completeConversation[0]?.timestamp || timestamp;
    const payload = commercialEvent ? buildPayload({
      event: commercialEvent,
      sessionId,
      lead,
      conversation: completeConversation,
      latestUser: userMessage,
      latestPixie: reply,
      origin: { page_url: safePageUrl(body.page_url), campaign: safeCampaign(body.campaign) },
      createdAt,
      updatedAt: completeConversation.at(-1).timestamp
    }) : null;

    let notification = { ...previousNotification, sent: false, event: commercialEvent, reason: policy.reason };
    const webhookEnabled = process.env.PIXIE_WEBHOOK_ENABLED !== 'false';
    if (payload && policy.notify && webhookEnabled) {
      console.info('[PIXIE] Lead detected', { session_id: sessionId, event: commercialEvent, score: lead.lead_score, timestamp });
      const webhookResult = await sendMakeWebhook({
        url: process.env.MAKE_PIXIE_WEBHOOK_URL || process.env.MAKE_WEBHOOK_URL,
        payload,
        timeoutMs: Math.max(1000, Number(process.env.PIXIE_WEBHOOK_TIMEOUT_MS || 5000))
      });
      notification = {
        sent: webhookResult.sent,
        event: commercialEvent,
        event_id: payload.event_id,
        reason: webhookResult.sent ? 'sent' : webhookResult.reason,
        last_sent_at: webhookResult.sent ? timestamp : previousNotification.last_sent_at,
        last_score: webhookResult.sent ? lead.lead_score : previousNotification.last_score,
        last_event: webhookResult.sent ? commercialEvent : previousNotification.last_event,
        contact_fingerprint: webhookResult.sent ? policy.contact_fingerprint : previousNotification.contact_fingerprint
      };
    }

    const responseBody = {
      reply,
      session_id: sessionId,
      lead_detected: lead.lead_detected,
      notification,
      state_token: signState({
        secret: stateSecret,
        sessionId,
        conversation: completeConversation,
        notification
      })
    };
    const debugAllowed = process.env.PIXIE_DEBUG_PAYLOAD === 'true' && process.env.CONTEXT !== 'production';
    if (debugAllowed && body.debug === true) responseBody.debug_payload = payload;
    return jsonResponse(200, responseBody);
  } catch (error) {
    console.error('[PIXIE] Chat failed', {
      session_id: sessionId,
      timestamp,
      error: error.message === 'LLM unavailable' ? 'configuration_missing' : error.name === 'AbortError' ? 'timeout' : 'request_failed'
    });
    return jsonResponse(500, { reply: '⚠️ Mis circuitos están tardando más de lo normal. Intenta de nuevo en un momento.' });
  }
};

exports._test = {
  MAX_BODY_BYTES,
  SECURITY_HEADERS,
  allowedOrigins,
  getQueretaroContext,
  requestLlm,
  safeCampaign,
  safePageUrl,
  validSessionId,
  validateRequest
};
