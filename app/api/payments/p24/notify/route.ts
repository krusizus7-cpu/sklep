import { apiError, requestJson } from '@/lib/http';
import { runtime } from '@/lib/store';

export async function POST(request: Request) {
  try {
    await runtime().commerce.notify(await requestJson(request));
    return new Response(null, {headers: {'Cache-Control': 'no-store'}});
  } catch (error) {
    return apiError(error);
  }
}
