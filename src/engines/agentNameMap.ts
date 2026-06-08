/**
 * AGENT NAME MAP — hardcoded, verified against real file samples
 *
 * Sources:
 *   CCDR: "LastName, FirstName" → normalised to "FirstName LastName"
 *   CRM:  first-name-only, partial, abbreviated, or misspelled variants
 *
 * All mappings confirmed by CS Operations Manager.
 * Key: CRM name variant → canonical name (CCDR normalised form)
 * The canonical name is always the CCDR FirstName LastName form.
 */

export const CRM_TO_CANONICAL: Record<string, string> = {
  // ── Exact / near-exact (case variants handled separately) ──
  'Ajesh varghese':          'Ajesh Varghese',
  'NAUSHAD AHMAD':           'Naushad Ahmad','Aswin A.V':'Aswin AV',

  // ── CRM first-name-only ──
  'Gokul':                   'Gokul Sarath',
  'Haleema':                 'Haleema Raheem',
  'Nimi':                    'Nimi M Nair',
  'Ananthu':                 'Ananthu J R',
  'Reshma':                  'Reshma Sunil',       // QC — excluded, but mapped for completeness
  'Gowri':                   'Gowri S',            // Disputes — excluded

  // ── CRM abbreviated / truncated ──
  'Akshay Vinod':            'Akshay Vinod Nair',
  'Amal Krishna A':          'Amal Krishna',
  'Arya J S':                'Arya JS',
  'Rufus Johny':             'Rufus H Johny',
  'U Likhith':               'Uppara Likhith',
  'B I Sumith':              'Sumith B I',
  'Subin MS':                'Subin M S',          // Disputes — excluded
  'Greeshma RS':             'Greeshma R S',       // Disputes — excluded
  'Vishnu BS':               'Vishnu B S',         // TL — excluded
  'Vishnu MS':               'Vishnu M S',         // Reporting — excluded
  'surya suresh':            'Surya Suresh',       // TL — excluded

  // ── CRM middle name present ──
  'Mohammad Haider Ali':     'Mohammad Ali',

  // ── CRM spelling variant ──
  'Sarah Gonzales':          'Sarah Gonzalez',

  // ── Confirmed alias: "Abhi" = Abhilash Lean (email: abhilash.lean@way.com) ──
  'Abhi':                    'Abhilash Lean',

  // ── Confirmed: Sreelaraghavan = Sreela R (Disputes — excluded) ──
  'Sreelaraghavan':          'Sreela R',

  // ── Teena GM = Ops executive — excluded ──
  'Teena GM':                '_EXCLUDE_',
};

/**
 * Agents confirmed NOT from the WAY CS India team.
 * Present in CCDR due to routing/system entries — excluded from all KPIs.
 */
export const NON_TEAM_CCDR_AGENTS = new Set([
  'Aathira Ashok',
  'Al-Ameen AS',
  'Samuel Chacko',
  'Mike Sudarsanan',
  'Shyny Selvia',
  'Nivesh R',
  'Daisy Mathew',
  'Goutham S Nair',
]);

/**
 * Sreelakshmi S (CCDR) and Sreelaraghavan (CRM) are two different people.
 * Sreelaraghavan = Sreela R = Disputes (excluded).
 * Sreelakshmi S — not confirmed as a team member; treat as exclude pending confirmation.
 */
export const CCDR_TO_CANONICAL: Record<string, string> = {
  // No flips needed — CCDR names are already normalised by the parser.
  // This map handles edge cases where CCDR normalisation produces a non-standard form.
  'Arya JS':   'Arya JS',   // keep as-is; CRM maps to this canonical
};

/**
 * Resolve a CRM agent name to its canonical form.
 * Returns null if the agent should be excluded entirely.
 */
export function resolveCRMName(crmName: string): string | null {
  if (!crmName) return null;
  const trimmed = crmName.trim();

  // Direct map lookup (case-insensitive key check)
  const direct = CRM_TO_CANONICAL[trimmed];
  if (direct === '_EXCLUDE_') return null;
  if (direct) return direct;

  // Case-insensitive fallback
  const lower = trimmed.toLowerCase();
  for (const [k, v] of Object.entries(CRM_TO_CANONICAL)) {
    if (k.toLowerCase() === lower) {
      return v === '_EXCLUDE_' ? null : v;
    }
  }

  return trimmed; // unchanged
}

/**
 * Check if a normalised agent name (CCDR form) belongs to the WAY CS team.
 * Returns false for non-team members confirmed by the CS Operations Manager.
 */
export function isTeamMember(normalisedName: string): boolean {
  return !NON_TEAM_CCDR_AGENTS.has(normalisedName.trim());
}

/**
 * Interaction types that are restricted to specific non-frontline roles.
 * If a frontline agent logs any of these, it is a data entry error.
 *
 * Rule: only Team Leads and SMEs are permitted to log "TL Review".
 * Any frontline agent row with these types is flagged in Tab 4 QC & Compliance.
 */
export const FRONTLINE_RESTRICTED_TYPES = new Set([
  'TL Review',
]);

/**
 * Returns CRM rows where a frontline agent has used a restricted interaction type.
 * These rows are excluded from all KPI calculations AND surfaced as coaching flags.
 *
 * Works for ANY frontline agent — not hardcoded to individuals.
 */
export function getWrongInteractionRows(
  crmRows: import('../types').CRMRow[],
  canonicalName: string
): import('../types').CRMRow[] {
  return crmRows.filter(
    r => r.canonicalName === canonicalName &&
         FRONTLINE_RESTRICTED_TYPES.has(r.interactionType)
  );
}
