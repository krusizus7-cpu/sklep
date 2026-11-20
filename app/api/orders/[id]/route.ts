import { apiError, json } from '@/lib/http';
import { currentAccount } from '@/lib/session';
import { runtime } from '@/lib/store';

export async function GET(_request: Request, {params}: {params: Promise<{id: string}>}) {
  try {
    return json(runtime().commerce.status((await params).id, await currentAccount()));
  } catch (error) {
    return apiError(error);
  }
}
