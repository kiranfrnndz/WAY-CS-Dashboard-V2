import { useRef } from 'react';
import { Box, Typography, Paper, Button, Chip, LinearProgress } from '@mui/material';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import TableChartIcon from '@mui/icons-material/TableChart';

interface FileUploadPanelProps {
  ccdrLoaded: boolean;
  agentLoaded: boolean;
  crmLoaded: boolean;
  loading: boolean;
  onCCDR: (file: File) => void;
  onAgentCall: (file: File) => void;
  onCRM: (file: File) => void;
}

interface UploadSlotProps {
  label: string;
  description: string;
  loaded: boolean;
  onFile: (file: File) => void;
  color: string;
}

function UploadSlot({ label, description, loaded, onFile, color }: UploadSlotProps) {
  const ref = useRef<HTMLInputElement>(null);
  return (
    <Paper
      elevation={0}
      sx={{
        border: `2px dashed ${loaded ? color : '#CBD5E1'}`,
        borderRadius: 2,
        p: 2.5,
        textAlign: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        background: loaded ? `${color}08` : '#FAFBFD',
        '&:hover': { borderColor: color, background: `${color}05` },
        position: 'relative',
        overflow: 'hidden',
      }}
      onClick={() => ref.current?.click()}
    >
      <input
        ref={ref}
        type="file"
        accept=".xlsx,.xls,.csv"
        style={{ display: 'none' }}
        onChange={e => { if (e.target.files?.[0]) onFile(e.target.files[0]); }}
      />
      {loaded ? (
        <CheckCircleIcon sx={{ fontSize: 32, color, mb: 1 }} />
      ) : (
        <UploadFileIcon sx={{ fontSize: 32, color: '#94A3B8', mb: 1 }} />
      )}
      <Typography variant="subtitle2" fontWeight={700} sx={{ color: loaded ? color : '#1A1A2E' }}>
        {label}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
        {description}
      </Typography>
      {loaded && (
        <Chip label="Loaded" size="small" sx={{ mt: 1, background: color, color: '#fff', fontSize: '0.65rem' }} />
      )}
    </Paper>
  );
}

export default function FileUploadPanel({ ccdrLoaded, agentLoaded, crmLoaded, loading, onCCDR, onAgentCall, onCRM }: FileUploadPanelProps) {
  const allLoaded = ccdrLoaded && agentLoaded && crmLoaded;

  return (
    <Box sx={{ mb: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        <TableChartIcon sx={{ color: '#1565C0' }} />
        <Typography variant="h6" fontWeight={700}>Data Sources</Typography>
        {allLoaded && (
          <Chip label="All files loaded" color="success" size="small" icon={<CheckCircleIcon />} sx={{ ml: 'auto' }} />
        )}
      </Box>
      {loading && <LinearProgress sx={{ mb: 1, borderRadius: 1 }} />}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
        <UploadSlot
          label="Call Center Call Detail"
          description="CCDR — Inbound/Outbound call log with talk, hold, wrap times"
          loaded={ccdrLoaded}
          onFile={onCCDR}
          color="#1565C0"
        />
        <UploadSlot
          label="Agent Call Detail"
          description="Per-agent call breakdown for queue assignment"
          loaded={agentLoaded}
          onFile={onAgentCall}
          color="#7B1FA2"
        />
        <UploadSlot
          label="CRM Ticket Export"
          description="Zoho / CRM tickets with reason, sub-reason, action taken"
          loaded={crmLoaded}
          onFile={onCRM}
          color="#00695C"
        />
      </Box>
    </Box>
  );
}
