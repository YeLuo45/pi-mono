/**
 * CostAlertToast Component for PixelPal V88
 * 
 * Displays budget alert notifications when cost thresholds are exceeded.
 */

import React, { useState, useEffect } from 'react';
import { Snackbar, Alert, AlertTitle, Box, Typography, IconButton, Button } from '@mui/material';
import { Close as CloseIcon, Settings as SettingsIcon } from '@mui/icons-material';
import { budgetManager, type BudgetAlert } from '../../services/usage/BudgetManager';

interface CostAlertToastProps {
  onOpenSettings?: () => void;
}

export const CostAlertToast: React.FC<CostAlertToastProps> = ({ onOpenSettings }) => {
  const [alert, setAlert] = useState<BudgetAlert | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = budgetManager.subscribe((budgetAlert) => {
      setAlert(budgetAlert);
      setOpen(true);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const handleClose = () => {
    setOpen(false);
  };

  const handleOpenSettings = () => {
    setOpen(false);
    onOpenSettings?.();
  };

  if (!alert) return null;

  const getSeverity = () => {
    switch (alert.type) {
      case 'exceeded':
        return 'error';
      case 'critical':
        return 'warning';
      case 'warning':
        return 'warning';
      default:
        return 'info';
    }
  };

  const getTitle = () => {
    switch (alert.type) {
      case 'exceeded':
        return 'Budget Exceeded!';
      case 'critical':
        return 'Budget Warning';
      case 'warning':
        return 'Budget Notice';
      default:
        return 'Budget Alert';
    }
  };

  const formatBudgetType = (type: string) => {
    switch (type) {
      case 'daily': return 'Daily';
      case 'weekly': return 'Weekly';
      case 'monthly': return 'Monthly';
      default: return type;
    }
  };

  return (
    <Snackbar
      open={open}
      autoHideDuration={alert.type === 'exceeded' ? null : 10000}
      onClose={handleClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
    >
      <Alert
        severity={getSeverity()}
        variant="filled"
        onClose={handleClose}
        sx={{ width: '100%', minWidth: 300 }}
        action={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            {alert.type !== 'exceeded' && onOpenSettings && (
              <Button 
                color="inherit" 
                size="small" 
                onClick={handleOpenSettings}
                startIcon={<SettingsIcon />}
                sx={{ fontSize: 12 }}
              >
                Settings
              </Button>
            )}
            <IconButton 
              size="small" 
              color="inherit" 
              onClick={handleClose}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
        }
      >
        <AlertTitle sx={{ fontSize: 14, fontWeight: 600 }}>
          {getTitle()}
        </AlertTitle>
        <Box>
          <Typography variant="body2" sx={{ fontSize: 13 }}>
            Your <strong>{formatBudgetType(alert.budgetType)}</strong> budget 
            {alert.type === 'exceeded' 
              ? ' has been exceeded.' 
              : ` is at ${alert.percentage.toFixed(0)}%.`
            }
          </Typography>
          <Typography variant="body2" sx={{ fontSize: 12, mt: 0.5, opacity: 0.9 }}>
            Spent: <strong>${alert.current.toFixed(2)}</strong> / ${alert.limit.toFixed(2)}
          </Typography>
          {alert.providerId && (
            <Typography variant="body2" sx={{ fontSize: 11, mt: 0.5, opacity: 0.8 }}>
              Provider: {alert.providerId}
            </Typography>
          )}
        </Box>
      </Alert>
    </Snackbar>
  );
};

export default CostAlertToast;
