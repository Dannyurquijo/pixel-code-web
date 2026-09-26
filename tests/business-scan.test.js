const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../netlify/functions/business-scan/engine');

const base = {
  industry: 'Servicios profesionales', companySize: '6–20 personas', mainGoal: 'Reducir tareas manuales',
  leadChannels: ['Email'], tools: ['Email'], manualProcesses: ['Captura de información'],
  painPoints: ['Demasiadas tareas repetitivas'], automationLevel: 'Bajo', aiUsage: 'No usamos IA',
  primaryProblem: 'Necesitamos ordenar un proceso operativo repetitivo.', urgency: 'Este trimestre',
  name: 'Persona Prueba', company: 'Empresa Prueba', email: 'test@example.com', whatsapp: '',
  role: 'Dirección', consent: true, website: ''
};

test('Business Scan valida y normaliza un payload legítimo', () => {
  const parsed = engine.validateScan(base);
  assert.equal(parsed.ok, true);
  assert.equal(parsed.input.email, 'test@example.com');
});

test('Business Scan rechaza honeypot, ausencia de consentimiento y payload incompleto', () => {
  assert.equal(engine.validateScan({ ...base, website: 'spam.example' }).ok, false);
  assert.equal(engine.validateScan({ ...base, consent: false }).ok, false);
  assert.equal(engine.validateScan({ ...base, email: 'incorrecto' }).ok, false);
});

test('Perfil de servicios prioriza automatización y seguimiento', () => {
  const input = { ...base, leadChannels: ['WhatsApp'], tools: ['Excel / Hojas de cálculo'], manualProcesses: ['Seguimiento de prospectos', 'Captura de información', 'Cotizaciones'], painPoints: ['Seguimiento inconsistente', 'Demasiadas tareas repetitivas'] };
  const scores = engine.calculateScores(input);
  assert.ok(scores.automation >= 68);
  assert.ok(scores.sales >= 68);
});

test('Perfil manufacturero detecta datos e integraciones', () => {
  const input = { ...base, industry: 'Manufactura', companySize: '51–200 personas', tools: ['ERP', 'Excel / Hojas de cálculo', 'Sistema propio'], manualProcesses: ['Elaboración de reportes', 'Consolidación de datos'], painPoints: ['Sistemas desconectados', 'Reportes tardíos'] };
  const scores = engine.calculateScores(input);
  assert.ok(scores.data >= 68);
  assert.ok(scores.integrations >= 68);
});

test('Empresa pequeña recibe una recomendación proporcional sin cifras inventadas', () => {
  const input = { ...base, companySize: '1–5 personas', manualProcesses: ['Agenda y recordatorios'], painPoints: ['Demasiadas tareas repetitivas'], automationLevel: 'Intermedio' };
  const diagnostic = engine.ruleBasedDiagnostic(input, engine.calculateScores(input));
  assert.match(diagnostic.executiveSummary, /soluciones ligeras/);
  assert.doesNotMatch(diagnostic.executiveSummary, /\d+\s*%|ROI de|ahorrará/i);
});

test('Validador de salida IA limita estructura y estados', () => {
  const valid = {
    executiveSummary: 'A'.repeat(200),
    mainOpportunity: { category: 'Automatización', title: 'Flujo inicial', description: 'Descripción prudente.', status: 'Potencial' },
    opportunities: [{ category: 'Datos', title: 'Reporte base', description: 'Descripción prudente.', status: 'Por validar' }],
    nextStep: 'Validar el proceso, responsables y datos antes de construir un piloto.'
  };
  assert.equal(engine.validAiDiagnostic(valid), true);
  assert.equal(engine.validAiDiagnostic({ ...valid, opportunities: Array(4).fill(valid.opportunities[0]) }), false);
});

test('Endpoint entrega diagnóstico por reglas cuando Gemini y Supabase no están configurados', async () => {
  const previousGeminiEnabled = process.env.GEMINI_ENABLED;
  const previousGeminiKey = process.env.GEMINI_API_KEY;
  const previousSupabaseUrl = process.env.SUPABASE_URL;
  const previousSupabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  delete process.env.GEMINI_ENABLED;
  delete process.env.GEMINI_API_KEY;
  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  try {
    const { default: handler } = await import('../netlify/functions/business-scan-analyze.mjs');
    const request = new Request('http://localhost/api/business-scan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'http://localhost:8888' },
      body: JSON.stringify(base)
    });
    const result = await handler(request);
    const payload = await result.json();
    assert.equal(result.status, 200);
    assert.equal(payload.diagnostic.source, 'rules');
    assert.equal(payload.diagnostic.opportunities.length, 3);
  } finally {
    if (previousGeminiEnabled === undefined) delete process.env.GEMINI_ENABLED; else process.env.GEMINI_ENABLED = previousGeminiEnabled;
    if (previousGeminiKey === undefined) delete process.env.GEMINI_API_KEY; else process.env.GEMINI_API_KEY = previousGeminiKey;
    if (previousSupabaseUrl === undefined) delete process.env.SUPABASE_URL; else process.env.SUPABASE_URL = previousSupabaseUrl;
    if (previousSupabaseKey === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY; else process.env.SUPABASE_SERVICE_ROLE_KEY = previousSupabaseKey;
  }
});

test('Business Scan acepta el mismo origen del Deploy Preview', async () => {
  const { default: handler } = await import('../netlify/functions/business-scan-analyze.mjs');
  const origin = 'https://deploy-preview-1--moonlit-lamington-b718a2.netlify.app';
  const result = await handler(new Request(`${origin}/api/business-scan`, {
    method: 'POST', headers: { 'Content-Type': 'application/json', Origin: origin }, body: '{}'
  }));
  assert.equal(result.status, 400);
});
