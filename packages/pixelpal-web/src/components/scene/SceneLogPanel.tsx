import React, { useState } from 'react';
import { MyBox as Box, MyTypography as Typography, MyIconButton as IconButton, MyChip as Chip, MyList as List, MyListItem as ListItem, MyDivider as Divider, MyButton as Button } from '../MUI替代';
import {
  History as HistoryIcon,
  Delete as DeleteIcon,
  CheckCircle as CheckCircleIcon,
  Error as ErrorIcon,
  Close as CloseIcon,
} from '@mui/icons-material';
import { useSceneStore, type SceneLog } from '../../stores/sceneStore';
import { useTranslation } from 'react-i18next';

interface SceneLogPanelProps {
  onClose?: () => void;
}

export const SceneLogPanel: React.FC<SceneLogPanelProps> = ({ onClose }) => {
  const { t } = useTranslation();
  const logs = useSceneStore((s) => s.sceneLogs);
  const clearLogs = useSceneStore((s) => s.clearLogs);
  const [showAll, setShowAll] = useState(false);

  const displayed = showAll ? logs : logs.slice(0, 20);

  const formatTime = (ts: number) => {
    const d = new Date(ts);
    const date = d.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' });
    const time = d.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    return `${date} ${time}`;
  };

  return (
    <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column', p: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <HistoryIcon fontSize="small" />
          <Typography variant="h6" sx={{ fontWeight: 700 }}>
            {t('scene.executionLog', '执行日志')}
          </Typography>
          {logs.length > 0 && (
            <Chip label={logs.length} size="small" color="primary" sx={{ height: 20, fontSize: 11 }} />
          )}
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {logs.length > 0 && (
            <Button size="small" startIcon={<DeleteIcon />} onClick={clearLogs} color="error" variant="text">
              {t('scene.clear', '清空')}
            </Button>
          )}
          {onClose && (
            <IconButton size="small" onClick={onClose}>
              <CloseIcon />
            </IconButton>
          )}
        </Box>
      </Box>

      {logs.length === 0 ? (
        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {t('scene.noLogs', '暂无执行日志')}
          </Typography>
        </Box>
      ) : (
        <Box sx={{ flex: 1, overflow: 'auto' }}>
          <List dense disablePadding>
            {displayed.map((log) => (
              <LogItem key={log.id} log={log} formatTime={formatTime} />
            ))}
          </List>
          {!showAll && logs.length > 20 && (
            <Button size="small" onClick={() => setShowAll(true)} sx={{ mt: 1 }}>
              {t('scene.viewAll', '查看全部')} {logs.length} {t('scene.logs', '条')}
            </Button>
          )}
        </Box>
      )}
    </Box>
  );
};

const LogItem: React.FC<{ log: SceneLog; formatTime: (ts: number) => string }> = ({ log, formatTime }) => {
  const isError = log.status === 'error';
  const icon = isError ? (
    <ErrorIcon sx={{ fontSize: 18, color: 'error.main' }} />
  ) : (
    <CheckCircleIcon sx={{ fontSize: 18, color: 'success.main' }} />
  );

  return (
    <>
      <ListItem
        sx={{
          px: 1.5,
          py: 1,
          bgcolor: isError ? 'rgba(211, 47, 47, 0.06)' : 'transparent',
          borderRadius: 1,
          mb: 0.5,
          flexDirection: 'column',
          alignItems: 'flex-start',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', gap: 1 }}>
          {icon}
          <Chip
            label={log.sceneName}
            size="small"
            sx={{ fontSize: 11, height: 20, bgcolor: 'rgba(155, 127, 212, 0.15)' }}
          />
          <Chip label={log.trigger} size="small" variant="outlined" sx={{ fontSize: 10, height: 18 }} />
          <Box sx={{ flex: 1 }} />
          <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
            {formatTime(log.timestamp)}
          </Typography>
        </Box>
        {log.message && (
          <Typography variant="caption" sx={{ color: 'error.main', mt: 0.5, pl: 3.5, fontSize: 11 }}>
            {log.message}
          </Typography>
        )}
      </ListItem>
      <Divider sx={{ opacity: 0.3 }} />
    </>
  );
};
