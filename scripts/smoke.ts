import { PayCryptoClient } from '../src/client.js';
import { getEnv, loadEnvFromDotFile } from './env.js';

function assertTrue(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function run(): Promise<void> {
  loadEnvFromDotFile();
  const client = new PayCryptoClient({
    publicKey: getEnv('PAYCRYPTO_PUBLIC_KEY'),
    privateKey: getEnv('PAYCRYPTO_PRIVATE_KEY'),
    baseUrl: getEnv('PAYCRYPTO_BASE_URL', 'https://api.paycrypto.one/api/v1'),
    authMode: 'signature',
  });
  const orderId = `paycrypto-node-smoke-${Date.now()}`;
  const created = await client.createInvoice({
    amount: 5.5,
    client_reference_id: orderId,
    currency: 'USD',
    cryptocurrency: 'USDT',
    network: 'TRC-20',
  });
  const invoice = created.data as { id: number };
  assertTrue(Number(invoice.id) > 0, 'invoiceCreate failed');

  const detail = await client.getInvoice(invoice.id);
  const detailData = detail.data as { client_reference_id?: string };
  assertTrue(detailData.client_reference_id === orderId, 'invoiceDetail mismatch');

  const search = await client.searchInvoices(orderId);
  const searchItems = search.data as Array<unknown>;
  assertTrue(Array.isArray(searchItems) && searchItems.length > 0, 'invoiceSearch empty');

  const widget = await client.createWidget({
    amount: 6.75,
    client_reference_id: `paycrypto-node-widget-${Date.now()}`,
    currency: 'USD',
    lang: 'ru-RU',
  });
  const widgetData = widget.data as { id: number };
  assertTrue(Number(widgetData.id) > 0, 'widgetCreate failed');

  const confirm = await client.confirmInvoice(invoice.id, {
    transactionId: `paycrypto-node-smoke-tx-${Date.now()}`,
  });
  const confirmData = confirm.data as { status?: string };
  assertTrue(Boolean(confirmData.status), 'invoiceConfirm failed');

  const user = await client.getUser();
  assertTrue(Boolean(user.data), 'userDetail failed');

  const rates = await client.getCurrencyRateList();
  assertTrue(Boolean(rates.data), 'currencyRate failed');

  const rateStatus = await client.getCurrencyRateStatus('USD');
  assertTrue(Boolean(rateStatus.data), 'currencyRateStatus failed');

  console.log(
    JSON.stringify(
      {
        ok: true,
        invoice_id: invoice.id,
        widget_invoice_id: widgetData.id,
      },
      null,
      2,
    ),
  );
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
