'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { HttpError, orderIdPattern } from '@/server/orders.mjs';
import { requireAdmin } from './session';
import { runtime } from './store';
import type { Product } from './types';

export type AdminResult = {error?: string; success?: string};
const field = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const integer = (form: FormData, key: string) => {
  const value = field(form, key);
  return /^\d+$/.test(value) ? Number(value) : NaN;
};
const validRevision = (revision: string) => /^[a-f0-9]{64}$/.test(revision);
const productId = /^[a-zA-Z0-9_-]{1,64}$/;

export async function saveProduct(_state: AdminResult, form: FormData): Promise<AdminResult> {
  const actor = await requireAdmin();
  const expected = field(form, 'expectedStock');
  if (expected && !/^\d+$/.test(expected)) return {error: 'Nieprawidłowy stan wyjściowy.'};
  const revision = field(form, 'revision') || null;
  if (revision && !validRevision(revision)) return {error: 'Nieprawidłowa wersja produktu.'};
  const type = field(form, 'type');
  if (type !== 'tires' && type !== 'wheels') return {error: 'Wybierz rodzaj produktu.'};
  const common = {
    type, id: field(form, 'id'), brand: field(form, 'brand'), name: field(form, 'name'), size: field(form, 'size'),
    diameter: integer(form, 'diameter'), priceCents: integer(form, 'priceCents'), stock: integer(form, 'stock'),
    image: field(form, 'image'), description: field(form, 'description')
  };
  const product = (type === 'tires' ? {
    ...common, width: integer(form, 'width'), profile: integer(form, 'profile'), season: field(form, 'season'),
    vehicle: field(form, 'vehicle') || undefined, wetGripClass: field(form, 'wetGripClass') || undefined,
    bestseller: form.has('bestseller') || undefined,
    eprelUrl: field(form, 'eprelUrl') || undefined, labelImage: field(form, 'labelImage') || undefined
  } : {...common, pcd: field(form, 'pcd'), et: field(form, 'et'), finish: field(form, 'finish')}) as Product;
  try {
    runtime().orders.saveProduct(product, expected ? Number(expected) : null, revision, actor.id, field(form, 'stockReason'));
  } catch (error) {
    return {error: error instanceof Error ? error.message : 'Zapis produktu nie powiódł się.'};
  }
  revalidatePath('/', 'layout');
  redirect('/admin/produkty?zapisano=1');
}

export async function shipOrder(_state: AdminResult, form: FormData): Promise<AdminResult> {
  const actor = await requireAdmin();
  const id = field(form, 'id');
  const tracking = field(form, 'trackingNumber');
  if (!orderIdPattern.test(id) || !/^[\w -]{3,80}$/.test(tracking)) return {error: 'Podaj poprawny numer przesyłki.'};
  try {
    runtime().orders.markShipped(id, tracking, actor.id);
  } catch (error) {
    return {error: error instanceof Error ? error.message : 'Zapis wysyłki nie powiódł się.'};
  }
  revalidatePath('/admin/zamowienia/' + id);
  redirect('/admin/zamowienia/' + id);
}

export async function changeProductVisibility(_state: AdminResult, form: FormData): Promise<AdminResult> {
  const actor = await requireAdmin();
  const id = field(form, 'id');
  const revision = field(form, 'revision');
  const expected = integer(form, 'expectedStock');
  const operation = field(form, 'operation');
  if (!productId.test(id) || !validRevision(revision) || !Number.isSafeInteger(expected) ||
      !['archive', 'restore'].includes(operation)) return {error: 'Odśwież dane produktu i spróbuj ponownie.'};
  const archived = operation === 'archive';
  try {
    runtime().orders.setArchived(id, archived, expected, revision, actor.id);
  } catch (error) {
    return {error: error instanceof HttpError ? error.message : 'Nie udało się zmienić widoczności produktu.'};
  }
  revalidatePath('/', 'layout');
  return {success: archived ? 'Przeniesiono produkt do archiwum.' : 'Przywrócono produkt do katalogu.'};
}

export async function correctStock(_state: AdminResult, form: FormData): Promise<AdminResult> {
  const actor = await requireAdmin();
  const id = field(form, 'id');
  const revision = field(form, 'revision');
  const expected = integer(form, 'expectedStock');
  if (!productId.test(id) || !validRevision(revision) || !Number.isSafeInteger(expected)) {
    return {error: 'Odśwież dane produktu i spróbuj ponownie.'};
  }
  try {
    runtime().orders.correctStock(id, integer(form, 'quantity'), expected, revision, field(form, 'reason'), actor.id);
  } catch (error) {
    return {error: error instanceof HttpError ? error.message : 'Nie udało się zapisać korekty stanu.'};
  }
  revalidatePath('/', 'layout');
  return {success: 'Zapisano korektę stanu.'};
}

export async function reconcilePayment(_state: AdminResult, form: FormData): Promise<AdminResult> {
  const actor = await requireAdmin();
  const id = field(form, 'id');
  if (!orderIdPattern.test(id)) return {error: 'Nieprawidłowy numer zamówienia.'};
  try {
    await runtime().commerce.reconcile(id, actor.id);
  } catch (error) {
    revalidatePath('/admin', 'layout');
    return {error: error instanceof HttpError ? error.message : 'Przelewy24 nie potwierdziło płatności. Sprawdź ponownie później.'};
  }
  revalidatePath('/admin', 'layout');
  return {success: 'Płatność potwierdzona przez Przelewy24.'};
}

export async function updateCustomerAccess(_state: AdminResult, form: FormData): Promise<AdminResult> {
  const actor = await requireAdmin();
  const id = field(form, 'id');
  const operation = field(form, 'operation');
  if (!orderIdPattern.test(id) || !['block', 'unblock'].includes(operation)) {
    return {error: 'Nieprawidłowe konto lub operacja.'};
  }
  const blocked = operation === 'block';
  try {
    runtime().accounts.setCustomerBlocked(id, blocked, actor.id);
  } catch (error) {
    return {error: error instanceof HttpError ? error.message : 'Nie udało się zmienić dostępu do konta.'};
  }
  revalidatePath('/admin', 'layout');
  return {success: blocked ? 'Zablokowano konto klienta.' : 'Odblokowano konto klienta.'};
}

export async function saveShopSetting(_state: AdminResult, form: FormData): Promise<AdminResult> {
  const actor = await requireAdmin();
  const section = field(form, 'section');
  const revision = field(form, 'revision');
  if (!validRevision(revision)) return {error: 'Odśwież ustawienia i spróbuj ponownie.'};
  let value;
  switch (section) {
    case 'merchant': {
      const email = field(form, 'email');
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return {error: 'Podaj poprawny adres e-mail sprzedawcy.'};
      value = {
        name: field(form, 'name'), address: field(form, 'address'), email, taxId: field(form, 'taxId'),
        phone: field(form, 'phone'), termsUrl: field(form, 'termsUrl'), privacyUrl: field(form, 'privacyUrl')
      };
      break;
    }
    case 'shipping':
      value = {firstCents: integer(form, 'firstCents'), additionalCents: integer(form, 'additionalCents')};
      break;
    case 'lowStock':
      value = integer(form, 'lowStock');
      break;
    default:
      return {error: 'Nieprawidłowy zestaw ustawień.'};
  }
  try {
    runtime().orders.saveSetting(section, value, revision, actor.id);
  } catch (error) {
    return {error: error instanceof Error && !('code' in error) ? error.message : 'Nie udało się zapisać ustawień.'};
  }
  revalidatePath('/', 'layout');
  return {success: 'Zapisano ustawienia.'};
}
