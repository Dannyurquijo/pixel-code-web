(function initPixieSession(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root) root.PixieSession = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, () => {
  const SESSION_KEY = 'du:pixie:session:v2';
  const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

  const randomHex = () => {
    if (globalThis.crypto?.getRandomValues) {
      const values = new Uint32Array(2);
      globalThis.crypto.getRandomValues(values);
      return Array.from(values, (value) => value.toString(16).padStart(8, '0')).join('').slice(0, 10);
    }
    return Math.random().toString(16).slice(2, 12).padEnd(10, '0');
  };

  const createId = (now = Date.now()) => `px_${now}_${randomHex()}`;

  const safeParse = (value) => {
    try { return JSON.parse(value); } catch (_) { return null; }
  };

  const readSession = (storage, now, maxAgeMs) => {
    const saved = safeParse(storage?.getItem?.(SESSION_KEY));
    if (!saved || typeof saved.session_id !== 'string') return null;
    if (!/^px_\d+_[a-f0-9]{6,16}$/i.test(saved.session_id)) return null;
    const lastActivity = Date.parse(saved.updated_at || saved.created_at || '');
    if (!Number.isFinite(lastActivity) || now - lastActivity > maxAgeMs) return null;
    return saved;
  };

  const saveSession = (storage, session) => {
    try { storage?.setItem?.(SESSION_KEY, JSON.stringify(session)); } catch (_) { /* Storage may be unavailable. */ }
    return session;
  };

  const getOrCreate = (storage, options = {}) => {
    const now = options.now ?? Date.now();
    const maxAgeMs = options.maxAgeMs ?? DEFAULT_MAX_AGE_MS;
    const existing = readSession(storage, now, maxAgeMs);
    if (existing) return existing;
    const iso = new Date(now).toISOString();
    const session = { session_id: createId(now), created_at: iso, updated_at: iso };
    saveSession(storage, session);
    console.info('[PIXIE] Session created', { session_id: session.session_id, timestamp: iso });
    return session;
  };

  const touch = (storage, session, now = Date.now()) => {
    const updated = { ...session, updated_at: new Date(now).toISOString() };
    return saveSession(storage, updated);
  };

  const reset = (storage, options = {}) => {
    try { storage?.removeItem?.(SESSION_KEY); } catch (_) { /* Storage may be unavailable. */ }
    return getOrCreate(storage, options);
  };

  return { SESSION_KEY, DEFAULT_MAX_AGE_MS, createId, getOrCreate, touch, reset };
});
