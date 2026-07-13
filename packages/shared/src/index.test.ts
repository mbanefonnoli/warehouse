import { describe, expect, it } from 'vitest';
import { Customer, matchName, ping, sanitizeWhatsAppPaste } from './index';

describe('ping', () => {
  it('returns pong', () => {
    expect(ping()).toBe('pong');
  });
});

// Fixture data
const dolcisima: Customer = { id: 'd1', name: 'Dolcisima', addressLine1: 'Str. Florilor 1', city: 'Cluj' };
const noyBusiness: Customer = { id: 'n1', name: 'Noy Business', addressLine1: 'Bd. Unirii 5', city: 'Bucharest' };
const tacoSalis1: Customer = { id: 'ts1', name: 'Taco Salis', addressLine1: 'Calea Victoriei 10', city: 'Bucharest' };
const tacoSalis2: Customer = { id: 'ts2', name: 'Taco Salis', addressLine1: 'Str. Mihai Eminescu 22', city: 'Cluj' };
const evemma1: Customer = { id: 'ev1', name: 'Evemma', addressLine1: 'Piata Romana 3', city: 'Bucharest' };
const evemma2: Customer = { id: 'ev2', name: 'Evemma', addressLine1: 'Calea Floreasca 7', city: 'Bucharest' };

const FIXTURES: Customer[] = [dolcisima, noyBusiness, tacoSalis1, tacoSalis2, evemma1, evemma2];

describe('matchName — single-location exact match → green', () => {
  it('Dolcisima exact match → green', () => {
    const [r] = matchName(['Dolcisima'], FIXTURES);
    expect(r.status).toBe('green');
    expect(r.match?.id).toBe('d1');
    expect(r.ambiguityReason).toBeUndefined();
  });

  it('Noy Business exact match → green', () => {
    const [r] = matchName(['Noy Business'], FIXTURES);
    expect(r.status).toBe('green');
    expect(r.match?.id).toBe('n1');
    expect(r.ambiguityReason).toBeUndefined();
  });
});

describe('matchName — same company, multiple branches → yellow multi-location', () => {
  it('Taco Salis → yellow, ambiguityReason multi-location, match is null, all branches in alternatives', () => {
    const [r] = matchName(['Taco Salis'], FIXTURES);
    expect(r.status).toBe('yellow');
    expect(r.ambiguityReason).toBe('multi-location');
    expect(r.match).toBeNull();
    expect(r.alternatives.map((a) => a.id).sort()).toEqual(['ts1', 'ts2'].sort());
  });

  it('Evemma → yellow, ambiguityReason multi-location, both branches listed', () => {
    const [r] = matchName(['Evemma'], FIXTURES);
    expect(r.status).toBe('yellow');
    expect(r.ambiguityReason).toBe('multi-location');
    expect(r.match).toBeNull();
    expect(r.alternatives.map((a) => a.id).sort()).toEqual(['ev1', 'ev2'].sort());
  });
});

describe('matchName — no match → red', () => {
  it('Bosfor → red', () => {
    const [r] = matchName(['Bosfor'], FIXTURES);
    expect(r.status).toBe('red');
    expect(r.match).toBeNull();
  });
});

describe('matchName — e2e fixture check', () => {
  it('tiers: Taco Salis→yellow, Evemma→yellow, Dolcisima→green, Noy Business→green, Bosfor→red', () => {
    const inputs = ['Taco Salis', 'Evemma', 'Dolcisima', 'Noy Business', 'Bosfor'];
    const results = matchName(inputs, FIXTURES);
    expect(results.map((r) => r.status)).toEqual(['yellow', 'yellow', 'green', 'green', 'red']);
  });
});

describe('sanitizeWhatsAppPaste', () => {
  it('strips timestamps and deduplicates', () => {
    const raw = '14:32 Taco Salis\nTaco Salis\n[09:15 AM] Evemma';
    const result = sanitizeWhatsAppPaste(raw);
    expect(result).toContain('Taco Salis');
    expect(result).toContain('Evemma');
    expect(result.filter((r) => r === 'Taco Salis').length).toBe(1);
  });

  it('strips phone numbers', () => {
    const result = sanitizeWhatsAppPaste('+40 721 123 456 Dolcisima');
    expect(result).toContain('Dolcisima');
    expect(result.some((r) => r.includes('+40'))).toBe(false);
  });
});

describe('matchName — options', () => {
  it('stripSuffixes folds SRL from company name', () => {
    const list: Customer[] = [{ id: 'x1', name: 'Acme SRL', city: 'Cluj' }];
    const [r] = matchName(['Acme'], list, { stripSuffixes: true });
    expect(r.status).toBe('green');
  });

  it('stripSuffixes: false — SRL kept, bare name no longer matches exactly', () => {
    const list: Customer[] = [{ id: 'x1', name: 'Acme SRL', city: 'Cluj' }];
    const [withStrip] = matchName(['Acme'], list, { stripSuffixes: true });
    const [noStrip] = matchName(['Acme'], list, { stripSuffixes: false });
    expect(withStrip.status).toBe('green');
    // Without stripping, "acme" vs "acme srl" is more divergent — confidence lower
    expect(noStrip.confidence).toBeLessThan(withStrip.confidence);
  });

  it('strict sensitivity raises green threshold — fuzzy match is never auto-confirmed', () => {
    const list: Customer[] = [{ id: 'y1', name: 'Noy Business Center', city: 'Bucharest' }];
    const [loose] = matchName(['Noy Biz'], list, { sensitivity: 'loose' });
    const [strict] = matchName(['Noy Biz'], list, { sensitivity: 'strict' });
    // A real fuzzy match is reachable at loose sensitivity
    expect(loose.status).not.toBe('red');
    // With a 0.95 green threshold, "Noy Biz" will never auto-confirm as green
    expect(strict.status).not.toBe('green');
  });
});
