'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useOptimistic, useState, useTransition, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { filterLabels, seasonOptions, wheelFields } from '@/lib/filters';
import { readCatalogParams, catalogHref, catalogFilterChips, tireSeasons, tireSizes, type CatalogQuery, type ProductCategory } from '@/lib/catalog-query';
import { vehicleLabels } from '@/lib/tire-attributes.mjs';
import { CatalogIcon } from './catalog-icon';

const productNoun: Partial<Record<Intl.LDMLPluralRule, string>> = {one: 'produkt', few: 'produkty'};
const plurals = new Intl.PluralRules('pl');

type Props = {
  category: ProductCategory;
  query: CatalogQuery;
  options: Record<string, string[]>;
  vehicleCounts: Record<string, number>;
  seasonCounts: Record<string, number>;
  count: number;
  children: ReactNode;
};

function FilterSection({label, open, children}: {label: string; open: boolean; children: ReactNode}) {
  return <details className="shop-catalog-filter-section" open={open}>
    <summary>{label}<CatalogIcon name="chevron"/></summary>
    {children}
  </details>;
}

function FilterSelect({name, label, selected, options, onChange}: {
  name: string; label: string; selected?: string; options: string[]; onChange: (event: ChangeEvent<HTMLSelectElement>) => void;
}) {
  const available = selected && !options.includes(selected) ? [selected, ...options] : options;
  return <select name={name} aria-label={label} value={selected ?? ''} onChange={onChange}>
    <option value="">{label}</option>
    {available.map(option => <option key={option} value={option}>{option}</option>)}
  </select>;
}

export function CatalogFilters({category, query, options, vehicleCounts, seasonCounts, count, children}: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(query, (_previous, next: CatalogQuery) => next);
  const [enhanced, setEnhanced] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  useEffect(() => setEnhanced(true), []);

  const tires = category === 'opony';
  const fields = tires ? tireSizes : wheelFields;
  const chips = catalogFilterChips(category, query);
  function apply(form: HTMLFormElement) {
    const next = readCatalogParams(category, new FormData(form));
    const href = catalogHref(category, next);
    if (href === catalogHref(category, current)) return;
    startTransition(() => {
      setCurrent(next);
      router.push(href, {scroll: false});
    });
  }
  function change(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    if (event.currentTarget.form) apply(event.currentTarget.form);
  }
  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    apply(event.currentTarget);
  }

  return <form className={'shop-catalog-layout' + (enhanced ? ' shop-catalog-enhanced' : '')} action={'/' + category} onSubmit={submit}>
    {query.q && <input type="hidden" name="q" value={query.q}/>}
    <button className="shop-catalog-mobile-filters" type="button" aria-expanded={showFilters} aria-controls="shop-catalog-filter-panel"
      onClick={() => setShowFilters(open => !open)}><CatalogIcon name="filters"/> Filtry <CatalogIcon name="chevron"/></button>
    <aside className="shop-catalog-filter-panel" id="shop-catalog-filter-panel" aria-labelledby="shop-catalog-filter-title" data-open={showFilters}>
      <div className="shop-catalog-filter-heading">
        <h2 id="shop-catalog-filter-title"><CatalogIcon name="filters"/> Filtry</h2>
        <Link href={'/' + category} scroll={false}>Wyczyść wszystko</Link>
      </div>
      {tires && <>
        <FilterSection label="Typ pojazdu" open>
          <div className="shop-catalog-filter-choices" role="group" aria-label="Typ pojazdu">
            {Object.entries(vehicleLabels).map(([vehicle, label]) => <label key={vehicle}>
              <input type="checkbox" name="vehicle" value={vehicle} checked={current.vehicle.some(selected => selected === vehicle)} onChange={change}/>
              <span>{label} <small>({vehicleCounts[vehicle]})</small></span>
            </label>)}
          </div>
        </FilterSection>
        <FilterSection label="Sezon" open>
          <div className="shop-catalog-filter-choices shop-catalog-seasons" role="radiogroup" aria-label="Sezon">
            {tireSeasons.map(season => <label key={season}>
              <input type="radio" name="season" value={season} checked={current.season === season} onChange={change}/>
              <CatalogIcon name={season}/><span>{seasonOptions[season]} <small>({seasonCounts[season]})</small></span>
            </label>)}
            {current.season && <label><input type="radio" name="season" value="" checked={false} onChange={change}/> <span>Wszystkie sezony</span></label>}
          </div>
        </FilterSection>
      </>}
      <FilterSection label={tires ? 'Rozmiar' : 'Parametry felgi'} open>
        <div className="shop-catalog-filter-selects">
          {fields.map(field => <FilterSelect key={field} name={field} label={filterLabels[field]} selected={current[field]} options={options[field]} onChange={change}/>)}
        </div>
      </FilterSection>
      <FilterSection label="Producent" open={Boolean(query.brand)}>
        <div className="shop-catalog-filter-selects"><FilterSelect name="brand" label="Producent" selected={current.brand} options={options.brand} onChange={change}/></div>
      </FilterSection>
    </aside>
    <section className="shop-catalog-results" aria-labelledby="shop-catalog-results-title">
      <h2 className="visually-hidden" id="shop-catalog-results-title">Wyniki katalogu {tires ? 'opon' : 'felg'}</h2>
      <div className="shop-catalog-toolbar">
        {chips.length > 0 && <div className="shop-catalog-active-filters">
          <strong>Aktywne filtry:</strong>
          <ul>{chips.map(({label, href}) => <li key={href}>
            <Link href={href} scroll={false} aria-label={`Usuń filtr: ${label}`}>{label}<CatalogIcon name="close"/></Link>
          </li>)}</ul>
        </div>}
        <p className="shop-catalog-count" role="status">Znaleziono: {count} {productNoun[plurals.select(count)] ?? 'produktów'}</p>
        <label className="shop-catalog-sort"><span className="visually-hidden">Sortuj</span>
          <select name="sort" value={current.sort ?? ''} onChange={change}>
            <option value="">Sortuj: Polecane</option><option value="low">Cena rosnąco</option><option value="high">Cena malejąco</option>
          </select>
        </label>
        <noscript><button className="shop-catalog-add" type="submit">Zastosuj</button></noscript>
      </div>
      <div aria-busy={pending}>{children}</div>
    </section>
  </form>;
}
