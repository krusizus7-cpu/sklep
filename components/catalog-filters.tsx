'use client';

import { useState, type ReactNode } from 'react';

export function CatalogFilters({count, children}: {count: number; children: ReactNode}) {
  const [open, setOpen] = useState(false);
  return <>
    <button className="btn btn-border catalog-filter-toggle" type="button" aria-expanded={open}
      aria-controls="catalog-filter-fields" onClick={() => setOpen(!open)}>
      {count ? `Filtry (${count})` : 'Filtry'} <span aria-hidden="true"/>
    </button>
    <div className="catalog-filter-fields" id="catalog-filter-fields" data-open={open}>{children}</div>
  </>;
}
