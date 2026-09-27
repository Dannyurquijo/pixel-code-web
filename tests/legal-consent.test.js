const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

const publicPages = [
  'index.html',
  'banco_DUPC.html',
  'barberia.html',
  'clinica.html',
  'cotizaciones.html',
  'landing.html',
  'landing-manuales.html',
  'servicios.html',
  'cursos.html',
  'cursolanding.html',
  'webinarlanding.html',
  'tarjeta.html',
  'maquinados.html',
  'notebooklm.html',
  'suplementos.html',
  'oferta-vip.html',
  'gracias.html',
  'pago-exitoso.html',
  'diagnostico/index.html',
  'business-scan-src/index.html',
  'privacidad.html',
  'terminos.html',
  'cookies.html',
];

test('public entry pages load the shared privacy controls exactly once', () => {
  for (const file of publicPages) {
    const html = read(file);
    assert.equal(
      (html.match(/assets\/js\/site-consent\.js/g) || []).length,
      1,
      `${file} must load site-consent.js once`,
    );
    assert.equal(
      (html.match(/assets\/css\/site-consent\.css/g) || []).length,
      1,
      `${file} must load site-consent.css once`,
    );
  }
});

test('consent is versioned and the loader is limited to the browser session', () => {
  const script = read('assets/js/site-consent.js');
  assert.match(script, /localStorage\.getItem\(CONSENT_KEY\)/);
  assert.match(script, /sessionStorage\.getItem\(LOADER_KEY\)/);
  assert.match(script, /if\(!readConsent\(\)\)show\(\)/);
  assert.match(script, /dupc:consent/);
  assert.match(script, /Sólo esenciales/);
});

test('legal pages identify the responsible party and cross-link the policies', () => {
  const privacy = read('privacidad.html');
  const terms = read('terminos.html');
  const cookies = read('cookies.html');
  assert.match(privacy, /José Daniel Urquijo Beltrán/);
  assert.match(privacy, /Derechos ARCO/);
  assert.match(privacy, /Inteligencia artificial/);
  assert.match(terms, /PROFECO/);
  assert.match(terms, /Propiedad intelectual/);
  assert.match(cookies, /dupc_consent_v1/);
  assert.match(cookies, /no activa cookies publicitarias/i);
});

test('course lead form uses the protected first-party endpoint', () => {
  const html = read('cursolanding.html');
  assert.match(html, /action="\/api\/contact-register"/);
  assert.match(html, /name="consent"/);
  assert.match(html, /contact-registration\.js/);
  assert.doesNotMatch(html, /formsubmit\.co/i);
});

test('manual download uses the protected first-party endpoint', () => {
  const html = read('landing-manuales.html');
  assert.match(html, /fetch\('\/api\/manual-register'/);
  assert.match(html, /name="consent"/);
  assert.doesNotMatch(html, /formsubmit\.co/i);
});
