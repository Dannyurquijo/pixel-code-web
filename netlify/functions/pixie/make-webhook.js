const log = (message, context) => console.info(`[PIXIE] ${message}`, context);

const sendMakeWebhook = async ({ url, payload, timeoutMs = 5000, fetchImpl = global.fetch }) => {
  const timestamp = new Date().toISOString();
  const context = { session_id: payload.session_id, event: payload.event, event_id: payload.event_id, timestamp };
  if (!url) return { sent: false, skipped: true, reason: 'webhook_not_configured' };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  log('Sending webhook', context);
  try {
    const response = await fetchImpl(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Pixie-Event-Id': payload.event_id },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    log('Webhook success', context);
    return { sent: true, status: response.status };
  } catch (error) {
    console.error('[PIXIE] Webhook failed', { ...context, error: error.name === 'AbortError' ? 'timeout' : 'request_failed' });
    return { sent: false, skipped: false, reason: error.name === 'AbortError' ? 'timeout' : 'request_failed' };
  } finally {
    clearTimeout(timer);
  }
};

module.exports = { sendMakeWebhook };
