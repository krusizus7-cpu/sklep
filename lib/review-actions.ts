'use server';

import { revalidatePath } from 'next/cache';
import { currentAccount, requireAdmin } from './session';
import { runtime } from './store';
import { HttpError } from '@/server/orders.mjs';

type Result = {error?: string};

export async function submitReview(orderId: string, sku: string, _state: Result, form: FormData): Promise<Result> {
  const account = await currentAccount();
  if (!account) return {error: 'Zaloguj się, aby wysłać opinię.'};
  try {
    runtime().orders.submitReview(account.id, orderId, sku, Number(form.get('rating')), form.get('body'));
  } catch (error) {
    if (error instanceof HttpError) return {error: error.message};
    throw error;
  }
  revalidatePath('/konto');
  revalidatePath('/admin/opinie');
  return {};
}

export async function moderateReview(id: number, _state: Result, form: FormData): Promise<Result> {
  await requireAdmin();
  try {
    const sku = runtime().orders.moderateReview(id, form.get('decision'));
    revalidatePath('/produkt/' + sku);
  } catch (error) {
    if (error instanceof HttpError) return {error: error.message};
    throw error;
  }
  revalidatePath('/admin/opinie');
  revalidatePath('/konto');
  return {};
}
