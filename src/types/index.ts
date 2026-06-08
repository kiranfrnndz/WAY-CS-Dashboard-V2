// ============================================================
// CORE DATA TYPES — derived from exact column inspection
// ============================================================

export interface CCDRRow {
  callId: string;
  date: string;
  time: string;
  queue: string;          // Call Center Name: Airport | Global Main | City | etc.
  agentName: string;      // Normalised "FirstName LastName" (CCDR canonical form)
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
  agentName: string;      // Resolved to canonical via agentNameMap
  canonicalName: string;  // Always the CCDR-form name after resolution
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
  calls: number;
  emails: number;
  chats: number;
  escalations: number;
  tickets: number;
  totalInteractions: number;
  utilisation: number;
  fcr: number;
  bounceRate: number;
  avgAHT: number;
  avgHoldTime: number;
  avgTalkTime: number;
  productivity: 'Below Target' | 'Meets Target' | 'Exceeds Target';
  dates: string[];
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
export const EXCLUDED_AGENTS = new Set([
  // Team Leads
  'Shiju Salam', 'Vishnu V', 'Bijoy Kiran',
  'Rashmika', 'Rashmika Santhosh', 'Rashmika Santhosh D',
  'Vishnu B S', 'Vishnu BS', 'Surya Suresh', 'surya suresh',
  'Ansu Varghese', 'Jaison Nelson',
  // Leadership
  'Joyson Fernandez', 'Anju Mareeta Lean',
  // Reviews
  'Tharun Sunil Kumar', 'Jijo Papachan', 'Muvithra M',
  'Blessy Hillary', 'Abhilash Augustin',
  // Disputes
  'Gowri S', 'Gowri',
  'Greeshma R S', 'Greeshma RS',
  'Sreela R', 'Sreelaraghavan',   // same person, email sreela.r@way.com
  'Subin M S', 'Subin MS',
  // QC
  'Henna Najim S', 'Henna Najim',
  'Vidya Vijayan',
  'Reshma Sunil', 'Reshma',
  'Rijisha S Kumar', 'Rijisha',
  // L2
  'Jithin S',
  // Reporting
  'Vishnu M S', 'Vishnu MS',
  // SME
  'Lalita Lama', 'LALITA LAMA', 'Althaf Z',
  // AI
  'ai-decagon ai-decagon',
  // Ops executive
  'Teena GM',
  // Not WAY CS India team (confirmed by CS Ops Manager)
  'Aathira Ashok', 'Al-Ameen AS', 'Samuel Chacko',
  'Mike Sudarsanan', 'Shyny Selvia', 'Nivesh R',
  'Daisy Mathew','Goutham S Nair','Sreelakshmi S','Sreelakshmi','Alexandra Morales','Andrea Ruiz','Angeles Soledad','Brianna Lundy','Daniel Montoya','Gabriella Lacayo','Karen Hopkins','Karolyne Perez','Mauricio Leon','Nicholas Marquez','Oscar Perez','Sarah Gonzalez','Sarah Gonzales','Selina Benavides','Valentina Torres',
]);

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
