import { HttpError } from '@/server/orders.mjs';

export async function requestJson(request: Request): Promise<unknown> {
  if (request.headers.get('content-type')?.split(';')[0].trim() !== 'application/json') {
    throw new HttpError(415, 'Oczekiwano danych w formacie JSON.');
  }
  const reader = request.body?.getReader();
  const buffer = new Uint8Array(16000);
  let size = 0;
  try {
    while (reader) {
      const {value, done} = await reader.read();
      if (done) break;
      if (size + value.length > buffer.length) {
        await reader.cancel();
        throw new HttpError(413, 'Formularz jest za duży.');
      }
      buffer.set(value, size);
      size += value.length;
    }
    return JSON.parse(new TextDecoder().decode(buffer.subarray(0, size)));
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(400, 'Nie można odczytać formularza.');
  }
}

const privateHeaders = {'Cache-Control': 'no-store'};
export const json = (value: unknown, status = 200) => Response.json(value, {status, headers: privateHeaders});

export function apiError(error: unknown) {
  if (error instanceof HttpError) return json({error: error.message}, error.status);
  console.error('Store request failed:', error instanceof Error ? error.name : 'Unknown');
  return json({error: 'Wystąpił błąd. Spróbuj ponownie.'}, 500);
}
