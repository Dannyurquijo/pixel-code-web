const test = require('node:test');
const assert = require('node:assert/strict');
const Store = require('../assets/js/pixie/conversation-store');
const { verifyState } = require('../netlify/functions/pixie/state-security');
const { handler, _test } = require('../netlify/functions/pixie/chat-core');

test('Gemini retries one 503, keeps the key out of URLs, and does not retry 429', async () => {
  let calls = 0;
  const fetchImpl = async (url, options) => {
    assert.ok(!url.includes('test-secret'));
    assert.equal(options.headers['x-goog-api-key'], 'test-secret');
    calls++;
    return calls === 1 ? { ok: false, status: 503 } : { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: 'Recuperado' }] } }] }) };
  };
  assert.equal(await _test.requestLlm({ apiKey: 'test-secret', contents: [], systemPrompt: '', fetchImpl, sleepImpl: async () => {} }), 'Recuperado');
  assert.equal(calls, 2);
  calls = 0;
  await assert.rejects(_test.requestLlm({ apiKey: 'test-secret', contents: [], systemPrompt: '', fetchImpl: async () => { calls++; return { ok: false, status: 429 }; }, sleepImpl: async () => {} }), error => error.providerStatus === 429);
  assert.equal(calls, 1);
});

test('Signed memory survives ten questions, reload, provider failure, and the 40-message boundary', async () => {
  const originalFetch = global.fetch;
  const keys = ['GEMINI_API_KEY', 'PIXIE_STATE_SECRET', 'PIXIE_WEBHOOK_ENABLED'];
  const before = Object.fromEntries(keys.map(k => [k, process.env[k]]));
  process.env.GEMINI_API_KEY = 'test-key';
  process.env.PIXIE_STATE_SECRET = 'test-state';
  process.env.PIXIE_WEBHOOK_ENABLED = 'false';
  const values = new Map();
  const storage = { get length() { return values.size; }, key: i => [...values.keys()][i], getItem: k => values.get(k) || null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
  const session = { session_id: 'px_1723456789_abcdef1234', created_at: new Date().toISOString() };
  let store = Store.create({ storage, session, greeting: 'Hola' });
  let turn = 0;
  let failed = false;
  global.fetch = async (_url, options) => {
    if (failed) return { ok: false, status: 503 };
    const contents = JSON.parse(options.body).contents;
    if (turn === 10) assert.ok(contents.some(m => m.parts[0].text.includes('Mi color favorito es turquesa')));
    return { ok: true, json: async () => ({ candidates: [{ content: { parts: [{ text: `Respuesta ${turn}` }] } }] }) };
  };
  try {
    for (turn = 1; turn <= 25; turn++) {
      if (turn === 6) store = Store.create({ storage, session, greeting: 'Hola' });
      const message = turn === 1 ? 'Mi color favorito es turquesa' : `Pregunta ${turn}`;
      const snapshot = store.get();
      if (turn > 1) assert.ok(verifyState({ secret: 'test-state', sessionId: session.session_id, token: snapshot.state_token, conversation: snapshot.messages, notification: snapshot.notification }));
      const pending = store.append({ role: 'user', content: message, timestamp: new Date().toISOString() }, { pending: true });
      assert.deepEqual(store.get().messages, snapshot.messages, 'Pending request must not mutate persisted signed state');
      failed = turn === 11;
      const result = await handler({ httpMethod: 'POST', body: JSON.stringify({ message, session_id: session.session_id, conversation: pending.messages, state_token: pending.state_token, notification_state: pending.notification }) });
      assert.equal(result.statusCode, 200);
      const response = JSON.parse(result.body);
      assert.equal(response.model_available, !failed);
      store.applyServerState(response);
      const saved = store.get();
      assert.deepEqual(saved.messages, response.conversation);
      assert.ok(verifyState({ secret: 'test-state', sessionId: session.session_id, token: saved.state_token, conversation: saved.messages, notification: saved.notification }));
      assert.equal(saved.messages.length, Math.min(turn * 2, 40));
    }
  } finally {
    global.fetch = originalFetch;
    for (const key of keys) before[key] === undefined ? delete process.env[key] : process.env[key] = before[key];
  }
});
