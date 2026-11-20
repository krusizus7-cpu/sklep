import { telephoneHref, type Contact } from '@/lib/contact';

export function ContactWidgets({phone, facebookUrl}: Contact) {
  const phoneHref = telephoneHref(phone);
  if (!phoneHref && !facebookUrl) return null;

  return <nav className="contact-widgets" aria-label="Szybki kontakt z warsztatem">
    {phoneHref && <a className="contact-call" href={phoneHref} aria-label="Zadzwoń do warsztatu" title="Zadzwoń do warsztatu">
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M7 3H4a1 1 0 0 0-1 1 17 17 0 0 0 17 17 1 1 0 0 0 1-1v-3l-5-2-2 2a13 13 0 0 1-7-7l2-2-2-5Z"/>
      </svg>
    </a>}
    {facebookUrl && <a href={facebookUrl} target="_blank" rel="noopener noreferrer" aria-label="BIEŻNIK na Facebooku" title="BIEŻNIK na Facebooku">
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <path d="M14 22v-9h3l.5-4H14V7c0-1 .3-2 2-2h2V2h-3c-3 0-5 1.8-5 5v2H7v4h3v9z"/>
      </svg>
    </a>}
  </nav>;
}

export function CompanyDetails({title, name, address, taxId, email, phone}: Contact & {title: string}) {
  if (!name && !address && !taxId && !email && !phone) return null;
  const phoneHref = telephoneHref(phone);

  return <section className="company-details">
    <h2>{title}</h2>
    <address>
      {name && <strong>{name}</strong>}
      {address && <span>{address}</span>}
      {taxId && <span>NIP {taxId}</span>}
      {email && <a href={`mailto:${email}`}>{email}</a>}
      {phoneHref ? <a href={phoneHref}>{phone}</a> : phone && <span>{phone}</span>}
    </address>
  </section>;
}

export function WorkshopMap({googleMapsEmbedUrl, googleMapsDirectionsUrl}: Contact) {
  if (!googleMapsEmbedUrl && !googleMapsDirectionsUrl) return null;

  return <section className="workshop-map">
    <h2>Lokalizacja warsztatu</h2>
    {googleMapsEmbedUrl && <iframe src={googleMapsEmbedUrl} title="Mapa Google – lokalizacja warsztatu" loading="lazy"/>}
    {googleMapsDirectionsUrl && <a href={googleMapsDirectionsUrl} target="_blank" rel="noopener noreferrer">Wyznacz trasę</a>}
  </section>;
}
