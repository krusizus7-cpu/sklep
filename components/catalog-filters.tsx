'use client';

import { useState, type ReactNode } from 'react';
import { Icon } from './icon';

export function CatalogFilters({children, count}: {children: ReactNode; count: number}) {
  const [expanded, setExpanded] = useState(false);
  return <aside className="filter-panel">
    <button type="button" className="filter-toggle" aria-expanded={expanded} aria-controls="catalog-filters" onClick={() => setExpanded(!expanded)}>
      <Icon name="sliders"/> Filtry i sortowanie{count > 0 && <span>({count})</span>}<span className="disclosure" aria-hidden="true"/>
    </button>
    <div id="catalog-filters" className={expanded ? 'filters expanded' : 'filters'}>{children}</div>
  </aside>;
}
