import { describe, expect, it, vi } from 'vitest';
import { buildSignedPayload, computeSignature } from '../src/signature.js';
import { PayCryptoApiError, PayCryptoClient } from '../src/client.js';

describe('PayCryptoClient', () => {
  it('sends signature auth for POST request', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: { id: 1 } }),
    });
    const client = new PayCryptoClient({
      publicKey: 'pk',
      privateKey: 'sk',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await client.createInvoice({ amount: 10, client_reference_id: 'ord-1' });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    const payload = buildSignedPayload({ amount: 10, client_reference_id: 'ord-1' }, 'pk');
    expect(headers['public-key']).toBe('pk');
    expect(headers.signature).toBe(computeSignature(payload, 'sk'));
  });

  it('signs GET with api_key only', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: { id: 1 } }),
    });
    const client = new PayCryptoClient({
      publicKey: 'pk',
      privateKey: 'sk',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await client.getInvoice(42);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers.signature).toBe(computeSignature('api_key=pk', 'sk'));
  });

  it('supports private-key auth mode', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ success: true, data: {} }),
    });
    const client = new PayCryptoClient({
      publicKey: 'pk',
      privateKey: 'sk',
      authMode: 'private-key',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await client.getUser();
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers['private-key']).toBe('sk');
    expect(headers.signature).toBeUndefined();
  });

  it('throws PayCryptoApiError on API error', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      text: async () =>
        JSON.stringify({
          success: false,
          data: { message: 'Signature is invalid' },
        }),
    });
    const client = new PayCryptoClient({
      publicKey: 'pk',
      privateKey: 'bad',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(client.getUser()).rejects.toBeInstanceOf(PayCryptoApiError);
  });
});
