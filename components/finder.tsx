'use client';

import { useState } from 'react';
import Link from 'next/link';
import { filterLabels, filterOptionLabel, tireFields, wheelFields, type Attribute } from '@/lib/filters';
import { Icon } from './icon';

const anyValue = {
  width: 'Dowolna', profile: 'Dowolny', diameter: 'Dowolna', season: 'Dowolny', pcd: 'Dowolny', et: 'Dowolne', finish: 'Dowolne'
};
export function Finder({options}: {options: Record<'opony' | 'felgi', Partial<Record<Attribute, string[]>>>}) {
  const [category, setCategory] = useState<'opony' | 'felgi'>('opony');
  const fields = category === 'opony' ? tireFields : wheelFields;
  return <section className="finder-shell" aria-label="Dobór według parametrów">
    <div className="finder-top">
      <div className="finder-tabs" role="group" aria-label="Rodzaj produktu">
        <button type="button" aria-pressed={category === 'opony'} onClick={() => setCategory('opony')}><Icon name="tire"/>Opony</button>
        <button type="button" aria-pressed={category === 'felgi'} onClick={() => setCategory('felgi')}><Icon name="wheel"/>Felgi</button>
      </div>
      <Link className="finder-help" href="/poradnik"><Icon name="book"/> Jak dobrać rozmiar?</Link>
    </div>
    <form className="finder-grid" action={'/' + category} key={category}>
      {fields.map(field => <label key={field}>{filterLabels[field]}
        <select name={field}><option value="">{anyValue[field]}</option>
          {options[category][field]?.map(value => <option value={value} key={value}>{filterOptionLabel(field, value)}</option>)}
        </select>
      </label>)}
      <button className="btn btn-red finder-submit" type="submit"><Icon name="search"/>Pokaż produkty</button>
    </form>
  </section>;
}
