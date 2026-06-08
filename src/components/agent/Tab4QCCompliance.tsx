import { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableBody, Dialog, DialogTitle, DialogContent, DialogActions, Button, IconButton,
  TableRow, TableCell, TableContainer, Chip, Grid, Alert
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningIcon from '@mui/icons-material/Warning';
import type { EnrichedCall, CRMRow } from '../../types';
import { computeFCR, computeDuplicateTickets, computeMissingTickets } from '../../engines/metrics';
import { getWrongInteractionRows } from '../../engines/agentNameMap';
import { fmtPct } from '../../utils/format';
import StatCard from '../shared/StatCard';
import DrillDownModal from '../modals/DrillDownModal';

interface Tab4Props {
  enriched: EnrichedCall[];
  crmRows: CRMRow[];
  agentName: string;
}

export default function Tab4QCCompliance({ enriched, crmRows, agentName }: Tab4Props) {
  const [fcrDrillType, setFcrDrillType] = useState<'all' | 'failed' | null>(null);

  const fcrRecords = computeFCR(crmRows, agentName);
  const duplicates = computeDuplicateTickets(crmRows, agentName);
  const missing = computeMissingTickets(enriched, agentName);

  const fcrMet = fcrRecords.filter(r => r.fcrMet);
  const fcrFailed = fcrRecords.filter(r => !r.fcrMet);
  const fcrRate = fcrRecords.length ? fcrMet.length / fcrRecords.length : 0;

  // Multi-interaction review
  const agentCRM = crmRows.filter(r => r.agentName.trim() === agentName);
  const wrongInteractions = getWrongInteractionRows(crmRows, agentName);
  const multiInteraction: Array<{ ticketId: string; count: number; date: string; types: string }> = [];
  const ticketDayGroups = new Map<string, CRMRow[]>();
  for (const r of agentCRM) {
    const key = `${r.ticketId}|${r.date}`;
    if (!ticketDayGroups.has(key)) ticketDayGroups.set(key, []);
    ticketDayGroups.get(key)!.push(r);
  }
  for (const [key, rows] of ticketDayGroups) {
    if (rows.length > 1) {
      const [ticketId, date] = key.split('|');
      multiInteraction.push({
        ticketId,
        count: rows.length,
        date,
        types: rows.map(r => r.interactionType).join(', '),
      });
    }
  }

  return (
    <Box>
      {/* FCR summary */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 1.5, mb: 2.5 }}>
        <StatCard
          label="FCR Rate"
          value={fmtPct(fcrRate)}
          sub={`${fcrMet.length} of ${fcrRecords.length} cases resolved`}
          color={fcrRate >= 0.85 ? '#2E7D32' : fcrRate >= 0.7 ? '#E65100' : '#C62828'}
          onClick={() => setFcrDrillType('all')}
          tooltip="Click to view all FCR records"
        />
        <StatCard
          label="FCR Met"
          value={fcrMet.length}
          sub="Single-contact resolutions"
          color="#2E7D32"
          onClick={() => setFcrDrillType('all')}
        />
        <StatCard
          label="FCR Failed"
          value={fcrFailed.length}
          sub="Multi-contact cases"
          color={fcrFailed.length > 0 ? '#C62828' : '#5C6B8A'}
          onClick={() => setFcrDrillType('failed')}
        />
      </Box>

      <Grid container spacing={2}>
        {/* FCR Detail */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFF' }}>
              <Typography variant="subtitle1" fontWeight={700}>FCR Analysis</Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={`✓ ${fcrMet.length} Met`}
                  size="small"
                  onClick={() => setFcrDrillType('all')}
                  sx={{ background: '#E8F5E9', color: '#2E7D32', fontWeight: 700, cursor: 'pointer' }}
                />
                <Chip
                  label={`✗ ${fcrFailed.length} Failed`}
                  size="small"
                  onClick={() => setFcrDrillType('failed')}
                  sx={{ background: fcrFailed.length > 0 ? '#FFEBEE' : '#F5F5F5', color: fcrFailed.length > 0 ? '#C62828' : '#5C6B8A', fontWeight: 700, cursor: 'pointer' }}
                />
              </Box>
            </Box>
            <TableContainer sx={{ maxHeight: 320 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    <TableCell>Status</TableCell>
                    <TableCell>Ticket ID</TableCell>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Contacts</TableCell>
                    <TableCell>Pattern</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Sub Reason</TableCell>
                    <TableCell>Queue</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {fcrRecords.slice(0, 30).map((r, i) => (
                    <TableRow key={i} hover sx={{ background: r.fcrMet ? 'transparent' : '#FFF8F8' }}>
                      <TableCell>
                        {r.fcrMet
                          ? <CheckCircleIcon sx={{ fontSize: 18, color: '#2E7D32' }} />
                          : <CancelIcon sx={{ fontSize: 18, color: '#C62828' }} />}
                      </TableCell>
                      <TableCell><Chip label={r.ticketId || 'N/A'} size="small" variant="outlined" /></TableCell>
                      <TableCell>{r.orderId || 'N/A'}</TableCell>
                      <TableCell>
                        <Chip label={r.contactCount} size="small"
                          sx={{ background: r.contactCount > 1 ? '#FFEBEE' : '#E8F5E9', color: r.contactCount > 1 ? '#C62828' : '#2E7D32', fontWeight: 700 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem', maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.contactPattern}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{r.reason}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{r.subReason}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{r.queue}</TableCell>
                    </TableRow>
                  ))}
                  {fcrRecords.length === 0 && (
                    <TableRow><TableCell colSpan={8} align="center" sx={{ py: 3, color: '#5C6B8A' }}>No FCR-eligible interactions</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Duplicate tickets */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: `1px solid ${duplicates.length > 0 ? '#FFCDD2' : 'rgba(0,0,0,0.06)'}`, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.06)', background: duplicates.length > 0 ? '#FFF3F3' : '#F8FAFF', display: 'flex', gap: 1, alignItems: 'center' }}>
              {duplicates.length > 0 && <WarningIcon sx={{ fontSize: 18, color: '#C62828' }} />}
              <Typography variant="subtitle2" fontWeight={700}>Duplicate Tickets</Typography>
              <Chip label={duplicates.length} size="small" color={duplicates.length > 0 ? 'error' : 'default'} />
              <Typography variant="caption" color="text.secondary">Same Order + Reason + Sub Reason</Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 280 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Order ID</TableCell>
                    <TableCell>Ticket IDs</TableCell>
                    <TableCell>Reason</TableCell>
                    <TableCell>Sub Reason</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {duplicates.map((d, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontWeight: 600 }}>{d.orderId}</TableCell>
                      <TableCell>
                        <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                          {d.ticketIds.map(t => <Chip key={t} label={t} size="small" variant="outlined" sx={{ fontSize: '0.6rem' }} />)}
                        </Box>
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{d.reason}</TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{d.subReason}</TableCell>
                    </TableRow>
                  ))}
                  {duplicates.length === 0 && (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: '#2E7D32', fontSize: '0.8rem' }}>✓ No duplicate tickets found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Missing ticket logging */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: `1px solid ${missing.length > 0 ? '#FFF9C4' : 'rgba(0,0,0,0.06)'}`, borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.06)', background: missing.length > 0 ? '#FFFDF0' : '#F8FAFF', display: 'flex', gap: 1, alignItems: 'center' }}>
              {missing.length > 0 && <WarningIcon sx={{ fontSize: 18, color: '#E65100' }} />}
              <Typography variant="subtitle2" fontWeight={700}>Missing Ticket Logging</Typography>
              <Chip label={missing.length} size="small" color={missing.length > 0 ? 'warning' : 'default'} />
              <Typography variant="caption" color="text.secondary">Answered calls with no CRM match</Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 280 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>Time</TableCell>
                    <TableCell>Queue</TableCell>
                    <TableCell>Phone Number</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {missing.map((m, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{m.date}</TableCell>
                      <TableCell>{m.time}</TableCell>
                      <TableCell>{m.queue}</TableCell>
                      <TableCell>{m.phoneNumber}</TableCell>
                    </TableRow>
                  ))}
                  {missing.length === 0 && (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: '#2E7D32', fontSize: '0.8rem' }}>✓ All answered calls have CRM tickets</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Multi-interaction review */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#F8FAFF', display: 'flex', gap: 1, alignItems: 'center' }}>
              <Typography variant="subtitle2" fontWeight={700}>Multi-Interaction Review</Typography>
              <Chip label={multiInteraction.length} size="small" color={multiInteraction.length > 0 ? 'warning' : 'default'} />
              <Typography variant="caption" color="text.secondary">Same ticket · same agent · same day · multiple interactions</Typography>
            </Box>
            <TableContainer sx={{ maxHeight: 240 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Ticket ID</TableCell>
                    <TableCell>Date</TableCell>
                    <TableCell align="right">Interactions</TableCell>
                    <TableCell>Types</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {multiInteraction.map((m, i) => (
                    <TableRow key={i} hover>
                      <TableCell><Chip label={m.ticketId || 'N/A'} size="small" variant="outlined" /></TableCell>
                      <TableCell>{m.date}</TableCell>
                      <TableCell align="right">
                        <Chip label={m.count} size="small" color="warning" sx={{ fontWeight: 700 }} />
                      </TableCell>
                      <TableCell sx={{ fontSize: '0.75rem' }}>{m.types}</TableCell>
                    </TableRow>
                  ))}
                  {multiInteraction.length === 0 && (
                    <TableRow><TableCell colSpan={4} align="center" sx={{ py: 3, color: '#2E7D32', fontSize: '0.8rem' }}>✓ No multi-interaction cases</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
        {/* Wrong interaction type flag */}
        {wrongInteractions.length > 0 && (
          <Grid item xs={12}>
            <Paper elevation={0} sx={{ border: '1px solid #FFCDD2', borderRadius: 2, overflow: 'hidden' }}>
              <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#FFF3F3', display: 'flex', gap: 1, alignItems: 'center' }}>
                <WarningIcon sx={{ fontSize: 18, color: '#C62828' }} />
                <Typography variant="subtitle2" fontWeight={700} color="#C62828">Wrong Interaction Type — Coaching Required</Typography>
                <Chip label={wrongInteractions.length} size="small" color="error" />
                <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                  Only Team Leads and SMEs may log "TL Review" — frontline agents must not use this type
                </Typography>
              </Box>
              <TableContainer sx={{ maxHeight: 240 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Ticket ID</TableCell>
                      <TableCell>Interaction Type Logged</TableCell>
                      <TableCell>Order ID</TableCell>
                      <TableCell>Reason</TableCell>
                      <TableCell>Coaching Note</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {wrongInteractions.map((r, i) => (
                      <TableRow key={i} hover sx={{ background: '#FFF8F8' }}>
                        <TableCell>{r.date}</TableCell>
                        <TableCell><Chip label={r.ticketId || 'N/A'} size="small" color="error" variant="outlined" /></TableCell>
                        <TableCell>
                          <Chip label={r.interactionType} size="small" sx={{ background: '#FFEBEE', color: '#C62828', fontWeight: 700, fontSize: '0.65rem' }} />
                        </TableCell>
                        <TableCell>{r.orderId || 'N/A'}</TableCell>
                        <TableCell sx={{ fontSize: '0.75rem' }}>{r.reason || 'N/A'}</TableCell>
                        <TableCell sx={{ fontSize: '0.72rem', color: '#C62828' }}>
                          "TL Review" is restricted to Team Leads and SMEs — correct to Call, Email, or Chat
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            </Paper>
          </Grid>
        )}
      </Grid>
    </Box>
  );
}
