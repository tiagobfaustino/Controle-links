// Tags são armazenadas como string separada por vírgulas no campo
// `demandas.tags`. Helpers garantem normalização consistente: lowercase,
// trim, sem duplicatas, sem vazios.

export function parseTags(raw?: unknown): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return parseTags(raw.join(","));
  if (typeof raw !== "string") return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const t of raw.split(",")) {
    const v = t.trim().toLowerCase();
    if (!v || seen.has(v)) continue;
    seen.add(v);
    out.push(v);
  }
  return out;
}

export function serializeTags(tags: string[]): string {
  return tags
    .map((t) => t.trim().toLowerCase())
    .filter((t, i, arr) => t && arr.indexOf(t) === i)
    .join(",");
}

export function collectAllTags(items: Array<{ tags?: unknown }>): string[] {
  const set = new Set<string>();
  for (const it of items) {
    for (const t of parseTags(it.tags)) set.add(t);
  }
  return Array.from(set).sort();
}
