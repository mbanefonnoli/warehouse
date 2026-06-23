import Fuse from 'fuse.js';
import { Customer, MatchResult } from '@/types';

function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ăâ]/g, 'a')   // ă â
    .replace(/î/g, 'i')            // î
    .replace(/[şșŞȘ]/g, 's')  // ş ș Ş Ș
    .replace(/[ţțŢȚ]/g, 't')  // ţ ț Ţ Ț
    .replace(/\s+/g, ' ')
    .trim();
}

export function matchNames(inputNames: string[], customers: Customer[]): MatchResult[] {
  const normalizedCustomers = customers.map((c) => ({ ...c, _norm: normalize(c.name) }));

  const fuse = new Fuse(normalizedCustomers, {
    threshold: 0.45,
    keys: ['_norm'],
    includeScore: true,
    shouldSort: true,
    minMatchCharLength: 2,
  });

  return inputNames.map((rawName): MatchResult => {
    const query = normalize(rawName);
    const results = fuse.search(query, { limit: 5 });

    if (results.length === 0) {
      return { inputName: rawName, match: null, confidence: 0, status: 'red', alternatives: [] };
    }

    const best = results[0];
    const confidence = 1 - (best.score ?? 1);
    const status: 'green' | 'yellow' | 'red' =
      confidence >= 0.7 ? 'green' : confidence >= 0.4 ? 'yellow' : 'red';

    const originalBest = customers.find((c) => c.id === best.item.id)!;
    const alternatives = results
      .slice(1)
      .map((r) => customers.find((c) => c.id === r.item.id)!)
      .filter(Boolean);

    return { inputName: rawName, match: originalBest, confidence, status, alternatives };
  });
}
