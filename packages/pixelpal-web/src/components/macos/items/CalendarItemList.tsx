import { css } from '@emotion/react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { format, isSameDay, isAfter, parseISO, startOfDay } from 'date-fns';
import { useStore } from '../../../store';
import { useMacSplitStore, type CalendarFilter } from '../../../stores/macSplitStore';
import { MacListRow } from '../MacListRow';

const CALENDAR_FILTERS: { id: CalendarFilter; labelKey: string; icon: string }[] = [
  { id: 'month', labelKey: 'calendar.filterMonth', icon: '📅' },
  { id: 'today', labelKey: 'calendar.filterToday', icon: '☀️' },
  { id: 'upcoming', labelKey: 'calendar.filterUpcoming', icon: '📆' },
];

export function CalendarItemList() {
  const { t } = useTranslation();
  const events = useStore((s) => s.events);
  const calendarFilter = useMacSplitStore((s) => s.calendarFilter);
  const selectedEventId = useMacSplitStore((s) => s.selectedEventId);
  const setCalendarFilter = useMacSplitStore((s) => s.setCalendarFilter);
  const setSelectedEventId = useMacSplitStore((s) => s.setSelectedEventId);

  const filteredEvents = useMemo(() => {
    const now = startOfDay(new Date());
    const sorted = [...events].sort(
      (a, b) => parseISO(a.startTime).getTime() - parseISO(b.startTime).getTime(),
    );
    if (calendarFilter === 'today') {
      return sorted.filter((e) => isSameDay(parseISO(e.startTime), now));
    }
    if (calendarFilter === 'upcoming') {
      return sorted.filter((e) => isAfter(parseISO(e.startTime), now) || isSameDay(parseISO(e.startTime), now));
    }
    return sorted.slice(0, 12);
  }, [events, calendarFilter]);

  return (
    <div
      css={css({
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        padding: 'var(--space-2)',
        gap: 'var(--space-1)',
      })}
    >
      <div
        css={css({
          fontSize: 'var(--text-xs)',
          fontWeight: 600,
          color: 'var(--text-secondary)',
          padding: 'var(--space-1) var(--space-2)',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
        })}
      >
        {t('calendar.views', '视图')}
      </div>
      {CALENDAR_FILTERS.map((f) => (
        <MacListRow
          key={f.id}
          title={t(f.labelKey, f.id)}
          icon={<span>{f.icon}</span>}
          selected={calendarFilter === f.id && !selectedEventId}
          onClick={() => {
            setCalendarFilter(f.id);
            setSelectedEventId(null);
          }}
        />
      ))}
      {calendarFilter !== 'month' && (
        <>
          <div
            css={css({
              fontSize: 'var(--text-xs)',
              fontWeight: 600,
              color: 'var(--text-secondary)',
              padding: 'var(--space-2) var(--space-2) var(--space-1)',
              textTransform: 'uppercase',
              letterSpacing: '0.04em',
            })}
          >
            {t('calendar.events', '日程')}
          </div>
          <div css={css({ flex: 1, overflowY: 'auto' })}>
            {filteredEvents.length === 0 ? (
              <div css={css({ color: 'var(--text-secondary)', fontSize: 13, padding: 16, textAlign: 'center' })}>
                {t('calendar.noEvents', '暂无日程')}
              </div>
            ) : (
              filteredEvents.map((event) => (
                <MacListRow
                  key={event.id}
                  title={event.title}
                  subtitle={format(parseISO(event.startTime), 'MMM d · HH:mm')}
                  icon={<span>📌</span>}
                  selected={selectedEventId === event.id}
                  onClick={() => setSelectedEventId(event.id)}
                />
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}
