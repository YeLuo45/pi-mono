import React, { useEffect, useState } from 'react';
import { MyAlpha } from '../MUI替代';
import { MyBox, MyTypography, MyPaper, MyChip, MyList, MyListItem, MyListItemText } from '../MUI替代';
import { useTranslation } from 'react-i18next';
import { ToolRegistry } from '../../services/tools/registry';
import { ToolExecutionLogger, type ToolCallLog } from '../../services/tools/logger';

export const ToolsPanel: React.FC = () => {
  const { t } = useTranslation();
  const [tools, setTools] = useState<ReturnType<typeof ToolRegistry.prototype.list>>([]);
  const [history, setHistory] = useState<ToolCallLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const registry = ToolRegistry.getInstance();
    setTools(registry.list());

    ToolExecutionLogger.getHistory(undefined, 20)
      .then(setHistory)
      .finally(() => setLoading(false));
  }, []);

  const categoryColor = (cat: string) => {
    switch (cat) {
      case 'agent': return '#7c4dff';
      case 'skill': return '#00bcd4';
      case 'system': return '#ff9800';
      default: return '#9e9e9e';
    }
  };

  return (
    <Box sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
        {t('nav.tools')}
      </Typography>

      {/* Registered Tools */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Registered Tools ({tools.length})
        </Typography>
        <List dense disablePadding>
          {tools.map((tool) => (
            <ListItem key={tool.name} disablePadding sx={{ py: 0.5 }}>
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {tool.name}
                    </Typography>
                    <Chip
                      label={tool.category}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: 10,
                        backgroundColor: alpha(categoryColor(tool.category), 0.15),
                        color: categoryColor(tool.category),
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Typography variant="caption" color="text.secondary">
                    {tool.description}
                  </Typography>
                }
              />
            </ListItem>
          ))}
          {tools.length === 0 && (
            <Typography variant="caption" color="text.secondary" sx={{ pl: 1 }}>
              No tools registered
            </Typography>
          )}
        </List>
      </Paper>

      {/* Call History */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary' }}>
          Recent Calls ({history.length})
        </Typography>
        {loading ? (
          <Typography variant="caption" color="text.secondary">Loading...</Typography>
        ) : history.length === 0 ? (
          <Typography variant="caption" color="text.secondary">No call history yet</Typography>
        ) : (
          <List dense disablePadding>
            {history.map((log) => (
              <ListItem key={log.id} disablePadding sx={{ py: 0.5 }}>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2" sx={{ fontFamily: 'monospace', fontSize: 12 }}>
                        {log.name}
                      </Typography>
                      <Chip
                        label={log.success ? 'OK' : 'ERR'}
                        size="small"
                        sx={{
                          height: 16,
                          fontSize: 9,
                          backgroundColor: log.success
                            ? alpha('#4caf50', 0.15)
                            : alpha('#f44336', 0.15),
                          color: log.success ? '#4caf50' : '#f44336',
                        }}
                      />
                      <Typography variant="caption" color="text.secondary">
                        {log.duration_ms}ms
                      </Typography>
                    </Box>
                  }
                  secondary={
                    <Typography variant="caption" color="text.secondary">
                      {new Date(log.timestamp).toLocaleTimeString()}
                      {log.error && ` — ${log.error}`}
                    </Typography>
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Paper>
    </Box>
  );
};
