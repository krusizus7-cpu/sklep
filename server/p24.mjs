import { createHash, timingSafeEqual } from 'node:crypto';

const endpoints = {
  sandbox: 'https://sandbox.przelewy24.pl',
  live: 'https://secure.przelewy24.pl'
};

export function createP24(config, transport = fetch) {
  const { mode, merchantId, posId, crc, apiKey, origin } = config;
  const base = endpoints[mode];
  const signature = fields => createHash('sha384').update(JSON.stringify({ ...fields, crc })).digest('hex');

  async function request(operation, method, payload) {
    const response = await transport(base + '/api/v1/' + operation, {
      method,
      headers: {
        Authorization: 'Basic ' + Buffer.from(posId + ':' + apiKey).toString('base64'),
        'Content-Type': 'application/json'
      },
      body: payload === undefined ? undefined : JSON.stringify(payload),
      redirect: 'error',
      signal: AbortSignal.timeout(10000)
    });
    if (!response.ok) {
      await response.body?.cancel();
      throw new Error('Przelewy24 HTTP ' + response.status);
    }
    const result = await response.json();
    if (operation !== 'testAccess' && ![0, '0'].includes(result.responseCode)) throw new Error('Przelewy24 rejected ' + operation);
    return result.data;
  }

  async function verify({sessionId, orderId, amount, currency}) {
    const data = await request('transaction/verify', 'PUT', {
      merchantId, posId, sessionId, amount, currency, orderId,
      sign: signature({sessionId, orderId, amount, currency})
    });
    if (data?.status !== 'success') throw new Error('Przelewy24 did not verify payment');
  }

  const transaction = sessionId => request('transaction/by/sessionId/' + encodeURIComponent(sessionId), 'GET');
  const confirmed = details => details?.status === 2 && details.currency === 'PLN';

  return {
    mode,
    async testAccess() {
      return await request('testAccess', 'GET') === true;
    },
    async register({ id, total, customer, shipping }) {
      const sessionId = id;
      const amount = total;
      const currency = 'PLN';
      const data = await request('transaction/register', 'POST', {
        merchantId, posId, sessionId, amount, currency,
        description: 'Zamówienie BIEŻNIK ' + id.slice(0, 8),
        email: customer.email,
        country: 'PL',
        language: 'pl',
        encoding: 'UTF-8',
        shipping,
        urlReturn: origin + '/payment-return/' + id,
        urlStatus: origin + '/api/payments/p24/notify',
        timeLimit: 15,
        sign: signature({sessionId, merchantId, amount, currency})
      });
      if (!/^[\w-]{1,200}$/.test(data?.token ?? '')) throw new Error('Przelewy24 returned an invalid token');
      return data.token;
    },
    paymentUrl: token => base + '/trnRequest/' + encodeURIComponent(token),
    authentic(notification) {
      if (!notification || typeof notification !== 'object') return false;
      const {sessionId, amount, originAmount, currency, orderId, methodId, statement, sign} = notification;
      if (notification.merchantId !== merchantId || notification.posId !== posId || currency !== 'PLN' ||
          ![amount, originAmount, orderId, methodId].every(Number.isSafeInteger) || orderId <= 0 ||
          typeof sessionId !== 'string' || typeof statement !== 'string' ||
          typeof sign !== 'string' || !/^[0-9a-f]{96}$/i.test(sign)) return false;
      const expected = signature({merchantId, posId, sessionId, amount, originAmount, currency, orderId, methodId, statement});
      return timingSafeEqual(Buffer.from(sign, 'hex'), Buffer.from(expected, 'hex'));
    },
    async verify(notification) {
      try {
        await verify(notification);
      } catch (error) {
        const {sessionId, orderId, amount} = notification;
        const details = await transaction(sessionId);
        if (!confirmed(details) || details.sessionId !== sessionId ||
            details.orderId !== orderId || details.amount !== amount) throw error;
      }
    },
    async reconcile(sessionId, amount) {
      const details = await transaction(sessionId);
      if (details?.sessionId !== sessionId || details.currency !== 'PLN' || details.amount !== amount ||
          !Number.isSafeInteger(details.orderId) || details.orderId <= 0) {
        throw new Error('Dane płatności w Przelewy24 nie odpowiadają zamówieniu.');
      }
      if (details.status === 1) await verify(details);
      else if (!confirmed(details)) throw new Error('Przelewy24 nie potwierdziło płatności.');
      return details.orderId;
    }
  };
}
