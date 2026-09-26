import { randomUUID } from 'node:crypto';

const MAX_BODY_BYTES = 8 * 1024;
const buckets = new Map();
const headers = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'no-referrer', 'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'" };
const json = (status, body, extra = {}) => new Response(JSON.stringify(body), { status, headers: { ...headers, ...extra } });
const clean = (value, max) => typeof value === 'string' ? value.trim().replace(/[\u0000-\u001F\u007F]/g, '').slice(0, max) : '';

const originAllowed = (request) => {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  try { if (new URL(request.url).origin === origin) return true; } catch (_) { /* Continue with explicit allowlist. */ }
  const allowed = new Set(['https://dupixelcode.com', 'https://www.dupixelcode.com']);
  [process.env.URL, process.env.DEPLOY_PRIME_URL].filter(Boolean).forEach((value) => { try { allowed.add(new URL(value).origin); } catch (_) { /* Ignore malformed platform URLs. */ } });
  return allowed.has(origin) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
};

const rateAllowed = (request) => {
  const now = Date.now();
  const id = request.headers.get('x-nf-client-connection-ip') || request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'local';
  const current = buckets.get(id);
  if (!current || current.resetAt <= now) { buckets.set(id, { count: 1, resetAt: now + 15 * 60 * 1000 }); return true; }
  current.count += 1;
  return current.count <= 5;
};

const validate = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false };
  const keys = new Set(['name', 'email', 'manual', 'consent', 'website']);
  if (Object.keys(value).some((key) => !keys.has(key))) return { ok: false };
  const input = {
    name: clean(value.name, 100),
    email: clean(value.email, 160).toLowerCase(),
    manual: clean(value.manual, 120),
    consent: value.consent === true,
    website: clean(value.website, 200),
  };
  const valid = input.name.length >= 3 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)
    && input.manual.length >= 3 && input.consent && !input.website;
  return valid ? { ok: true, input } : { ok: false };
};

const sendToMake = async ({ input, eventId, fetchImpl = global.fetch }) => {
  const url = process.env.MAKE_CONTACT_WEBHOOK_URL || process.env.MAKE_PIXIE_WEBHOOK_URL;
  const apiKey = process.env.MAKE_CONTACT_API_KEY || process.env.MAKE_PIXIE_API_KEY;
  if (!url || !apiKey) throw new Error('integration_unavailable');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 7000);
  try {
    const response = await fetchImpl(url, {
      method: 'POST', signal: controller.signal,
      headers: { 'Content-Type': 'application/json', 'x-make-apikey': apiKey, 'X-DU-Event-Id': eventId },
      body: JSON.stringify({ event_id: eventId, event: 'manual_download', source: 'dupixelcode.com/landing-manuales', received_at: new Date().toISOString(), Nombre: input.name, Empresa: '', Email: input.email, WhatsApp: '', Servicio_Interes: `Manual: ${input.manual}`, Mensaje: `Solicitud de descarga: ${input.manual}`, Acepta_Privacidad: true }),
    });
    if (!response.ok) throw new Error('upstream_rejected');
  } finally { clearTimeout(timer); }
};

export default async function handler(request) {
  if (request.method !== 'POST') return json(405, { error: 'Método no permitido.' }, { Allow: 'POST' });
  if (!originAllowed(request)) return json(403, { error: 'Origen no permitido.' });
  if (!rateAllowed(request)) return json(429, { error: 'Espera unos minutos antes de intentar de nuevo.' });
  if (!(request.headers.get('content-type') || '').toLowerCase().startsWith('application/json')) return json(415, { error: 'El contenido debe enviarse como JSON.' });
  const declared = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return json(413, { error: 'Solicitud demasiado grande.' });
  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return json(413, { error: 'Solicitud demasiado grande.' });
  let body;
  try { body = JSON.parse(raw); } catch (_) { return json(400, { error: 'Solicitud inválida.' }); }
  const parsed = validate(body);
  if (!parsed.ok) return json(400, { error: 'Revisa los datos del formulario.' });
  const eventId = `manual_${randomUUID()}`;
  try {
    await sendToMake({ input: parsed.input, eventId });
    console.info('[MANUAL] Download accepted', { event_id: eventId, timestamp: new Date().toISOString() });
    return json(202, { accepted: true, event_id: eventId });
  } catch (error) {
    console.error('[MANUAL] Delivery failed', { event_id: eventId, reason: error instanceof Error ? error.message : 'unknown_error', timestamp: new Date().toISOString() });
    return json(503, { error: 'No fue posible registrar la solicitud.' });
  }
}

export const config = { path: '/api/manual-register', method: 'POST', rateLimit: { action: 'rate_limit', windowLimit: 5, windowSize: 900, aggregateBy: ['ip', 'domain'] } };
export const _test = { validate, sendToMake, originAllowed, buckets };
