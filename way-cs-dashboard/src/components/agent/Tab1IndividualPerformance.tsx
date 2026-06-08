import { useState } from 'react';
import {
  Box, Typography, Grid, Chip, Table, TableHead, TableBody,
  TableRow, TableCell, TableContainer, Paper, Button,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import PhoneCallbackIcon from '@mui/icons-material/PhoneCallback';
import CloseIcon from '@mui/icons-material/Close';
import type { AgentSummary, EnrichedCall } from '../../types';
import { DAILY_TARGET } from '../../types';
import StatCard from '../shared/StatCard';
import { fmtSeconds, fmtPct } from '../../utils/format';
import {
  RadialBarChart, RadialBar, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell
} from 'recharts';

interface Tab1Props {
  summary: AgentSummary;
  enriched: EnrichedCall[];
}

export default function Tab1IndividualPerformance({ summary, enriched }: Tab1Props) {
  const [bounceOpen, setBounceOpen] = useState(false);

  // Bounced calls = answered calls where numberOfBounces > 0
  // (Abandoned calls in CCDR have no agent — they are queue-level, not agent-specific)
  const bounced = enriched.filter(c =>
    c.callStatus === 'Answered' && (c.numberOfBounces || 0) > 0
  );

  const answered = enriched.filter(c =>
    (c.callStatus || '').toLowerCase().match(/answer|complet/)
  );

  const prodColor = summary.productivity === 'Exceeds Target' ? '#2E7D32'
    : summary.productivity === 'Meets Target' ? '#1565C0' : '#C62828';

  const utilPct = Math.round(summary.utilisation * 100);
  const fcrPct = Math.round(summary.fcr * 100);

  const interactionData = [
    { name: 'Calls', value: summary.calls, fill: '#1565C0' },
    { name: 'Emails', value: summary.emails, fill: '#7B1FA2' },
    { name: 'Chats', value: summary.chats, fill: '#00695C' },
    { name: 'Escalations', value: summary.escalations, fill: '#E65100' },
  ];

  const daysActive = summary.dates.length || 1;
  const avgPerDay = (summary.totalInteractions / daysActive).toFixed(1);

  return (
    <Box>
      {/* Hero metrics */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, mb: 2.5 }}>
        <StatCard
          label="Utilisation"
          value={`${utilPct}%`}
          sub={`Target: 60%+`}
          color={utilPct >= 75 ? '#2E7D32' : utilPct >= 60 ? '#1565C0' : '#C62828'}
          tooltip="(Calls × talk + Emails×6 + Chats×4 + Escalations×3 + CRM×1.5) / 480"
        />
        <StatCard
          label="Productivity"
          value={summary.totalInteractions}
          sub={`${avgPerDay}/day · Target: ${DAILY_TARGET}/day`}
          color={prodColor}
        />
        <StatCard label="FCR Rate" value={`${fcrPct}%`} sub="First Contact Resolution" color={fcrPct >= 85 ? '#2E7D32' : '#E65100'} />
        <StatCard
          label="Bounce Rate"
          value={`${Math.round(summary.bounceRate * 100)}%`}
          sub={`${bounced.length} bounced of ${enriched.length} offered`}
          color={summary.bounceRate < 0.05 ? '#2E7D32' : summary.bounceRate < 0.1 ? '#E65100' : '#C62828'}
          onClick={() => setBounceOpen(true)}
        />
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1.5, mb: 3 }}>
        <StatCard label="Calls" value={summary.calls} color="#1565C0" />
        <StatCard label="Emails" value={summary.emails} color="#7B1FA2" />
        <StatCard label="Chats" value={summary.chats} color="#00695C" />
        <StatCard label="Tickets Created" value={summary.tickets} color="#C62828" />
      </Box>

      {/* Productivity badge */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
        <Chip
          label={summary.productivity}
          icon={<TrendingUpIcon />}
          sx={{ background: prodColor, color: '#fff', fontWeight: 700, fontSize: '0.85rem', py: 2, px: 1 }}
        />
        <Typography variant="body2" color="text.secondary">
          {summary.dates.length} active day{summary.dates.length !== 1 ? 's' : ''} · 
          Avg AHT: {fmtSeconds(summary.avgAHT)} · 
          Avg Hold: {fmtSeconds(summary.avgHoldTime)} · 
          Avg Talk: {fmtSeconds(summary.avgTalkTime)}
        </Typography>
      </Box>

      {/* Charts */}
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2, p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Interaction Mix</Typography>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={interactionData} barSize={36}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F0F4F8" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {interactionData.map((d, i) => <Cell key={i} fill={d.fill} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2, p: 2 }}>
            <Typography variant="subtitle1" fontWeight={700} mb={2}>Performance Gauges</Typography>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
              {[
                { label: 'Utilisation', value: utilPct, color: utilPct >= 75 ? '#2E7D32' : '#1565C0', target: 60 },
                { label: 'FCR Rate', value: fcrPct, color: fcrPct >= 85 ? '#2E7D32' : '#E65100', target: 80 },
              ].map(g => (
                <Box key={g.label} sx={{ textAlign: 'center' }}>
                  <ResponsiveContainer width="100%" height={110}>
                    <RadialBarChart cx="50%" cy="100%" innerRadius="60%" outerRadius="100%"
                      startAngle={180} endAngle={0} data={[{ value: g.value, fill: g.color }]}>
                      <RadialBar background={{ fill: '#F0F4F8' }} dataKey="value" cornerRadius={4} />
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <Typography sx={{ fontSize: '1.4rem', fontWeight: 700, color: g.color, mt: -1 }}>{g.value}%</Typography>
                  <Typography sx={{ fontSize: '0.72rem', color: '#5C6B8A' }}>{g.label} · Target: {g.target}%</Typography>
                </Box>
              ))}
            </Box>
          </Paper>
        </Grid>

        {/* Call detail summary table */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid rgba(0,0,0,0.06)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="subtitle1" fontWeight={700}>Call Summary (Last {Math.min(20, answered.length)} Answered Calls)</Typography>
              <Button size="small" variant="outlined" startIcon={<PhoneCallbackIcon />} onClick={() => setBounceOpen(true)}>
                View Bounced ({bounced.length})
              </Button>
            </Box>
            <TableContainer sx={{ maxHeight: 300 }}>
              <Table size="small" stickyHeader>
                <TableHead>
                  <TableRow>
                    {['Date', 'Time', 'Queue', 'Talk', 'Hold', 'Wrap', 'AHT', 'Ticket', 'Reason'].map(h => (
                      <TableCell key={h}>{h}</TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {answered.slice(0, 20).map((c, i) => (
                    <TableRow key={i} hover>
                      <TableCell>{c.date}</TableCell>
                      <TableCell>{c.time}</TableCell>
                      <TableCell>{c.queue || 'N/A'}</TableCell>
                      <TableCell>{fmtSeconds(c.talkTime)}</TableCell>
                      <TableCell sx={{ color: c.holdTime > 240 ? '#C62828' : 'inherit', fontWeight: c.holdTime > 240 ? 700 : 400 }}>
                        {fmtSeconds(c.holdTime)}
                      </TableCell>
                      <TableCell>{fmtSeconds(c.wrapTime)}</TableCell>
                      <TableCell sx={{ color: (c.aht || c.talkTime + c.holdTime) > 330 ? '#C62828' : 'inherit' }}>
                        {fmtSeconds(c.aht || c.talkTime + c.holdTime)}
                      </TableCell>
                      <TableCell>{c.ticketId || '—'}</TableCell>
                      <TableCell sx={{ maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {c.reason || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                  {answered.length === 0 && (
                    <TableRow><TableCell colSpan={9} align="center" sx={{ py: 3, color: '#5C6B8A' }}>No answered calls</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Bounce modal */}
      <Dialog open={bounceOpen} onClose={() => setBounceOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h6" fontWeight={700}>Bounced / Abandoned Calls</Typography>
            <Typography variant="body2" color="text.secondary">{bounced.length} calls</Typography>
          </Box>
          <IconButton onClick={() => setBounceOpen(false)}><CloseIcon /></IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          <TableContainer sx={{ maxHeight: 400 }}>
            <Table size="small" stickyHeader>
              <TableHead>
                <TableRow>
                  {['Date', 'Time', 'Queue', 'Wait Time', 'Caller Number', '# Bounces'].map(h => (
                    <TableCell key={h}>{h}</TableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {bounced.map((c, i) => (
                  <TableRow key={i} hover>
                    <TableCell>{c.date}</TableCell>
                    <TableCell>{c.time}</TableCell>
                    <TableCell>{c.queue || 'N/A'}</TableCell>
                    <TableCell>{fmtSeconds(c.waitTime)}</TableCell>
                    <TableCell>{c.callerNumber || 'N/A'}</TableCell>
                    <TableCell><Chip label={c.numberOfBounces} size="small" color="warning" sx={{ fontSize: '0.65rem' }} /></TableCell>
                  </TableRow>
                ))}
                {bounced.length === 0 && (
                  <TableRow><TableCell colSpan={6} align="center" sx={{ py: 3, color: '#5C6B8A' }}>No bounced calls</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </DialogContent>
        <DialogActions><Button onClick={() => setBounceOpen(false)}>Close</Button></DialogActions>
      </Dialog>
    </Box>
  );
}
