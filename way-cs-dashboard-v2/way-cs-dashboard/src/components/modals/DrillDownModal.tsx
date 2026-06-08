import {
  Dialog, DialogTitle, DialogContent, DialogActions,
  Button, Table, TableHead, TableBody, TableRow, TableCell,
  TableContainer, Typography, Box, Chip, IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import DownloadIcon from '@mui/icons-material/Download';
import type { EnrichedCall } from '../../types';
import { fmtSeconds, orNA } from '../../utils/format';
import { exportToExcel } from '../../engines/fileParser';

interface DrillDownModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  calls: EnrichedCall[];
  columns?: string[];
}

const ALL_COLUMNS = ['date', 'time', 'queue', 'ticketId', 'orderId', 'talkTime', 'holdTime', 'aht', 'reason', 'subReason', 'actionTaken', 'callerNumber'];

const COLUMN_LABELS: Record<string, string> = {
  date: 'Date', time: 'Time', queue: 'Queue', ticketId: 'Ticket ID',
  orderId: 'Order ID', talkTime: 'Talk', holdTime: 'Hold', aht: 'AHT',
  reason: 'Reason', subReason: 'Sub Reason', actionTaken: 'Action Taken',
  callerNumber: 'Caller', wrapTime: 'Wrap', waitTime: 'Wait',
};

function renderCell(call: EnrichedCall, col: string): React.ReactNode {
  switch (col) {
    case 'ticketId': return <Chip label={orNA(call.ticketId)} size="small" variant="outlined" />;
    case 'orderId': return orNA(call.orderId);
    case 'talkTime': return fmtSeconds(call.talkTime);
    case 'holdTime': {
      const sec = call.holdTime;
      return (
        <Typography sx={{ color: sec > 240 ? '#C62828' : 'inherit', fontWeight: sec > 240 ? 600 : 400, fontSize: '0.83rem' }}>
          {fmtSeconds(sec)}
        </Typography>
      );
    }
    case 'aht': {
      const sec = call.aht || call.talkTime + call.holdTime;
      return (
        <Typography sx={{ color: sec > 330 ? '#C62828' : 'inherit', fontWeight: sec > 330 ? 600 : 400, fontSize: '0.83rem' }}>
          {fmtSeconds(sec)}
        </Typography>
      );
    }
    case 'wrapTime': return fmtSeconds(call.wrapTime);
    case 'waitTime': return fmtSeconds(call.waitTime);
    case 'reason': return orNA(call.reason);
    case 'subReason': return orNA(call.subReason);
    case 'actionTaken': return orNA(call.actionTaken);
    case 'queue': return call.queue || call.crmQueue || 'N/A';
    default: return String((call as unknown as Record<string, unknown>)[col] ?? 'N/A');
  }
}

export default function DrillDownModal({ open, onClose, title, calls, columns }: DrillDownModalProps) {
  const cols = columns || ALL_COLUMNS;

  const handleExport = () => {
    const data = calls.map(c => ({
      Date: c.date, Time: c.time, Agent: c.agentName, Queue: c.queue || c.crmQueue || '',
      'Ticket ID': c.ticketId || '', 'Order ID': c.orderId || '',
      'Talk Time': fmtSeconds(c.talkTime), 'Hold Time': fmtSeconds(c.holdTime),
      'Wrap Time': fmtSeconds(c.wrapTime), AHT: fmtSeconds(c.aht || c.talkTime + c.holdTime),
      Reason: c.reason || '', 'Sub Reason': c.subReason || '',
      'Action Taken': c.actionTaken || '', 'Caller Number': c.callerNumber,
    }));
    exportToExcel(data, `${title.replace(/\s+/g, '_')}.xlsx`);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="lg" fullWidth
      PaperProps={{ sx: { borderRadius: 3 } }}>
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box>
          <Typography variant="h6" fontWeight={700}>{title}</Typography>
          <Typography variant="body2" color="text.secondary">{calls.length} record{calls.length !== 1 ? 's' : ''}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button size="small" startIcon={<DownloadIcon />} onClick={handleExport} variant="outlined">Export</Button>
          <IconButton size="small" onClick={onClose}><CloseIcon /></IconButton>
        </Box>
      </DialogTitle>
      <DialogContent sx={{ p: 0 }}>
        <TableContainer sx={{ maxHeight: 520 }}>
          <Table stickyHeader size="small">
            <TableHead>
              <TableRow>
                {cols.map(c => (
                  <TableCell key={c}>{COLUMN_LABELS[c] || c}</TableCell>
                ))}
                <TableCell>CRM Match</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {calls.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={cols.length + 1} align="center" sx={{ py: 4, color: '#5C6B8A' }}>
                    No records found
                  </TableCell>
                </TableRow>
              ) : (
                calls.map((call, i) => (
                  <TableRow key={call.callId || i} hover>
                    {cols.map(c => (
                      <TableCell key={c}>{renderCell(call, c)}</TableCell>
                    ))}
                    <TableCell>
                      <Chip
                        label={call.crmMatchFound ? 'Matched' : 'Not Found'}
                        size="small"
                        color={call.crmMatchFound ? 'success' : 'default'}
                        sx={{ fontSize: '0.65rem' }}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={onClose} variant="contained" disableElevation>Close</Button>
      </DialogActions>
    </Dialog>
  );
}
