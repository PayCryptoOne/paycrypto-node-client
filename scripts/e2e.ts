import { PayCryptoApiError, PayCryptoClient } from '../src/client.js';
import { getEnv, loadEnvFromDotFile } from './env.js';

class TestRunner {
  private passed = 0;
  private failed = 0;

  async run(name: string, fn: () => Promise<void>): Promise<void> {
    try {
      await fn();
      this.passed += 1;
      console.log(`PASS ${name}`);
    } catch (error) {
      this.failed += 1;
      const message = error instanceof Error ? error.message : String(error);
      console.error(`FAIL ${name}: ${message}`);
    }
  }

  finish(): void {
    console.log(JSON.stringify({ passed: this.passed, failed: this.failed }));
    if (this.failed > 0) process.exit(1);
  }
}

function assertTrue(condition: boolean, message: string): void {
  if (!condition) throw new Error(message);
}

async function run(): Promise<void> {
  loadEnvFromDotFile();
  const baseUrl = getEnv('PAYCRYPTO_BASE_URL', 'https://api.paycrypto.one/api/v1');
  const publicKey = getEnv('PAYCRYPTO_PUBLIC_KEY');
  const privateKey = getEnv('PAYCRYPTO_PRIVATE_KEY');

  const runner = new TestRunner();
  const client = new PayCryptoClient({
    publicKey,
    privateKey,
    baseUrl,
    authMode: 'signature',
  });
  const clientPrivate = new PayCryptoClient({
    publicKey,
    privateKey,
    baseUrl,
    authMode: 'private-key',
  });

  let invoiceId = 0;
  const orderId = `paycrypto-node-e2e-${Date.now()}`;
  const widgetOrderId = `paycrypto-node-widget-${Date.now()}`;

  await runner.run('invoiceCreate signature', async () => {
    const result = await client.createInvoice({
      amount: 15.75,
      client_reference_id: orderId,
      currency: 'USD',
      cryptocurrency: 'USDT',
      network: 'TRC-20',
      metadata: 'paycrypto-node-e2e',
    });
    const data = result.data as { id: number; final_amount?: string; wallet?: string };
    invoiceId = Number(data.id);
    assertTrue(invoiceId > 0, 'invoice id must be > 0');
    assertTrue(Boolean(data.final_amount), 'final amount is empty');
    assertTrue(Boolean(data.wallet), 'wallet is empty');
  });

  await runner.run('invoiceDetail', async () => {
    const result = await client.getInvoice(invoiceId);
    const data = result.data as { id: number; client_reference_id?: string };
    assertTrue(Number(data.id) === invoiceId, 'invoiceDetail id mismatch');
    assertTrue(data.client_reference_id === orderId, 'client_reference_id mismatch');
  });

  await runner.run('invoiceList', async () => {
    const result = await client.getInvoiceList({
      client_reference_id: orderId,
      limit: 20,
      offset: 0,
      sort_by: 'created_at',
      sort_order: 'desc',
    });
    const data = result.data as { items?: Array<{ client_reference_id?: string }>; total?: number };
    assertTrue(Array.isArray(data.items), 'invoiceList items must be an array');
    assertTrue((data.total ?? 0) >= 1, 'invoiceList total must be >= 1');
    assertTrue(data.items?.some((item) => item.client_reference_id === orderId) === true, 'invoiceList missing created invoice');
  });

  await runner.run('invoiceSearch', async () => {
    const result = await client.searchInvoices(orderId);
    const data = result.data as Array<unknown>;
    assertTrue(Array.isArray(data) && data.length > 0, 'invoiceSearch returned empty list');
  });

  await runner.run('widgetCreate', async () => {
    const result = await client.createWidget({
      amount: 7.3,
      client_reference_id: widgetOrderId,
      currency: 'USD',
      lang: 'ru-RU',
      widget_description: 'paycrypto node client e2e',
    });
    const data = result.data as { id: number; widget_url?: string };
    assertTrue(Number(data.id) > 0, 'widget invoice id must be > 0');
    assertTrue(Boolean(data.widget_url), 'widget url is empty');
  });

  await runner.run('invoiceConfirm', async () => {
    const result = await client.confirmInvoice(invoiceId, {
      transactionId: `paycrypto-node-e2e-tx-${Date.now()}`,
    });
    const data = result.data as { status?: string };
    assertTrue(Boolean(data.status), 'invoiceConfirm failed');
  });

  await runner.run('userDetail', async () => {
    const user = await client.getUser();
    assertTrue(Boolean(user.data), 'userDetail is empty');
  });

  await runner.run('currencyRate', async () => {
    const rates = await client.getCurrencyRateList();
    const data = rates.data as Array<unknown>;
    assertTrue(Array.isArray(data) && data.length > 0, 'currencyRate list is empty');
  });

  await runner.run('currencyRateStatus', async () => {
    const status = await client.getCurrencyRateStatus('USD');
    assertTrue(Boolean(status.data), 'currencyRateStatus is empty');
  });

  await runner.run('private-key auth', async () => {
    const user = await clientPrivate.getUser();
    assertTrue(Boolean(user.data), 'private-key auth failed');
  });

  await runner.run('negative 400 duplicate client_reference_id', async () => {
    try {
      await client.createInvoice({ amount: 1.1, client_reference_id: orderId });
      throw new Error('Expected API error');
    } catch (error) {
      assertTrue(error instanceof PayCryptoApiError, 'Expected PayCryptoApiError');
      assertTrue(error.statusCode === 400, `Expected status 400, got ${error.statusCode}`);
    }
  });

  await runner.run('negative 404 invoiceDetail not found', async () => {
    try {
      await client.getInvoice(999999999);
      throw new Error('Expected API error');
    } catch (error) {
      assertTrue(error instanceof PayCryptoApiError, 'Expected PayCryptoApiError');
      assertTrue(error.statusCode === 404, `Expected status 404, got ${error.statusCode}`);
    }
  });

  await runner.run('negative 401 invalid signature', async () => {
    const badClient = new PayCryptoClient({
      publicKey,
      privateKey: 'bad_private_key',
      baseUrl,
      authMode: 'signature',
    });
    try {
      await badClient.getUser();
      throw new Error('Expected API error');
    } catch (error) {
      assertTrue(error instanceof PayCryptoApiError, 'Expected PayCryptoApiError');
      assertTrue(error.statusCode === 401, `Expected status 401, got ${error.statusCode}`);
    }
  });

  runner.finish();
}

run().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
