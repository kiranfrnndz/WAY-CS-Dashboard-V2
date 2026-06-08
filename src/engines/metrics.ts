/**
 * METRICS ENGINE
 *
 * Agent identity:
 *   CCDR rows use agentName (canonical "FirstName LastName" from parser).
 *   CRM rows use canonicalName (resolved at parse time via agentNameMap).
 *   All lookups are exact string match on the canonical name — no fuzzy matching here.
 *
 * CRM timestamp:
 *   Uses Ticket_created_date (real). Interaction created date is midnight default — ignored.
 */

import type {
  CCDRRow, CRMRow, EnrichedCall, AgentSummary,
  QueueSummary, FCRRecord, DuplicateTicket, MissingTicket,
  CoachingInsight, WrapBucket, GapDetail,
} from '../types';
import {
  EXCLUDED_AGENTS, FCR_EXCLUDED_TYPES,
  HIGH_HOLD_THRESHOLD, LONG_AHT_THRESHOLD,
  DAILY_TARGET, AVAILABLE_MINUTES, WRAP_BUCKETS,
  ANSWERED_STATUSES,
} from '../types';
import { enrichCalls } from './crmMatcher';

// ── Helpers ───────────────────────────────────────────────────

export function isFrontline(name: string): boolean {
  return !!name.trim() && !EXCLUDED_AGENTS.has(name.trim());
}

export function fmtSec(s: number): string {
  const h   = Math.floor(s / 3600);
  const m   = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  if (h > 0) return `${h}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
  return `${m}:${String(sec).padStart(2,'0')}`;
}

function timeToSec(t: string): number {
  const p = (t || '00:00:00').split(':').map(Number);
  return (p[0]||0)*3600 + (p[1]||0)*60 + (p[2]||0);
}

function secToTime(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = Math.floor(s % 60);
  return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
}

// ── Agent Summary ─────────────────────────────────────────────

export function computeAgentSummaries(
  ccdrRows: CCDRRow[],
  crmRows: CRMRow[]
): AgentSummary[] {

  // Filter to frontline CCDR calls and enrich
  const frontlineCCDR = ccdrRows.filter(r => isFrontline(r.agentName));
  const enriched      = enrichCalls(frontlineCCDR, crmRows);

  // Group enriched calls by canonical agent name
  const callsByAgent = new Map<string, EnrichedCall[]>();
  for (const call of enriched) {
    if (!isFrontline(call.agentName)) continue;
    if (!callsByAgent.has(call.agentName)) callsByAgent.set(call.agentName, []);
    callsByAgent.get(call.agentName)!.push(call);
  }

  // Group CRM rows by canonical name — CRM parser already resolved this
  const crmByAgent = new Map<string, CRMRow[]>();
  for (const row of crmRows) {
    const name = row.canonicalName;
    if (!name || !isFrontline(name)) continue;
    if (!crmByAgent.has(name)) crmByAgent.set(name, []);
    crmByAgent.get(name)!.push(row);
  }

  const allAgents = new Set([...callsByAgent.keys(), ...crmByAgent.keys()]);
  const summaries: AgentSummary[] = [];

  for (const name of allAgents) {
    if (!isFrontline(name)) continue;

    const calls     = callsByAgent.get(name) || [];
    const agentCRM  = crmByAgent.get(name)   || [];

    // Answered = Answered status in CCDR
    const answered      = calls.filter(c => ANSWERED_STATUSES.has(c.callStatus));
    // Bounced = answered calls where numberOfBounces > 0 (rang other agents first)
    const bouncedCalls  = answered.filter(c => (c.numberOfBounces || 0) > 0);

    // CRM-sourced interaction counts
    const emails      = agentCRM.filter(r => r.interactionType === 'Email');
    const chats       = agentCRM.filter(r => r.interactionType === 'Chat');
    const escalations = agentCRM.filter(r => r.interactionType?.startsWith('Escalation'));
    const uniqueTickets = new Set(agentCRM.map(r => r.ticketId).filter(Boolean));

    const callCount   = answered.length;
    const emailCount  = emails.length;
    const chatCount   = chats.length;
    const totalInteractions = callCount + emailCount + chatCount;

    const activeDates = [...new Set(calls.map(c => c.date).filter(Boolean))].sort();
    const days        = activeDates.length || 1;
    const perDay      = totalInteractions / days;

    const productivity: AgentSummary['productivity'] =
      perDay >= DAILY_TARGET * 1.1  ? 'Exceeds Target'
      : perDay >= DAILY_TARGET * 0.85 ? 'Meets Target'
      : 'Below Target';

    // Utilisation
    const callMins   = answered.reduce((s, c) => s + c.talkTime / 60, 0);
    const emailMins  = emailCount  * 6;
    const chatMins   = chatCount   * 4;
    const escalMins  = escalations.length * 3;
    const crmMins    = uniqueTickets.size * 1.5;
    const occupied   = callMins + emailMins + chatMins + escalMins + crmMins;
    const available  = AVAILABLE_MINUTES * days;
    const utilisation = Math.min(1, occupied / available);

    // FCR — group by OGI, exclude non-FCR types
    const fcrEligible   = agentCRM.filter(r => !FCR_EXCLUDED_TYPES.has(r.interactionType));
    const orderGroups   = new Map<string, CRMRow[]>();
    for (const r of fcrEligible) {
      if (!r.orderId) continue;
      if (!orderGroups.has(r.orderId)) orderGroups.set(r.orderId, []);
      orderGroups.get(r.orderId)!.push(r);
    }
    const fcrMet    = [...orderGroups.values()].filter(g => g.length === 1).length;
    const fcrTotal  = orderGroups.size || 1;
    const fcr       = fcrMet / fcrTotal;

    const bounceRate  = answered.length > 0 ? bouncedCalls.length / answered.length : 0;
    const avgAHT      = answered.length ? answered.reduce((s,c) => s+c.aht,       0) / answered.length : 0;
    const avgHoldTime = answered.length ? answered.reduce((s,c) => s+c.holdTime,  0) / answered.length : 0;
    const avgTalkTime = answered.length ? answered.reduce((s,c) => s+c.talkTime,  0) / answered.length : 0;

    summaries.push({
      name, calls: callCount, emails: emailCount, chats: chatCount,
      escalations: escalations.length, tickets: uniqueTickets.size,
      totalInteractions, utilisation, fcr, bounceRate,
      avgAHT, avgHoldTime, avgTalkTime, productivity,
      dates: activeDates,
    });
  }

  return summaries.sort((a, b) => a.name.localeCompare(b.name));
}

// ── Queue Summary ─────────────────────────────────────────────

export function computeQueueSummary(enriched: EnrichedCall[]): QueueSummary[] {
  const byQueue = new Map<string, EnrichedCall[]>();
  for (const c of enriched) {
    const q = c.queue || c.crmQueue || 'Unknown';
    if (!byQueue.has(q)) byQueue.set(q, []);
    byQueue.get(q)!.push(c);
  }

  return [...byQueue.entries()].map(([queue, calls]) => {
    const answered    = calls.filter(c => ANSWERED_STATUSES.has(c.callStatus));
    const totalTalk   = answered.reduce((s,c) => s+c.talkTime,  0);
    const totalHold   = answered.reduce((s,c) => s+c.holdTime,  0);
    const totalAHT    = answered.reduce((s,c) => s+c.aht,       0);
    return {
      queue,
      totalCalls:    answered.length,
      totalTalkTime: totalTalk,
      totalHoldTime: totalHold,
      avgAHT:        answered.length ? totalAHT / answered.length : 0,
      calls:         answered,
    };
  }).filter(q => q.totalCalls > 0)
    .sort((a,b) => b.totalCalls - a.totalCalls);
}

// ── FCR ───────────────────────────────────────────────────────

export function computeFCR(crmRows: CRMRow[], canonicalName: string): FCRRecord[] {
  const eligible = crmRows.filter(
    r => r.canonicalName === canonicalName && !FCR_EXCLUDED_TYPES.has(r.interactionType)
  );

  const orderGroups = new Map<string, CRMRow[]>();
  for (const r of eligible) {
    const key = r.orderId || `no-ogi-${r.ticketId}`;
    if (!orderGroups.has(key)) orderGroups.set(key, []);
    orderGroups.get(key)!.push(r);
  }

  return [...orderGroups.entries()].map(([key, rows]) => {
    const first = rows[0];
    return {
      ticketId:       rows.map(r => r.ticketId).filter(Boolean).join(', ') || 'N/A',
      orderId:        key.startsWith('no-ogi-') ? 'N/A' : key,
      contactCount:   rows.length,
      contactPattern: rows.map(r => r.interactionType).join(' → '),
      reason:         first.reason      || 'N/A',
      subReason:      first.subReason   || 'N/A',
      actionTaken:    first.actionTaken || 'N/A',
      interactionType: first.interactionType,
      queue:          first.queue || first.subVertical || first.vertical || 'N/A',
      fcrMet:         rows.length === 1,
    };
  });
}

// ── Duplicate Tickets ─────────────────────────────────────────

export function computeDuplicateTickets(crmRows: CRMRow[], canonicalName: string): DuplicateTicket[] {
  const agentRows = crmRows.filter(r => r.canonicalName === canonicalName);
  const groups    = new Map<string, CRMRow[]>();

  for (const r of agentRows) {
    if (!r.orderId) continue;
    const key = `${r.orderId}|${r.reason}|${r.subReason}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  return [...groups.values()]
    .filter(rows => {
      const ids = [...new Set(rows.map(r => r.ticketId).filter(Boolean))];
      return ids.length > 1;
    })
    .map(rows => ({
      orderId:   rows[0].orderId,
      ticketIds: [...new Set(rows.map(r => r.ticketId).filter(Boolean))],
      reason:    rows[0].reason    || 'N/A',
      subReason: rows[0].subReason || 'N/A',
    }));
}

// ── Missing Ticket Logging ────────────────────────────────────

export function computeMissingTickets(enriched: EnrichedCall[], canonicalName: string): MissingTicket[] {
  return enriched
    .filter(c =>
      c.agentName === canonicalName &&
      c.callStatus === 'Answered'   &&
      !c.crmMatchFound
    )
    .map(c => ({
      agent:       c.agentName,
      date:        c.date,
      time:        c.time,
      queue:       c.queue || 'N/A',
      phoneNumber: c.callerNumber || 'N/A',
      callId:      c.callId,
    }));
}

// ── Wrap Buckets ──────────────────────────────────────────────

export function computeWrapBuckets(enriched: EnrichedCall[]): WrapBucket[] {
  return WRAP_BUCKETS.map(b => {
    const calls = enriched.filter(c =>
      ANSWERED_STATUSES.has(c.callStatus) && c.wrapTime >= b.min && c.wrapTime < b.max
    );
    return { ...b, count: calls.length, calls };
  });
}

// ── Gap Analysis ──────────────────────────────────────────────

export function computeGaps(enriched: EnrichedCall[]): GapDetail[] {
  const answered = enriched
    .filter(c => ANSWERED_STATUSES.has(c.callStatus))
    .sort((a, b) => {
      const da = (a.date||'') + (a.time||'');
      const db = (b.date||'') + (b.time||'');
      return da < db ? -1 : da > db ? 1 : 0;
    });

  const gaps: GapDetail[] = [];
  for (let i = 0; i < answered.length - 1; i++) {
    const curr = answered[i];
    const next = answered[i + 1];
    if (curr.date !== next.date) continue;

    const currEnd  = timeToSec(curr.time) + curr.talkTime + curr.holdTime + curr.wrapTime;
    const nextStart = timeToSec(next.time);
    const gap       = nextStart - currEnd;

    if (gap > 30) {
      gaps.push({ prevCallEnd: secToTime(currEnd), nextCallStart: next.time, gapDuration: gap });
    }
  }
  return gaps;
}

// ── Coaching Insights ─────────────────────────────────────────

export function computeCoachingInsights(
  summary:    AgentSummary,
  enriched:   EnrichedCall[],
  _crmRows:   CRMRow[],
  fcrRecords: FCRRecord[],
  duplicates: DuplicateTicket[]
): CoachingInsight[] {
  const insights: CoachingInsight[] = [];
  const days   = summary.dates.length || 1;
  const perDay = summary.totalInteractions / days;

  if (summary.utilisation >= 0.75)
    insights.push({ type:'strength', category:'Utilisation', label:'High Utilisation',
      value:`${Math.round(summary.utilisation*100)}%`, details:[], severity:'low' });

  if (perDay >= DAILY_TARGET)
    insights.push({ type:'strength', category:'Productivity', label:'High Productivity',
      value:`${summary.totalInteractions} interactions (${perDay.toFixed(1)}/day)`, details:[], severity:'low' });

  if (summary.fcr >= 0.85)
    insights.push({ type:'strength', category:'FCR', label:'High FCR Rate',
      value:`${Math.round(summary.fcr*100)}%`, details:[], severity:'low' });

  if (summary.bounceRate < 0.05 && summary.calls > 10)
    insights.push({ type:'strength', category:'Bounce Rate', label:'Low Bounce Rate',
      value:`${Math.round(summary.bounceRate*100)}%`, details:[], severity:'low' });

  if (summary.utilisation < 0.6)
    insights.push({ type:'improvement', category:'Utilisation', label:'Low Utilisation',
      value:`${Math.round(summary.utilisation*100)}%`, details:[],
      severity: summary.utilisation < 0.4 ? 'high' : 'medium' });

  if (perDay < DAILY_TARGET * 0.8 && summary.totalInteractions > 0)
    insights.push({ type:'improvement', category:'Productivity', label:'Low Productivity',
      value:`${perDay.toFixed(1)}/day (target: ${DAILY_TARGET})`, details:[], severity:'medium' });

  const longHold = enriched.filter(c => ANSWERED_STATUSES.has(c.callStatus) && c.holdTime > HIGH_HOLD_THRESHOLD);
  if (longHold.length)
    insights.push({ type:'improvement', category:'Hold Time', label:'Long Hold Time',
      value:`${longHold.length} calls >4 min`, details:longHold,
      severity: longHold.length > 5 ? 'high' : 'medium' });

  const longAHT = enriched.filter(c => ANSWERED_STATUSES.has(c.callStatus) && c.aht > LONG_AHT_THRESHOLD);
  if (longAHT.length)
    insights.push({ type:'improvement', category:'AHT', label:'Long AHT',
      value:`${longAHT.length} calls >5m30s`, details:longAHT,
      severity: longAHT.length > 5 ? 'high' : 'medium' });

  const fcrFailed = fcrRecords.filter(r => !r.fcrMet);
  if (fcrFailed.length)
    insights.push({ type:'improvement', category:'FCR', label:'FCR Failures',
      value:`${fcrFailed.length} multi-contact cases`, details:[],
      severity: fcrFailed.length > 3 ? 'high' : 'medium' });

  if (duplicates.length)
    insights.push({ type:'improvement', category:'Ticket Quality', label:'Duplicate Tickets',
      value:`${duplicates.length} duplicate OGIs`, details:[], severity:'medium' });

  return insights;
}
