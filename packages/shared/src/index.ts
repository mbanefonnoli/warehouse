import Fuse from 'fuse.js';

export interface Customer {
  id: string;
  name: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  country?: string;
  notes?: string;
  lat?: number;
  lng?: number;
}

export interface MatchResult {
  inputName: string;
  match: Customer | null;
  confidence: number;
  status: 'green' | 'yellow' | 'red';
  alternatives: Customer[];
  ambiguityReason?: 'multi-location' | 'fuzzy';
}

export interface MatchOptions {
  sensitivity?: 'strict' | 'normal' | 'loose';
  stripSuffixes?: boolean;
}

const SUFFIX_RE = /\b(s\.?r\.?l\.?|s\.?a\.?|s\.?c\.?|p\.?f\.?a\.?)\b\.?/gi;

const THRESHOLDS = {
  strict: { green: 0.95, yellow: 0.65 },
  normal: { green: 0.70, yellow: 0.40 },
  loose:  { green: 0.55, yellow: 0.25 },
};

export function normalize(str: string, stripSuffixes = true): string {
  let s = str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[ăâ]/g, 'a')
    .replace(/î/g, 'i')
    .replace(/[şșŞȘ]/g, 's')
    .replace(/[ţțŢȚ]/g, 't');
  if (stripSuffixes) s = s.replace(SUFFIX_RE, '');
  return s.replace(/\s+/g, ' ').trim();
}

export function matchName(
  inputNames: string[],
  customers: Customer[],
  options: MatchOptions = {},
): MatchResult[] {
  const { sensitivity = 'normal', stripSuffixes = true } = options;
  const { green: greenThreshold, yellow: yellowThreshold } = THRESHOLDS[sensitivity];

  const normalizedCustomers = customers.map((c) => ({
    ...c,
    _norm: normalize(c.name, stripSuffixes),
  }));

  const fuse = new Fuse(normalizedCustomers, {
    threshold: 1 - yellowThreshold,
    keys: ['_norm'],
    includeScore: true,
    shouldSort: true,
    minMatchCharLength: 2,
  });

  return inputNames.map((rawName): MatchResult => {
    const query = normalize(rawName, stripSuffixes);
    const results = fuse.search(query, { limit: 10 });

    if (results.length === 0) {
      return { inputName: rawName, match: null, confidence: 0, status: 'red', alternatives: [] };
    }

    const best = results[0];
    const confidence = 1 - (best.score ?? 1);
    const bestNorm = best.item._norm;

    // Collect every customer that maps to the same normalized company name.
    const allSameCompany = customers.filter(
      (c) => normalize(c.name, stripSuffixes) === bestNorm,
    );

    if (allSameCompany.length > 1) {
      return {
        inputName: rawName,
        match: null,
        confidence,
        status: 'yellow',
        alternatives: allSameCompany,
        ambiguityReason: 'multi-location',
      };
    }

    const originalBest = customers.find((c) => c.id === best.item.id)!;

    if (confidence >= greenThreshold) {
      return {
        inputName: rawName,
        match: originalBest,
        confidence,
        status: 'green',
        alternatives: [],
      };
    }

    const alternatives = results
      .slice(1)
      .map((r) => customers.find((c) => c.id === r.item.id)!)
      .filter(Boolean);

    return {
      inputName: rawName,
      match: originalBest,
      confidence,
      status: 'yellow',
      alternatives,
      ambiguityReason: 'fuzzy',
    };
  });
}

export function sanitizeWhatsAppPaste(raw: string): string[] {
  const lines = raw
    .split(/[\n,]+/)
    .map((line) =>
      line
        .replace(/\[?\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?\]?/gi, '')
        .replace(/\+?\d[\d\s\-(). ]{7,}/g, '')
        .replace(/[-–—]\s*\d+\s*(mesaj|message|msg)e?s?/gi, '')
        .replace(/^[\s\-–—•*>]+/, '')
        .trim(),
    )
    .filter((line) => line.length > 1);
  return [...new Set(lines)];
}

export function ping(): string {
  return 'pong';
}
