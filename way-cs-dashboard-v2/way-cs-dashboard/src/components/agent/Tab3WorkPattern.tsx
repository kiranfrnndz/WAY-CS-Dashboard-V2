import { useState } from 'react';
import {
  Box, Typography, Paper, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Chip, Grid, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell, ScatterChart, Scatter, Legend
} from 'recharts';
import type { EnrichedCall, CRMRow } from '../../types';
import { WRAP_BUCKETS, AVAILABLE_MINUTES } from '../../types';
import { computeWrapBuckets, computeGaps } from '../../engines/metrics';
import { fmtSeconds, groupBy } from '../../utils/format';
import DrillDownModal from '../modals/DrillDownModal';

interface Tab3Props {
  enriched: EnrichedCall[];
  crmRows: CRMRow[];
  agentName: string;
}

const BUCKET_COLORS = ['#2E7D32', '#1565C0', '#E65100', '#C62828'];

export default function Tab3WorkPattern({ enriched, crmRows, agentName }: Tab3Props) {
  const [selectedBucket, setSelectedBucket] = useState<typeof wrapBuckets[0] | null>(null);
  const [gapOpen, setGapOpen] = useState(false);
  const [timelineOpen, setTimelineOpen] = useState(false);

  const agentCalls = enriched.filter(c => c.agentName.trim() === agentName);
  const agentCRM = crmRows.filter(r => r.agentName.trim() === agentName);

  const wrapBuckets = computeWrapBuckets(agentCalls);
  const gaps = computeGaps(agentCalls);

  // Occupancy calculation
  const emails = agentCRM.filter(r => r.interactionType?.toLowerCase().includes('email'));
  const chats = agentCRM.filter(r => r.interactionType?.toLowerCase().includes('chat'));
  const escalations = agentCRM.filter(r => r.interactionType?.toLowerCase().includes('escalat'));
  const days = Math.max(1, new Set(agentCalls.map(c => c.date)).size);

  const callMins = agentCalls.reduce((s, c) => s + c.talkTime / 60, 0);
  const emailMins = emails.length * 6;
  const chatMins = chats.length * 4;
  const escalMins = escalations.length * 3;
  const crmMins = new Set(agentCRM.map(r => r.ticketId)).size * 1.5;
  const occupiedMins = callMins + emailMins + chatMins + escalMins + crmMins;
  const idleMins = Math.max(0, AVAILABLE_MINUTES * days - occupiedMins);

  const occupancyData = [
    { name: 'Calls', value: Math.round(callMins), fill: '#1565C0' },
    { name: 'Emails', value: Math.round(emailMins), fill: '#7B1FA2' },
    { name: 'Chats', value: Math.round(chatMins), fill: '#00695C' },
    { name: 'Escalations', value: Math.round(escalMins), fill: '#E65100' },
    { name: 'CRM Logging', value: Math.round(crmMins), fill: '#C62828' },
    { name: 'Idle', value: Math.round(idleMins), fill: '#CFD8DC' },
  ].filter(d => d.value > 0);

  // Timeline — calls grouped by hour
  const hourlyData = (() => {
    const hm = new Map<string, number>();
    for (const c of agentCalls) {
      const h = (c.time || '00:00').substring(0, 2);
      hm.set(h, (hm.get(h) || 0) + 1);
    }
    return [...hm.entries()].sort().map(([h, count]) => ({ hour: `${h}:00`, count }));
  })();

  const wrapData = wrapBuckets.map((b, i) => ({ name: b.label, count: b.count, fill: BUCKET_COLORS[i] }));

  return (
    <Box>
      <Grid container spacing={2}>
        {/* Hourly activity */}
        <Grid item xs={12} md={7}>
          <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Productivity Timeline</Typography>
                <Typography variant="caption" color="text.secondary">Call volume by hour</Typography>
              </Box>
              <Button size="small" variant="outlined" onClick={() => setTimelineOpen(true)}>All Calls</Button>
            </Box>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={hourlyData} barSize={18}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" vertical={false} />
                <XAxis dataKey="hour" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip formatter={(v) => [v, 'Calls']} />
                <Bar dataKey="count" fill="#1565C0" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Occupancy */}
        <Grid item xs={12} md={5}>
          <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2, p: 2, height: '100%' }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Occupancy Breakdown</Typography>
            {occupancyData.map(d => {
              const pct = Math.round((d.value / (AVAILABLE_MINUTES * days)) * 100);
              return (
                <Box key={d.name} sx={{ mb: 1.2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
                    <Typography sx={{ fontSize: '0.75rem', color: '#5C6B8A' }}>{d.name}</Typography>
                    <Typography sx={{ fontSize: '0.75rem', fontWeight: 700 }}>{d.value}m ({pct}%)</Typography>
                  </Box>
                  <Box sx={{ height: 6, background: '#F0F4F8', borderRadius: 3, overflow: 'hidden' }}>
                    <Box sx={{ height: '100%', width: `${Math.min(100, pct)}%`, background: d.fill, borderRadius: 3, transition: 'width 0.5s' }} />
                  </Box>
                </Box>
              );
            })}
            <Typography sx={{ fontSize: '0.7rem', color: '#5C6B8A', mt: 1.5, borderTop: '1px solid rgba(0,0,0,0.06)', pt: 1 }}>
              Available: {AVAILABLE_MINUTES * days}m over {days} day{days !== 1 ? 's' : ''}
            </Typography>
          </Paper>
        </Grid>

        {/* Wrap-up analysis */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.06)', background: '#F8FAFF' }}>
              <Typography variant="subtitle1" fontWeight={700}>Wrap-Up Analysis</Typography>
              <Typography variant="caption" color="text.secondary">Click a bucket to drill into calls</Typography>
            </Box>
            <Box sx={{ p: 2 }}>
              <ResponsiveContainer width="100%" height={160}>
                <BarChart data={wrapData} barSize={44}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis tick={{ fontSize: 12 }} />
                  <Tooltip />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]} onClick={(d, i) => setSelectedBucket(wrapBuckets[i])}>
                    {wrapData.map((d, i) => <Cell key={i} fill={d.fill} cursor="pointer" />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Bucket</TableCell>
                    <TableCell align="right">Count</TableCell>
                    <TableCell align="right">% of Calls</TableCell>
                    <TableCell></TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {wrapBuckets.map((b, i) => (
                    <TableRow key={b.label} hover sx={{ cursor: 'pointer' }} onClick={() => setSelectedBucket(b)}>
                      <TableCell><Chip label={b.label} size="small" sx={{ background: BUCKET_COLORS[i], color: '#fff', fontSize: '0.65rem' }} /></TableCell>
                      <TableCell align="right" sx={{ fontWeight: 600 }}>{b.count}</TableCell>
                      <TableCell align="right">{agentCalls.length ? Math.round((b.count / agentCalls.length) * 100) : 0}%</TableCell>
                      <TableCell><Typography sx={{ fontSize: '0.72rem', color: '#1565C0' }}>Drill →</Typography></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>

        {/* Gap analysis */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#F8FAFF' }}>
              <Box>
                <Typography variant="subtitle1" fontWeight={700}>Between-Call Gaps</Typography>
                <Typography variant="caption" color="text.secondary">Gaps &gt;30s between calls</Typography>
              </Box>
              {gaps.length > 5 && <Button size="small" onClick={() => setGapOpen(true)}>View All ({gaps.length})</Button>}
            </Box>
            <TableContainer sx={{ maxHeight: 280 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Prev End</TableCell>
                    <TableCell>Next Start</TableCell>
                    <TableCell align="right">Gap</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {gaps.slice(0, 8).map((g, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{g.prevCallEnd}</TableCell>
                      <TableCell>{g.nextCallStart}</TableCell>
                      <TableCell align="right"
                        sx={{ color: g.gapDuration > 600 ? '#C62828' : g.gapDuration > 300 ? '#E65100' : 'inherit', fontWeight: 600 }}>
                        {fmtSeconds(g.gapDuration)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {gaps.length === 0 && (
                    <TableRow><TableCell colSpan={3} align="center" sx={{ py: 3, color: '#5C6B8A' }}>No significant gaps found</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Wrap bucket drill-down */}
      {selectedBucket && (
        <DrillDownModal
          open={!!selectedBucket}
          onClose={() => setSelectedBucket(null)}
          title={`Wrap-Up: ${selectedBucket.label}`}
          calls={selectedBucket.calls}
          columns={['date', 'time', 'queue', 'talkTime', 'holdTime', 'wrapTime', 'aht', 'reason', 'subReason']}
        />
      )}

      {/* All calls modal */}
      <DrillDownModal
        open={timelineOpen}
        onClose={() => setTimelineOpen(false)}
        title={`All Calls — ${agentName}`}
        calls={agentCalls}
        columns={['date', 'time', 'queue', 'talkTime', 'holdTime', 'wrapTime', 'aht']}
      />

      {/* Gap detail modal */}
      <Dialog open={gapOpen} onClose={() => setGapOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
          <Typography variant="h6" fontWeight={700}>All Between-Call Gaps</Typography>
          <IconButton onClick={() => setGapOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  <TableCell>Previous Call End</TableCell>
                  <TableCell>Next Call Start</TableCell>
                  <TableCell align="right">Gap Duration</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {gaps.map((g, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{g.prevCallEnd}</TableCell>
                    <TableCell>{g.nextCallStart}</TableCell>
                    <TableCell align="right"
                      sx={{ color: g.gapDuration > 600 ? '#C62828' : g.gapDuration > 300 ? '#E65100' : 'inherit', fontWeight: 600 }}>
                      {fmtSeconds(g.gapDuration)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions><Button onClick={() => setGapOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
