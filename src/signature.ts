import { createHmac } from 'node:crypto';

export function buildSignedPayload(
  body: Record<string, unknown> | undefined,
  publicKey: string,
): string {
  const params: Record<string, string> = { api_key: publicKey };
  if (body) {
    for (const [key, value] of Object.entries(body)) {
      if (value === undefined || value === null) continue;
      params[key] = String(value);
    }
  }
  const sorted = Object.entries(params).sort(([a], [b]) => a.localeCompare(b));
  const query = new URLSearchParams();
  for (const [key, value] of sorted) {
    query.append(key, value);
  }
  return query.toString();
}

export function computeSignature(payload: string, privateKey: string): string {
  return createHmac('sha256', privateKey).update(payload).digest('hex');
}
