import { useState, useMemo } from 'react';
import {
  Box, Typography, Tabs, Tab, Paper, Avatar, Chip,
  IconButton, Tooltip, Button
} from '@mui/material';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import AssessmentIcon from '@mui/icons-material/Assessment';
import QueuePlayNextIcon from '@mui/icons-material/QueuePlayNext';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import VerifiedIcon from '@mui/icons-material/Verified';
import PsychologyIcon from '@mui/icons-material/Psychology';
import type { AgentSummary, EnrichedCall, CRMRow } from '../../types';
import { enrichCalls } from '../../engines/crmMatcher';
import type { CCDRRow } from '../../types';
import Tab1IndividualPerformance from './Tab1IndividualPerformance';
import Tab2QueuePerformance from './Tab2QueuePerformance';
import Tab3WorkPattern from './Tab3WorkPattern';
import Tab4QCCompliance from './Tab4QCCompliance';
import Tab5Coaching from './Tab5Coaching';

interface AgentDashboardProps {
  agentName: string;
  summary: AgentSummary;
  allCalls: CCDRRow[];
  crmRows: CRMRow[];
  onBack: () => void;
}

const PRODUCTIVITY_COLOR: Record<string, string> = {
  'Exceeds Target': '#2E7D32',
  'Meets Target': '#1565C0',
  'Below Target': '#C62828',
};

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

export default function AgentDashboard({ agentName, summary, allCalls, crmRows, onBack }: AgentDashboardProps) {
  const [tab, setTab] = useState(0);

  const enriched = useMemo<EnrichedCall[]>(() => {
    const agentCalls = allCalls.filter(c => c.agentName.trim() === agentName);
    return enrichCalls(agentCalls, crmRows);
  }, [allCalls, crmRows, agentName]);

  const prodColor = PRODUCTIVITY_COLOR[summary.productivity];

  const tabs = [
    { label: 'Individual Performance', icon: <AssessmentIcon sx={{ fontSize: 18 }} /> },
    { label: 'Queue Performance', icon: <QueuePlayNextIcon sx={{ fontSize: 18 }} /> },
    { label: 'Work Pattern', icon: <AccessTimeIcon sx={{ fontSize: 18 }} /> },
    { label: 'QC & Compliance', icon: <VerifiedIcon sx={{ fontSize: 18 }} /> },
    { label: 'Coaching', icon: <PsychologyIcon sx={{ fontSize: 18 }} /> },
  ];

  return (
    <Box>
      {/* Agent header */}
      <Paper elevation={0} sx={{
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: 2,
        p: 2.5,
        mb: 2.5,
        background: 'linear-gradient(135deg, #F8FAFF 0%, #EEF2FF 100%)',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Accent stripe */}
        <Box sx={{ position: 'absolute', top: 0, left: 0, bottom: 0, width: 4, background: prodColor }} />

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          <IconButton onClick={onBack} size="small" sx={{ background: '#fff', border: '1px solid rgba(0,0,0,0.08)', '&:hover': { background: '#F0F4FF' } }}>
            <ArrowBackIcon fontSize="small" />
          </IconButton>

          <Avatar sx={{ width: 52, height: 52, bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 700, fontSize: '1.1rem' }}>
            {initials(agentName)}
          </Avatar>

          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" fontWeight={700}>{agentName}</Typography>
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mt: 0.5 }}>
              <Chip label={summary.productivity} size="small" sx={{ background: prodColor, color: '#fff', fontWeight: 700, fontSize: '0.7rem' }} />
              <Chip label={`${summary.calls} calls`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
              <Chip label={`${summary.emails} emails`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
              <Chip label={`${summary.chats} chats`} size="small" variant="outlined" sx={{ fontSize: '0.7rem' }} />
              <Chip label={`${Math.round(summary.utilisation * 100)}% util`} size="small" variant="outlined"
                sx={{ fontSize: '0.7rem', color: summary.utilisation >= 0.75 ? '#2E7D32' : summary.utilisation >= 0.6 ? '#1565C0' : '#C62828' }} />
              <Chip label={`${Math.round(summary.fcr * 100)}% FCR`} size="small" variant="outlined"
                sx={{ fontSize: '0.7rem', color: summary.fcr >= 0.85 ? '#2E7D32' : '#E65100' }} />
            </Box>
          </Box>

          <Box sx={{ textAlign: 'right' }}>
            <Typography sx={{ fontSize: '0.72rem', color: '#5C6B8A' }}>Active dates: {summary.dates.length}</Typography>
            <Typography sx={{ fontSize: '0.72rem', color: '#5C6B8A' }}>{summary.dates[0]} → {summary.dates[summary.dates.length - 1] || 'N/A'}</Typography>
          </Box>
        </Box>
      </Paper>

      {/* Tabs */}
      <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.06)', borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          sx={{
            borderBottom: '1px solid rgba(0,0,0,0.08)',
            background: '#FAFBFD',
            '& .MuiTab-root': { minHeight: 48, fontSize: '0.8rem' },
            '& .Mui-selected': { color: '#1565C0', fontWeight: 700 },
            '& .MuiTabs-indicator': { background: '#1565C0', height: 3 },
          }}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((t, i) => (
            <Tab key={i} label={t.label} icon={t.icon} iconPosition="start" />
          ))}
        </Tabs>

        <Box sx={{ p: 2.5 }}>
          {tab === 0 && <Tab1IndividualPerformance summary={summary} enriched={enriched} />}
          {tab === 1 && <Tab2QueuePerformance enriched={enriched} crmRows={crmRows} agentName={agentName} />}
          {tab === 2 && <Tab3WorkPattern enriched={enriched} crmRows={crmRows} agentName={agentName} />}
          {tab === 3 && <Tab4QCCompliance enriched={enriched} crmRows={crmRows} agentName={agentName} />}
          {tab === 4 && <Tab5Coaching summary={summary} enriched={enriched} crmRows={crmRows} agentName={agentName} />}
        </Box>
      </Paper>
    </Box>
  );
}
