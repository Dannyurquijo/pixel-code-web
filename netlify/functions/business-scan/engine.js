const categories = ['automation', 'sales', 'customerExperience', 'data', 'integrations', 'ai'];

const library = {
  automation: { category: 'Automatización', title: 'Automatizar tareas operativas repetitivas', description: 'Existe una oportunidad potencial de reducir pasos manuales con flujos simples, priorizando primero los procesos frecuentes y fáciles de validar.' },
  sales: { category: 'Ventas y seguimiento', title: 'Estructurar el seguimiento comercial', description: 'Centralizar prospectos, recordatorios y estados puede dar continuidad al proceso comercial sin depender de seguimientos individuales.' },
  customerExperience: { category: 'Experiencia del cliente', title: 'Mejorar tiempos y consistencia de atención', description: 'Existe potencial para organizar consultas, respuestas y derivaciones manteniendo una experiencia clara y humana.' },
  data: { category: 'Datos y analítica', title: 'Convertir información dispersa en decisiones', description: 'Unificar indicadores esenciales puede facilitar reportes confiables y una lectura más oportuna de la operación.' },
  integrations: { category: 'Integraciones', title: 'Conectar herramientas y eliminar recapturas', description: 'Es conveniente validar qué datos se duplican entre sistemas y conectar primero los intercambios de mayor frecuencia.' },
  ai: { category: 'Inteligencia Artificial', title: 'Aplicar IA en tareas bien delimitadas', description: 'La IA puede probarse de forma controlada en clasificación, síntesis o asistencia, con revisión humana y sin reemplazar procesos críticos.' }
};

const cleanText = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const cleanList = (value, maxItems, maxLength) => Array.isArray(value)
  ? value.slice(0, maxItems).map((item) => cleanText(item, maxLength)).filter(Boolean)
  : [];
const cap = (value) => Math.min(100, Math.max(0, value));
const hasAny = (values, needles) => values.some((value) => needles.some((needle) => value.toLowerCase().includes(needle)));

function validateScan(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return { ok: false };
  const input = {
    industry: cleanText(value.industry, 80),
    companySize: cleanText(value.companySize, 40),
    mainGoal: cleanText(value.mainGoal, 120),
    leadChannels: cleanList(value.leadChannels, 8, 50),
    tools: cleanList(value.tools, 12, 50),
    manualProcesses: cleanList(value.manualProcesses, 10, 80),
    painPoints: cleanList(value.painPoints, 10, 80),
    automationLevel: cleanText(value.automationLevel, 60),
    aiUsage: cleanText(value.aiUsage, 60),
    primaryProblem: cleanText(value.primaryProblem, 700),
    urgency: cleanText(value.urgency, 40),
    name: cleanText(value.name, 100),
    company: cleanText(value.company, 120),
    email: cleanText(value.email, 160),
    whatsapp: cleanText(value.whatsapp, 30),
    role: cleanText(value.role, 100),
    consent: value.consent === true,
    website: cleanText(value.website, 200)
  };
  const required = ['industry', 'companySize', 'mainGoal', 'automationLevel', 'aiUsage', 'urgency', 'name', 'company', 'role'];
  const valid = required.every((key) => input[key])
    && input.leadChannels.length > 0
    && input.tools.length > 0
    && input.manualProcesses.length > 0
    && input.painPoints.length > 0
    && input.primaryProblem.length >= 10
    && input.name.length >= 2
    && input.company.length >= 2
    && input.role.length >= 2
    && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)
    && input.consent
    && !input.website;
  return valid ? { ok: true, input } : { ok: false };
}

function calculateScores(input) {
  const manualCount = input.manualProcesses.length;
  const lowAutomation = input.automationLevel === 'Bajo' || input.automationLevel === 'Ninguno';
  const disconnected = hasAny(input.painPoints, ['desconect', 'duplic', 'información dispersa']);
  const spreadsheet = hasAny(input.tools, ['excel', 'hojas']);
  const crm = hasAny(input.tools, ['crm']);
  const erp = hasAny(input.tools, ['erp']);
  const whatsapp = hasAny(input.leadChannels, ['whatsapp']);
  const manualFollowup = hasAny(input.painPoints, ['seguimiento', 'prospectos']);
  const reports = hasAny(input.manualProcesses, ['reporte', 'captura', 'consolidación']);
  const dataPain = hasAny(input.painPoints, ['dato', 'reporte', 'visibilidad', 'información']);
  const aiNone = input.aiUsage === 'No usamos IA';
  return {
    automation: cap(20 + manualCount * 13 + (lowAutomation ? 22 : 0)),
    sales: cap(18 + (whatsapp ? 24 : 0) + (manualFollowup ? 30 : 0) + (!crm ? 12 : 0)),
    customerExperience: cap(18 + (whatsapp ? 16 : 0) + (hasAny(input.painPoints, ['respuesta', 'cliente', 'demora']) ? 34 : 0)),
    data: cap(18 + (spreadsheet ? 22 : 0) + (reports ? 26 : 0) + (dataPain ? 24 : 0)),
    integrations: cap(15 + (disconnected ? 42 : 0) + ((erp || crm) && input.tools.length > 1 ? 24 : 0)),
    ai: cap(20 + (aiNone ? 18 : 30) + manualCount * 7 + (input.aiUsage === 'Uso avanzado' ? -28 : 0))
  };
}

function ruleBasedDiagnostic(input, scores) {
  const ranked = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  const toOpportunity = ([key, score]) => ({
    ...library[key],
    status: score >= 68 ? 'Detectado' : score >= 40 ? 'Potencial' : 'Por validar'
  });
  const mainOpportunity = toOpportunity(ranked[0]);
  const context = input.companySize === '1–5 personas'
    ? 'La recomendación prioriza soluciones ligeras y evita una arquitectura mayor a la necesaria.'
    : 'La recomendación prioriza una implementación gradual, medible y compatible con las herramientas actuales.';
  return {
    executiveSummary: `${input.company} presenta oportunidades principalmente en ${mainOpportunity.category.toLowerCase()}, a partir de los procesos y retos reportados. ${context} El análisis no asume ahorros, retornos ni integraciones no confirmadas; propone validar el flujo de mayor impacto antes de ampliar el alcance. El objetivo es mejorar la trazabilidad, reducir fricción operativa y crear una base confiable para futuras automatizaciones e iniciativas de inteligencia artificial.`,
    mainOpportunity,
    opportunities: ranked.slice(1, 4).map(toOpportunity),
    nextStep: `Realizar una sesión breve de validación para mapear el proceso relacionado con “${input.mainGoal}”, confirmar responsables, herramientas y datos disponibles, y definir un primer piloto acotado.`,
    scores,
    source: 'rules'
  };
}

function validAiDiagnostic(value) {
  const statuses = new Set(['Detectado', 'Potencial', 'Por validar']);
  const validOpportunity = (item) => item && typeof item.category === 'string' && typeof item.title === 'string'
    && typeof item.description === 'string' && statuses.has(item.status)
    && item.category.length <= 60 && item.title.length <= 120 && item.description.length <= 420;
  return value && typeof value.executiveSummary === 'string' && value.executiveSummary.length >= 180
    && value.executiveSummary.length <= 1000 && validOpportunity(value.mainOpportunity)
    && Array.isArray(value.opportunities) && value.opportunities.length >= 1 && value.opportunities.length <= 3
    && value.opportunities.every(validOpportunity) && typeof value.nextStep === 'string'
    && value.nextStep.length >= 40 && value.nextStep.length <= 500;
}

module.exports = { categories, validateScan, calculateScores, ruleBasedDiagnostic, validAiDiagnostic };
