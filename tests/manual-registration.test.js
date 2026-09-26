const test = require('node:test');
const assert = require('node:assert/strict');

const valid = { name: 'Persona Prueba', email: 'persona@example.com', manual: 'Prompt Engineering', consent: true, website: '' };

test('Manual valida esquema cerrado, consentimiento y honeypot', async () => {
  const { _test } = await import('../netlify/functions/manual-register.mjs');
  assert.equal(_test.validate(valid).ok, true);
  assert.equal(_test.validate({ ...valid, website: 'spam.example' }).ok, false);
  assert.equal(_test.validate({ ...valid, consent: false }).ok, false);
  assert.equal(_test.validate({ ...valid, role: 'admin' }).ok, false);
});

test('Manual autentica Make y minimiza el payload', async () => {
  const previousUrl = process.env.MAKE_SITE_INTAKE_WEBHOOK_URL;
  const previousKey = process.env.MAKE_SITE_INTAKE_API_KEY;
  process.env.MAKE_SITE_INTAKE_WEBHOOK_URL = 'https://example.invalid/contact';
  process.env.MAKE_SITE_INTAKE_API_KEY = 'test-contact-key';
  let captured;
  try {
    const { _test } = await import('../netlify/functions/manual-register.mjs');
    await _test.sendToMake({ input: _test.validate(valid).input, eventId: 'manual_test', fetchImpl: async (url, options) => { captured = { url, options }; return { ok: true }; } });
    const body = JSON.parse(captured.options.body);
    assert.equal(captured.options.headers['x-make-apikey'], 'test-contact-key');
    assert.equal(body.event, 'manual_download');
    assert.equal(body.WhatsApp, '');
    assert.doesNotMatch(captured.options.body, /test-contact-key/);
  } finally {
    if (previousUrl === undefined) delete process.env.MAKE_SITE_INTAKE_WEBHOOK_URL; else process.env.MAKE_SITE_INTAKE_WEBHOOK_URL = previousUrl;
    if (previousKey === undefined) delete process.env.MAKE_SITE_INTAKE_API_KEY; else process.env.MAKE_SITE_INTAKE_API_KEY = previousKey;
  }
});

test('Manual permite mismo origen y rechaza un origen externo', async () => {
  const { _test } = await import('../netlify/functions/manual-register.mjs');
  const url = 'https://deploy-preview-1--moonlit-lamington-b718a2.netlify.app/api/manual-register';
  assert.equal(_test.originAllowed(new Request(url, { headers: { Origin: 'https://deploy-preview-1--moonlit-lamington-b718a2.netlify.app' } })), true);
  assert.equal(_test.originAllowed(new Request(url, { headers: { Origin: 'https://attacker.example' } })), false);
});
