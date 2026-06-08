import { useState, useCallback } from 'react';
import { Box, Container, Typography, AppBar, Toolbar, Chip, Snackbar, Alert, CircularProgress } from '@mui/material';
import SpeedIcon from '@mui/icons-material/Speed';
import type { CCDRRow, AgentCallRow, CRMRow, AgentSummary } from './types';
import { parseCCDR, parseAgentCall, parseCRM } from './engines/fileParser';
import { computeAgentSummaries } from './engines/metrics';
import FileUploadPanel from './components/shared/FileUploadPanel';
import HomePage from './components/home/HomePage';
import AgentDashboard from './components/agent/AgentDashboard';

export default function App() {
  const [ccdr, setCcdr] = useState<CCDRRow[] | null>(null);
  const [agentCall, setAgentCall] = useState<AgentCallRow[] | null>(null);
  const [crm, setCrm] = useState<CRMRow[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null);

  const summaries: AgentSummary[] = ccdr || crm
    ? computeAgentSummaries(ccdr || [], crm || [])
    : [];

  const handleFile = useCallback(async (file: File, type: 'ccdr' | 'agent' | 'crm') => {
    setLoading(true);
    try {
      if (type === 'ccdr') {
        const rows = await parseCCDR(file);
        setCcdr(rows);
        setToast({ msg: `CCDR loaded: ${rows.length} rows`, type: 'success' });
      } else if (type === 'agent') {
        const rows = await parseAgentCall(file);
        setAgentCall(rows);
        setToast({ msg: `Agent Call Detail loaded: ${rows.length} rows`, type: 'success' });
      } else {
        const rows = await parseCRM(file);
        setCrm(rows);
        setToast({ msg: `CRM Export loaded: ${rows.length} rows`, type: 'success' });
      }
    } catch (e) {
      setToast({ msg: `Failed to parse file: ${(e as Error).message}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  }, []);

  const selectedSummary = summaries.find(s => s.name === selectedAgent);

  return (
    <Box sx={{ minHeight: '100vh', background: '#F0F2F8' }}>
      {/* AppBar */}
      <AppBar position="sticky" elevation={0} sx={{
        background: '#0D47A1',
        borderBottom: '1px solid rgba(255,255,255,0.1)',
      }}>
        <Toolbar sx={{ gap: 2 }}>
          <SpeedIcon sx={{ fontSize: 26 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="subtitle1" fontWeight={700} sx={{ lineHeight: 1 }}>WAY CS Operations</Typography>
            <Typography sx={{ fontSize: '0.7rem', opacity: 0.7, lineHeight: 1 }}>Dashboard V2</Typography>
          </Box>
          {selectedAgent && (
            <Chip
              label={`Viewing: ${selectedAgent}`}
              size="small"
              onDelete={() => setSelectedAgent(null)}
              sx={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.75rem', '& .MuiChip-deleteIcon': { color: 'rgba(255,255,255,0.7)' } }}
            />
          )}
          {loading && <CircularProgress size={20} sx={{ color: '#fff' }} />}
          <Box sx={{ display: 'flex', gap: 1 }}>
            {ccdr && <Chip label={`CCDR: ${ccdr.length}`} size="small" sx={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.68rem' }} />}
            {crm && <Chip label={`CRM: ${crm.length}`} size="small" sx={{ background: 'rgba(255,255,255,0.15)', color: '#fff', fontSize: '0.68rem' }} />}
          </Box>
        </Toolbar>
      </AppBar>

      {/* Main content */}
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {/* Upload panel */}
        <FileUploadPanel
          ccdrLoaded={!!ccdr}
          agentLoaded={!!agentCall}
          crmLoaded={!!crm}
          loading={loading}
          onCCDR={f => handleFile(f, 'ccdr')}
          onAgentCall={f => handleFile(f, 'agent')}
          onCRM={f => handleFile(f, 'crm')}
        />

        {/* Page content */}
        {selectedAgent && selectedSummary ? (
          <AgentDashboard
            agentName={selectedAgent}
            summary={selectedSummary}
            allCalls={ccdr || []}
            crmRows={crm || []}
            onBack={() => setSelectedAgent(null)}
          />
        ) : (
          <HomePage
            agents={summaries}
            onSelectAgent={setSelectedAgent}
          />
        )}
      </Container>

      {/* Toast */}
      <Snackbar
        open={!!toast}
        autoHideDuration={4000}
        onClose={() => setToast(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        {toast ? (
          <Alert severity={toast.type} variant="filled" onClose={() => setToast(null)} sx={{ borderRadius: 2 }}>
            {toast.msg}
          </Alert>
        ) : undefined}
      </Snackbar>
    </Box>
  );
}
