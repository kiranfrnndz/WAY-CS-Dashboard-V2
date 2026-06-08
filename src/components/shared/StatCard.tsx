import { Box, Typography, Tooltip } from '@mui/material';
import type { SxProps } from '@mui/material';

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  icon?: React.ReactNode;
  color?: string;
  bgColor?: string;
  tooltip?: string;
  sx?: SxProps;
  onClick?: () => void;
}

export default function StatCard({ label, value, sub, icon, color = '#1565C0', bgColor, tooltip, sx, onClick }: StatCardProps) {
  const card = (
    <Box
      onClick={onClick}
      sx={{
        background: bgColor || '#fff',
        border: '1px solid rgba(0,0,0,0.06)',
        borderRadius: '12px',
        p: 2,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.15s',
        '&:hover': onClick ? { boxShadow: '0 4px 16px rgba(0,0,0,0.10)', transform: 'translateY(-1px)' } : {},
        ...sx,
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <Box>
          <Typography sx={{ fontSize: '0.7rem', fontWeight: 700, color: '#5C6B8A', textTransform: 'uppercase', letterSpacing: '0.6px', mb: 0.5 }}>
            {label}
          </Typography>
          <Typography sx={{ fontSize: '1.6rem', fontWeight: 700, color, lineHeight: 1.1 }}>
            {value}
          </Typography>
          {sub && (
            <Typography sx={{ fontSize: '0.72rem', color: '#5C6B8A', mt: 0.5 }}>{sub}</Typography>
          )}
        </Box>
        {icon && (
          <Box sx={{ color, opacity: 0.8, mt: 0.25 }}>{icon}</Box>
        )}
      </Box>
    </Box>
  );

  return tooltip ? <Tooltip title={tooltip}>{card}</Tooltip> : card;
}
