// Ye file server aur browser dono mein chalti hai (koi Node-only cheez nahi).

export const normalize = (s) => String(s || "").toLowerCase().trim();

export function domainParts(website) {
  try {
    const raw = String(website || "").trim();
    if (!raw) return { host: "", root: "" };
    const u = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
    const host = u.hostname.replace(/^www\./, "");
    return { host, root: host.split(".")[0] };
  } catch {
    return { host: "", root: "" };
  }
}

// Brand ko pehchanne ke tareeqe: naam, domain (acme.com), domain ka pehla hissa (acme)
export function brandTerms(brand, website) {
  const { host, root } = domainParts(website);
  const t = new Set();
  if (brand) t.add(String(brand).trim());
  if (host) t.add(host);
  if (root && root.length >= 4) t.add(root);
  return [...t].filter((x) => x.length >= 2);
}

const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export function termRegex(terms) {
  const sorted = [...new Set(terms.filter((t) => t && t.length >= 2))].sort((a, b) => b.length - a.length);
  if (!sorted.length) return null;
  return new RegExp(`(?<![\\p{L}\\p{N}])(${sorted.map(escapeRe).join("|")})(?![\\p{L}\\p{N}])`, "giu");
}

export function firstIndex(text, terms) {
  const re = termRegex(terms);
  if (!re) return -1;
  const m = re.exec(text || "");
  return m ? m.index : -1;
}

export function isSameBrand(name, bTerms) {
  const n = normalize(name);
  if (n.length < 2) return false;
  return bTerms.some((t) => {
    const x = normalize(t);
    if (n === x) return true;
    return x.length >= 4 && n.length >= 4 && (n.includes(x) || x.includes(n));
  });
}

export function questionScore(mentioned, position) {
  if (!mentioned) return 0;
  if (position === 1) return 100;
  if (position === 2) return 85;
  if (position === 3) return 70;
  if (position <= 5) return 55;
  return 40;
}

// Ek jawab ko check karta hai: brand aaya? kis number par? kaunse competitors aaye?
export function analyzeAnswer(answer, brand, website, otherNames = []) {
  const bTerms = brandTerms(brand, website);
  const others = otherNames.filter((n) => !isSameBrand(n, bTerms));
  const bIdx = firstIndex(answer, bTerms);
  const mentioned = bIdx >= 0;

  const competitorsNamed = [];
  let before = 0;
  for (const n of others) {
    const i = firstIndex(answer, [n]);
    if (i >= 0) {
      competitorsNamed.push(n);
      if (mentioned && i < bIdx) before++;
    }
  }
  const position = mentioned ? before + 1 : null;
  return { mentioned, position, competitorsNamed, score: questionScore(mentioned, position) };
}

export function overallScore(results) {
  if (!results.length) return 0;
  return Math.round(results.reduce((s, r) => s + r.score, 0) / results.length);
}

export function competitorTally(results) {
  const map = new Map();
  for (const r of results) {
    const seen = new Set();
    for (const name of r.competitorsNamed) {
      const k = normalize(name);
      if (seen.has(k)) continue;
      seen.add(k);
      const cur = map.get(k) || { name, count: 0 };
      cur.count++;
      map.set(k, cur);
    }
  }
  return [...map.values()].sort((a, b) => b.count - a.count).slice(0, 8);
}

// Markdown (**, #, links) hata kar saaf text banata hai
export function cleanAnswer(text) {
  return String(text || "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/__(.+?)__/g, "$1")
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^\s*[\*\-]\s+/gm, "• ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Jawab ke text ko tukron mein todta hai taake brand aur competitors highlight ho sakein
export function splitHighlights(text, bTerms, competitorNames) {
  const comps = competitorNames.filter((n) => !isSameBrand(n, bTerms));
  const re = termRegex([...bTerms, ...comps]);
  if (!re) return [{ t: text, kind: null }];
  const bset = bTerms.map(normalize);
  const out = [];
  let last = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push({ t: text.slice(last, m.index), kind: null });
    out.push({ t: m[0], kind: bset.includes(normalize(m[0])) ? "brand" : "comp" });
    last = m.index + m[0].length;
    if (m[0].length === 0) re.lastIndex++;
  }
  if (last < text.length) out.push({ t: text.slice(last), kind: null });
  return out;
}
