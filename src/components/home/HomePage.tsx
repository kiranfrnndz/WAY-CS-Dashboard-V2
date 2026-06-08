import { useState, useMemo } from 'react';
import {
  Box, Typography, Grid, TextField, InputAdornment,
  Chip, Select, MenuItem, FormControl, InputLabel,
  Avatar, Paper, LinearProgress, Tooltip
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import PersonIcon from '@mui/icons-material/Person';
import PhoneIcon from '@mui/icons-material/Phone';
import EmailIcon from '@mui/icons-material/Email';
import ChatIcon from '@mui/icons-material/Chat';
import ConfirmationNumberIcon from '@mui/icons-material/ConfirmationNumber';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import type { AgentSummary } from '../../types';
import StatCard from '../shared/StatCard';
import { fmtPct } from '../../utils/format';

interface HomePageProps {
  agents: AgentSummary[];
  onSelectAgent: (name: string) => void;
}

const PRODUCTIVITY_COLOR: Record<string, string> = {
  'Exceeds Target': '#2E7D32',
  'Meets Target': '#1565C0',
  'Below Target': '#C62828',
};

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function AgentTile({ agent, onClick }: { agent: AgentSummary; onClick: () => void }) {
  const prodColor = PRODUCTIVITY_COLOR[agent.productivity];
  const utilPct = Math.round(agent.utilisation * 100);
  const fcrPct = Math.round(agent.fcr * 100);

  return (
    <Paper
      elevation={0}
      onClick={onClick}
      sx={{
        border: '1px solid rgba(0,0,0,0.07)',
        borderRadius: 2,
        p: 2,
        cursor: 'pointer',
        transition: 'all 0.18s',
        '&:hover': { boxShadow: '0 6px 24px rgba(21,101,192,0.13)', transform: 'translateY(-2px)', borderColor: '#1565C0' },
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Top accent bar */}
      <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: prodColor }} />

      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1.5 }}>
        <Avatar sx={{ bgcolor: '#E3F2FD', color: '#1565C0', fontWeight: 700, fontSize: '0.85rem', width: 40, height: 40 }}>
          {initials(agent.name)}
        </Avatar>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="subtitle2" fontWeight={700} noWrap>{agent.name}</Typography>
          <Chip
            label={agent.productivity}
            size="small"
            sx={{ fontSize: '0.6rem', height: 18, background: `${prodColor}18`, color: prodColor, fontWeight: 700 }}
          />
        </Box>
      </Box>

      {/* Mini stats grid */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 0.75, mb: 1.5 }}>
        {[
          { label: 'Calls', value: agent.calls },
          { label: 'Emails', value: agent.emails },
          { label: 'Chats', value: agent.chats },
        ].map(s => (
          <Box key={s.label} sx={{ textAlign: 'center', background: '#F8FAFF', borderRadius: 1, py: 0.5 }}>
            <Typography sx={{ fontSize: '0.95rem', fontWeight: 700, color: '#1A1A2E' }}>{s.value}</Typography>
            <Typography sx={{ fontSize: '0.6rem', color: '#5C6B8A', textTransform: 'uppercase' }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Utilisation bar */}
      <Box sx={{ mb: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.4 }}>
          <Typography sx={{ fontSize: '0.67rem', color: '#5C6B8A', textTransform: 'uppercase', fontWeight: 700 }}>Utilisation</Typography>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: utilPct >= 85 ? '#2E7D32' : utilPct >= 60 ? '#E65100' : '#C62828' }}>{utilPct}%</Typography>
        </Box>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, utilPct)}
          sx={{
            height: 5, borderRadius: 3,
            background: '#E8EEF8',
            '& .MuiLinearProgress-bar': {
              background: utilPct >= 85 ? '#2E7D32' : utilPct >= 60 ? '#E65100' : '#C62828',
              borderRadius: 3,
            }
          }}
        />
      </Box>

      {/* FCR */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontSize: '0.67rem', color: '#5C6B8A', textTransform: 'uppercase', fontWeight: 700 }}>FCR</Typography>
        <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: fcrPct >= 80 ? '#2E7D32' : fcrPct >= 70 ? '#E65100' : '#C62828' }}>{fcrPct}%</Typography>
      </Box>
    </Paper>
  );
}

export default function HomePage({ agents, onSelectAgent }: HomePageProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');

  const totals = useMemo(() => ({
    agents: agents.length,
    calls: agents.reduce((s, a) => s + a.calls, 0),
    emails: agents.reduce((s, a) => s + a.emails, 0),
    chats: agents.reduce((s, a) => s + a.chats, 0),
    tickets: agents.reduce((s, a) => s + a.tickets, 0),
    avgUtil: agents.length ? agents.reduce((s, a) => s + a.utilisation, 0) / agents.length : 0,
    avgFcr: agents.length ? agents.reduce((s, a) => s + a.fcr, 0) / agents.length : 0,
  }), [agents]);

  const filtered = useMemo(() => {
    return agents.filter(a => {
      const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'All' || a.productivity === filter;
      return matchSearch && matchFilter;
    });
  }, [agents, search, filter]);

  return (
    <Box>
      {/* Global stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 1.5, mb: 3 }}>
        <StatCard label="Frontline Agents" value={totals.agents} icon={<PersonIcon />} color="#1565C0" />
        <StatCard label="Total Calls" value={totals.calls.toLocaleString()} icon={<PhoneIcon />} color="#7B1FA2" />
        <StatCard label="Total Emails" value={totals.emails.toLocaleString()} icon={<EmailIcon />} color="#00695C" />
        <StatCard label="Total Chats" value={totals.chats.toLocaleString()} icon={<ChatIcon />} color="#E65100" />
        <StatCard label="Total Tickets" value={totals.tickets.toLocaleString()} icon={<ConfirmationNumberIcon />} color="#C62828" />
        <StatCard label="Avg Utilisation" value={fmtPct(totals.avgUtil)} icon={<TrendingUpIcon />}
          color={totals.avgUtil >= 0.75 ? '#2E7D32' : totals.avgUtil >= 0.6 ? '#1565C0' : '#C62828'}
          tooltip="Occupied time / 480 available minutes" />
        <StatCard label="Avg FCR" value={fmtPct(totals.avgFcr)} color={totals.avgFcr >= 0.85 ? '#2E7D32' : '#E65100'}
          tooltip="First Contact Resolution rate" />
      </Box>

      {/* Search and filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 2.5 }}>
        <TextField
          placeholder="Search agents…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          size="small"
          sx={{ flex: 1 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon sx={{ fontSize: 18, color: '#94A3B8' }} /></InputAdornment> }}
        />
        <FormControl size="small" sx={{ minWidth: 180 }}>
          <InputLabel>Productivity Filter</InputLabel>
          <Select value={filter} label="Productivity Filter" onChange={e => setFilter(e.target.value)}>
            <MenuItem value="All">All Agents</MenuItem>
            <MenuItem value="Exceeds Target">Exceeds Target</MenuItem>
            <MenuItem value="Meets Target">Meets Target</MenuItem>
            <MenuItem value="Below Target">Below Target</MenuItem>
          </Select>
        </FormControl>
        <Typography sx={{ alignSelf: 'center', color: '#5C6B8A', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
          {filtered.length} of {agents.length} agents
        </Typography>
      </Box>

      {/* Agent tiles */}
      {agents.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8, color: '#94A3B8' }}>
          <PersonIcon sx={{ fontSize: 56, mb: 2, opacity: 0.3 }} />
          <Typography variant="h6" color="text.secondary">Upload data files to view agent metrics</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>Start by uploading the CCDR and CRM files above</Typography>
        </Box>
      ) : (
        <Grid container spacing={1.5}>
          {filtered.map(agent => (
            <Grid item xs={12} sm={6} md={4} lg={3} xl={2} key={agent.name}>
              <AgentTile agent={agent} onClick={() => onSelectAgent(agent.name)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
