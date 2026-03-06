import { describe, expect, it } from 'vitest';
import { buildSignedPayload, computeSignature } from '../src/signature.js';

describe('signature', () => {
  it('builds sorted payload with api_key', () => {
    const payload = buildSignedPayload(
      {
        metadata: 'test value',
        amount: 10.5,
        client_reference_id: 'ord-1',
      },
      'pk_live_test',
    );
    expect(payload).toBe(
      'amount=10.5&api_key=pk_live_test&client_reference_id=ord-1&metadata=test+value',
    );
  });

  it('computes deterministic sha256 hmac', () => {
    const signature = computeSignature('amount=10&api_key=pk_live_test', 'sk_live_test');
    expect(signature).toBe('b4f0c2d1d2e192063661ea645c7fd5526872ed7f90faf197952099969c81fe25');
  });
});
