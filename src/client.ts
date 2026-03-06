import { buildSignedPayload, computeSignature } from './signature.js';
import type {
  ApiEnvelope,
  ConfirmInvoicePayload,
  CreateInvoicePayload,
  CreateWidgetPayload,
  PayCryptoClientOptions,
} from './types.js';

export class PayCryptoApiError extends Error {
  statusCode: number;
  responseBody: unknown;

  constructor(message: string, statusCode: number, responseBody: unknown) {
    super(message);
    this.name = 'PayCryptoApiError';
    this.statusCode = statusCode;
    this.responseBody = responseBody;
  }
}

export class PayCryptoClient {
  private readonly publicKey: string;
  private readonly privateKey: string;
  private readonly authMode: 'signature' | 'private-key';
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: PayCryptoClientOptions) {
    this.publicKey = options.publicKey.trim();
    this.privateKey = options.privateKey.trim();
    this.authMode = options.authMode ?? 'signature';
    this.baseUrl = (options.baseUrl ?? 'https://api.paycrypto.one/api/v1').replace(/\/+$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
    if (!this.publicKey) throw new Error('publicKey is required');
    if (!this.privateKey) throw new Error('privateKey is required');
  }

  async createInvoice(payload: CreateInvoicePayload): Promise<ApiEnvelope<unknown>> {
    return this.request('POST', 'invoice', this.asBody(payload));
  }

  async createWidget(payload: CreateWidgetPayload): Promise<ApiEnvelope<unknown>> {
    return this.request('POST', 'invoice/widget', this.asBody(payload));
  }

  async getInvoice(id: number | string): Promise<ApiEnvelope<unknown>> {
    return this.request('GET', `invoice/${id}`);
  }

  async searchInvoices(query: string): Promise<ApiEnvelope<unknown>> {
    return this.request('GET', `invoice?query=${encodeURIComponent(query)}`);
  }

  async confirmInvoice(id: number | string, payload: ConfirmInvoicePayload): Promise<ApiEnvelope<unknown>> {
    return this.request('PUT', `invoice/confirm/${id}`, this.asBody(payload));
  }

  async getUser(): Promise<ApiEnvelope<unknown>> {
    return this.request('GET', 'user');
  }

  async getCurrencyRateList(): Promise<ApiEnvelope<unknown>> {
    return this.request('GET', 'currency-rate');
  }

  async getCurrencyRateStatus(currency: string): Promise<ApiEnvelope<unknown>> {
    return this.request('GET', `currency-rate/${encodeURIComponent(currency)}/status`);
  }

  private buildHeaders(body: Record<string, unknown> | undefined): HeadersInit {
    const headers: Record<string, string> = {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'public-key': this.publicKey,
    };
    if (this.authMode === 'private-key') {
      headers['private-key'] = this.privateKey;
      return headers;
    }
    const payload = buildSignedPayload(body, this.publicKey);
    headers.signature = computeSignature(payload, this.privateKey);
    return headers;
  }

  private async request(
    method: 'GET' | 'POST' | 'PUT',
    path: string,
    body?: Record<string, unknown>,
  ): Promise<ApiEnvelope<unknown>> {
    const url = `${this.baseUrl}/${path.replace(/^\/+/, '')}`;
    const response = await this.fetchImpl(url, {
      method,
      headers: this.buildHeaders(method === 'GET' ? undefined : body),
      body: method === 'GET' ? undefined : JSON.stringify(body ?? {}),
    });
    const text = await response.text();
    let parsed: unknown = null;
    try {
      parsed = text ? JSON.parse(text) : null;
    } catch {
      throw new PayCryptoApiError('Invalid JSON response', response.status, text);
    }
    const envelope = parsed as ApiEnvelope<unknown> | null;
    if (!response.ok || !envelope || envelope.success !== true) {
      const message =
        (envelope &&
          typeof envelope.data === 'object' &&
          envelope.data !== null &&
          'message' in envelope.data &&
          typeof (envelope.data as { message?: unknown }).message === 'string' &&
          (envelope.data as { message: string }).message) ||
        `HTTP ${response.status}`;
      throw new PayCryptoApiError(message, response.status, parsed);
    }
    return envelope;
  }

  private asBody(value: object): Record<string, unknown> {
    return value as Record<string, unknown>;
  }
}
