import { money } from '@/lib/types';

type Day = {day: string; total: number; orders: number};
const calendarLabel = new Intl.DateTimeFormat('pl-PL', {day: 'numeric', month: 'short', timeZone: 'UTC'});
export const shortDay = (day: string) => calendarLabel.format(new Date(day + 'T00:00:00Z'));

export function RevenueChart({days}: {days: Day[]}) {
  const maximum = Math.max(1, ...days.map(day => day.total));
  const total = days.reduce((sum, day) => sum + day.total, 0);
  const spacing = Math.max(1, Math.ceil(days.length / 5));

  return <>
    <div className="admin-trend" aria-hidden="true">
      <div className="admin-trend-scale">
        <span>{money(maximum === 1 && !total ? 0 : maximum)}</span>
        <span>{money(total ? Math.round(maximum / 2) : 0)}</span>
        <span>{money(0)}</span>
      </div>
      <div className="admin-trend-series">
        <div className="admin-trend-plot">
          {days.map(day => <meter key={day.day} min={0} max={maximum} value={day.total}
            title={shortDay(day.day) + ' · ' + money(day.total)}/>)}
        </div>
        <div className="admin-trend-labels">{days.filter((_, index) => index % spacing === 0 || index === days.length - 1)
          .map(day => <span key={day.day}>{shortDay(day.day)}</span>)}</div>
      </div>
    </div>
    {!total && <p className="admin-chart-empty">Brak opłaconych zamówień w tym okresie.</p>}
    <details className="admin-chart-data">
      <summary>Pokaż dane dzienne</summary>
      <div className="admin-table-scroll" tabIndex={0} role="region" aria-label="Dane dzienne sprzedaży">
        <table className="admin-table">
          <caption className="visually-hidden">Dzienne wpływy brutto z dostawą</caption>
          <thead><tr><th scope="col">Dzień</th><th scope="col" className="admin-align-right">Zamówienia</th>
            <th scope="col" className="admin-align-right">Wpływy</th></tr></thead>
          <tbody>{days.map(day => <tr key={day.day}><th scope="row"><time dateTime={day.day}>{shortDay(day.day)}</time></th>
            <td className="admin-align-right admin-numbers">{day.orders}</td>
            <td className="admin-align-right admin-numbers">{money(day.total)}</td></tr>)}</tbody>
        </table>
      </div>
    </details>
  </>;
}
