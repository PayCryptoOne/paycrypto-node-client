export type AuthMode = 'signature' | 'private-key';
export type InvoiceListSortBy = 'created_at' | 'expire_at' | 'final_amount' | 'status' | 'client_reference_id';
export type InvoiceListSortOrder = 'asc' | 'desc';

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

export interface InvoiceListQuery {
  id?: string;
  status?: string;
  currency?: string;
  network?: string;
  client_reference_id?: string;
  transaction_id?: string;
  created_at_from?: number;
  created_at_to?: number;
  expire_at_from?: number;
  expire_at_to?: number;
  sort_by?: InvoiceListSortBy;
  sort_order?: InvoiceListSortOrder;
  limit?: number;
  offset?: number;
}

export interface InvoiceListItem {
  id: number;
  merchant_id: string;
  merchant_name: string | null;
  cryptocurrency: string;
  network: string;
  wallet: string;
  payer_wallet: string | null;
  transaction_id: string | null;
  transaction_explorer_url: string | null;
  source_currency: string | null;
  source_amount: string | null;
  payment_amount: string | null;
  final_amount: number;
  requested_amount: string;
  status: string;
  client_reference_id: string;
  metadata: string | null;
  created_at: number;
  paid_at: number | null;
  expire_at: number;
}

export interface InvoiceListResult {
  items: InvoiceListItem[];
  total: number;
  limit: number;
  offset: number;
}
