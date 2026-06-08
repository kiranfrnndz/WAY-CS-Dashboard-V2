/**
 * FILE PARSERS — exact column mappings from sample file inspection
 *
 * CCDR  (Call_Centre_Call_Detail_Report):
 *   Sheet: "Call Center Call Detail Report"
 *   Preamble rows 0–5, section header row 6, column header row 7, data from row 8
 *   col[0]  Call Center Name  → queue
 *   col[1]  Call Start Time   "MM/DD/YYYY, HH:MM:SS"
 *   col[2]  Call Answer Time  (absent for Abandoned)
 *   col[3]  Call End Time
 *   col[4]  Agent Name        "LastName, FirstName" → normalised
 *   col[7]  Callers Number    10-digit numeric (some 'Private')
 *   col[9]  Call Result       Answered | Abandoned | Transferred | Overflow - Time
 *   col[10] Wait Time         Excel time fraction → seconds
 *   col[12] Number of Bounces integer
 *   col[14] Talk Time
 *   col[15] Hold Time
 *   col[16] Wrap Up Time
 *
 * AGENT (Agent_Call_Detail_Report):
 *   Column header row 8, data from row 9
 *   col[0]  Agent Name  "LastName, FirstName"
 *   col[1]  Call Start Time
 *   col[2]  Call End Time
 *   col[3]  Call Type   "Inbound ACD" | "Outbound"
 *   col[5]  Callers/Called Number
 *   col[7]  Wait Time In Queue
 *   col[9]  Talk Time
 *   col[10] Hold Time
 *   col[11] Wrap Up Time
 *
 * CRM (CS_All_Tickets):
 *   Sheet: "Sheet 1", headers in row 0
 *   Key columns (exact names):
 *     'Ticket ID'               → ticketId
 *     'Ticket_created_date'     → date + time  (USE THIS — interaction timestamp is midnight default)
 *     'OGI'                     → orderId
 *     'Cust Ph No'              → phoneNumber  (normalised to 10-digit)
 *     'Interaction'             → interactionType
 *     'Agent Name'              → resolved via agentNameMap to canonical
 *     'Action'                  → actionTaken
 *     'Reason'                  → reason
 *     'Sub Reason'              → subReason
 *     'Status'                  → status
 *     'Vertical'                → vertical
 *     'SubVertical'             → subVertical  (used as queue)
 *     'TKT_IssueReason'         → tktIssueReason
 *     'Interaction ID'          → interactionId
 */

import * as XLSX from 'xlsx';
import type { CCDRRow, AgentCallRow, CRMRow } from '../types';
import { resolveCRMName } from './agentNameMap';

// ── Time helpers ──────────────────────────────────────────────

function excelTimeToSeconds(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  if (typeof val === 'number') {
    if (val > 0 && val < 2) return Math.round(val * 86400);
    return Math.round(val);
  }
  if (typeof val === 'string') {
    const parts = val.trim().split(':').map(Number);
    if (parts.length === 3 && !parts.some(isNaN)) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    }
  }
  return 0;
}

/** Parse "MM/DD/YYYY, HH:MM:SS" → { date: 'YYYY-MM-DD', time: 'HH:MM:SS' } */
function parseCCDRDatetime(val: unknown): { date: string; time: string } {
  if (!val || typeof val !== 'string') return { date: '', time: '' };
  const m = val.trim().match(/^(\d{2})\/(\d{2})\/(\d{4}),\s*(\d{2}:\d{2}:\d{2})$/);
  if (m) return { date: `${m[3]}-${m[1]}-${m[2]}`, time: m[4] };
  return { date: '', time: '' };
}

/** Parse "M/D/YYYY H:MM:SS AM/PM" → { date: 'YYYY-MM-DD', time: 'HH:MM:SS' } */
function parseCRMDatetime(val: unknown): { date: string; time: string } {
  if (!val) return { date: '', time: '' };
  const s = String(val).trim();
  const m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})\s+(\d{1,2}):(\d{2}):(\d{2})\s*(AM|PM)?$/i);
  if (m) {
    const mon = m[1].padStart(2, '0');
    const day = m[2].padStart(2, '0');
    const yr  = m[3];
    let h     = parseInt(m[4]);
    const min = m[5];
    const sec = m[6];
    const ap  = (m[7] || '').toUpperCase();
    if (ap === 'PM' && h < 12) h += 12;
    if (ap === 'AM' && h === 12) h = 0;
    return { date: `${yr}-${mon}-${day}`, time: `${String(h).padStart(2,'0')}:${min}:${sec}` };
  }
  return { date: s, time: '' };
}

/**
 * Normalise CCDR agent name from "LastName, FirstName" to "FirstName LastName".
 * Handles multi-part surnames: "Kumar S, Abhishek" → "Abhishek Kumar S"
 *                              "B I, Sumith"       → "Sumith B I"
 *                              "Vinod Nair, Akshay"→ "Akshay Vinod Nair"
 */
function normaliseCCDRAgent(raw: unknown): string {
  if (!raw || typeof raw !== 'string') return '';
  const s = raw.trim();
  if (!s) return '';
  const comma = s.indexOf(',');
  if (comma === -1) return s;
  const last  = s.slice(0, comma).trim();
  const first = s.slice(comma + 1).trim();
  const result = first ? `${first} ${last}` : last; return result.replace('A.V', 'AV').replace('Aswin A.V', 'Aswin AV');
}

function safePhone(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  if (!s || s === 'nan') return '';
  const n = Number(s);
  if (!isNaN(n) && isFinite(n)) return String(Math.round(n));
  return s;
}

/** Normalise CRM phone to 10-digit string */
function normPhone(val: unknown): string {
  if (!val) return '';
  const s = String(val).trim();
  if (!s || s === 'nan') return '';
  const digits = s.replace(/\D/g, '');
  return digits.length >= 10 ? digits.slice(-10) : digits;
}

function safeStr(val: unknown): string {
  if (val === null || val === undefined) return '';
  const s = String(val).trim();
  return s === 'nan' ? '' : s;
}

function safeNum(val: unknown): number {
  if (val === null || val === undefined || val === '') return 0;
  const n = Number(val);
  return isNaN(n) ? 0 : n;
}

// ── Raw sheet readers ─────────────────────────────────────────

function readAOA(file: File): Promise<unknown[][]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: false, raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: null, raw: false }));
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

function readWithHeaders(file: File): Promise<Record<string, unknown>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer);
        const wb = XLSX.read(data, { type: 'array', cellDates: false, raw: false });
        const ws = wb.Sheets[wb.SheetNames[0]];
        resolve(XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: null, raw: false }));
      } catch (err) { reject(err); }
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsArrayBuffer(file);
  });
}

// ── CCDR Parser ───────────────────────────────────────────────

export async function parseCCDR(file: File): Promise<CCDRRow[]> {
  const aoa = await readAOA(file);
  const rows: CCDRRow[] = [];
  let id = 0;

  for (let i = 8; i < aoa.length; i++) {
    const row = aoa[i] as unknown[];
    if (!row || row.length === 0) continue;

    const queue = safeStr(row[0]);
    if (!queue) continue;

    const startRaw = safeStr(row[1]);
    if (!startRaw.includes('2026') && !startRaw.includes('2025')) continue;

    const { date, time } = parseCCDRDatetime(startRaw);
    if (!date) continue;

    rows.push({
      callId:          `ccdr-${i}-${id++}`,
      date,
      time,
      queue,
      agentName:       normaliseCCDRAgent(row[4]),
      callType:        'Inbound',
      callStatus:      safeStr(row[9]),
      callerNumber:    safePhone(row[7]),
      waitTime:        excelTimeToSeconds(row[10]),
      talkTime:        excelTimeToSeconds(row[14]),
      holdTime:        excelTimeToSeconds(row[15]),
      wrapTime:        excelTimeToSeconds(row[16]),
      aht:             excelTimeToSeconds(row[14]) + excelTimeToSeconds(row[15]) + excelTimeToSeconds(row[16]),
      numberOfBounces: safeNum(row[12]),
    });
  }

  return rows;
}

// ── Agent Call Detail Parser ──────────────────────────────────

export async function parseAgentCall(file: File): Promise<AgentCallRow[]> {
  const aoa = await readAOA(file);
  const rows: AgentCallRow[] = [];
  let id = 0;

  for (let i = 9; i < aoa.length; i++) {
    const row = aoa[i] as unknown[];
    if (!row || row.length === 0) continue;

    const agentRaw = safeStr(row[0]);
    if (!agentRaw) continue;

    const startRaw = safeStr(row[1]);
    if (!startRaw.includes('2026') && !startRaw.includes('2025')) continue;

    const { date, time } = parseCCDRDatetime(startRaw);
    if (!date) continue;

    const talkTime = excelTimeToSeconds(row[9]);
    const holdTime = excelTimeToSeconds(row[10]);
    const wrapTime = excelTimeToSeconds(row[11]);

    rows.push({
      callId:       `agent-${i}-${id++}`,
      date,
      time,
      agentName:    normaliseCCDRAgent(agentRaw),
      callType:     safeStr(row[3]),   // "Inbound ACD" | "Outbound"
      callStatus:   'Answered',
      callerNumber: safePhone(row[5]),
      queue:        '',
      waitTime:     excelTimeToSeconds(row[7]),
      talkTime,
      holdTime,
      wrapTime,
      aht:          talkTime + holdTime + wrapTime,
    });
  }

  return rows;
}

// ── CRM Parser ────────────────────────────────────────────────

export async function parseCRM(file: File): Promise<CRMRow[]> {
  const rawRows = await readWithHeaders(file);
  const rows: CRMRow[] = [];

  for (const raw of rawRows) {
    const ticketId = safeStr(raw['Ticket ID']);
    if (!ticketId) continue;

    // Use Ticket_created_date — Interaction created date is always midnight (default)
    const { date, time } = parseCRMDatetime(raw['Ticket_created_date']);

    const rawAgent  = safeStr(raw['Agent Name']);
    const canonical = resolveCRMName(rawAgent);
    if (canonical === null) continue;   // _EXCLUDE_ sentinel

    const vertical    = safeStr(raw['Vertical']);
    const subVertical = safeStr(raw['SubVertical']);

    rows.push({
      ticketId,
      orderId:         safeStr(raw['OGI']),
      agentName:       rawAgent,
      canonicalName:   canonical,
      date,
      time,
      interactionType: safeStr(raw['Interaction']),
      queue:           subVertical || vertical,
      vertical,
      subVertical,
      reason:          safeStr(raw['Reason']),
      subReason:       safeStr(raw['Sub Reason']),
      actionTaken:     safeStr(raw['Action']),
      phoneNumber:     normPhone(raw['Cust Ph No']),
      status:          safeStr(raw['Status']),
      channel:         safeStr(raw['Interaction']),
      tktIssueReason:  safeStr(raw['TKT_IssueReason']),
      interactionId:   safeStr(raw['Interaction ID']),
    });
  }

  return rows;
}

// ── Excel Export ──────────────────────────────────────────────

export function exportToExcel(data: Record<string, unknown>[], filename: string, sheetName = 'Data') {
  const ws = XLSX.utils.json_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, filename);
}
