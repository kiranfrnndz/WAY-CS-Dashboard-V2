import type { QueueScope } from '../engines/roster';

// ============================================================
// CORE DATA TYPES — derived from exact column inspection
// ============================================================

export interface CCDRRow {
  callId: string;
  date: string;
  time: string;
  queue: string;          // Call Center Name: Airport | Global Main | City | etc.
  agentName: string;      // ROSTER canonical name when resolvable, else raw export name
  rawAgentName: string;   // Exactly as the export had it, after "(*)" strip and comma flip
  rostered: boolean;      // Resolved to a roster member?
  queueScope: QueueScope | null;
  callType: string;       // 'Inbound' (all CCDR rows are inbound queue calls)
  callStatus: string;     // Answered | Abandoned | Transferred | Overflow - Time
  callerNumber: string;
  waitTime: number;
  talkTime: number;
  holdTime: number;
  wrapTime: number;
  aht: number;
  numberOfBounces: number;
}

export interface AgentCallRow {
  callId: string;
  date: string;
  time: string;
  agentName: string;
  rawAgentName: string;
  rostered: boolean;
  callType: string;       // "Inbound ACD" | "Outbound"
  callStatus: string;
  callerNumber: string;
  queue: string;
  waitTime: number;
  talkTime: number;
  holdTime: number;
  wrapTime: number;
  aht: number;
}

export interface CRMRow {
  ticketId: string;
  orderId: string;        // OGI field
  agentName: string;      // Raw name exactly as the CRM export had it
  canonicalName: string;  // ROSTER canonical name; '' when unrostered
  rostered: boolean;      // Resolved to a roster member?
  queueScope: QueueScope | null;
  date: string;           // from Ticket_created_date (use this — interaction timestamp is default midnight)
  time: string;
  interactionType: string;
  queue: string;          // SubVertical || Vertical
  vertical: string;
  subVertical: string;
  reason: string;
  subReason: string;
  actionTaken: string;
  phoneNumber: string;    // 10-digit normalised
  status: string;
  channel: string;
  tktIssueReason: string;
  interactionId: string;
}

export interface EnrichedCall extends CCDRRow {
  ticketId?: string;
  orderId?: string;
  reason?: string;
  subReason?: string;
  actionTaken?: string;
  interactionType?: string;
  crmQueue?: string;
  vertical?: string;
  subVertical?: string;
  crmMatchFound: boolean;
}

export interface AgentSummary {
  name: string;
  queueScope: QueueScope;
  calls: number;
  emails: number;
  chats: number;
  escalations: number;
  tickets: number;
  totalInteractions: number;
  utilisation: number;
  fcr: number;
  /**
   * False when the agent has NO FCR-eligible CRM rows. Previously this case
   * produced 0% (0 divided by a fallback of 1), which read as a performance
   * failure when it actually meant "no CRM data matched". Render as n/a.
   */
  fcrAvailable: boolean;
  bounceRate: number;
  avgAHT: number;
  avgHoldTime: number;
  avgTalkTime: number;
  productivity: 'Below Target' | 'Meets Target' | 'Exceeds Target';
  /**
   * Union of CCDR call dates AND CRM ticket dates. Previously call dates only,
   * which dropped email-only days from the denominator and inflated per-day
   * productivity and utilisation (an email-only agent divided by a single day).
   */
  dates: string[];
}

/** An agent name present in the data but NOT on the roster. */
export interface UnrosteredAgent {
  name: string;
  source: 'CCDR' | 'CRM' | 'Both';
  calls: number;
  crmRows: number;
  knownNonCS: boolean;
}

export interface QueueSummary {
  queue: string;
  totalCalls: number;
  totalTalkTime: number;
  totalHoldTime: number;
  avgAHT: number;
  calls: EnrichedCall[];
}

export interface WrapBucket {
  label: string;
  min: number;
  max: number;
  count: number;
  calls: EnrichedCall[];
}

export interface FCRRecord {
  ticketId: string;
  orderId: string;
  contactCount: number;
  contactPattern: string;
  reason: string;
  subReason: string;
  actionTaken: string;
  interactionType: string;
  queue: string;
  fcrMet: boolean;
}

export interface DuplicateTicket {
  orderId: string;
  ticketIds: string[];
  reason: string;
  subReason: string;
}

export interface MissingTicket {
  agent: string;
  date: string;
  time: string;
  queue: string;
  phoneNumber: string;
  callId: string;
}

export interface CoachingInsight {
  type: 'strength' | 'improvement';
  category: string;
  label: string;
  value: string | number;
  details: EnrichedCall[];
  severity: 'low' | 'medium' | 'high';
}

export interface GapDetail {
  prevCallEnd: string;
  nextCallStart: string;
  gapDuration: number;
}

// ============================================================
// EXCLUSION LISTS
// ============================================================

/**
 * Non-frontline WAY CS roles — excluded from all KPI calculations.
 * Uses CCDR canonical names (FirstName LastName).
 * Also includes CRM-only name variants for the same people.
 */
/**
 * DEPRECATED — replaced by the allowlist in engines/roster.ts.
 *
 * The blacklist model meant anyone not explicitly listed counted as frontline,
 * so non-CS names (Esther Cleetus, Fazal Sherrif, Rahul Vinod, Jonathan Brown)
 * scored silently. Roster membership is now explicit; see roster.ts.
 */
export const EXCLUDED_AGENTS = new Set<string>();

/**
 * CRM interaction types excluded from FCR calculation.
 */
export const FCR_EXCLUDED_TYPES = new Set([
  'AI-Agent Call',
  'TL Review',
  'User Reviews',
  'BBB Reviews',
  'Dispute',
  'Escalation handled by Escalation Team',
  'Escalation handled by Ops Team',
  'Select',
]);

export const HIGH_HOLD_THRESHOLD = 240;
export const LONG_AHT_THRESHOLD = 330;
export const DAILY_TARGET = 60;
export const AVAILABLE_MINUTES = 480;

export const WRAP_BUCKETS = [
  { label: '0–30s',   min: 0,   max: 30 },
  { label: '30–60s',  min: 30,  max: 60 },
  { label: '60–120s', min: 60,  max: 120 },
  { label: '120+s',   min: 120, max: Infinity },
];

export const ANSWERED_STATUSES = new Set(['Answered']);
export const ABANDONED_STATUSES = new Set(['Abandoned']);
