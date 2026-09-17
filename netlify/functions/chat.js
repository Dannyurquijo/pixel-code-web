const { cleanText, ensureLatestUserMessage, sanitizeConversation, toLlmContents } = require('./pixie/conversation');
const { analyzeLead, selectEvent } = require('./pixie/lead-analyzer');
const { shouldNotify } = require('./pixie/notification-policy');
const { buildPayload } = require('./pixie/payload-builder');
const { sendMakeWebhook } = require('./pixie/make-webhook');
const { buildSystemPrompt } = require('./pixie/system-prompt');

const jsonResponse = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' },
  body: JSON.stringify(body)
});

const validSessionId = (value) => typeof value === 'string' && /^px_\d+_[a-f0-9]{6,16}$/i.test(value);
const fallbackSessionId = () => `px_${Date.now()}_${Math.random().toString(16).slice(2, 12)}`;

const safeCampaign = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const allowed = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content'];
  const entries = allowed.map((key) => [key, cleanText(value[key], 120)]).filter(([, item]) => item);
  return entries.length ? Object.fromEntries(entries) : null;
};

const getQueretaroContext = (date = new Date()) => {
  const time = new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City', hour: '2-digit', minute: '2-digit', hourCycle: 'h23'
  }).format(date);
  const hour = Number(time.split(':')[0]);
  return { time, afterHours: hour >= 20 || hour < 8 };
};

const requestLlm = async ({ apiKey, systemPrompt, contents, fetchImpl = global.fetch }) => {
  const response = await fetchImpl(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ systemInstruction: { parts: [{ text: systemPrompt }] }, contents })
  });
  const data = await response.json();
  if (!response.ok || data.error) throw new Error('LLM request failed');
  const reply = cleanText(data.candidates?.[0]?.content?.parts?.[0]?.text, 4000);
  if (!reply) throw new Error('LLM returned an empty reply');
  return reply;
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return jsonResponse(405, { reply: 'Método no permitido.' });

  const now = new Date();
  const timestamp = now.toISOString();
  let sessionId = null;

  try {
    const body = JSON.parse(event.body || '{}');
    const userMessage = cleanText(body.message, 600);
    if (!userMessage) return jsonResponse(400, { reply: 'Escribe un mensaje para continuar.' });

    sessionId = validSessionId(body.session_id) ? body.session_id : fallbackSessionId();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error('LLM unavailable');

    const legacyHistory = sanitizeConversation(body.history, timestamp);
    const receivedConversation = sanitizeConversation(body.conversation, timestamp);
    const canonicalConversation = ensureLatestUserMessage(
      receivedConversation.length ? receivedConversation : legacyHistory,
      userMessage,
      timestamp
    );
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
      previous: body.notification_state,
      now: Date.now(),
      debounceMs: debounceMinutes * 60 * 1000
    });

    const createdAt = body.created_at && Number.isFinite(Date.parse(body.created_at)) ? new Date(body.created_at).toISOString() : completeConversation[0]?.timestamp || timestamp;
    const payload = commercialEvent ? buildPayload({
      event: commercialEvent,
      sessionId,
      lead,
      conversation: completeConversation,
      latestUser: userMessage,
      latestPixie: reply,
      origin: { page_url: cleanText(body.page_url, 500), campaign: safeCampaign(body.campaign) },
      createdAt,
      updatedAt: completeConversation.at(-1).timestamp
    }) : null;

    let notification = { sent: false, event: commercialEvent, reason: policy.reason };
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
        last_sent_at: webhookResult.sent ? timestamp : null,
        last_score: webhookResult.sent ? lead.lead_score : Number(body.notification_state?.last_score || 0),
        last_event: webhookResult.sent ? commercialEvent : body.notification_state?.last_event || null,
        contact_fingerprint: webhookResult.sent ? policy.contact_fingerprint : body.notification_state?.contact_fingerprint || null
      };
    }

    const responseBody = { reply, session_id: sessionId, lead_detected: lead.lead_detected, notification };
    const debugAllowed = process.env.PIXIE_DEBUG_PAYLOAD === 'true' && process.env.CONTEXT !== 'production';
    if (debugAllowed && body.debug === true) responseBody.debug_payload = payload;
    return jsonResponse(200, responseBody);
  } catch (error) {
    console.error('[PIXIE] Chat failed', { session_id: sessionId, timestamp, error: error.message === 'LLM unavailable' ? 'configuration_missing' : 'request_failed' });
    return jsonResponse(500, { reply: '⚠️ Mis circuitos están tardando más de lo normal. Intenta de nuevo en un momento.' });
  }
};

exports._test = { getQueretaroContext, requestLlm, validSessionId, safeCampaign };
