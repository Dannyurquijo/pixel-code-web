const { formatConversationText, redactSensitive } = require('./conversation');

const hash = (value) => {
  let result = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    result ^= value.charCodeAt(index);
    result = Math.imul(result, 16777619);
  }
  return (result >>> 0).toString(16).padStart(8, '0');
};

const buildPayload = ({ event, sessionId, lead, conversation, latestUser, latestPixie, origin, createdAt, updatedAt }) => {
  const safeConversation = conversation.map((message) => ({ ...message, content: redactSensitive(message.content) }));
  const safeLatestUser = redactSensitive(latestUser);
  const safeLatestPixie = redactSensitive(latestPixie);
  const messageCount = safeConversation.length;
  const eventId = `evt_${sessionId}_${messageCount}_${hash(`${event}|${lead.lead_score}|${safeLatestUser}`)}`;
  return {
    event,
    event_id: eventId,
    session_id: sessionId,
    lead_detected: lead.lead_detected,
    lead_score: lead.lead_score,
    lead_classification: lead.lead_classification,
    lead_reason: lead.lead_reason,
    name: lead.name,
    email: lead.email,
    phone: lead.phone,
    company: lead.company,
    service_interest: lead.service_interest,
    problem: lead.problem,
    budget: lead.budget,
    urgency: lead.urgency,
    timeline: lead.timeline,
    city: lead.city,
    lead: {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      service_interest: lead.service_interest,
      problem: lead.problem,
      budget: lead.budget,
      urgency: lead.urgency,
      timeline: lead.timeline,
      city: lead.city,
      lead_detected: lead.lead_detected,
      lead_score: lead.lead_score,
      lead_classification: lead.lead_classification,
      lead_reason: lead.lead_reason
    },
    origin: {
      website: 'dupixelcode.com',
      page_url: origin.page_url || null,
      source: 'Pixie',
      campaign: origin.campaign || null
    },
    latest_message: { user: safeLatestUser, pixie: safeLatestPixie },
    conversation: safeConversation,
    conversation_text: formatConversationText(safeConversation),
    metadata: { created_at: createdAt, updated_at: updatedAt, message_count: messageCount },
    // Compatibilidad temporal con el escenario Make actual.
    mensaje_cliente: safeLatestUser,
    respuesta_pixie: safeLatestPixie,
    origen: 'Chatbot Pixie · dupixelcode.com'
  };
};

module.exports = { buildPayload, hash };
