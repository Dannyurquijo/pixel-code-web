const VALID_ROLES = new Set(['user', 'assistant']);

const redactSensitive = (value) => value
  .replace(/\b(sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{12,}|AIza[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{12,})\b/g, '[DATO SENSIBLE REDACTADO]')
  .replace(/\b(api[_ -]?key|authorization|bearer|cookie|password|contraseña|token)\s*[:=]\s*[^\s,;]+/gi, '$1: [DATO SENSIBLE REDACTADO]')
  .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[DATO FINANCIERO REDACTADO]');

const cleanText = (value, maxLength = 4000) => {
  if (typeof value !== 'string') return null;
  const text = value.trim().replace(/\u0000/g, '');
  return text ? text.slice(0, maxLength) : null;
};

const normalizeTimestamp = (value, fallback = new Date().toISOString()) => {
  const parsed = Date.parse(value || '');
  return Number.isFinite(parsed) ? new Date(parsed).toISOString() : fallback;
};

const sanitizeMessage = (message, fallbackTimestamp) => {
  const sourceRole = message?.role === 'model' ? 'assistant' : message?.role;
  const role = VALID_ROLES.has(sourceRole) ? sourceRole : null;
  const content = cleanText(message?.content ?? message?.text);
  if (!role || !content) return null;
  return { role, content, timestamp: normalizeTimestamp(message?.timestamp, fallbackTimestamp) };
};

const sanitizeConversation = (messages, now = new Date().toISOString()) => {
  if (!Array.isArray(messages)) return [];
  return messages.map((message) => sanitizeMessage(message, now)).filter(Boolean);
};

const ensureLatestUserMessage = (messages, userMessage, timestamp) => {
  const sanitized = sanitizeConversation(messages, timestamp);
  const last = sanitized.at(-1);
  if (last?.role !== 'user' || last.content !== userMessage) {
    sanitized.push({ role: 'user', content: userMessage, timestamp });
  }
  return sanitized;
};

const toLlmContents = (messages, maxMessages = 20) => {
  const context = sanitizeConversation(messages).slice(-maxMessages);
  while (context[0]?.role === 'assistant') context.shift();
  return context.map((message) => ({
    role: message.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: message.content }]
  }));
};

const formatConversationText = (messages) => {
  const lines = ['💬 CONVERSACIÓN PIXIE'];
  sanitizeConversation(messages).forEach((message) => {
    lines.push(message.role === 'user' ? '👤 Cliente:' : '🤖 Pixie:');
    lines.push(message.content);
  });
  return lines.join('\n');
};

module.exports = {
  cleanText,
  redactSensitive,
  normalizeTimestamp,
  sanitizeMessage,
  sanitizeConversation,
  ensureLatestUserMessage,
  toLlmContents,
  formatConversationText
};
