import { useState } from 'react';
import {
  Box, Typography, Paper, Grid, Chip, Button, Alert,
  Table, TableHead, TableBody, TableRow, TableCell, TableContainer,
  Dialog, DialogTitle, DialogContent, DialogActions, IconButton
} from '@mui/material';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import StarIcon from '@mui/icons-material/Star';
import BuildIcon from '@mui/icons-material/Build';
import CloseIcon from '@mui/icons-material/Close';
import type { AgentSummary, EnrichedCall, CRMRow, CoachingInsight } from '../../types';
import { computeCoachingInsights, computeFCR, computeDuplicateTickets } from '../../engines/metrics';
import { fmtSeconds, orNA } from '../../utils/format';
import DrillDownModal from '../modals/DrillDownModal';

interface Tab5Props {
  summary: AgentSummary;
  enriched: EnrichedCall[];
  crmRows: CRMRow[];
  agentName: string;
}

const SEVERITY_COLOR = { low: '#2E7D32', medium: '#E65100', high: '#C62828' };

export default function Tab5Coaching({ summary, enriched, crmRows, agentName }: Tab5Props) {
  const [activeInsight, setActiveInsight] = useState<CoachingInsight | null>(null);

  const agentCalls = enriched.filter(c => c.agentName.trim() === agentName);
  const fcrRecords = computeFCR(crmRows, agentName);
  const duplicates = computeDuplicateTickets(crmRows, agentName);

  const insights = computeCoachingInsights(summary, agentCalls, crmRows, fcrRecords, duplicates);
  const strengths = insights.filter(i => i.type === 'strength');
  const improvements = insights.filter(i => i.type === 'improvement');

  const hasStrengths = strengths.length > 0;
  const hasImprovements = improvements.length > 0;

  return (
    <Box>
      {/* Summary alert */}
      {!hasImprovements && hasStrengths && (
        <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>
          Excellent performance! {agentName} meets or exceeds all key metrics.
        </Alert>
      )}
      {improvements.filter(i => i.severity === 'high').length > 0 && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {improvements.filter(i => i.severity === 'high').length} high-priority area{improvements.filter(i => i.severity === 'high').length !== 1 ? 's' : ''} requiring immediate attention.
        </Alert>
      )}

      <Grid container spacing={2}>
        {/* Strengths */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid rgba(46,125,50,0.2)', borderRadius: 2, overflow: 'hidden', height: '100%' }}>
            <Box sx={{ p: 2, background: '#F1F8E9', borderBottom: '1px solid rgba(46,125,50,0.15)', display: 'flex', gap: 1, alignItems: 'center' }}>
              <StarIcon sx={{ color: '#2E7D32', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700} color="#2E7D32">Strengths</Typography>
              <Chip label={strengths.length} size="small" sx={{ background: '#2E7D32', color: '#fff', fontSize: '0.65rem' }} />
            </Box>
            <Box sx={{ p: 2 }}>
              {strengths.length === 0 ? (
                <Typography color="text.secondary" sx={{ fontSize: '0.85rem', textAlign: 'center', py: 2 }}>
                  No notable strengths identified yet. Keep building!
                </Typography>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {strengths.map((s, i) => (
                    <Box
                      key={i}
                      onClick={() => s.details.length > 0 && setActiveInsight(s)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        p: 1.5, borderRadius: 1.5, background: '#F9FBF6',
                        border: '1px solid rgba(46,125,50,0.15)',
                        cursor: s.details.length > 0 ? 'pointer' : 'default',
                        '&:hover': s.details.length > 0 ? { background: '#F1F8E9' } : {},
                        transition: 'all 0.15s',
                      }}
                    >
                      <TrendingUpIcon sx={{ color: '#2E7D32', fontSize: 22 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1A1A2E' }}>{s.label}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#5C6B8A' }}>{s.category}</Typography>
                      </Box>
                      <Chip label={s.value} size="small" sx={{ background: '#E8F5E9', color: '#2E7D32', fontWeight: 700, fontSize: '0.7rem' }} />
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Improvement Areas */}
        <Grid item xs={12} md={6}>
          <Paper elevation={0} sx={{ border: '1px solid rgba(198,40,40,0.2)', borderRadius: 2, overflow: 'hidden', height: '100%' }}>
            <Box sx={{ p: 2, background: '#FFF3F0', borderBottom: '1px solid rgba(198,40,40,0.15)', display: 'flex', gap: 1, alignItems: 'center' }}>
              <BuildIcon sx={{ color: '#C62828', fontSize: 20 }} />
              <Typography variant="subtitle1" fontWeight={700} color="#C62828">Improvement Areas</Typography>
              <Chip label={improvements.length} size="small" sx={{ background: '#C62828', color: '#fff', fontSize: '0.65rem' }} />
            </Box>
            <Box sx={{ p: 2 }}>
              {improvements.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 2 }}>
                  <TrendingUpIcon sx={{ fontSize: 36, color: '#2E7D32', mb: 1 }} />
                  <Typography color="text.secondary" sx={{ fontSize: '0.85rem' }}>No improvement areas identified. Great work!</Typography>
                </Box>
              ) : (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
                  {improvements.map((s, i) => (
                    <Box
                      key={i}
                      onClick={() => setActiveInsight(s)}
                      sx={{
                        display: 'flex', alignItems: 'center', gap: 1.5,
                        p: 1.5, borderRadius: 1.5,
                        background: s.severity === 'high' ? '#FFF3F3' : s.severity === 'medium' ? '#FFF8F0' : '#FAFAFA',
                        border: `1px solid ${SEVERITY_COLOR[s.severity]}28`,
                        cursor: 'pointer',
                        '&:hover': { filter: 'brightness(0.97)' },
                        transition: 'all 0.15s',
                      }}
                    >
                      <TrendingDownIcon sx={{ color: SEVERITY_COLOR[s.severity], fontSize: 22 }} />
                      <Box sx={{ flex: 1 }}>
                        <Typography sx={{ fontWeight: 700, fontSize: '0.85rem', color: '#1A1A2E' }}>{s.label}</Typography>
                        <Typography sx={{ fontSize: '0.75rem', color: '#5C6B8A' }}>{s.category}</Typography>
                      </Box>
                      <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 0.5 }}>
                        <Chip label={s.value} size="small"
                          sx={{ background: `${SEVERITY_COLOR[s.severity]}18`, color: SEVERITY_COLOR[s.severity], fontWeight: 700, fontSize: '0.7rem' }} />
                        <Chip label={s.severity} size="small"
                          sx={{ background: SEVERITY_COLOR[s.severity], color: '#fff', fontWeight: 700, fontSize: '0.6rem', height: 16 }} />
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Coaching summary table */}
        <Grid item xs={12}>
          <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
            <Box sx={{ p: 2, background: '#F8FAFF', borderBottom: '1px solid rgba(0,0,0,0.06)' }}>
              <Typography variant="subtitle1" fontWeight={700}>Coaching Summary</Typography>
              <Typography variant="caption" color="text.secondary">Click any row to view supporting evidence</Typography>
            </Box>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Type</TableCell>
                    <TableCell>Category</TableCell>
                    <TableCell>Finding</TableCell>
                    <TableCell>Value</TableCell>
                    <TableCell>Priority</TableCell>
                    <TableCell>Evidence</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {insights.map((ins, i) => (
                    <TableRow
                      key={i} hover
                      sx={{ cursor: 'pointer', background: ins.type === 'strength' ? '#FAFFF8' : '#FFFAFA' }}
                      onClick={() => setActiveInsight(ins)}
                    >
                      <TableCell>
                        <Chip
                          label={ins.type === 'strength' ? '↑ Strength' : '↓ Improve'}
                          size="small"
                          sx={{
                            background: ins.type === 'strength' ? '#E8F5E9' : '#FFEBEE',
                            color: ins.type === 'strength' ? '#2E7D32' : '#C62828',
                            fontWeight: 700, fontSize: '0.65rem'
                          }}
                        />
                      </TableCell>
                      <TableCell sx={{ fontWeight: 600 }}>{ins.category}</TableCell>
                      <TableCell>{ins.label}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: ins.type === 'strength' ? '#2E7D32' : SEVERITY_COLOR[ins.severity] }}>
                        {ins.value}
                      </TableCell>
                      <TableCell>
                        {ins.type === 'improvement' && (
                          <Chip label={ins.severity} size="small"
                            sx={{ background: SEVERITY_COLOR[ins.severity], color: '#fff', fontSize: '0.6rem', height: 18 }} />
                        )}
                      </TableCell>
                      <TableCell>
                        {ins.details.length > 0 && (
                          <Typography sx={{ fontSize: '0.72rem', color: '#1565C0' }}>
                            {ins.details.length} call{ins.details.length !== 1 ? 's' : ''} →
                          </Typography>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                  {insights.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} align="center" sx={{ py: 4, color: '#5C6B8A' }}>
                        Upload data to generate coaching insights
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Evidence drill-down */}
      {activeInsight && activeInsight.details.length > 0 && (
        <DrillDownModal
          open={!!activeInsight}
          onClose={() => setActiveInsight(null)}
          title={`Evidence: ${activeInsight.label}`}
          calls={activeInsight.details}
          columns={['date', 'time', 'queue', 'ticketId', 'holdTime', 'aht', 'reason', 'subReason', 'actionTaken']}
        />
      )}

      {/* Text-only insight dialog */}
      {activeInsight && activeInsight.details.length === 0 && (
        <Dialog open onClose={() => setActiveInsight(null)} maxWidth="xs" fullWidth>
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between' }}>
            <Typography fontWeight={700}>{activeInsight.label}</Typography>
            <IconButton onClick={() => setActiveInsight(null)}><CloseIcon /></IconButton>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2">Category: {activeInsight.category}</Typography>
            <Typography variant="body2">Metric value: <strong>{activeInsight.value}</strong></Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>
              {activeInsight.type === 'strength'
                ? 'This is a positive performance indicator. Keep up the excellent work!'
                : 'This area requires focused coaching and improvement. Review specific calls in Tab 2 or Tab 3 for context.'}
            </Typography>
          </DialogContent>
          <DialogActions><Button onClick={() => setActiveInsight(null)}>Close</Button></DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
