import { randomUUID } from 'node:crypto';

const MAX_BODY_BYTES = 12 * 1024;
const buckets = new Map();
const SECURITY_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
};

const jsonResponse = (status, body, extraHeaders = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { ...SECURITY_HEADERS, ...extraHeaders }
});

const cleanText = (value, maxLength) => typeof value === 'string'
  ? value.trim().replace(/[\u0000-\u001F\u007F]/g, '').slice(0, maxLength)
  : '';

const originAllowed = (request) => {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { if (new URL(request.url).origin === origin) return true; } catch (_) { /* Continue with explicit allowlist. */ }
  const allowed = new Set(['https://dupixelcode.com', 'https://www.dupixelcode.com']);
  [process.env.URL, process.env.DEPLOY_PRIME_URL].filter(Boolean).forEach((value) => {
    try { allowed.add(new URL(value).origin); } catch (_) { /* Ignore malformed platform URLs. */ }
  });
  return allowed.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

const rateAllowed = (request) => {
  const now = Date.now();
  const identifier = request.headers.get('x-nf-client-connection-ip')
    || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || 'local';
  const current = buckets.get(identifier);
  if (!current || current.resetAt <= now) {
    buckets.set(identifier, { count: 1, resetAt: now + 15 * 60 * 1000 });
    return true;
  }
  current.count += 1;
  return current.count <= 5;
};

const validateRegistration = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false };
  const allowedKeys = new Set(['name', 'specialty', 'phone', 'email', 'consent', 'website']);
  if (Object.keys(value).some((key) => !allowedKeys.has(key))) return { ok: false };

  const input = {
    name: cleanText(value.name, 100),
    specialty: cleanText(value.specialty, 120),
    phone: cleanText(value.phone, 24),
    email: cleanText(value.email, 160).toLowerCase(),
    consent: value.consent === true,
    website: cleanText(value.website, 200)
  };
  const valid = input.name.length >= 3
    && input.specialty.length >= 3
    && /^\+?[0-9][0-9\s-]{8,20}[0-9]$/.test(input.phone)
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)
    && input.consent
    && !input.website;
  return valid ? { ok: true, input } : { ok: false };
};

const sendToMake = async ({ input, eventId, fetchImpl = global.fetch }) => {
  const url = process.env.MAKE_WEBINAR_WEBHOOK_URL;
  const apiKey = process.env.MAKE_WEBINAR_API_KEY;
  if (!url || !apiKey) throw new Error('integration_unavailable');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const result = await fetchImpl(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-make-apikey': apiKey,
        'X-DU-Event-Id': eventId
      },
      body: JSON.stringify({
        event_id: eventId,
        event: 'webinar_registration',
        source: 'dupixelcode.com/webinarlanding',
        received_at: new Date().toISOString(),
        Nombre: input.name,
        Especialidad: input.specialty,
        Telefono: input.phone,
        Email: input.email,
        Acepta_Privacidad: true
      }),
      signal: controller.signal
    });
    if (!result.ok) throw new Error('upstream_rejected');
  } finally {
    clearTimeout(timer);
  }
};

export default async function handler(request) {
  if (request.method !== 'POST') return jsonResponse(405, { error: 'Método no permitido.' }, { Allow: 'POST' });
  if (!originAllowed(request)) return jsonResponse(403, { error: 'Origen no permitido.' });
  if (!rateAllowed(request)) return jsonResponse(429, { error: 'Espera unos minutos antes de intentar de nuevo.' });
  const contentType = request.headers.get('content-type') || '';
  if (!contentType.toLowerCase().startsWith('application/json')) return jsonResponse(415, { error: 'El contenido debe enviarse como JSON.' });

  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return jsonResponse(413, { error: 'Solicitud demasiado grande.' });
  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return jsonResponse(413, { error: 'Solicitud demasiado grande.' });

  let body;
  try { body = JSON.parse(raw); } catch (_) { return jsonResponse(400, { error: 'Solicitud inválida.' }); }
  const parsed = validateRegistration(body);
  if (!parsed.ok) return jsonResponse(400, { error: 'Revisa los datos del formulario.' });

  const eventId = `webinar_${randomUUID()}`;
  try {
    await sendToMake({ input: parsed.input, eventId });
    console.info('[WEBINAR] Registration accepted', { event_id: eventId, timestamp: new Date().toISOString() });
    return jsonResponse(202, { accepted: true, event_id: eventId });
  } catch (error) {
    console.error('[WEBINAR] Registration delivery failed', {
      event_id: eventId,
      reason: error instanceof Error ? error.message : 'unknown_error',
      timestamp: new Date().toISOString()
    });
    return jsonResponse(503, { error: 'No fue posible completar el registro. Intenta de nuevo.' });
  }
}

export const config = {
  path: '/api/webinar-register',
  method: 'POST',
  rateLimit: { action: 'rate_limit', windowLimit: 5, windowSize: 900, aggregateBy: ['ip', 'domain'] }
};

export const _test = { MAX_BODY_BYTES, cleanText, originAllowed, validateRegistration, sendToMake, buckets };
