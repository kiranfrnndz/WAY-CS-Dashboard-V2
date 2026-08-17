/**
 * ROSTER — SINGLE SOURCE OF TRUTH FOR AGENT IDENTITY
 * ==================================================
 *
 * DESIGN CHANGE (supersedes the previous EXCLUDED_AGENTS blacklist):
 *
 *   OLD: canonical name = whatever the CCDR export happened to contain.
 *        Anyone not explicitly blacklisted counted as frontline.
 *        CCDR-side corruptions ("Ajesh (*) Varghese", "Javed Humayun Khan")
 *        had no path to correction — aliases only flowed CRM -> CCDR.
 *
 *   NEW: canonical name = the ROSTER name below.
 *        BOTH CCDR and CRM variants resolve INTO the roster name.
 *        Anyone not on the roster is excluded and surfaced as "unrostered"
 *        rather than silently entering the KPIs.
 *
 * Confirmed by CS Operations, Aug 2026.
 *
 * queueScope:
 *   'English' — the 34 CS voice/email agents. These form the team baseline.
 *   'Spanish' — 9 agents answering Spanish-queue calls only. Rostered so they
 *               get individual pages, but held OUT of team aggregates and peer
 *               benchmarking so the English baseline stays clean.
 */

export type QueueScope = 'English' | 'Spanish';

export interface RosterEntry {
  canonical: string;
  queueScope: QueueScope;
}

// ── The roster ────────────────────────────────────────────────

/** 34 English voice/email agents — the team baseline. */
export const ENGLISH_ROSTER: string[] = [
  'Rufus H Johny',
  'Azhar Abdul Kalam',
  'Nikhil Pradeep',
  'Arya J S',
  'Amal Krishna A',
  'Akshaya G S',
  'Nimi M Nair',
  'Ajesh Mathew Varghese',
  'Abhiraj Erenzath',
  'Abhishek Kumar S',
  'Devika S',
  'Sumith B I',
  'Karnan Jayaprakash',
  'Swathy Peethambaran',
  'Aswin AV',
  'Irshad S',
  'Haleema Raheem',
  'Abhija Zakkir',
  'Gokul Sarath',
  'Abin Eappen',
  'Abhilash Lean',
  'Dravya SP Naga',
  'Irfana S Ibrahim',
  'John Chacko',
  'Ananthu J R',
  'Sufaila Abdul Fathah',
  'Ajeet A',
  'Jishnu Praveen',
  'Hizana Noushad',
  'Pooja Jose',
  'Abin Ferry',
  'Abhinav S B',
  'Ajesh Varghese',
  'Jonathan Anil',
];

/** 9 Spanish-queue agents — rostered, but excluded from team aggregates. */
export const SPANISH_ROSTER: string[] = [
  'Uppara Likhith',
  'Sattar Alam',
  'MD Ali',
  'Javed Khan',
  'Siddarth Raj',
  'Pawan Kumar',
  'Ansar Alli',
  'Mohamed Jowhar',
  'Naushad Ahmad',
];

// ── Alias map: variant -> roster canonical ────────────────────

/**
 * Explicit aliases only. Keys are matched on a normalised form
 * (lowercased, punctuation stripped, whitespace collapsed), so most
 * cosmetic variants resolve automatically and do NOT need an entry here:
 *
 *   'Ajesh (*) Varghese'  -> ajesh varghese   -> Ajesh Varghese   (auto)
 *   'Aswin A.V'           -> aswin av         -> Aswin AV         (auto)
 *   'NAUSHAD AHMAD'       -> naushad ahmad    -> Naushad Ahmad    (auto)
 *   'shiju  salam'        -> shiju salam                          (auto)
 *
 * Entries below are the cases where the strings genuinely differ.
 *
 * NOTE ON FIRST-NAME ALIASES: these are deliberately explicit and never
 * inferred. A bare first name is only resolved if it appears here. This is
 * what prevents a bare "Jonathan" from being credited to Jonathan Anil when
 * it may belong to Jonathan Brown (not CS).
 */
export const ALIASES: Record<string, string> = {
  // ── CCDR-side variants (previously unfixable) ──
  'javed humayun khan': 'Javed Khan',
  'ajesh varghese s': 'Ajesh Varghese',

  // ── Spacing variants on initials ──
  'ananthu jr': 'Ananthu J R',
  'arya js': 'Arya J S',
  'sumith bi': 'Sumith B I',
  'abhinav sb': 'Abhinav S B',
  'abhishek kumars': 'Abhishek Kumar S',
  'akshaya gs': 'Akshaya G S',
  'dravya sp naga': 'Dravya SP Naga',
  'dravya s p naga': 'Dravya SP Naga',
  'irfana s ibrahim': 'Irfana S Ibrahim',

  // ── Truncated / reordered ──
  'rufus johny': 'Rufus H Johny',
  'b i sumith': 'Sumith B I',
  'u likhith': 'Uppara Likhith',
  'likhith uppara': 'Uppara Likhith',
  'amal krishna': 'Amal Krishna A',
  'akshaya g': 'Akshaya G S',
  'ajesh mathew': 'Ajesh Mathew Varghese',
  'sufaila abdul': 'Sufaila Abdul Fathah',
  'sufaila fathah': 'Sufaila Abdul Fathah',
  'azhar kalam': 'Azhar Abdul Kalam',
  'azhar abdulkalam': 'Azhar Abdul Kalam',

  // ── MD Ali (Spanish) — multiple recorded forms ──
  'mohammad ali': 'MD Ali',
  'mohammad haider ali': 'MD Ali',
  'md ali': 'MD Ali',
  'ali mohammad': 'MD Ali',

  // ── Confirmed first-name aliases (explicit, never inferred) ──
  'abhi': 'Abhilash Lean',
  'gokul': 'Gokul Sarath',
  'haleema': 'Haleema Raheem',
  'nimi': 'Nimi M Nair',
  'ananthu': 'Ananthu J R',
  'karnan': 'Karnan Jayaprakash',
  'swathy': 'Swathy Peethambaran',
  'hizana': 'Hizana Noushad',
  'irfana': 'Irfana S Ibrahim',
  'sufaila': 'Sufaila Abdul Fathah',
  'dravya': 'Dravya SP Naga',
  'abhija': 'Abhija Zakkir',
  'jishnu': 'Jishnu Praveen',
  'devika': 'Devika S',
  'rufus': 'Rufus H Johny',
};

/**
 * Names confirmed NOT to be CS team members. Functionally redundant under an
 * allowlist, but retained so the unrostered panel can separate "known, already
 * ruled out" from "unknown, needs a decision".
 */
export const KNOWN_NON_CS = new Set<string>([
  // Confirmed non-CS from dashboard review, Aug 2026
  'Esther Cleetus', 'Fazal Sherrif', 'Rahul Vinod', 'Shijith', 'Jonathan Brown',
  // Team Leads
  'Shiju Salam', 'Vishnu V', 'Bijoy Kiran', 'Rashmika', 'Rashmika Santhosh',
  'Vishnu B S', 'Surya Suresh', 'Ansu Varghese', 'Jaison Nelson',
  // Leadership
  'Joyson Fernandez', 'Anju Mareeta Lean',
  // Reviews
  'Tharun Sunil Kumar', 'Jijo Papachan', 'Muvithra M', 'Blessy Hillary', 'Abhilash Augustin',
  // Disputes
  'Gowri S', 'Greeshma R S', 'Sreela R', 'Subin M S',
  // QC
  'Henna Najim', 'Vidya Vijayan', 'Reshma Sunil', 'Rijisha S Kumar',
  // L2 / Reporting / SME
  'Jithin S', 'Vishnu M S', 'Lalita Lama', 'Althaf Z',
  // Removed from team, Aug 2026
  'Najna Nizar', 'Meenakshy RS', 'Catherine Benjamin',
  'Akshay Vinod Nair', 'Bibin Selvan', 'Shinu Varghese',
  // AI agent
  'Ai-Decagon Ai-Decagon',
  // Cross-sell / WAY+ / non-India
  'Teena GM', 'Aathira Ashok', 'Al-Ameen AS', 'Samuel Chacko',
  'Mike Sudarsanan', 'Shyny Selvia', 'Nivesh R', 'Daisy Mathew',
  'Goutham S Nair', 'Sreelakshmi S', 'Andrea Ruiz', 'Nicholas Marquez',
  'Alexandra Morales', 'Angeles Soledad', 'Brianna Lundy', 'Daniel Montoya',
  'Gabriella Lacayo', 'Karen Hopkins', 'Karolyne Perez', 'Mauricio Leon',
  'Oscar Perez', 'Sarah Gonzalez', 'Selina Benavides', 'Valentina Torres',
]);

// ── Resolution ────────────────────────────────────────────────

/**
 * Normalise a name for matching:
 *   lowercase, strip (), [], {}, *, ., ,, -, collapse whitespace.
 * This is what makes "Ajesh (*) Varghese" and "Aswin A.V" resolve without
 * needing an explicit alias entry.
 */
export function normaliseKey(raw: string): string {
  return (raw || '')
    .toLowerCase()
    .replace(/[()[\]{}*.,\-_'"]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Compact key: normalised form with ALL spaces removed.
 *   "aswin a v"  -> "aswinav"
 *   "aswin av"   -> "aswinav"
 *   "arya j s"   -> "aryajs"
 *   "ananthu jr" -> "ananthujr"
 *
 * This makes initial-spacing variants resolve generically instead of needing an
 * alias each. It is only used as a FALLBACK, and only for keys that are
 * unambiguous across the whole roster — any compact key that two different
 * roster members share is discarded rather than guessed.
 */
function compactKey(raw: string): string {
  return normaliseKey(raw).replace(/\s+/g, '');
}

/** Lookup built once: normalised key -> { canonical, queueScope }. */
const LOOKUP: Map<string, RosterEntry> = (() => {
  const m = new Map<string, RosterEntry>();

  for (const name of ENGLISH_ROSTER) {
    m.set(normaliseKey(name), { canonical: name, queueScope: 'English' });
  }
  for (const name of SPANISH_ROSTER) {
    m.set(normaliseKey(name), { canonical: name, queueScope: 'Spanish' });
  }

  // Aliases resolve to a roster entry; skip any alias whose target is not
  // on the roster (guards against typos in the alias map itself).
  for (const [variant, target] of Object.entries(ALIASES)) {
    const entry = m.get(normaliseKey(target));
    if (!entry) {
      // eslint-disable-next-line no-console
      console.warn(`[roster] alias "${variant}" targets "${target}" which is not on the roster — ignored`);
      continue;
    }
    const key = normaliseKey(variant);
    if (!m.has(key)) m.set(key, entry);
  }

  return m;
})();

/**
 * Resolve any raw agent name (from CCDR or CRM) to its roster entry.
 * Returns null when the name is not on the roster.
 */
/**
 * Compact fallback lookup. Built from every key already in LOOKUP, but any
 * compact key claimed by two different canonical names is REMOVED, so an
 * ambiguous form resolves to nothing rather than to an arbitrary winner.
 */
const COMPACT: Map<string, RosterEntry> = (() => {
  const m = new Map<string, RosterEntry>();
  const ambiguous = new Set<string>();

  for (const [key, entry] of LOOKUP) {
    const ck = key.replace(/\s+/g, '');
    if (!ck) continue;
    const existing = m.get(ck);
    if (existing && existing.canonical !== entry.canonical) {
      ambiguous.add(ck);
      continue;
    }
    if (!existing) m.set(ck, entry);
  }

  for (const ck of ambiguous) {
    m.delete(ck);
    // eslint-disable-next-line no-console
    console.warn(`[roster] compact key "${ck}" is ambiguous across roster names — no fallback registered`);
  }

  return m;
})();

export function resolveAgent(raw: string): RosterEntry | null {
  if (!raw) return null;

  // 1. Exact normalised match (roster name or explicit alias)
  const exact = LOOKUP.get(normaliseKey(raw));
  if (exact) return exact;

  // 2. Compact fallback — handles initial spacing ("Aswin A.V" vs "Aswin AV")
  return COMPACT.get(compactKey(raw)) ?? null;
}

/** Canonical roster name, or null if unrostered. */
export function resolveCanonical(raw: string): string | null {
  return resolveAgent(raw)?.canonical ?? null;
}

/** True when the name resolves to a roster member (English or Spanish). */
export function isRostered(raw: string): boolean {
  return resolveAgent(raw) !== null;
}

/** Queue scope for a raw or canonical name; null if unrostered. */
export function queueScopeOf(raw: string): QueueScope | null {
  return resolveAgent(raw)?.queueScope ?? null;
}

/** True when the name is a known non-CS person (already ruled out). */
export function isKnownNonCS(raw: string): boolean {
  const key = normaliseKey(raw);
  for (const n of KNOWN_NON_CS) {
    if (normaliseKey(n) === key) return true;
  }
  return false;
}

export const ROSTER_SIZE = {
  english: ENGLISH_ROSTER.length,
  spanish: SPANISH_ROSTER.length,
  total: ENGLISH_ROSTER.length + SPANISH_ROSTER.length,
};
