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

  it('builds invoice list query string for GET /invoices', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: { items: [], total: 0, limit: 20, offset: 0 },
        }),
    });
    const client = new PayCryptoClient({
      publicKey: 'pk',
      privateKey: 'sk',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await client.getInvoiceList({
      status: 'paid_all',
      client_reference_id: 'order-1',
      created_at_from: 1700000000,
      created_at_to: 1700000100,
      sort_by: 'created_at',
      sort_order: 'desc',
      limit: 20,
      offset: 0,
    });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(
      'https://api.paycrypto.one/api/v1/invoices?status=paid_all&client_reference_id=order-1&created_at_from=1700000000&created_at_to=1700000100&sort_by=created_at&sort_order=desc&limit=20&offset=0',
    );
    const headers = init.headers as Record<string, string>;
    expect(headers.signature).toBe(computeSignature('api_key=pk', 'sk'));
  });

  it('omits undefined invoice list params', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () =>
        JSON.stringify({
          success: true,
          data: { items: [], total: 0, limit: 20, offset: 0 },
        }),
    });
    const client = new PayCryptoClient({
      publicKey: 'pk',
      privateKey: 'sk',
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await client.getInvoiceList({ status: 'pending', limit: 10, offset: undefined });
    const [url] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.paycrypto.one/api/v1/invoices?status=pending&limit=10');
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
