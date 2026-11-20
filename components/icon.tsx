const paths = {
  arrow: <path d="M4 12h15m-6-6 6 6-6 6"/>,
  account: <><circle cx="12" cy="8" r="3.5"/><path d="M4.5 21v-2a7.5 7.5 0 0 1 15 0v2"/></>,
  cart: <><path d="M2.5 4h2.8l2.4 11.5h11.2l2.1-8H6.4"/><circle cx="9" cy="20" r="1"/><circle cx="18" cy="20" r="1"/></>,
  heart: <path d="M20.4 5.5a5.1 5.1 0 0 0-7.2.1L12 6.9l-1.2-1.3a5.1 5.1 0 0 0-7.2 7.2l8.4 8.1 8.4-8.1a5.1 5.1 0 0 0 0-7.3Z"/>,
  menu: <path d="M3 6h18M3 12h18M3 18h18"/>,
  info: <><circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-9v.1"/></>,
  book: <><path d="M12 6c-3-2-6-2-9-1v14c3-1 6-1 9 1 3-2 6-2 9-1V5c-3-1-6-1-9 1Zm0 0v14"/></>,
  tire: <><ellipse cx="10" cy="12" rx="6" ry="9" transform="rotate(20 10 12)"/><ellipse cx="10" cy="12" rx="2.5" ry="5.3" transform="rotate(20 10 12)"/><path d="m13 3.5 3.5 1.2c3.2 1.2 4.2 6.1 2.4 10.8s-5.5 7.6-8.7 6.4L7 20.8"/></>,
  wheel: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="2.4"/><path d="M12 3v6.5m8-1.9-5.8 3.1m3.3 8.4-4.1-5m-6.9 5 4.1-5M4 7.6l5.8 3.1"/></>,
  search: <><circle cx="10.4" cy="10.4" r="6.5"/><path d="m15.4 15.4 5 5"/></>,
  sliders: <><path d="M4 7h6m4 0h6M4 17h10m4 0h2"/><circle cx="12" cy="7" r="2"/><circle cx="16" cy="17" r="2"/></>,
  plus: <path d="M5 12h14M12 5v14"/>,
  close: <path d="m6 6 12 12M18 6 6 18"/>
};

export function Icon({name}: {name: keyof typeof paths}) {
  return <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.65" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;
}
