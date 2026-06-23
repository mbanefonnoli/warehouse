import { describe, expect, it } from 'vitest';
import { env } from './env';

describe('env', () => {
  it('parses defaults', () => {
    expect(env.PORT).toBeGreaterThan(0);
  });
});
