/**
 * CRM MATCHING ENGINE
 *
 * Now that CRM rows carry a `canonicalName` (resolved at parse time via agentNameMap),
 * agent matching is exact string comparison — no more fuzzy token overlap needed.
 *
 * Match priority:
 *   P1: callerPhone + canonicalName + date  → pick closest by ticket timestamp
 *   P2: callerPhone + date                  → pick closest by ticket timestamp
 *   P3: canonicalName + date                → pick closest by ticket timestamp
 *
 * Phone normalisation:
 *   CCDR callerNumber: 10-digit string from parser
 *   CRM phoneNumber:   10-digit string from parser (normalised from "+1 XXXXXXXXXX" etc.)
 *
 * Timestamp note:
 *   CRM uses Ticket_created_date (real timestamp).
 *   Interaction created date is always midnight — ignored per domain rules.
 */

import type { CCDRRow, CRMRow, EnrichedCall } from '../types';

function timeToSec(t: string): number {
  if (!t) return 0;
  const p = t.split(':').map(Number);
  return (p[0] || 0) * 3600 + (p[1] || 0) * 60 + (p[2] || 0);
}

function datePart(d: string): string {
  return (d || '').substring(0, 10);
}

function closestByTime(rows: CRMRow[], callTimeSec: number): CRMRow {
  return rows.reduce((best, r) => {
    const diff     = Math.abs(timeToSec(r.time) - callTimeSec);
    const bestDiff = Math.abs(timeToSec(best.time) - callTimeSec);
    return diff < bestDiff ? r : best;
  });
}

// ── Index ─────────────────────────────────────────────────────

interface CRMIndex {
  /** phone + canonicalName + date → rows */
  byPhoneAgentDate: Map<string, CRMRow[]>;
  /** phone + date → rows */
  byPhoneDate:      Map<string, CRMRow[]>;
  /** canonicalName + date → rows */
  byAgentDate:      Map<string, CRMRow[]>;
}

function buildIndex(crm: CRMRow[]): CRMIndex {
  const byPhoneAgentDate = new Map<string, CRMRow[]>();
  const byPhoneDate      = new Map<string, CRMRow[]>();
  const byAgentDate      = new Map<string, CRMRow[]>();

  for (const row of crm) {
    const date  = datePart(row.date);
    const phone = row.phoneNumber;
    const agent = row.canonicalName;

    if (phone && phone.length >= 7) {
      const kPAD = `${phone}|${agent}|${date}`;
      if (!byPhoneAgentDate.has(kPAD)) byPhoneAgentDate.set(kPAD, []);
      byPhoneAgentDate.get(kPAD)!.push(row);

      const kPD = `${phone}|${date}`;
      if (!byPhoneDate.has(kPD)) byPhoneDate.set(kPD, []);
      byPhoneDate.get(kPD)!.push(row);
    }

    if (agent && date) {
      const kAD = `${agent}|${date}`;
      if (!byAgentDate.has(kAD)) byAgentDate.set(kAD, []);
      byAgentDate.get(kAD)!.push(row);
    }
  }

  return { byPhoneAgentDate, byPhoneDate, byAgentDate };
}

// ── Main enrichment ───────────────────────────────────────────

export function enrichCalls(calls: CCDRRow[], crm: CRMRow[]): EnrichedCall[] {
  if (!crm.length) {
    return calls.map(c => ({ ...c, crmMatchFound: false }));
  }

  const idx = buildIndex(crm);

  return calls.map(call => {
    const phone       = call.callerNumber;
    const date        = datePart(call.date);
    const agent       = call.agentName;        // CCDR canonical already
    const callTimeSec = timeToSec(call.time);

    let match: CRMRow | null = null;

    // P1: phone + agent + date (exact canonical match)
    if (phone && phone.length >= 7) {
      const p1 = idx.byPhoneAgentDate.get(`${phone}|${agent}|${date}`);
      if (p1?.length) {
        match = closestByTime(p1, callTimeSec);
      }
    }

    // P2: phone + date (any agent)
    if (!match && phone && phone.length >= 7) {
      const p2 = idx.byPhoneDate.get(`${phone}|${date}`);
      if (p2?.length) {
        match = closestByTime(p2, callTimeSec);
      }
    }

    // P3: agent + date (no phone match)
    if (!match) {
      const p3 = idx.byAgentDate.get(`${agent}|${date}`);
      if (p3?.length) {
        match = closestByTime(p3, callTimeSec);
      }
    }

    if (match) {
      return {
        ...call,
        ticketId:        match.ticketId      || undefined,
        orderId:         match.orderId       || undefined,
        reason:          match.reason        || undefined,
        subReason:       match.subReason     || undefined,
        actionTaken:     match.actionTaken   || undefined,
        interactionType: match.interactionType || undefined,
        crmQueue:        match.queue         || undefined,
        vertical:        match.vertical      || undefined,
        subVertical:     match.subVertical   || undefined,
        crmMatchFound:   true,
      };
    }

    return { ...call, crmMatchFound: false };
  });
}
