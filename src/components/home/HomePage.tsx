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
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import type { AgentSummary, UnrosteredAgent, ProductivityMode, ProductivityMeasure } from '../../types';
import { teamMedianPerDay } from '../../engines/metrics';
import StatCard from '../shared/StatCard';
import { fmtPct } from '../../utils/format';

interface HomePageProps {
  agents: AgentSummary[];
  unrostered?: UnrosteredAgent[];
  dailyTarget: number;
  prodMode: ProductivityMode;
  measure: ProductivityMeasure;
  onMeasureChange: (m: ProductivityMeasure) => void;
  onTargetChange: (n: number) => void;
  onModeChange: (m: ProductivityMode) => void;
  onSelectAgent: (name: string) => void;
}

type ScopeFilter = 'English' | 'Spanish' | 'All';

const PRODUCTIVITY_COLOR: Record<string, string> = {
  'Exceeds Target': '#2E7D32',
  'Meets Target': '#1565C0',
  'Below Target': '#C62828',
};

function initials(name: string): string {
  return name.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
}

function AgentTile({ agent, measure, onClick }: { agent: AgentSummary; measure: ProductivityMeasure; onClick: () => void }) {
  const prodColor = PRODUCTIVITY_COLOR[agent.productivity];
  const utilPct = Math.round(agent.utilisation * 100);
  // FCR reads n/a when no CRM rows matched — previously rendered as a red 0%.
  const fcrPct = agent.fcrAvailable ? Math.round(agent.fcr * 100) : null;

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
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
            <Chip
              label={agent.productivity}
              size="small"
              sx={{ fontSize: '0.6rem', height: 18, background: `${prodColor}18`, color: prodColor, fontWeight: 700 }}
            />
            {agent.queueScope === 'Spanish' && (
              <Tooltip title="Spanish queue — excluded from team aggregates and peer benchmarking">
                <Chip label="ES" size="small"
                  sx={{ fontSize: '0.6rem', height: 18, background: '#EDE7F6', color: '#5E35B1', fontWeight: 700 }} />
              </Tooltip>
            )}
          </Box>
        </Box>
      </Box>

      {/* Mini stats grid */}
      {/* Tickets tile added: tickets and escalations feed the utilisation formula,
          so an agent could show 0/0/0 yet still carry a utilisation figure. */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 0.6, mb: 1.5 }}>
        {[
          { label: 'Calls', value: agent.calls },
          { label: 'Emails', value: agent.emails },
          { label: 'Chats', value: agent.chats },
          { label: 'Tickets', value: agent.tickets },
        ].map(s => (
          <Box key={s.label} sx={{ textAlign: 'center', background: '#F8FAFF', borderRadius: 1, py: 0.5 }}>
            <Typography sx={{ fontSize: '0.9rem', fontWeight: 700, color: '#1A1A2E' }}>{s.value}</Typography>
            <Typography sx={{ fontSize: '0.55rem', color: '#5C6B8A', textTransform: 'uppercase' }}>{s.label}</Typography>
          </Box>
        ))}
      </Box>

      {/* Per-day KPI on the selected measure, over WORKED days. */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.75 }}>
        <Typography sx={{ fontSize: '0.67rem', color: '#5C6B8A', textTransform: 'uppercase', fontWeight: 700 }}>
          {measure === 'tickets' ? 'Tickets / day' : 'Per day'}
        </Typography>
        <Tooltip title={measure === 'tickets'
          ? `${agent.tickets} tickets over ${agent.workedDays} worked days`
          : `${agent.totalInteractions} interactions over ${agent.workedDays} worked days`}>
          <Typography sx={{ fontSize: '0.8rem', fontWeight: 700, color: prodColor }}>
            {(measure === 'tickets' ? agent.ticketsPerDay : agent.perDay).toFixed(1)}
          </Typography>
        </Tooltip>
      </Box>

      {/* Days worked out of the file's span. Shown because per-day figures divide
          by WORKED days, so an agent who worked 5 of 13 reads the same as one who
          worked 13 at the same daily rate — the absence is otherwise invisible. */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
        <Typography sx={{ fontSize: '0.67rem', color: '#5C6B8A', textTransform: 'uppercase', fontWeight: 700 }}>Days</Typography>
        <Tooltip title={`Active on ${agent.workedDays} of ${agent.availableDays} days in the file. Week-offs are not subtracted, so a full-time agent typically shows 9-10 of 13.`}>
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#5C6B8A' }}>
            {agent.workedDays}/{agent.availableDays}
          </Typography>
        </Tooltip>
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

      {/* Ticket logging ratio — flags handled contacts with no ticket logged. */}
      {agent.totalInteractions > 0 && agent.ticketRatio < 0.5 && (
        <Tooltip title={`${agent.tickets} tickets against ${agent.totalInteractions} interactions. Low ratio usually means contacts handled without a ticket logged.`}>
          <Typography sx={{ fontSize: '0.62rem', color: '#E65100', mb: 0.75 }}>
            Low ticket logging ({Math.round(agent.ticketRatio * 100)}%)
          </Typography>
        </Tooltip>
      )}

      {/* FCR */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography sx={{ fontSize: '0.67rem', color: '#5C6B8A', textTransform: 'uppercase', fontWeight: 700 }}>FCR</Typography>
        {fcrPct === null ? (
          <Tooltip title="No FCR-eligible CRM rows matched this agent — not a performance result">
            <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: '#94A3B8' }}>n/a</Typography>
          </Tooltip>
        ) : (
          <Typography sx={{ fontSize: '0.72rem', fontWeight: 700, color: fcrPct >= 80 ? '#2E7D32' : fcrPct >= 70 ? '#E65100' : '#C62828' }}>{fcrPct}%</Typography>
        )}
      </Box>
    </Paper>
  );
}

export default function HomePage({
  agents, unrostered = [], dailyTarget, prodMode, measure,
  onTargetChange, onModeChange, onMeasureChange, onSelectAgent,
}: HomePageProps) {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('All');
  const [scope, setScope] = useState<ScopeFilter>('English');
  const [showUnrostered, setShowUnrostered] = useState(false);

  // Only names that actually need a decision. Known non-CS are already excluded
  // and are not surfaced on this view.
  const unknownNames = useMemo(
    () => unrostered.filter(u => !u.knownNonCS),
    [unrostered]
  );

  /**
   * Team aggregates are computed on the CURRENT SCOPE, and scope defaults to
   * English. Spanish-queue agents have a different handling profile, so folding
   * them into the headline AHT/FCR/utilisation would distort the English baseline.
   */
  const scoped = useMemo(
    () => (scope === 'All' ? agents : agents.filter(a => a.queueScope === scope)),
    [agents, scope]
  );

  const totals = useMemo(() => {
    const withFcr = scoped.filter(a => a.fcrAvailable);
    return {
      agents: scoped.length,
      calls: scoped.reduce((s, a) => s + a.calls, 0),
      emails: scoped.reduce((s, a) => s + a.emails, 0),
      chats: scoped.reduce((s, a) => s + a.chats, 0),
      tickets: scoped.reduce((s, a) => s + a.tickets, 0),
      avgUtil: scoped.length ? scoped.reduce((s, a) => s + a.utilisation, 0) / scoped.length : 0,
      // Averaged over agents WITH FCR data only — including n/a agents as 0
      // dragged the team figure down artificially.
      avgFcr: withFcr.length ? withFcr.reduce((s, a) => s + a.fcr, 0) / withFcr.length : 0,
      fcrCoverage: scoped.length ? withFcr.length / scoped.length : 0,
    };
  }, [scoped]);

  const filtered = useMemo(() => {
    return scoped.filter(a => {
      const matchSearch = a.name.toLowerCase().includes(search.toLowerCase());
      const matchFilter = filter === 'All' || a.productivity === filter;
      return matchSearch && matchFilter;
    });
  }, [scoped, search, filter]);

  const median = useMemo(() => teamMedianPerDay(agents, measure), [agents, measure]);

  const windowDays  = agents.length ? agents[0].availableDays : 0;
  const windowLabel = useMemo(() => {
    const all = agents.flatMap(a => a.dates).sort();
    return all.length ? `${all[0]} to ${all[all.length - 1]}` : '';
  }, [agents]);

  const englishCount = useMemo(() => agents.filter(a => a.queueScope === 'English').length, [agents]);
  const spanishCount = useMemo(() => agents.filter(a => a.queueScope === 'Spanish').length, [agents]);

  return (
    <Box>
      {/* Global stats */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 1.2, mb: 3 }}>
        <StatCard label="Reporting Window"
          value={windowDays ? `${windowDays} days` : '—'}
          sub={windowLabel}
          color="#455A64"
          tooltip="Calendar span of the uploaded files, inclusive. Week-offs and leave are not subtracted." />
        <StatCard label={scope === 'All' ? 'Rostered Agents' : `${scope} Agents`} value={totals.agents} icon={<PersonIcon />} color="#1565C0"
          tooltip={`Roster: ${englishCount} English + ${spanishCount} Spanish`} />
        <StatCard label="Total Calls" value={totals.calls.toLocaleString()} icon={<PhoneIcon />} color="#7B1FA2" />
        <StatCard label="Total Emails" value={totals.emails.toLocaleString()} icon={<EmailIcon />} color="#00695C" />
        <StatCard label="Total Chats" value={totals.chats.toLocaleString()} icon={<ChatIcon />} color="#E65100" />
        <StatCard label="Total Tickets" value={totals.tickets.toLocaleString()} icon={<ConfirmationNumberIcon />} color="#C62828" />
        <StatCard label="Avg Utilisation" value={fmtPct(totals.avgUtil)} icon={<TrendingUpIcon />}
          color={totals.avgUtil >= 0.75 ? '#2E7D32' : totals.avgUtil >= 0.6 ? '#1565C0' : '#C62828'}
          tooltip="Occupied time / 480 available minutes" />
        <StatCard label="Avg FCR" value={fmtPct(totals.avgFcr)} color={totals.avgFcr >= 0.85 ? '#2E7D32' : '#E65100'}
          sub={`${Math.round(totals.fcrCoverage * 100)}% of agents have FCR data`}
          tooltip="Averaged over agents with FCR-eligible CRM rows only. Agents showing n/a are not counted as 0." />
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
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Queue</InputLabel>
          <Select value={scope} label="Queue" onChange={e => setScope(e.target.value as ScopeFilter)}>
            <MenuItem value="English">English ({englishCount})</MenuItem>
            <MenuItem value="Spanish">Spanish ({spanishCount})</MenuItem>
            <MenuItem value="All">All ({agents.length})</MenuItem>
          </Select>
        </FormControl>
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
          {filtered.length} of {scoped.length} agents
        </Typography>
      </Box>

      {/* Productivity basis — the verdict on every card depends on this.
          A fixed 60/day was not derived from this team's volume; on a 13-day
          export it marks everyone Below Target. Median banding compares agents
          to their own team instead. */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2.5, flexWrap: 'wrap' }}>
        <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#5C6B8A', textTransform: 'uppercase' }}>
          Productivity basis
        </Typography>
        <FormControl size="small" sx={{ minWidth: 165 }}>
          <Select value={measure} onChange={e => onMeasureChange(e.target.value as ProductivityMeasure)}>
            <MenuItem value="interactions">Interactions / day</MenuItem>
            <MenuItem value="tickets">Tickets / day</MenuItem>
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 190 }}>
          <Select value={prodMode} onChange={e => onModeChange(e.target.value as ProductivityMode)}>
            <MenuItem value="absolute">Fixed target / day</MenuItem>
            <MenuItem value="median">Banded vs team median</MenuItem>
          </Select>
        </FormControl>
        {prodMode === 'absolute' && (
          <TextField
            size="small" type="number" label="Target / day"
            value={dailyTarget}
            onChange={e => onTargetChange(Math.max(1, Number(e.target.value) || 1))}
            sx={{ width: 130 }}
          />
        )}
        <Tooltip title="Median interactions per active day across the English roster. Use this to set a target from evidence rather than assumption.">
          <Chip
            label={`Team median: ${median.toFixed(1)} ${measure === 'tickets' ? 'tickets' : 'interactions'}/day`}
            size="small"
            onClick={prodMode === 'absolute' ? () => onTargetChange(Math.round(median)) : undefined}
            sx={{ fontSize: '0.7rem', background: '#E3F2FD', color: '#1565C0', fontWeight: 700,
                  cursor: prodMode === 'absolute' ? 'pointer' : 'default' }}
          />
        </Tooltip>
        {prodMode === 'absolute' && median > 0 && dailyTarget > median * 1.5 && (
          <Typography sx={{ fontSize: '0.7rem', color: '#E65100' }}>
            Target is more than 1.5&times; the team median — most agents will read Below Target.
          </Typography>
        )}
      </Box>

      {/* Unrostered activity — ONLY names that need a decision.
          Known non-CS names (TLs, QC, Disputes, Decagon, ex-team, non-India) are
          NOT rendered: they are already excluded and listing them every load is
          noise on a team productivity view. Only "Unknown" names appear here,
          because those are either a new joiner or an unmapped variant that is
          silently under-counting a rostered agent. Empty = nothing renders. */}
      {unknownNames.length > 0 && (
        <Paper elevation={0} sx={{ border: '1px solid #FFE0B2', background: '#FFFDF7', borderRadius: 2, px: 2, py: 1.25, mb: 2 }}>
          <Box
            onClick={() => setShowUnrostered(v => !v)}
            sx={{ display: 'flex', alignItems: 'center', gap: 1, cursor: 'pointer' }}
          >
            <WarningAmberIcon sx={{ fontSize: 16, color: '#E65100' }} />
            <Typography sx={{ fontSize: '0.75rem', fontWeight: 700, color: '#E65100', flex: 1 }}>
              {unknownNames.length} unrecognised name{unknownNames.length === 1 ? '' : 's'} in the data — excluded from all KPIs
            </Typography>
            <Typography sx={{ fontSize: '0.7rem', color: '#B26500' }}>
              {showUnrostered ? 'hide' : 'show'}
            </Typography>
          </Box>
          {showUnrostered && (
            <Box sx={{ mt: 1.25 }}>
              <Typography sx={{ fontSize: '0.7rem', color: '#7A6A55', mb: 1 }}>
                Either a new joiner, or a spelling variant of a rostered agent — if it is a
                variant, that agent&rsquo;s volume is being under-counted until it is added to
                ALIASES in roster.ts.
              </Typography>
              <Box sx={{ display: 'flex', gap: 0.6, flexWrap: 'wrap' }}>
                {unknownNames.map(u => (
                  <Tooltip key={u.name} title={`${u.calls} CCDR calls · ${u.crmRows} CRM rows · source: ${u.source}`}>
                    <Chip label={`${u.name} (${u.calls + u.crmRows})`} size="small"
                      sx={{ fontSize: '0.66rem', height: 22, background: '#FFF3E0', color: '#E65100', border: '1px solid #FFCC80' }} />
                  </Tooltip>
                ))}
              </Box>
            </Box>
          )}
        </Paper>
      )}

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
              <AgentTile agent={agent} measure={measure} onClick={() => onSelectAgent(agent.name)} />
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
