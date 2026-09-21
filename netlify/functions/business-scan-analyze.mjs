import engine from './business-scan/engine.js';

const MAX_BODY_BYTES = 32 * 1024;
const buckets = new Map();
const SECURITY_HEADERS = {
  'Content-Type': 'application/json; charset=utf-8',
  'Cache-Control': 'no-store',
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer',
  'Content-Security-Policy': "default-src 'none'; frame-ancestors 'none'"
};

const response = (status, body) => new Response(JSON.stringify(body), { status, headers: SECURITY_HEADERS });

const originAllowed = (request) => {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const allowed = new Set(['https://dupixelcode.com', 'https://www.dupixelcode.com']);
  [process.env.URL, process.env.DEPLOY_PRIME_URL].filter(Boolean).forEach((value) => allowed.add(value));
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
  return current.count <= 8;
};

const responseSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['executiveSummary', 'mainOpportunity', 'opportunities', 'nextStep'],
  properties: {
    executiveSummary: { type: 'string' },
    mainOpportunity: { $ref: '#/$defs/opportunity' },
    opportunities: { type: 'array', minItems: 1, maxItems: 3, items: { $ref: '#/$defs/opportunity' } },
    nextStep: { type: 'string' }
  },
  $defs: {
    opportunity: {
      type: 'object', additionalProperties: false,
      required: ['category', 'title', 'description', 'status'],
      properties: {
        category: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' },
        status: { type: 'string', enum: ['Detectado', 'Potencial', 'Por validar'] }
      }
    }
  }
};

async function withGemini(input, scores) {
  if (process.env.GEMINI_ENABLED !== 'true' || !process.env.GEMINI_API_KEY) return null;
  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 14000);
  try {
    const result = await ai.models.generateContent({
      model: process.env.GEMINI_MODEL || 'gemini-2.5-flash',
      contents: `Genera un diagnóstico ejecutivo en español únicamente con estos datos:\n${JSON.stringify({
        industry: input.industry, companySize: input.companySize, mainGoal: input.mainGoal,
        leadChannels: input.leadChannels, tools: input.tools, manualProcesses: input.manualProcesses,
        painPoints: input.painPoints, automationLevel: input.automationLevel, aiUsage: input.aiUsage,
        primaryProblem: input.primaryProblem, urgency: input.urgency, scores
      })}`,
      config: {
        systemInstruction: "Eres consultor de transformación digital de DU Pixel Code. Sé ejecutivo, claro y prudente. No inventes ROI, ahorros, horas, porcentajes, facturación, costos, tamaño, procesos, integraciones ni problemas. Distingue Detectado, Potencial y Por validar. Usa expresiones como 'Existe una oportunidad potencial'. Una oportunidad principal y máximo tres secundarias. Evita tecnicismos y promesas.",
        responseMimeType: 'application/json', responseJsonSchema: responseSchema,
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 2400, temperature: 0.25, abortSignal: controller.signal
      }
    });
    const normalized = (result.text || '').trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    const parsed = JSON.parse(normalized);
    return engine.validAiDiagnostic(parsed) ? { ...parsed, scores, source: 'gemini' } : null;
  } finally {
    clearTimeout(timer);
  }
}

async function saveLead(input, diagnostic) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return;
  const result = await fetch(`${url}/rest/v1/business_scan_leads`, {
    method: 'POST',
    headers: { apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      name: input.name, company: input.company, email: input.email, whatsapp: input.whatsapp || null,
      role: input.role, industry: input.industry, company_size: input.companySize, main_goal: input.mainGoal,
      tools: input.tools, pain_points: input.painPoints, lead_channels: input.leadChannels,
      automation_level: input.automationLevel, ai_usage: input.aiUsage, primary_problem: input.primaryProblem,
      urgency: input.urgency, scores: diagnostic.scores, main_opportunity: diagnostic.mainOpportunity,
      ai_analysis: diagnostic, source: 'dupixelcode.com/diagnostico'
    }),
    signal: AbortSignal.timeout(8000)
  });
  if (!result.ok) throw new Error(`Supabase persistence failed (${result.status})`);
}

export default async function handler(request) {
  if (request.method !== 'POST') return response(405, { error: 'Método no permitido.' });
  if (!originAllowed(request)) return response(403, { error: 'Origen no permitido.' });
  if (!rateAllowed(request)) return response(429, { error: 'Espera unos minutos antes de intentar de nuevo.' });
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) return response(413, { error: 'Solicitud demasiado grande.' });
  const raw = await request.text();
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return response(413, { error: 'Solicitud demasiado grande.' });

  let body;
  try { body = JSON.parse(raw); } catch { return response(400, { error: 'Solicitud inválida.' }); }
  const parsed = engine.validateScan(body);
  if (!parsed.ok) return response(400, { error: 'Revisa los campos del diagnóstico.' });

  const scores = engine.calculateScores(parsed.input);
  let diagnostic = engine.ruleBasedDiagnostic(parsed.input, scores);
  try {
    diagnostic = await withGemini(parsed.input, scores) || diagnostic;
  } catch (error) {
    console.error('Business Scan Gemini fallback', { name: error instanceof Error ? error.name : 'UnknownError' });
  }
  try {
    await saveLead(parsed.input, diagnostic);
  } catch (error) {
    console.error('Business Scan optional lead persistence unavailable', { name: error instanceof Error ? error.name : 'UnknownError' });
  }
  return response(200, { diagnostic });
}

export const config = {
  path: '/api/business-scan',
  method: 'POST',
  rateLimit: { action: 'rate_limit', windowLimit: 8, windowSize: 900, aggregateBy: ['ip', 'domain'] }
};
