# PayCrypto Node.js Client

Node.js client for [paycrypto.one](https://paycrypto.one) API: signature or private-key auth, invoices, widget, user, currency rates.

- **NPM:** [paycrypto-node-client](https://www.npmjs.com/package/paycrypto-node-client)
- **GitHub:** [PayCryptoOne/paycrypto-node-client](https://github.com/PayCryptoOne/paycrypto-node-client)

## Установка

```bash
npm i paycrypto-node-client
```

## Инициализация

Ключи передаются в конструктор:

```ts
import { PayCryptoClient } from 'paycrypto-node-client';

const client = new PayCryptoClient({
  publicKey: process.env.PAYCRYPTO_PUBLIC_KEY!,
  privateKey: process.env.PAYCRYPTO_PRIVATE_KEY!,
  baseUrl: process.env.PAYCRYPTO_BASE_URL ?? 'https://api.paycrypto.one/api/v1',
  authMode: 'signature',
});
```

Переменные окружения (по желанию): `PAYCRYPTO_BASE_URL`, `PAYCRYPTO_PUBLIC_KEY`, `PAYCRYPTO_PRIVATE_KEY`.

Поддерживаются ESM (`import`) и CommonJS (`require`), в т.ч. в NestJS и Express.

## Примеры по эндпоинтам

### Создание инвойса — `POST /invoice`

```ts
const { data } = await client.createInvoice({
  amount: 10.5,
  client_reference_id: `order-${Date.now()}`,
  currency: 'USD',
  cryptocurrency: 'USDT',
  network: 'TRC-20',
  metadata: 'my-order',
});
console.log(data);
```

### Виджет инвойса — `POST /invoice/widget`

```ts
const { data } = await client.createWidget({
  amount: 7.5,
  client_reference_id: `widget-${Date.now()}`,
  currency: 'USD',
  lang: 'ru-RU',
  widget_description: 'Оплата заказа',
});
console.log(data);
```

### Получить инвойс по ID — `GET /invoice/:id`

```ts
const { data } = await client.getInvoice(invoiceId);
console.log(data);
```

### Список инвойсов — `GET /invoices`

```ts
const { data } = await client.getInvoiceList({
  status: 'paid_all',
  client_reference_id: 'order',
  created_at_from: 1700000000,
  created_at_to: 1700003600,
  sort_by: 'created_at',
  sort_order: 'desc',
  limit: 20,
  offset: 0,
});
console.log(data.items, data.total);
```

### Поиск инвойсов — `GET /invoice?query=`

```ts
const { data } = await client.searchInvoices('order-123');
console.log(data);
```

### Подтверждение оплаты инвойса — `PUT /invoice/confirm/:id`

```ts
const { data } = await client.confirmInvoice(invoiceId, {
  transactionId: 'tx-hash-or-id',
});
console.log(data);
```

### Текущий пользователь — `GET /user`

```ts
const { data } = await client.getUser();
console.log(data);
```

### Список курсов — `GET /currency-rate`

```ts
const { data } = await client.getCurrencyRateList();
console.log(data);
```

### Статус курса по валюте — `GET /currency-rate/:currency/status`

```ts
const { data } = await client.getCurrencyRateStatus('USD');
console.log(data);
```

## Тесты

```bash
npm test
npm run smoke
npm run e2e
```
