const paths = {
  dashboard: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
  orders: 'M8 5H5v16h14V5h-3M8 3h8v4H8zM8 11h8m-8 4h8',
  payments: 'M3 5h18v14H3zM3 10h18M7 15h3',
  products: 'm12 3 9 5v8l-9 5-9-5V8l9-5Zm0 9 9-4m-9 4L3 8m9 4v9m-5-15 9 5',
  warehouse: 'M3 21V9l9-6 9 6v12M7 21V11h10v10M7 15h10m-10 3h10M2 21h20',
  analytics: 'M4 4v16h16M8 16l4-5 4 2 4-6m-4 0h4v4',
  users: 'M15 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2m20 0v-2a4 4 0 0 0-3-4M12.5 7.5a3.5 3.5 0 1 1-7 0 3.5 3.5 0 0 1 7 0ZM17 4.1a3.5 3.5 0 0 1 0 6.8',
  settings: 'M4 7h16M4 17h16M8 4v6m8 4v6',
  history: 'M4 11a8 8 0 1 1 2 6m-2-6V5m0 6h6m2-4v5l3 2',
  external: 'M13 5h6v6m0-6-8 8m6 0v6H5V7h6',
  chevron: 'm9 18 6-6-6-6',
  down: 'm6 9 6 6 6-6',
  plus: 'M12 5v14M5 12h14',
  search: 'M16 16l4 4m-2-9a7 7 0 1 1-14 0 7 7 0 0 1 14 0Z',
  alert: 'M12 3 2 20h20L12 3Zm0 6v4m0 3h.01',
  arrow: 'M4 12h15m-6-6 6 6-6 6'
};

export type AdminIconName = keyof typeof paths;

export function AdminIcon({name, size = 19}: {name: AdminIconName; size?: number}) {
  return <svg aria-hidden="true" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round"><path d={paths[name]}/></svg>;
}
