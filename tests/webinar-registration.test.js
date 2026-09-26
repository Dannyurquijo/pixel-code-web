const test = require('node:test');
const assert = require('node:assert/strict');

const validRegistration = {
  name: 'Persona Prueba',
  specialty: 'Ingeniería estructural',
  phone: '+52 442 000 0000',
  email: 'persona@example.com',
  consent: true,
  website: ''
};

test('Webinar valida, normaliza y rechaza bot/campos inesperados', async () => {
  const { _test } = await import('../netlify/functions/webinar-register.mjs');
  const parsed = _test.validateRegistration(validRegistration);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.input.email, 'persona@example.com');
  assert.equal(_test.validateRegistration({ ...validRegistration, website: 'spam.example' }).ok, false);
  assert.equal(_test.validateRegistration({ ...validRegistration, consent: false }).ok, false);
  assert.equal(_test.validateRegistration({ ...validRegistration, admin: true }).ok, false);
});

test('Webinar autentica el envío server-to-server sin filtrar la clave al body', async () => {
  const previousUrl = process.env.MAKE_SITE_INTAKE_WEBHOOK_URL;
  const previousKey = process.env.MAKE_SITE_INTAKE_API_KEY;
  process.env.MAKE_SITE_INTAKE_WEBHOOK_URL = 'https://example.invalid/webinar';
  process.env.MAKE_SITE_INTAKE_API_KEY = 'test-api-key';
  let captured;
  try {
    const { _test } = await import('../netlify/functions/webinar-register.mjs');
    await _test.sendToMake({
      input: _test.validateRegistration(validRegistration).input,
      eventId: 'webinar_test_event',
      fetchImpl: async (url, options) => {
        captured = { url, options };
        return { ok: true, status: 200 };
      }
    });
    assert.equal(captured.options.headers['x-make-apikey'], 'test-api-key');
    assert.equal(JSON.parse(captured.options.body).event_id, 'webinar_test_event');
    assert.doesNotMatch(captured.options.body, /test-api-key/);
  } finally {
    if (previousUrl === undefined) delete process.env.MAKE_SITE_INTAKE_WEBHOOK_URL; else process.env.MAKE_SITE_INTAKE_WEBHOOK_URL = previousUrl;
    if (previousKey === undefined) delete process.env.MAKE_SITE_INTAKE_API_KEY; else process.env.MAKE_SITE_INTAKE_API_KEY = previousKey;
  }
});

test('Endpoint de webinar rechaza origen externo y acepta entrega válida', async () => {
  const previousUrl = process.env.MAKE_SITE_INTAKE_WEBHOOK_URL;
  const previousKey = process.env.MAKE_SITE_INTAKE_API_KEY;
  const previousFetch = global.fetch;
  process.env.MAKE_SITE_INTAKE_WEBHOOK_URL = 'https://example.invalid/webinar';
  process.env.MAKE_SITE_INTAKE_API_KEY = 'test-api-key';
  global.fetch = async () => ({ ok: true, status: 200 });
  try {
    const { default: handler } = await import('../netlify/functions/webinar-register.mjs');
    const rejected = await handler(new Request('https://dupixelcode.com/api/webinar-register', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://attacker.example' }, body: JSON.stringify(validRegistration)
    }));
    assert.equal(rejected.status, 403);

    const accepted = await handler(new Request('https://dupixelcode.com/api/webinar-register', {
      method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://dupixelcode.com' }, body: JSON.stringify(validRegistration)
    }));
    const payload = await accepted.json();
    assert.equal(accepted.status, 202);
    assert.equal(payload.accepted, true);
  } finally {
    global.fetch = previousFetch;
    if (previousUrl === undefined) delete process.env.MAKE_SITE_INTAKE_WEBHOOK_URL; else process.env.MAKE_SITE_INTAKE_WEBHOOK_URL = previousUrl;
    if (previousKey === undefined) delete process.env.MAKE_SITE_INTAKE_API_KEY; else process.env.MAKE_SITE_INTAKE_API_KEY = previousKey;
  }
});

test('Webinar permite el mismo origen de un Deploy Preview', async () => {
  const { _test } = await import('../netlify/functions/webinar-register.mjs');
  const request = new Request('https://deploy-preview-1--moonlit-lamington-b718a2.netlify.app/api/webinar-register', { headers: { Origin: 'https://deploy-preview-1--moonlit-lamington-b718a2.netlify.app' } });
  assert.equal(_test.originAllowed(request), true);
});

test('Webinar reutiliza las credenciales del flujo consolidado cuando no hay sobrescritura', async () => {
  const previous = {
    webinarUrl: process.env.MAKE_SITE_INTAKE_WEBHOOK_URL,
    webinarKey: process.env.MAKE_SITE_INTAKE_API_KEY,
    pixieUrl: process.env.MAKE_PIXIE_WEBHOOK_URL,
    pixieKey: process.env.MAKE_PIXIE_API_KEY
  };
  delete process.env.MAKE_SITE_INTAKE_WEBHOOK_URL;
  delete process.env.MAKE_SITE_INTAKE_API_KEY;
  process.env.MAKE_PIXIE_WEBHOOK_URL = 'https://example.invalid/consolidated';
  process.env.MAKE_PIXIE_API_KEY = 'consolidated-test-key';
  try {
    const { _test } = await import('../netlify/functions/webinar-register.mjs');
    let captured;
    await _test.sendToMake({
      input: _test.validateRegistration(validRegistration).input,
      eventId: 'webinar_consolidated_test',
      fetchImpl: async (url, options) => { captured = { url, options }; return { ok: true }; }
    });
    assert.equal(captured.url, 'https://example.invalid/consolidated');
    assert.equal(captured.options.headers['x-make-apikey'], 'consolidated-test-key');
  } finally {
    const restore = (name, value) => value === undefined ? delete process.env[name] : process.env[name] = value;
    restore('MAKE_SITE_INTAKE_WEBHOOK_URL', previous.webinarUrl);
    restore('MAKE_SITE_INTAKE_API_KEY', previous.webinarKey);
    restore('MAKE_PIXIE_WEBHOOK_URL', previous.pixieUrl);
    restore('MAKE_PIXIE_API_KEY', previous.pixieKey);
  }
});
