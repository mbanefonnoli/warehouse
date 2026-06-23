export function sanitizeWhatsAppPaste(raw: string): string[] {
  const lines = raw
    .split(/[\n,]+/)
    .map((line) =>
      line
        .replace(/\[?\d{1,2}:\d{2}(?::\d{2})?(?:\s?[AP]M)?\]?/gi, '')
        .replace(/\+?\d[\d\s\-(). ]{7,}/g, '')
        .replace(/[-–—]\s*\d+\s*(mesaj|message|msg)e?s?/gi, '')
        .replace(/^[\s\-–—•*>]+/, '')
        .trim()
    )
    .filter((line) => line.length > 1);

  return [...new Set(lines)];
}
