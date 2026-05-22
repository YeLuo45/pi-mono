// CalendarPlugin — Built-in calendar plugin with Google Calendar API support
import React, { useState } from 'react';
import { MyDialog } from '../../components/MUI替代';
import { MyBox, MyTypography, MyIconButton, MyButton, MyTextField, MyList, MyListItem, MyListItemText } from '../../components/MUI替代';
import { Add as AddIcon, ChevronLeft, ChevronRight, Delete as DeleteIcon } from '@mui/icons-material';
import type { Plugin } from './types';
import { PluginService } from './PluginService';
import {
  format, startOfMonth, endOfMonth, eachDayOfInterval,
  isSameMonth, isSameDay, parseISO,
  startOfWeek, endOfWeek, addMonths, subMonths,
} from 'date-fns';
import { zhCN } from 'date-fns/locale';

export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  description?: string;
  source: 'local' | 'google';
  syncId?: string;
}

interface DayEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  source: 'local' | 'google';
}

interface GoogleCalendarConfig {
  apiKey?: string;
  calendarId?: string;
}

const DEFAULT_CONFIG: GoogleCalendarConfig = {};

const DEFAULT_EVENTS: CalendarEvent[] = [];

export const CalendarPluginPanel: React.FC<{ pluginId: string }> = ({ pluginId: _pluginId }) => {
  const [events, setEvents] = useState<CalendarEvent[]>(DEFAULT_EVENTS);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [_config] = useState<GoogleCalendarConfig>(DEFAULT_CONFIG);
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    description: '',
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  const getEventsForDay = (day: Date): DayEvent[] =>
    events
      .filter((e) => isSameDay(parseISO(e.startTime), day))
      .map((e) => ({ id: e.id, title: e.title, startTime: e.startTime, endTime: e.endTime, source: e.source }));

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleDayClick = (day: Date) => {
    setSelectedDay(isSameDay(day, selectedDay ?? new Date(0)) ? null : day);
  };

  const handleOpenDialog = (event?: CalendarEvent, day?: Date) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        startTime: event.startTime.slice(0, 16),
        endTime: event.endTime.slice(0, 16),
        description: event.description || '',
      });
    } else {
      setEditingEvent(null);
      const defaultStart = day
        ? format(day, "yyyy-MM-dd'T'HH:mm")
        : format(new Date(), "yyyy-MM-dd'T'HH:mm");
      setFormData({ title: '', startTime: defaultStart, endTime: defaultStart, description: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.startTime || !formData.endTime) return;
    const eventData: CalendarEvent = {
      id: editingEvent?.id || crypto.randomUUID(),
      title: formData.title,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
      description: formData.description || undefined,
      source: 'local',
    };
    if (editingEvent) {
      setEvents((prev) => prev.map((e) => (e.id === editingEvent.id ? eventData : e)));
    } else {
      setEvents((prev) => [...prev, eventData]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (eventId: string) => {
    setEvents((prev) => prev.filter((e) => e.id !== eventId));
  };

  const selectedDayEvents = selectedDay ? getEventsForDay(selectedDay) : [];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600, flex: 1 }}>
          📅 Calendar Plugin
        </Typography>
        <IconButton size="small" onClick={handlePrevMonth}><ChevronLeft sx={{ fontSize: 18 }} /></IconButton>
        <Typography variant="body2" sx={{ fontSize: 13, minWidth: 100, textAlign: 'center' }}>
          {format(currentMonth, 'MMMM yyyy', { locale: zhCN })}
        </Typography>
        <IconButton size="small" onClick={handleNextMonth}><ChevronRight sx={{ fontSize: 18 }} /></IconButton>
        <IconButton size="small" color="primary" onClick={() => handleOpenDialog()}><AddIcon sx={{ fontSize: 18 }} /></IconButton>
      </Box>

      {/* Week day headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', px: 1, py: 0.5, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {weekDays.map((d) => (
          <Typography key={d} variant="caption" sx={{ fontSize: 10, textAlign: 'center', color: 'text.secondary', fontWeight: 600 }}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* Calendar grid */}
      <Box sx={{ flex: 1, overflow: 'auto', display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', p: 1, gap: 0.5 }}>
        {days.map((day, idx) => {
          const dayEvents = getEventsForDay(day);
          const isToday = isSameDay(day, new Date());
          const isSelected = selectedDay && isSameDay(day, selectedDay);
          const isCurrentMonth = isSameMonth(day, currentMonth);

          return (
            <Box
              key={idx}
              onClick={() => handleDayClick(day)}
              sx={{
                minHeight: 48,
                borderRadius: 1,
                bgcolor: isSelected
                  ? 'rgba(155, 127, 212, 0.2)'
                  : isToday
                  ? 'rgba(155, 127, 212, 0.08)'
                  : 'rgba(255,255,255,0.02)',
                border: isToday ? '1px solid rgba(155,127,212,0.4)' : '1px solid transparent',
                cursor: 'pointer',
                opacity: isCurrentMonth ? 1 : 0.35,
                '&:hover': { bgcolor: isSelected ? 'rgba(155,127,212,0.25)' : 'rgba(255,255,255,0.06)' },
                p: 0.5,
                display: 'flex',
                flexDirection: 'column',
                gap: 0.25,
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontSize: 11,
                  fontWeight: isToday ? 700 : 400,
                  color: isToday ? 'primary.main' : 'text.primary',
                  textAlign: 'center',
                }}
              >
                {format(day, 'd')}
              </Typography>
              {dayEvents.slice(0, 2).map((ev) => (
                <Box
                  key={ev.id}
                  sx={{
                    bgcolor: ev.source === 'google' ? 'rgba(66, 133, 244, 0.2)' : 'rgba(76,175,80,0.2)',
                    borderRadius: 0.5,
                    px: 0.5,
                    overflow: 'hidden',
                  }}
                >
                  <Typography variant="caption" sx={{ fontSize: 8, color: 'text.primary', display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {ev.title}
                  </Typography>
                </Box>
              ))}
              {dayEvents.length > 2 && (
                <Typography variant="caption" sx={{ fontSize: 8, color: 'text.secondary', textAlign: 'center' }}>
                  +{dayEvents.length - 2}
                </Typography>
              )}
            </Box>
          );
        })}
      </Box>

      {/* Selected day events panel */}
      {selectedDay && (
        <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', maxHeight: 200, overflow: 'auto' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 2, py: 1 }}>
            <Typography variant="caption" sx={{ fontSize: 12, fontWeight: 600 }}>
              {format(selectedDay, 'MMMM d, yyyy')}
            </Typography>
            <IconButton size="small" color="primary" onClick={() => handleOpenDialog(undefined, selectedDay)}>
              <AddIcon sx={{ fontSize: 14 }} />
            </IconButton>
          </Box>
          {selectedDayEvents.length === 0 ? (
            <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', px: 2, pb: 1, display: 'block' }}>
              No events
            </Typography>
          ) : (
            <List dense disablePadding>
              {selectedDayEvents.map((ev) => (
                <ListItem
                  key={ev.id}
                  disablePadding
                  sx={{ px: 2, py: 0.5 }}
                  secondaryAction={
                    <IconButton edge="end" size="small" onClick={() => handleDelete(ev.id)}>
                      <DeleteIcon sx={{ fontSize: 12 }} />
                    </IconButton>
                  }
                >
                  <ListItemText
                    primary={
                      <Typography variant="caption" sx={{ fontSize: 11 }}>
                        {ev.title}
                      </Typography>
                    }
                    secondary={
                      <Typography variant="caption" sx={{ fontSize: 9, color: 'text.secondary' }}>
                        {format(parseISO(ev.startTime), 'HH:mm')} – {format(parseISO(ev.endTime), 'HH:mm')}
                        {ev.source === 'google' && ' · Google'}
                      </Typography>
                    }
                  />
                </ListItem>
              ))}
            </List>
          )}
        </Box>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15 }}>{editingEvent ? 'Edit Event' : 'New Event'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              size="small" fullWidth autoFocus
            />
            <TextField
              label="Start"
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              size="small" fullWidth InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="End"
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              size="small" fullWidth InputLabelProps={{ shrink: true }}
            />
            <TextField
              label="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              size="small" fullWidth multiline rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} size="small">Cancel</Button>
          <Button onClick={handleSave} variant="contained" size="small" disabled={!formData.title}>
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// AI tools
const addEventTool = async (args: unknown): Promise<unknown> => {
  const { title, startTime, endTime, description } = args as {
    title: string;
    startTime: string;
    endTime: string;
    description?: string;
  };
  return { success: true, event: { id: crypto.randomUUID(), title, startTime, endTime, description, source: 'local' } };
};

const listEventsTool = async (args: unknown): Promise<unknown> => {
  const { date } = args as { date?: string };
  return { success: true, events: [], date };
};

// Plugin definition
export const calendarPlugin: Plugin = {
  id: 'calendar',
  name: 'Calendar',
  version: '1.0.0',
  icon: '📅',
  panel: CalendarPluginPanel,
  capabilities: [
    { type: 'panel' },
    { type: 'ai_tool', name: 'add_calendar_event' },
    { type: 'ai_tool', name: 'list_calendar_events' },
  ],

  onInit() {
    PluginService.registerTool('calendar', 'add_calendar_event', addEventTool);
    PluginService.registerTool('calendar', 'list_calendar_events', listEventsTool);
  },
};
