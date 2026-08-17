/**
 * AGENT NAME MAP — now a thin compatibility layer over roster.ts
 *
 * SUPERSEDED: this file previously held a CRM -> CCDR alias map and treated the
 * CCDR name as canonical by definition. That design had no way to correct a
 * corrupted CCDR-side name, which caused split agent cards
 * ("Ajesh (*) Varghese" vs "Ajesh Varghese", "Javed Humayun Khan" vs "Javed Khan").
 *
 * Identity now lives in roster.ts, where the ROSTER name is canonical and both
 * CCDR and CRM variants resolve into it. Add new aliases to roster.ts ALIASES.
 */

import { resolveCanonical, isRostered, isKnownNonCS } from './roster';

export { ALIASES as CRM_TO_CANONICAL, KNOWN_NON_CS as NON_TEAM_CCDR_AGENTS } from './roster';

/**
 * Resolve a CRM agent name to its canonical roster name.
 * Returns null when the agent is not on the roster (excluded).
 */
export function resolveCRMName(crmName: string): string | null {
  return resolveCanonical(crmName);
}

/**
 * Resolve a CCDR agent name to its canonical roster name.
 * Returns null when the agent is not on the roster (excluded).
 * NEW: CCDR names are no longer assumed canonical.
 */
export function resolveCCDRName(ccdrName: string): string | null {
  return resolveCanonical(ccdrName);
}

/** True when the name belongs to the CS roster. */
export function isTeamMember(name: string): boolean {
  return isRostered(name);
}

/** True when the name is a known non-CS person. */
export { isKnownNonCS };

/**
 * Interaction types restricted to non-frontline roles.
 * A frontline agent logging one of these is a data entry error, surfaced in Tab 4.
 */
export const FRONTLINE_RESTRICTED_TYPES = new Set([
  'TL Review',
]);

/** CRM rows where a frontline agent used a restricted interaction type. */
export function getWrongInteractionRows(
  crmRows: import('../types').CRMRow[],
  canonicalName: string
): import('../types').CRMRow[] {
  return crmRows.filter(
    r => r.canonicalName === canonicalName &&
         FRONTLINE_RESTRICTED_TYPES.has(r.interactionType)
  );
}
