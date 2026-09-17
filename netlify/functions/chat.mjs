import chatCore from './pixie/chat-core.js';

const tooLargeResponse = () => new Response(
  JSON.stringify({ reply: 'La conversación excede el límite permitido.' }),
  {
    status: 413,
    headers: chatCore._test.SECURITY_HEADERS
  }
);

export default async function handler(request) {
  const declaredLength = Number(request.headers.get('content-length') || 0);
  if (Number.isFinite(declaredLength) && declaredLength > chatCore._test.MAX_BODY_BYTES) {
    return tooLargeResponse();
  }

  const body = await request.text();
  if (Buffer.byteLength(body, 'utf8') > chatCore._test.MAX_BODY_BYTES) {
    return tooLargeResponse();
  }

  const result = await chatCore.handler({
    httpMethod: request.method,
    path: new URL(request.url).pathname,
    headers: Object.fromEntries(request.headers.entries()),
    body
  });

  return new Response(result.body, {
    status: result.statusCode,
    headers: result.headers
  });
}

export const config = {
  path: '/api/chat',
  method: 'POST',
  rateLimit: {
    action: 'rate_limit',
    windowLimit: 12,
    windowSize: 60,
    aggregateBy: ['ip', 'domain']
  }
};
