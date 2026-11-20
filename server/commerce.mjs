import { HttpError, maxPerProduct, maxUnits, openOrders, orderIdPattern } from './orders.mjs';

const seasonLabels = {summer: 'Letnia', winter: 'Zimowa', allseason: 'Całoroczna'};

export function createCommerce({shop, dbPath, p24}) {
  const orders = shop && p24 ? openOrders(dbPath, shop, p24.mode) : null;
  const registrations = new Map();
  const notifications = new Map();
  const attemptWindow = 60_000;
  let windowStarted = 0;
  let attempts = 0;
  const orderView = order => ({
    id: order.id,
    status: order.shippedAt ? 'shipped' : order.status,
    ...(order.shippedAt ? {trackingNumber: order.trackingNumber} : {}),
    total: order.total,
    ...(order.status === 'pending' && order.token && Date.now() < order.tokenAt + 15 * 60000
      ? {paymentUrl: p24.paymentUrl(order.token)} : {})
  });

  const catalog = () => !orders ? {ordering: false} : {
    ordering: true,
    paymentMode: p24.mode,
    merchant: Object.fromEntries(['name', 'address', 'email', 'taxId', 'phone', 'termsUrl', 'privacyUrl'].map(key => [key, shop.merchant[key]])),
    shipping: shop.shipping,
    maxPerProduct,
    maxUnits,
    products: orders.catalog().map(product => ({
      ...Object.fromEntries(['id', 'type', 'brand', 'name', 'size', 'diameter', 'width', 'profile', 'season',
        'pcd', 'et', 'finish', 'priceCents', 'image', 'labelImage', 'eprelUrl', 'description'].map(key => [key, product[key]])),
      seasonLabel: seasonLabels[product.season],
      stock: product.stock
    }))
  };

  async function register(order) {
    if (order.status !== 'registering' || Date.parse(order.createdAt) + 15 * 60000 < Date.now()) return order;
    if (!registrations.has(order.id)) {
      const tokenAt = Date.now();
      registrations.set(order.id, p24.register(order)
        .then(token => orders.register(order.id, token, tokenAt))
        .catch(error => {
          console.warn('P24 register:', order.id, error.name, error.message);
          throw new HttpError(502, 'Przelewy24 jest chwilowo niedostępne. Spróbuj ponownie z tym samym koszykiem.');
        })
        .finally(() => registrations.delete(order.id)));
    }
    return registrations.get(order.id);
  }

  async function notify(body) {
    if (!orders) throw new HttpError(503, 'Płatności są niedostępne.');
    if (!p24.authentic(body) || !orderIdPattern.test(body.sessionId)) throw new HttpError(400, 'Nieprawidłowe potwierdzenie płatności.');
    const {sessionId, amount, originAmount, orderId} = body;
    const order = orders.get(sessionId);
    if (!order) throw new HttpError(404, 'Brak zamówienia.');
    if (order.total !== amount || order.total !== originAmount) throw new HttpError(409, 'Niezgodna kwota płatności.');
    orders.recordNotification(sessionId, orderId);
    if (order.status === 'paid') return;
    if (!notifications.has(sessionId)) {
      notifications.set(sessionId, p24.verify(body)
        .then(() => orders.markPaid(sessionId, orderId))
        .catch(error => {
          console.warn('P24 verify:', sessionId, error.name, error.message);
          throw new HttpError(502, 'Nie udało się zweryfikować płatności.');
        })
        .finally(() => notifications.delete(sessionId)));
    }
    await notifications.get(sessionId);
  }

  return {
    catalog,
    orders,
    /** @param {unknown} input @param {string | null} accountId */
    async submit(input, accountId = null) {
      if (!orders) throw new HttpError(503, 'Sprzedaż jest jeszcze niedostępna.');
      const now = Date.now();
      if (now - windowStarted >= attemptWindow) {
        windowStarted = now;
        attempts = 0;
      }
      if (attempts++ >= 60) throw new HttpError(429, 'Za dużo prób. Spróbuj za minutę.');
      return orderView(await register(orders.reserve(input, accountId)));
    },
    notify,
    /** @param {string} id @param {{id: string, role: string} | null} viewer */
    status(id, viewer = null) {
      const order = orderIdPattern.test(id) && orders?.get(id);
      if (!order || (order.accountId && viewer?.id !== order.accountId && viewer?.role !== 'admin')) {
        throw new HttpError(404, 'Brak zamówienia.');
      }
      return orderView(order);
    },
    close: () => orders?.close()
  };
}
