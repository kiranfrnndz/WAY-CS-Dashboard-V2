import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
  palette: {
    mode: 'light',
    primary: { main: '#0D47A1', light: '#1565C0', dark: '#0A3880' },
    secondary: { main: '#FF6B35', light: '#FF8C5A', dark: '#E55A25' },
    background: { default: '#F0F2F8', paper: '#FFFFFF' },
    success: { main: '#2E7D32' },
    warning: { main: '#E65100' },
    error: { main: '#C62828' },
    text: { primary: '#1A1A2E', secondary: '#5C6B8A' },
  },
  typography: {
    fontFamily: '"DM Sans", sans-serif',
    h1: { fontWeight: 700, letterSpacing: '-0.5px' },
    h2: { fontWeight: 700, letterSpacing: '-0.3px' },
    h3: { fontWeight: 600 },
    h4: { fontWeight: 600 },
    h5: { fontWeight: 600 },
    h6: { fontWeight: 600 },
    body1: { fontSize: '0.9rem' },
    body2: { fontSize: '0.8rem' },
    button: { fontFamily: '"DM Sans", sans-serif', fontWeight: 600, textTransform: 'none' },
  },
  shape: { borderRadius: 10 },
  components: {
    MuiButton: {
      styleOverrides: {
        root: { borderRadius: 8, fontWeight: 600, textTransform: 'none' },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: { borderRadius: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.08)', border: '1px solid rgba(0,0,0,0.06)' },
      },
    },
    MuiChip: {
      styleOverrides: { root: { fontWeight: 600, fontSize: '0.72rem' } },
    },
    MuiTableHead: {
      styleOverrides: {
        root: {
          '& .MuiTableCell-head': {
            backgroundColor: '#F0F2F8',
            fontWeight: 700,
            fontSize: '0.75rem',
            color: '#5C6B8A',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            borderBottom: '2px solid #E0E4F0',
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: { fontSize: '0.83rem', borderColor: '#EEF0F8', padding: '10px 14px' },
      },
    },
    MuiTab: {
      styleOverrides: {
        root: { fontWeight: 600, textTransform: 'none', fontSize: '0.85rem', minHeight: 44 },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: { borderRadius: 16 },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: { backgroundImage: 'none' },
      },
    },
  },
});

export const COLORS = {
  blue: '#1565C0',
  orange: '#FF6B35',
  green: '#2E7D32',
  teal: '#00695C',
  purple: '#6A1B9A',
  amber: '#E65100',
  red: '#C62828',
  gray: '#546E7A',
  lightBlue: '#E3F2FD',
  lightGreen: '#E8F5E9',
  lightOrange: '#FFF3E0',
  lightRed: '#FFEBEE',
  lightPurple: '#F3E5F5',
  chartPalette: ['#1565C0', '#FF6B35', '#2E7D32', '#6A1B9A', '#00695C', '#E65100', '#C62828'],
};
