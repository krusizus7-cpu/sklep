/** @param {{firstCents: number, additionalCents: number}} rates @param {number} units */
export function shippingCost(rates, units) {
  return units > 0 ? rates.firstCents + (units - 1) * rates.additionalCents : 0;
}
