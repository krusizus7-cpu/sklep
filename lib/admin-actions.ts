'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { orderIdPattern } from '@/server/orders.mjs';
import { requireAdmin } from './session';
import { runtime } from './store';
import { productFromForm } from './product-input';

type Result = {error?: string};
const field = (form: FormData, key: string) => String(form.get(key) ?? '').trim();
export async function saveProduct(_state: Result, form: FormData): Promise<Result> {
  await requireAdmin();
  const expected = field(form, 'expectedStock');
  if (expected && !/^\d+$/.test(expected)) return {error: 'Nieprawidłowy stan wyjściowy.'};
  const revision = field(form, 'revision') || null;
  if (revision && !/^[a-f0-9]{64}$/.test(revision)) return {error: 'Nieprawidłowa wersja produktu.'};
  const product = productFromForm(form);
  if (!product) return {error: 'Wybierz rodzaj produktu.'};
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
