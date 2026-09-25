const test = require('node:test');
const assert = require('node:assert/strict');

const valid = { name: 'Persona Prueba', company: 'Empresa Prueba', email: 'persona@example.com', phone: '+52 442 000 0000', service: 'Automatización', message: 'Necesitamos automatizar el seguimiento comercial.', consent: true, website: '' };

test('Contacto valida esquema cerrado, consentimiento y honeypot', async () => {
  const { _test } = await import('../netlify/functions/contact-register.mjs');
  assert.equal(_test.validate(valid).ok, true);
  assert.equal(_test.validate({ ...valid, website: 'spam.example' }).ok, false);
  assert.equal(_test.validate({ ...valid, consent: false }).ok, false);
  assert.equal(_test.validate({ ...valid, role: 'admin' }).ok, false);
});

test('Contacto autentica Make sin incluir la clave en el payload', async () => {
  const previousUrl = process.env.MAKE_CONTACT_WEBHOOK_URL;
  const previousKey = process.env.MAKE_CONTACT_API_KEY;
  process.env.MAKE_CONTACT_WEBHOOK_URL = 'https://example.invalid/contact';
  process.env.MAKE_CONTACT_API_KEY = 'test-contact-key';
  let captured;
  try {
    const { _test } = await import('../netlify/functions/contact-register.mjs');
    await _test.sendToMake({ input: _test.validate(valid).input, eventId: 'contact_test', fetchImpl: async (url, options) => { captured = { url, options }; return { ok: true }; } });
    assert.equal(captured.options.headers['x-make-apikey'], 'test-contact-key');
    assert.equal(JSON.parse(captured.options.body).event, 'project_inquiry');
    assert.doesNotMatch(captured.options.body, /test-contact-key/);
  } finally {
    if (previousUrl === undefined) delete process.env.MAKE_CONTACT_WEBHOOK_URL; else process.env.MAKE_CONTACT_WEBHOOK_URL = previousUrl;
    if (previousKey === undefined) delete process.env.MAKE_CONTACT_API_KEY; else process.env.MAKE_CONTACT_API_KEY = previousKey;
  }
});
