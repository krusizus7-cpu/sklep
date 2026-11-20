const zone = 'Europe/Warsaw';
const dayFormat = new Intl.DateTimeFormat('sv-SE', {timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit'});
const offsetFormat = new Intl.DateTimeFormat('en', {timeZone: zone, timeZoneName: 'longOffset'});

export function validDay(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00.000Z');
  return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value &&
    value >= '1900-01-01' && value <= '9998-12-31';
}

export function addDays(day, amount) {
  const date = new Date(day + 'T00:00:00.000Z');
  date.setUTCDate(date.getUTCDate() + amount);
  return date.toISOString().slice(0, 10);
}

export function warsawMidnight(day) {
  const stamp = Date.parse(day + 'T00:00:00.000Z');
  const offset = offsetFormat.formatToParts(stamp).find(part => part.type === 'timeZoneName')?.value;
  // Warsaw's clock changes occur after midnight, so the offset at 00:00 UTC is still the midnight offset.
  const match = offset?.match(/^GMT([+-])(\d\d):(\d\d)$/);
  const minutes = match ? (match[1] === '+' ? 1 : -1) * (Number(match[2]) * 60 + Number(match[3])) : 0;
  return new Date(stamp - minutes * 60_000).toISOString();
}

export function calendarWindow(count, now = new Date()) {
  const today = dayFormat.format(now);
  const firstDay = addDays(today, 1 - count);
  return {
    days: Array.from({length: count}, (_, index) => addDays(firstDay, index)),
    from: warsawMidnight(firstDay),
    until: warsawMidnight(addDays(today, 1))
  };
}

export function summarizeSales(rows, days) {
  const buckets = new Map(days.map(day => [day, {day, total: 0, orders: 0}]));
  const items = new Map();
  let total = 0;
  let quantity = 0;
  for (const row of rows) {
    const bucket = buckets.get(dayFormat.format(new Date(row.paidAt)));
    if (!bucket) continue;
    bucket.total += row.total;
    bucket.orders++;
    total += row.total;
    for (const item of JSON.parse(row.items)) {
      if (!items.has(item.id)) items.set(item.id, {id: item.id, name: item.name, quantity: 0});
      items.get(item.id).quantity += item.quantity;
      quantity += item.quantity;
    }
  }
  return {
    days: [...buckets.values()], total, orders: rows.length, quantity,
    average: rows.length ? Math.round(total / rows.length) : 0,
    items: [...items.values()].sort((a, b) => b.quantity - a.quantity || a.id.localeCompare(b.id))
  };
}
