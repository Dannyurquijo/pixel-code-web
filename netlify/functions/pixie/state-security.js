const crypto = require('node:crypto');
const { sanitizeConversation } = require('./conversation');

const TOKEN_PREFIX = 'pxs1';

const normalizeNotification = (value) => ({
  last_sent_at: typeof value?.last_sent_at === 'string' ? value.last_sent_at : null,
  last_score: Number.isFinite(Number(value?.last_score)) ? Number(value.last_score) : 0,
  last_event: typeof value?.last_event === 'string' ? value.last_event : null,
  contact_fingerprint: typeof value?.contact_fingerprint === 'string' ? value.contact_fingerprint : null
});

const serializeState = ({ sessionId, conversation, notification }) => JSON.stringify({
  session_id: sessionId,
  conversation: sanitizeConversation(conversation),
  notification: normalizeNotification(notification)
});

const signState = ({ secret, sessionId, conversation, notification }) => {
  if (!secret || !sessionId) return null;
  const digest = crypto
    .createHmac('sha256', secret)
    .update(serializeState({ sessionId, conversation, notification }))
    .digest('base64url');
  return `${TOKEN_PREFIX}.${digest}`;
};

const verifyState = ({ token, secret, sessionId, conversation, notification }) => {
  if (typeof token !== 'string' || !token.startsWith(`${TOKEN_PREFIX}.`) || !secret) return false;
  const expected = signState({ secret, sessionId, conversation, notification });
  if (!expected || expected.length !== token.length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(token));
};

module.exports = { normalizeNotification, serializeState, signState, verifyState };
