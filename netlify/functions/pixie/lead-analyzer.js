const nullIfEmpty = (value) => typeof value === 'string' && value.trim() ? value.trim() : null;

const lastMatch = (texts, regex, group = 1) => {
  for (let index = texts.length - 1; index >= 0; index -= 1) {
    const match = texts[index].match(regex);
    if (match?.[group]) return nullIfEmpty(match[group]);
  }
  return null;
};

const detectService = (text) => {
  const services = [
    ['Automatización de procesos', /automatiz|flujo|tarea repetitiva|proceso manual/i],
    ['Agentes y chatbots de IA', /chatbot|agente(?:s)? de ia|asistente(?:s)? (?:virtual|de ia)/i],
    ['Inteligencia artificial para empresas', /inteligencia artificial|\bia\b|rag|modelo de lenguaje/i],
    ['Desarrollo web y captación', /página web|sitio web|landing|captación|conversión/i],
    ['Software a medida', /software|aplicación|portal|plataforma|saas/i],
    ['Integraciones y APIs', /integración|conectar (?:sistemas|herramientas)|\bapi(?:s)?\b|\bcrm\b/i],
    ['Capacitación en IA', /curso|capacitación|taller|entrenamiento/i]
  ];
  return services.find(([, pattern]) => pattern.test(text))?.[0] || null;
};

const analyzeLead = (conversation, options = {}) => {
  const threshold = Number.isFinite(Number(options.threshold)) ? Number(options.threshold) : 30;
  const userMessages = conversation.filter((message) => message.role === 'user').map((message) => message.content);
  const text = userMessages.join('\n');
  const latest = userMessages.at(-1) || '';

  const email = lastMatch(userMessages, /\b([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})\b/i);
  const rawPhone = lastMatch(userMessages, /(?:\+?52[\s.-]?)?\b((?:\d[\s.-]?){10})\b/);
  const phone = rawPhone ? rawPhone.replace(/\D/g, '').slice(-10) : null;
  const name = lastMatch(userMessages, /\b(?:me llamo|mi nombre es|soy\s+(?!de\b|una?\b|el\b|la\b))\s*([A-ZÁÉÍÓÚÑ][A-Za-zÁÉÍÓÚÜÑáéíóúüñ' -]{1,48})(?:[.,;!\n]|$)/i);
  const company = lastMatch(userMessages, /\b(?:mi empresa(?: se llama)?|mi negocio(?: se llama)?|trabajo en)\s+(?:es\s+)?([A-Za-z0-9ÁÉÍÓÚÜÑáéíóúüñ&.' -]{2,60})(?:[.,;!\n]|$)/i);
  const city = lastMatch(userMessages, /\b(?:estoy en|somos de|ubicad[oa]s? en|desde)\s+([A-Za-zÁÉÍÓÚÜÑáéíóúüñ .' -]{2,40})(?:[.,;!\n]|$)/i);
  const budget = lastMatch(userMessages, /\b(?:presupuesto|inversión|invertir|cuento con)\D{0,20}(\$?\s?[\d,.]+(?:\s?(?:mxn|pesos|usd))?)/i);
  const timeline = lastMatch(userMessages, /\b(?:para|en|dentro de)\s+(esta semana|este mes|cuanto antes|lo antes posible|\d+\s+(?:días?|semanas?|meses?))/i);
  const serviceInterest = detectService(text);
  const asksCommercialInfo = /información|servicio|solución|pueden ayudar|me interesa|quisiera saber/i.test(text);
  const problemPattern = /problema|necesito|quiero (?:automatizar|mejorar|implementar|conectar|desarrollar)|busco|tarea manual|no funciona|pierdo/i;
  const hasProblem = problemPattern.test(text);
  const hasBusiness = /empresa|negocio|pyme|clientes|equipo|operación|manufactura|corporativo/i.test(text) || Boolean(company);
  const asksPrice = /cu[aá]nto (?:cuesta|vale)|precio|costo|cotiz|presupuesto/i.test(text);
  const asksQuote = /cotización|cotizar|propuesta/i.test(text);
  const asksMeeting = /reunión|demo|demostración|agendar|cita|llamada/i.test(text);
  const asksHuman = /hablar con|contacte|contactar|asesor|persona|daniel/i.test(text);
  const urgent = /urgente|cuanto antes|lo antes posible|inmediato|esta semana|ya mismo/i.test(text);

  let score = 0;
  const reasons = [];
  if (asksCommercialInfo || serviceInterest) { score += 20; reasons.push('Solicita información comercial'); }
  if (hasProblem) { score += 20; reasons.push('Describe una necesidad empresarial concreta'); }
  if (hasBusiness) { score += 15; reasons.push('Menciona una empresa o contexto de negocio'); }
  if (email || phone) { score += 15; reasons.push('Comparte información de contacto'); }
  if (asksPrice) { score += 10; reasons.push('Pregunta por precio o inversión'); }
  if (asksQuote || asksMeeting || asksHuman) { score += 10; reasons.push('Solicita cotización, reunión o contacto humano'); }
  if (urgent) { score += 10; reasons.push('Expresa urgencia'); }
  score = Math.min(100, score);

  const classification = score >= 80 ? 'lead prioritario' : score >= 60 ? 'lead calificado' : score >= 30 ? 'lead potencial' : 'visitante';
  const problem = hasProblem ? [...userMessages].reverse().find((message) => problemPattern.test(message)) || null : null;
  const urgency = urgent ? (timeline || 'Intención urgente expresada') : null;

  return {
    lead_detected: score >= threshold,
    lead_score: score,
    lead_classification: classification,
    lead_reason: reasons.length ? reasons.join('; ') : null,
    name: name || null,
    email: email || null,
    phone: phone || null,
    company: company || null,
    service_interest: serviceInterest,
    problem,
    budget: budget || null,
    urgency,
    timeline: timeline || null,
    city: city || null,
    intent: { asks_price: asksPrice, quote_requested: asksQuote, meeting_requested: asksMeeting, human_contact_requested: asksHuman },
    latest_user_message: latest || null
  };
};

const selectEvent = (lead) => {
  if (lead.email || lead.phone) return 'contact_information_captured';
  if (lead.intent.quote_requested) return 'quote_requested';
  if (lead.intent.meeting_requested) return 'meeting_requested';
  if (lead.intent.human_contact_requested) return 'human_contact_requested';
  if (lead.lead_score >= 80) return 'high_intent_detected';
  if (lead.lead_detected) return 'lead_detected';
  return null;
};

module.exports = { analyzeLead, selectEvent, detectService };
