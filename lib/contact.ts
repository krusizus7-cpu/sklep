import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type Contact = {
  name?: string;
  address?: string;
  taxId?: string;
  email?: string;
  phone?: string;
  facebookUrl?: string;
  googleMapsEmbedUrl?: string;
  googleMapsDirectionsUrl?: string;
};

function text(value: unknown) {
  return typeof value === 'string' ? value.trim() || undefined : undefined;
}

function httpsUrl(value: unknown) {
  const address = text(value);
  const url = address ? URL.parse(address) : null;
  return url?.protocol === 'https:' && !url.username && !url.password && !url.port ? url : null;
}

export function telephoneHref(phone?: string) {
  const number = phone?.replace(/[\s().-]/gu, '');
  return number && /^\+?[0-9]{7,15}$/.test(number) ? `tel:${number}` : undefined;
}

export function readContact(): Contact {
  const path = resolve(/* turbopackIgnore: true */ process.env.BIEZNIK_CONTACT || 'data/contact.json');
  let contents: string;
  try {
    contents = readFileSync(path, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return {};
    throw error;
  }

  const config: unknown = JSON.parse(contents);
  if (!config || typeof config !== 'object' || Array.isArray(config)) {
    throw new Error('Dane kontaktowe warsztatu muszą być obiektem JSON.');
  }

  const fields = config as Record<string, unknown>;
  const facebook = httpsUrl(fields.facebookUrl);
  const embed = httpsUrl(fields.googleMapsEmbedUrl);
  const directions = httpsUrl(fields.googleMapsDirectionsUrl);

  return {
    name: text(fields.name),
    address: text(fields.address),
    taxId: text(fields.taxId),
    email: text(fields.email),
    phone: text(fields.phone),
    facebookUrl: facebook && ['facebook.com', 'www.facebook.com', 'm.facebook.com'].includes(facebook.hostname)
      && facebook.pathname !== '/' ? facebook.href : undefined,
    googleMapsEmbedUrl: embed?.hostname === 'www.google.com' && embed.pathname === '/maps/embed'
      && embed.searchParams.get('pb') ? embed.href : undefined,
    googleMapsDirectionsUrl: directions && (directions.hostname === 'maps.app.goo.gl' ||
      (directions.hostname === 'www.google.com' && directions.pathname.startsWith('/maps/')))
      ? directions.href : undefined,
  };
}
