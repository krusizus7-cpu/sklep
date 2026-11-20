'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { orderIdPattern } from '@/server/orders.mjs';
import { requireAdmin } from './session';
import { runtime } from './store';
import type { Product } from './types';

type Result = {error?: string};
const field = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
const integer = (form: FormData, key: string) => {
  const value = field(form, key);
  return /^\d+$/.test(value) ? Number(value) : NaN;
};

export async function saveProduct(_state: Result, form: FormData): Promise<Result> {
  await requireAdmin();
  const expected = field(form, 'expectedStock');
  if (expected && !/^\d+$/.test(expected)) return {error: 'Nieprawidłowy stan wyjściowy.'};
  const revision = field(form, 'revision') || null;
  if (revision && !/^[a-f0-9]{64}$/.test(revision)) return {error: 'Nieprawidłowa wersja produktu.'};
  const type = field(form, 'type');
  if (type !== 'tires' && type !== 'wheels' && type !== 'hubcaps') return {error: 'Wybierz rodzaj produktu.'};
  const optional = (key: string) => field(form, key) || undefined;
  const common = {
    type, id: field(form, 'id'), brand: field(form, 'brand'), name: field(form, 'name'), size: field(form, 'size'),
    diameter: integer(form, 'diameter'), priceCents: integer(form, 'priceCents'), stock: integer(form, 'stock'),
    image: field(form, 'image'), description: field(form, 'description')
  };
  const product = (type === 'tires' ? {
    ...common, vehicle: optional('vehicle'), tier: optional('tier'), width: integer(form, 'width'), profile: integer(form, 'profile'), season: field(form, 'season'),
    eprelUrl: field(form, 'eprelUrl') || undefined, labelImage: field(form, 'labelImage') || undefined
  } : type === 'wheels' ? {
    ...common, pcd: field(form, 'pcd'), et: field(form, 'et'), finish: field(form, 'finish'),
    vehicle: optional('vehicle'), material: optional('material'), style: optional('style')
  } : common) as Product;
  try {
    runtime().orders.saveProduct(product, expected ? Number(expected) : null, revision);
  } catch (error) {
    return {error: error instanceof Error ? error.message : 'Zapis produktu nie powiódł się.'};
  }
  revalidatePath('/', 'layout');
  redirect('/admin/produkty');
}

export async function shipOrder(_state: Result, form: FormData): Promise<Result> {
  await requireAdmin();
  const id = field(form, 'id');
  const tracking = field(form, 'trackingNumber');
  if (!orderIdPattern.test(id) || !/^[\w -]{3,80}$/.test(tracking)) return {error: 'Podaj poprawny numer przesyłki.'};
  try {
    runtime().orders.markShipped(id, tracking);
  } catch (error) {
    return {error: error instanceof Error ? error.message : 'Zapis wysyłki nie powiódł się.'};
  }
  revalidatePath('/admin/zamowienia/' + id);
  redirect('/admin/zamowienia/' + id);
}
