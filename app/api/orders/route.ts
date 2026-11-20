import { apiError, json, requestJson } from '@/lib/http';
import { currentAccount } from '@/lib/session';
import { runtime } from '@/lib/store';

export async function POST(request: Request) {
  try {
    const account = await currentAccount();
    return json(await runtime().commerce.submit(await requestJson(request), account?.id ?? null), 201);
  } catch (error) {
    return apiError(error);
  }
}
