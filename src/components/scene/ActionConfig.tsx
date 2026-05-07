import React from 'react';
import { useTranslation } from 'react-i18next';
import { Box, Button, TextField, FormControl, Select, MenuItem, IconButton, Typography, Collapse } from '@mui/material';
import { Add as AddIcon, Delete as DeleteIcon, ExpandMore as ExpandMoreIcon, ExpandLess as ExpandLessIcon } from '@mui/icons-material';
import type { Action, ActionType } from '../../types/scene';
import { createAction } from '../../types/scene';

interface ActionConfigProps {
  actions: Action[];
  onChange: (actions: Action[]) => void;
}

const ACTION_TYPE_OPTIONS: { value: ActionType; labelKey: string }[] = [
  { value: 'sendMessage', labelKey: 'scene.sendMessage' },
  { value: 'switchRole', labelKey: 'scene.switchRole' },
  { value: 'speak', labelKey: 'scene.speak' },
  { value: 'notify', labelKey: 'scene.notify' },
  { value: 'delay', labelKey: 'scene.delay' },
  { value: 'condition', labelKey: 'scene.condition' },
  { value: 'random', labelKey: 'scene.random' },
];

export const ActionConfig: React.FC<ActionConfigProps> = ({ actions, onChange }) => {
  const { t } = useTranslation();

  const addAction = () => {
    onChange([...actions, createAction('sendMessage')]);
  };

  const removeAction = (index: number) => {
    onChange(actions.filter((_, i) => i !== index));
  };

  const updateActionType = (index: number, type: ActionType) => {
    const newActions = [...actions];
    newActions[index] = createAction(type);
    onChange(newActions);
  };

  const updateActionParams = (index: number, params: Record<string, unknown>) => {
    const newActions = [...actions];
    newActions[index] = { ...newActions[index], params: { ...newActions[index].params, ...params } } as Action;
    onChange(newActions);
  };

  const getActionParams = (action: Action): Record<string, unknown> => {
    return (action as { params: Record<string, unknown> }).params;
  };

  const updateNestedActions = (index: number, field: 'thenActions' | 'elseActions', nested: Action[]) => {
    const params = getActionParams(actions[index]);
    updateActionParams(index, { ...params, [field]: nested });
  };

  const updateRandomOptions = (index: number, options: Action[][]) => {
    const params = getActionParams(actions[index]);
    updateActionParams(index, { ...params, options });
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 12, color: 'text.secondary' }}>
        {t('scene.actions', '执行动作')}
      </Typography>

      {actions.map((action, index) => (
        <ActionItem
          key={index}
          action={action}
          index={index}
          onUpdateType={updateActionType}
          onUpdateParams={updateActionParams}
          onRemove={removeAction}
          getActionParams={getActionParams}
          onUpdateNestedActions={updateNestedActions}
          onUpdateRandomOptions={updateRandomOptions}
          t={t}
        />
      ))}

      <Button startIcon={<AddIcon />} variant="outlined" size="small" onClick={addAction} sx={{ alignSelf: 'flex-start' }}>
        {t('scene.addAction', '添加动作')}
      </Button>
    </Box>
  );
};

// ---------- Action Item (recursive for condition) ----------

interface ActionItemProps {
  action: Action;
  index: number;
  onUpdateType: (index: number, type: ActionType) => void;
  onUpdateParams: (index: number, params: Record<string, unknown>) => void;
  onRemove: (index: number) => void;
  getActionParams: (action: Action) => Record<string, unknown>;
  onUpdateNestedActions: (index: number, field: 'thenActions' | 'elseActions', nested: Action[]) => void;
  onUpdateRandomOptions: (index: number, options: Action[][]) => void;
  nestDepth?: number;
  t: (key: string, fallback: string) => string;
}

const ActionItem: React.FC<ActionItemProps> = ({
  action,
  index,
  onUpdateType,
  onUpdateParams,
  onRemove,
  getActionParams,
  onUpdateNestedActions,
  onUpdateRandomOptions,
  nestDepth = 0,
  t,
}) => {
  const [expanded, setExpanded] = React.useState(false);
  const params = getActionParams(action);

  const renderParams = () => {
    switch (action.type) {
      case 'sendMessage':
        return (
          <TextField fullWidth size="small" placeholder={t('scene.enterMessage', '输入要发送的消息内容')}
            value={params.message || ''} onChange={(e) => onUpdateParams(index, { message: e.target.value })} />
        );
      case 'speak':
        return (
          <TextField fullWidth size="small" placeholder={t('scene.enterText', '输入要朗读的文本')}
            value={params.text || ''} onChange={(e) => onUpdateParams(index, { text: e.target.value })} />
        );
      case 'notify':
        return (
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
            <TextField fullWidth size="small" placeholder={t('scene.notificationTitle', '通知标题')}
              value={params.title || ''} onChange={(e) => onUpdateParams(index, { title: e.target.value })} />
            <TextField fullWidth size="small" placeholder={t('scene.notificationContent', '通知内容')}
              value={params.body || ''} onChange={(e) => onUpdateParams(index, { body: e.target.value })} />
          </Box>
        );
      case 'switchRole':
        return (
          <TextField fullWidth size="small" placeholder={t('scene.roleId', '角色 ID')}
            value={params.roleId || ''} onChange={(e) => onUpdateParams(index, { roleId: e.target.value })} />
        );
      case 'delay':
        return (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <TextField type="number" size="small" placeholder={t('scene.seconds', '秒数')} sx={{ width: 100 }}
              value={params.seconds || 5}
              onChange={(e) => onUpdateParams(index, { seconds: Math.max(1, parseInt(e.target.value) || 1) })} />
            <Typography variant="caption" color="text.secondary">{t('scene.continueAfter', '秒后继续')}</Typography>
          </Box>
        );
      case 'condition':
        return (
          <Box sx={{ pl: nestDepth > 0 ? 2 : 0, borderLeft: nestDepth > 0 ? '2px solid rgba(255,255,255,0.1)' : 'none' }}>
            <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 90 }}>
                <Select value={params.field as string} onChange={(e) => onUpdateParams(index, { ...params, field: e.target.value })}>
                  <MenuItem value="hour">{t('scene.hour', '小时')}</MenuItem>
                  <MenuItem value="dayOfWeek">{t('scene.dayOfWeek', '星期')}</MenuItem>
                  <MenuItem value="keyword">{t('scene.keyword', '关键词')}</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small" sx={{ minWidth: 70 }}>
                <Select value={params.operator as string} onChange={(e) => onUpdateParams(index, { ...params, operator: e.target.value })}>
                  <MenuItem value="eq">{t('scene.equals', '等于')}</MenuItem>
                  <MenuItem value="neq">{t('scene.notEquals', '不等于')}</MenuItem>
                  <MenuItem value="gt">{t('scene.greaterThan', '大于')}</MenuItem>
                  <MenuItem value="lt">{t('scene.lessThan', '小于')}</MenuItem>
                  <MenuItem value="contains">{t('scene.contains', '包含')}</MenuItem>
                </Select>
              </FormControl>
              <TextField size="small" placeholder={t('scene.value', '值')}
                sx={{ flex: 1, minWidth: 60 }}
                value={params.value || ''}
                onChange={(e) => onUpdateParams(index, { ...params, value: e.target.value })} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>{t('scene.conditionSatisfied', '条件满足时：')}</Typography>
            <ActionConfig
              actions={(params.thenActions as Action[]) || []}
              onChange={(a) => onUpdateNestedActions(index, 'thenActions', a)}
            />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1, mb: 0.5 }}>{t('scene.otherwise', '否则：')}</Typography>
            <ActionConfig
              actions={(params.elseActions as Action[]) || []}
              onChange={(a) => onUpdateNestedActions(index, 'elseActions', a)}
            />
          </Box>
        );
      case 'random':
        return (
          <Box>
            {(params.options as Action[][]).map((opt, oi) => (
              <Box key={oi} sx={{ mb: 1, p: 1, bgcolor: 'rgba(255,255,255,0.03)', borderRadius: 1 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                  <Typography variant="caption" color="text.secondary">{t('scene.option', '选项')} {oi + 1}</Typography>
                  <Button size="small" color="error" onClick={() => {
                    const newOpts = (params.options as Action[][]).filter((_, i) => i !== oi);
                    onUpdateRandomOptions(index, newOpts.length > 0 ? newOpts : [[]]);
                  }}>{t('scene.delete', '删除')}</Button>
                </Box>
                <ActionConfig
                  actions={opt}
                  onChange={(a) => {
                    const newOpts = [...(params.options as Action[][])];
                    newOpts[oi] = a;
                    onUpdateRandomOptions(index, newOpts);
                  }}
                />
              </Box>
            ))}
            <Button size="small" onClick={() => {
              const newOpts = [...(params.options as Action[][]), []];
              onUpdateRandomOptions(index, newOpts);
            }}>+ {t('scene.addOption', '添加选项')}</Button>
          </Box>
        );
      default:
        return null;
    }
  };

  const isExpandable = action.type === 'condition' || action.type === 'random';

  return (
    <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: isExpandable && expanded ? 1 : 0 }}>
        <FormControl size="small" sx={{ flex: 1, minWidth: 0 }}>
          <Select
            value={action.type}
            onChange={(e) => onUpdateType(index, e.target.value as ActionType)}
          >
            {ACTION_TYPE_OPTIONS.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {t(opt.labelKey, opt.labelKey)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {isExpandable && (
          <IconButton size="small" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </IconButton>
        )}
        <IconButton size="small" onClick={() => onRemove(index)} sx={{ color: 'error.main' }}>
          <DeleteIcon fontSize="small" />
        </IconButton>
      </Box>
      <Collapse in={!isExpandable || !expanded}>
        {renderParams()}
      </Collapse>
      {isExpandable && expanded && renderParams()}
    </Box>
  );
};
