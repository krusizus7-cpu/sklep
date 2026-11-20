// Loaded only by the browser test subprocess. Other network requests use fetch normally.
const actualFetch = globalThis.fetch;
globalThis.fetch = async (input, options) => {
  const url = new URL(input instanceof Request ? input.url : String(input));
  if (url.origin !== 'https://sandbox.przelewy24.pl') return actualFetch(input, options);
  if (url.pathname === '/api/v1/transaction/register') {
    const {sessionId} = JSON.parse(options.body);
    return Response.json({data: {token: 'fixture-' + sessionId}, responseCode: 0});
  }
  if (url.pathname === '/api/v1/transaction/verify') {
    return Response.json({data: {status: 'success'}, responseCode: 0});
  }
  if (url.pathname.startsWith('/api/v1/transaction/by/sessionId/')) {
    const sessionId = url.pathname.split('/').at(-1);
    return Response.json({data: {sessionId, amount: 92300, currency: 'PLN', orderId: 79003, status: 2}, responseCode: 0});
  }
  throw new Error('Unexpected payment fixture request');
};
