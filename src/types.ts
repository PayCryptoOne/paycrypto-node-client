export type AuthMode = 'signature' | 'private-key';

export interface PayCryptoClientOptions {
  publicKey: string;
  privateKey: string;
  baseUrl?: string;
  authMode?: AuthMode;
  fetchImpl?: typeof fetch;
}

export interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

export interface CreateInvoicePayload {
  amount: number;
  client_reference_id: string;
  currency?: string;
  cryptocurrency?: string;
  network?: string;
  metadata?: string;
  back_url?: string;
  cancel_url?: string;
}

export interface CreateWidgetPayload extends CreateInvoicePayload {
  widget_description?: string;
  lang?: string;
}

export interface ConfirmInvoicePayload {
  transactionId: string;
}
