import React from 'react';
import { MySelect, MySelect, MySelect, MySelect, MyTextField, MyChip, MyTypography } from '../MUI替代';
import { Box } from '../ui/Box';
// SelectChangeEvent type - using string/number for Select onChange
type SelectChangeEvent = { target: { value: string | number } };
import type { Trigger, TimeTrigger, KeywordTrigger } from '../../types/scene';
import { createTrigger } from '../../types/scene';
import { useTranslation } from 'react-i18next';

interface TriggerConfigProps {
  triggers: Trigger[];
  onChange: (triggers: Trigger[]) => void;
}

export const TriggerConfig: React.FC<TriggerConfigProps> = ({ triggers, onChange }) => {
  const { t } = useTranslation();
  const timeTrigger = triggers.find((t) => t.type === 'time') as TimeTrigger | undefined;
  const keywordTrigger = triggers.find((t) => t.type === 'keyword') as KeywordTrigger | undefined;
  const hasClickTrigger = triggers.some((t) => t.type === 'click');

  const addTrigger = (type: 'time' | 'click' | 'keyword') => {
    if (triggers.some((t) => t.type === type)) return;
    onChange([...triggers, createTrigger(type)]);
  };

  const updateTimeTrigger = (updates: Partial<TimeTrigger>) => {
    if (!timeTrigger) return;
    onChange(triggers.map((t) => (t.type === 'time' ? { ...t, ...updates } : t)));
  };

  const updateKeywordTrigger = (pattern: string) => {
    if (!keywordTrigger) return;
    onChange(triggers.map((t) => (t.type === 'keyword' ? { ...t, pattern } : t)));
  };

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: 12, color: 'text.secondary' }}>
        {t('scene.triggers', '触发条件')}
      </Typography>

      {/* Time trigger */}
      {timeTrigger ? (
        <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Chip label={t('scene.timeTrigger', '⏰ 定时触发')} size="small" />
            <Chip label={t('scene.added', '已添加')} size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
          </Box>
          <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 1 }}>
            <TextField
              type="time"
              size="small"
              value={timeTrigger.time}
              onChange={(e) => updateTimeTrigger({ time: e.target.value })}
              sx={{ flex: 1, minWidth: 0 }}
            />
            <FormControl size="small" sx={{ minWidth: { xs: '100%', sm: 100 }, flex: { xs: 0, sm: 1 } }}>
              <InputLabel>{t('scene.repeat', '重复')}</InputLabel>
              <Select
                value={typeof timeTrigger.repeat === 'string' ? timeTrigger.repeat : JSON.stringify(timeTrigger.repeat)}
                label={t('scene.repeat', '重复')}
                onChange={(e: SelectChangeEvent<string>) => {
                  const val = e.target.value;
                  if (val.startsWith('[')) {
                    updateTimeTrigger({ repeat: JSON.parse(val) as number[] });
                  } else {
                    updateTimeTrigger({ repeat: val as 'daily' | 'weekdays' | 'weekends' });
                  }
                }}
              >
                <MenuItem value="daily">{t('scene.daily', '每天')}</MenuItem>
                <MenuItem value="weekdays">{t('scene.weekdays', '工作日')}</MenuItem>
                <MenuItem value="weekends">{t('scene.weekends', '周末')}</MenuItem>
                <MenuItem value="[1,2,3,4,5]">{t('scene.monFri', '周一至周五')}</MenuItem>
                <MenuItem value="[0,6]">{t('scene.weekend', '周六日')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </Box>
      ) : (
        <Chip
          label={t('scene.addTimeTrigger', '+ 添加定时触发')}
          size="small"
          onClick={() => addTrigger('time')}
          sx={{ alignSelf: 'flex-start', cursor: 'pointer', minHeight: 32, px: 1 }}
        />
      )}

      {/* Keyword trigger */}
      {keywordTrigger ? (
        <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
            <Chip label={t('scene.keywordTrigger', '🔑 关键词触发')} size="small" />
            <Chip label={t('scene.added', '已添加')} size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: 10 }} />
          </Box>
          <TextField
            fullWidth
            size="small"
            placeholder={t('scene.keywordPlaceholder', '输入关键词，如：*你好* 或 晚安')}
            value={keywordTrigger.pattern}
            onChange={(e) => updateKeywordTrigger(e.target.value)}
            helperText={t('scene.keywordHint', '* 匹配任意字符，如 *晚安* 匹配「晚安，明天见」')}
          />
        </Box>
      ) : (
        <Chip
          label={t('scene.addKeywordTrigger', '+ 添加关键词触发')}
          size="small"
          onClick={() => addTrigger('keyword')}
          sx={{ alignSelf: 'flex-start', cursor: 'pointer', minHeight: 32, px: 1 }}
        />
      )}

      {/* Click trigger */}
      {hasClickTrigger ? (
        <Box sx={{ p: 1.5, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1 }}>
          <Chip label={t('scene.clickTrigger', '🖱️ 点击触发（显示在快捷栏）')} size="small" color="primary" />
        </Box>
      ) : (
        <Chip
          label={t('scene.addClickTrigger', '+ 添加点击触发')}
          size="small"
          onClick={() => addTrigger('click')}
          sx={{ alignSelf: 'flex-start', cursor: 'pointer', minHeight: 32, px: 1 }}
        />
      )}
    </Box>
  );
};
