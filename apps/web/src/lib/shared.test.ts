import { describe, expect, it } from 'vitest';
import { ping } from '@spoke/shared';

describe('@spoke/shared wiring', () => {
  it('is resolvable from apps/web', () => {
    expect(ping()).toBe('pong');
  });
});
