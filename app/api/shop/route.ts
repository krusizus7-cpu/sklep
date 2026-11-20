import { apiError, json } from '@/lib/http';
import { runtime } from '@/lib/store';

export async function GET() {
  try {
    return json(runtime().commerce.catalog());
  } catch (error) {
    return apiError(error);
  }
}
