'use client';

import { useState } from 'react';
import Link from 'next/link';
import { filterLabels, seasonOptions, tireFields, wheelFields, type Attribute } from '@/lib/filters';

export function Finder({options}: {options: Record<'opony' | 'felgi', Partial<Record<Attribute, string[]>>>}) {
  const [category, setCategory] = useState<'opony' | 'felgi'>('opony');
  const fields = category === 'opony' ? tireFields : wheelFields;
  return <div className="finder-shell">
    <div className="finder-tabs" role="group" aria-label="Rodzaj produktu">
      <button type="button" className={category === 'opony' ? 'active' : ''} aria-pressed={category === 'opony'} onClick={() => setCategory('opony')}><span className="tab-symbol tyre-symbol" aria-hidden="true"/> Opony</button>
      <button type="button" className={category === 'felgi' ? 'active' : ''} aria-pressed={category === 'felgi'} onClick={() => setCategory('felgi')}><span className="tab-symbol wheel-symbol" aria-hidden="true"/> Felgi</button>
      <div className="finder-help"><span>Nie znasz parametrów?</span> <Link href="/poradnik">Sprawdź poradnik →</Link></div>
    </div>
    <form id="finderForm" className="finder-grid" action={'/' + category} key={category}>
      {fields.map(field => <div className="finder-group" key={field}>
        <label htmlFor={field}>{filterLabels[field]}</label>
        <select id={field} name={field}><option value="">Dowolny</option>
          {options[category][field]?.map(value => <option value={value} key={value}>{seasonOptions[value] ?? value}</option>)}
        </select>
      </div>)}
      <button className="btn btn-red finder-submit" type="submit">Pokaż produkty <span className="btn-arrow" aria-hidden="true">→</span></button>
    </form>
    <div className="finder-foot"><span><span className="tiny-red-square"/> Sprawdź zgodność z instrukcją samochodu</span>
      <span>{category === 'opony' ? 'Np. 225 / 50 R17' : 'Np. 18″ / 5×112 / ET40'}</span>
    </div>
  </div>;
}
