const WORD_SIGNALS: { locale: string; pattern: RegExp }[] = [
  {
    locale: "es",
    pattern:
      /\b(el|la|los|las|una|unos|unas|del|que|por|para|con|m[aá]s|tambi[eé]n|despu[eé]s|actualizaci[oó]n|arreglo|correcci[oó]n|a[nñ]ade|mejoras?|versi[oó]n|funci[oó]n|cuando|donde|este|esta|estos|estas|pero|porque|seg[uú]n|desde|hasta|sobre|nuevo|nueva|cambios?|solicitud)\b/gi,
  },
  {
    locale: "pt",
    pattern:
      /\b(uma|n[aã]o|voc[eê]|est[aá]|s[aã]o|mais|tamb[eé]m|atualiza[cç][aã]o|corre[cç][aã]o|fun[cç][aã]o|quando|onde|este|esta|mas|porque|depois|vers[aã]o|para|com|novo|nova)\b/gi,
  },
  {
    locale: "fr",
    pattern:
      /\b(les|une|des|pour|avec|dans|cette|aussi|apr[eè]s|mise|correction|fonction|quand|mais|parce|nouveau|nouvelle|version)\b/gi,
  },
  {
    locale: "de",
    pattern:
      /\b(und|der|die|das|ein|eine|f[uü]r|mit|nicht|auch|nach|aktualisierung|fehlerbehebung|wenn|aber|weil|neue|neuer|version)\b/gi,
  },
  {
    locale: "en",
    pattern:
      /\b(the|and|for|with|this|that|from|into|update|fix|add|added|fixed|release|feature|when|where|but|because|after|before|improve|improved)\b/gi,
  },
];

function addScore(scores: Map<string, number>, locale: string, amount: number) {
  scores.set(locale, (scores.get(locale) ?? 0) + amount);
}

export function detectContentLocale(texts: string[]): string {
  const sample = texts
    .filter((text) => text.trim().length > 0)
    .join("\n")
    .slice(0, 8_000);
  if (!sample.trim()) {
    return "en";
  }

  const scores = new Map<string, number>();
  if (/[ñ¿¡]/i.test(sample)) {
    addScore(scores, "es", 4);
  }
  if (/[ãõ]/i.test(sample)) {
    addScore(scores, "pt", 4);
  }
  if (/[ßäö]/i.test(sample)) {
    addScore(scores, "de", 3);
  }

  for (const signal of WORD_SIGNALS) {
    const matches = sample.match(signal.pattern);
    if (matches) {
      addScore(scores, signal.locale, matches.length);
    }
  }

  let best = "en";
  let bestScore = 0;
  for (const [locale, score] of scores) {
    if (score > bestScore) {
      best = locale;
      bestScore = score;
    }
  }
  return bestScore >= 2 ? best : "en";
}
