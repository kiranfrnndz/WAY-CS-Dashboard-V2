import { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Chip, Accordion,
  AccordionSummary, AccordionDetails, Button
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { EnrichedCall, CRMRow } from '../../types';
import { HIGH_HOLD_THRESHOLD, LONG_AHT_THRESHOLD } from '../../types';
import { computeQueueSummary } from '../../engines/metrics';
import { fmtSeconds, orNA, groupBy } from '../../utils/format';
import DrillDownModal from '../modals/DrillDownModal';

interface Tab2Props {
  enriched: EnrichedCall[];
  crmRows: CRMRow[];
  agentName: string;
}

export default function Tab2QueuePerformance({ enriched, crmRows, agentName }: Tab2Props) {
  const [selectedQueue, setSelectedQueue] = useState<EnrichedCall[] | null>(null);
  const [selectedQueueName, setSelectedQueueName] = useState('');
  const [holdDrillOpen, setHoldDrillOpen] = useState(false);
  const [ahtDrillOpen, setAhtDrillOpen] = useState(false);

  const agentCalls = enriched.filter(c => c.agentName.trim() === agentName);
  const queueSummaries = computeQueueSummary(agentCalls);

  const agentCRM = crmRows.filter(r => r.agentName.trim() === agentName);
  const emails = agentCRM.filter(r => r.interactionType?.toLowerCase().includes('email'));
  const chats = agentCRM.filter(r => r.interactionType?.toLowerCase().includes('chat'));

  const highHoldCalls = agentCalls.filter(c => c.holdTime > HIGH_HOLD_THRESHOLD);
  const longAHTCalls = agentCalls.filter(c => (c.aht || c.talkTime + c.holdTime) > LONG_AHT_THRESHOLD);

  const emailGroups = groupBy(emails, r => `${r.reason || 'Unknown'}__${r.subReason || ''}`);
  const chatGroups = groupBy(chats, r => `${r.reason || 'Unknown'}__${r.subReason || ''}`);

  const openQueue = (q: typeof queueSummaries[0]) => {
    setSelectedQueue(q.calls);
    setSelectedQueueName(q.queue);
  };

  return (
    <Box>
      {/* Call Queue Summary */}
      <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden', mb: 2.5 }}>
        <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#F8FAFF' }}>
          <Typography variant="subtitle1" fontWeight={700}>Call Queue Summary</Typography>
          <Typography variant="caption" color="text.secondary">Click a row to drill into calls</Typography>
        </Box>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Queue</TableCell>
                <TableCell align="right">Total Calls</TableCell>
                <TableCell align="right">Total Talk</TableCell>
                <TableCell align="right">Total Hold</TableCell>
                <TableCell align="right">Avg AHT</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {queueSummaries.map(q => (
                <TableRow key={q.queue} hover sx={{ cursor: 'pointer' }} onClick={() => openQueue(q)}>
                  <TableCell><Chip label={q.queue} size="small" variant="outlined" /></TableCell>
                  <TableCell align="right" sx={{ fontWeight: 600 }}>{q.totalCalls}</TableCell>
                  <TableCell align="right">{fmtSeconds(q.totalTalkTime)}</TableCell>
                  <TableCell align="right">{fmtSeconds(q.totalHoldTime)}</TableCell>
                  <TableCell align="right"
                    sx={{ color: q.avgAHT > LONG_AHT_THRESHOLD ? '#C62828' : 'inherit', fontWeight: q.avgAHT > LONG_AHT_THRESHOLD ? 700 : 400 }}>
                    {fmtSeconds(q.avgAHT)}
                  </TableCell>
                  <TableCell><Typography sx={{ fontSize: '0.72rem', color: '#1565C0' }}>View →</Typography></TableCell>
                </TableRow>
              ))}
              {queueSummaries.length === 0 && (
                <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: '#5C6B8A' }}>No call data</TableCell></TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Alerts row */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2.5 }}>
        {/* High Hold Time */}
        <Paper elevation={0} sx={{ border: `1px solid ${highHoldCalls.length > 0 ? '#FFCDD2' : 'rgba(0,0,0,0.06)'}`, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: highHoldCalls.length > 0 ? '#FFF3F3' : '#F8FAFF', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {highHoldCalls.length > 0 && <WarningAmberIcon sx={{ fontSize: 18, color: '#C62828' }} />}
              <Typography variant="subtitle2" fontWeight={700}>High Hold Time (&gt;4 min)</Typography>
              <Chip label={highHoldCalls.length} size="small" color={highHoldCalls.length > 0 ? 'error' : 'default'} />
            </Box>
            {highHoldCalls.length > 0 && (
              <Button size="small" onClick={() => setHoldDrillOpen(true)}>View All</Button>
            )}
          </Box>
          <TableContainer sx={{ maxHeight: 200 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Queue</TableCell>
                  <TableCell>Hold</TableCell>
                  <TableCell>Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {highHoldCalls.slice(0, 5).map((c, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{c.queue || 'N/A'}</TableCell>
                    <TableCell sx={{ color: '#C62828', fontWeight: 700 }}>{fmtSeconds(c.holdTime)}</TableCell>
                    <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{orNA(c.reason)}</TableCell>
                  </TableRow>
                ))}
                {highHoldCalls.length === 0 && (
                  <TableRow><TableCell colSpan={3} align="center" sx={{ py: 2, color: '#5C6B8A', fontSize: '0.8rem' }}>✓ No high hold calls</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>

        {/* Long AHT */}
        <Paper elevation={0} sx={{ border: `1px solid ${longAHTCalls.length > 0 ? '#FFF3E0' : 'rgba(0,0,0,0.06)'}`, borderRadius: 2, overflow: 'hidden' }}>
          <Box sx={{ p: 1.5, display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: longAHTCalls.length > 0 ? '#FFF8F0' : '#F8FAFF', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {longAHTCalls.length > 0 && <WarningAmberIcon sx={{ fontSize: 18, color: '#E65100' }} />}
              <Typography variant="subtitle2" fontWeight={700}>Long AHT (&gt;5m 30s)</Typography>
              <Chip label={longAHTCalls.length} size="small" color={longAHTCalls.length > 0 ? 'warning' : 'default'} />
            </Box>
            {longAHTCalls.length > 0 && (
              <Button size="small" onClick={() => setAhtDrillOpen(true)}>View All</Button>
            )}
          </Box>
          <TableContainer sx={{ maxHeight: 200 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Queue</TableCell>
                  <TableCell>AHT</TableCell>
                  <TableCell>Reason</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {longAHTCalls.slice(0, 5).map((c, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{c.queue || 'N/A'}</TableCell>
                    <TableCell sx={{ color: '#E65100', fontWeight: 700 }}>{fmtSeconds(c.aht || c.talkTime + c.holdTime)}</TableCell>
                    <TableCell sx={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{orNA(c.reason)}</TableCell>
                  </TableRow>
                ))}
                {longAHTCalls.length === 0 && (
                  <TableRow><TableCell colSpan={3} align="center" sx={{ py: 2, color: '#5C6B8A', fontSize: '0.8rem' }}>✓ No long AHT calls</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Paper>
      </Box>

      {/* Email & Chat Summary */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
        {[{ label: 'Email Summary', groups: emailGroups }, { label: 'Chat Summary', groups: chatGroups }].map(({ label, groups }) => (
          <Paper key={label} elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 1.5, background: '#F8FAFF', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <Typography variant="subtitle2" fontWeight={700}>{label}</Typography>
              <Typography variant="caption" color="text.secondary">Grouped by Reason → Sub Reason</Typography>
            </Box>
            <Box sx={{ maxHeight: 280, overflow: 'auto' }}>
              {[...groups.entries()].sort((a, b) => b[1].length - a[1].length).slice(0, 20).map(([key, rows]) => {
                const [reason, sub] = key.split('__');
                return (
                  <Accordion key={key} elevation={0} disableGutters sx={{ border: 'none', '&:before': { display: 'none' } }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon sx={{ fontSize: 16 }} />} sx={{ minHeight: 36, px: 2, '& .MuiAccordionSummary-content': { m: '6px 0' } }}>
                      <Box sx={{ display: 'flex', flex: 1, alignItems: 'center', gap: 1, overflow: 'hidden' }}>
                        <Chip label={rows.length} size="small" sx={{ fontSize: '0.65rem', height: 18, background: '#E3F2FD', color: '#1565C0', fontWeight: 700 }} />
                        <Typography sx={{ fontSize: '0.78rem', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{reason}</Typography>
                        {sub && <Typography sx={{ fontSize: '0.72rem', color: '#5C6B8A', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>→ {sub}</Typography>}
                      </Box>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0, borderTop: '1px solid rgba(0,0,0,0.06)' }}>
                      <Table size="small">
                        <TableHead>
                          <TableRow>
                            <TableCell>Ticket ID</TableCell>
                            <TableCell>Reason</TableCell>
                            <TableCell>Sub Reason</TableCell>
                            <TableCell>Action</TableCell>
                          </TableRow>
                        </TableHead>
                        <TableBody>
                          {rows.slice(0, 5).map((r, i) => (
                            <TableRow key={i}>
                              <TableCell><Chip label={r.ticketId || 'N/A'} size="small" variant="outlined" /></TableCell>
                              <TableCell sx={{ fontSize: '0.75rem' }}>{r.reason || 'N/A'}</TableCell>
                              <TableCell sx={{ fontSize: '0.75rem' }}>{r.subReason || 'N/A'}</TableCell>
                              <TableCell sx={{ fontSize: '0.75rem', maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.actionTaken || 'N/A'}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </AccordionDetails>
                  </Accordion>
                );
              })}
              {groups.size === 0 && (
                <Box sx={{ py: 3, textAlign: 'center', color: '#5C6B8A', fontSize: '0.8rem' }}>No {label.toLowerCase()} records</Box>
              )}
            </Box>
          </Paper>
        ))}
      </Box>

      {/* Drill-down modals */}
      {selectedQueue && (
        <DrillDownModal
          open={!!selectedQueue}
          onClose={() => setSelectedQueue(null)}
          title={`${selectedQueueName} — Call Detail`}
          calls={selectedQueue}
          columns={['date', 'time', 'ticketId', 'orderId', 'talkTime', 'holdTime', 'aht', 'reason', 'subReason', 'actionTaken']}
        />
      )}
      <DrillDownModal
        open={holdDrillOpen}
        onClose={() => setHoldDrillOpen(false)}
        title="High Hold Time Calls (>4 min)"
        calls={highHoldCalls}
        columns={['date', 'time', 'queue', 'holdTime', 'ticketId', 'reason', 'subReason', 'actionTaken']}
      />
      <DrillDownModal
        open={ahtDrillOpen}
        onClose={() => setAhtDrillOpen(false)}
        title="Long AHT Calls (>5m 30s)"
        calls={longAHTCalls}
        columns={['date', 'time', 'queue', 'aht', 'ticketId', 'reason', 'subReason', 'actionTaken']}
      />
    </Box>
  );
}
