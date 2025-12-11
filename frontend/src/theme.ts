import { createTheme } from '@mui/material/styles';

export const theme = createTheme({
    palette: {
        primary: {
            main: '#2E7D7D', // Verde-azulado dos botões
            dark: '#1E5D5D',
            light: '#4A9D9D',
        },
        secondary: {
            main: '#1F3A52', // Azul escuro do chat
            dark: '#0F2436',
            light: '#2D5371',
        },
        background: {
            default: '#F8F9FA',
            paper: '#FFFFFF',
        },
        text: {
            primary: '#1F2937',
            secondary: '#6B7280',
        },
        error: {
            main: '#EF4444', // Para emergências
        },
        warning: {
            main: '#F59E0B',
        },
        success: {
            main: '#10B981',
        },
    },
    typography: {
        fontFamily: "'Inter', 'Roboto', 'Helvetica', 'Arial', sans-serif",
        h1: {
            fontSize: '32px',
            fontWeight: 700,
            color: '#1F2937',
        },
        h2: {
            fontSize: '24px',
            fontWeight: 600,
            color: '#1F2937',
        },
        h3: {
            fontSize: '18px',
            fontWeight: 600,
            color: '#1F2937',
        },
        body1: {
            fontSize: '14px',
            fontWeight: 400,
            color: '#1F2937',
        },
        body2: {
            fontSize: '13px',
            fontWeight: 400,
            color: '#6B7280',
        },
        button: {
            fontSize: '13px',
            fontWeight: 500,
            textTransform: 'none',
        },
    },
    shape: {
        borderRadius: 8,
    },
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '6px',
                    padding: '8px 16px',
                },
                contained: {
                    boxShadow: 'none',
                    '&:hover': {
                        boxShadow: 'none',
                    },
                },
            },
        },
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: '8px',
                    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                },
            },
        },
    },
});
