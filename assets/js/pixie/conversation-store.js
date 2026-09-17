(function initPixieStore(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PixieConversationStore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const KEY_PREFIX = 'du:pixie:conversation:v2:';
  const memoryFallback = new Map();

  const redactSensitive = (value) => value
    .replace(/\b(sk-[A-Za-z0-9_-]{12,}|gh[pousr]_[A-Za-z0-9_]{12,}|AIza[A-Za-z0-9_-]{20,}|xox[baprs]-[A-Za-z0-9-]{12,})\b/g, '[DATO SENSIBLE REDACTADO]')
    .replace(/\b(api[_ -]?key|authorization|bearer|cookie|password|contraseña|token)\s*[:=]\s*[^\s,;]+/gi, '$1: [DATO SENSIBLE REDACTADO]')
    .replace(/\b(?:\d[ -]*?){13,19}\b/g, '[DATO FINANCIERO REDACTADO]');

  const sanitizeMessage = (message) => {
    const role = message?.role === 'user' ? 'user' : message?.role === 'assistant' || message?.role === 'model' ? 'assistant' : null;
    const rawContent = typeof message?.content === 'string' ? message.content.trim() : typeof message?.text === 'string' ? message.text.trim() : '';
    const content = redactSensitive(rawContent);
    if (!role || !content) return null;
    const parsed = Date.parse(message.timestamp || '');
    return { role, content, timestamp: Number.isFinite(parsed) ? new Date(parsed).toISOString() : new Date().toISOString() };
  };

  const create = ({ storage, session, greeting }) => {
    const key = `${KEY_PREFIX}${session.session_id}`;
    const initialTimestamp = session.created_at || new Date().toISOString();
    const initial = {
      session_id: session.session_id,
      created_at: initialTimestamp,
      updated_at: initialTimestamp,
      messages: greeting ? [{ role: 'assistant', content: greeting, timestamp: initialTimestamp }] : [],
      notification: { last_sent_at: null, last_score: 0, last_event: null, contact_fingerprint: null }
    };

    const load = () => {
      let value = null;
      try { value = JSON.parse(storage?.getItem?.(key) || 'null'); } catch (_) { value = null; }
      if (!value) value = memoryFallback.get(key) || initial;
      const messages = Array.isArray(value.messages) ? value.messages.map(sanitizeMessage).filter(Boolean) : [];
      return { ...initial, ...value, session_id: session.session_id, messages };
    };

    const save = (conversation) => {
      memoryFallback.set(key, conversation);
      try { storage?.setItem?.(key, JSON.stringify(conversation)); } catch (_) { /* Memory fallback remains available. */ }
      return conversation;
    };

    if (!memoryFallback.has(key)) save(load());

    return {
      get: load,
      append(message) {
        const clean = sanitizeMessage(message);
        if (!clean) return load();
        const conversation = load();
        conversation.messages.push(clean);
        conversation.updated_at = clean.timestamp;
        save(conversation);
        console.info('[PIXIE] Message stored', { session_id: session.session_id, role: clean.role, timestamp: clean.timestamp });
        return conversation;
      },
      updateNotification(notification) {
        const conversation = load();
        conversation.notification = { ...conversation.notification, ...notification };
        return save(conversation);
      },
      clear() {
        memoryFallback.delete(key);
        try { storage?.removeItem?.(key); } catch (_) { /* Ignore storage failures. */ }
      }
    };
  };

  return { KEY_PREFIX, create, sanitizeMessage, redactSensitive };
});
