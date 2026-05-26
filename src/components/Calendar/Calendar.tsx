import React, { useState } from 'react';
import { MyDialog as Dialog , MyDialogActions as DialogActions, MyDialogContent as DialogContent, MyDialogTitle as DialogTitle } from '../MUI替代';
import { MyBox as Box, MyTypography as Typography, MyIconButton as IconButton, MyButton as Button, MyTextField as TextField, MyList as List, MyListItem as ListItem, MyListItemText as ListItemText, MyPopper as Popper, MyPaper as Paper, MyFade as Fade } from '../MUI替代';
import { Add as AddIcon, ChevronLeft, ChevronRight, Delete as DeleteIcon } from '@mui/icons-material';
import { useStore } from '../../store';
import type { Event } from '../../types';
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, parseISO, startOfWeek, endOfWeek, addMonths, subMonths } from 'date-fns';
import { zhCN } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

export const Calendar: React.FC = () => {
  const { t } = useTranslation();
  const events = useStore((s) => s.events);
  const addEvent = useStore((s) => s.addEvent);
  const updateEvent = useStore((s) => s.updateEvent);
  const deleteEvent = useStore((s) => s.deleteEvent);

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [popperAnchor, setPopperAnchor] = useState<HTMLElement | null>(null);
  const [popperDay, setPopperDay] = useState<Date | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    startTime: '',
    endTime: '',
    location: '',
    description: '',
  });

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const handlePrevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));
  const handleNextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));

  const handleOpenDialog = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setFormData({
        title: event.title,
        startTime: event.startTime.slice(0, 16),
        endTime: event.endTime.slice(0, 16),
        location: event.location || '',
        description: event.description || '',
      });
    } else {
      setEditingEvent(null);
      setFormData({ title: '', startTime: '', endTime: '', location: '', description: '' });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title || !formData.startTime || !formData.endTime) return;
    const eventData: Event = {
      id: editingEvent?.id || crypto.randomUUID(),
      title: formData.title,
      startTime: new Date(formData.startTime).toISOString(),
      endTime: new Date(formData.endTime).toISOString(),
      location: formData.location || undefined,
      description: formData.description || undefined,
      reminders: [15],
      source: 'local',
    };
    if (editingEvent) {
      updateEvent(editingEvent.id, eventData);
    } else {
      addEvent(eventData);
    }
    setDialogOpen(false);
  };

  const getEventsForDay = (day: Date) =>
    events.filter((e) => isSameDay(parseISO(e.startTime), day));

  const weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', width: '100%' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600, flex: 1 }}>
          📅 {t('calendar.title')}
        </Typography>
        <IconButton size="small" onClick={handlePrevMonth}>
          <ChevronLeft sx={{ fontSize: 18 }} />
        </IconButton>
        <Typography variant="body2" sx={{ fontSize: 13, minWidth: 100, textAlign: 'center' }}>
          {format(currentMonth, 'MMMM yyyy', { locale: zhCN })}
        </Typography>
        <IconButton size="small" onClick={handleNextMonth}>
          <ChevronRight sx={{ fontSize: 18 }} />
        </IconButton>
        <IconButton size="small" color="primary" onClick={() => handleOpenDialog()}>
          <AddIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Week day headers */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', p: '4px 8px' }}>
        {weekDays.map((d) => (
          <Typography key={d} variant="caption" sx={{ textAlign: 'center', color: 'text.secondary', fontSize: 10 }}>
            {d}
          </Typography>
        ))}
      </Box>

      {/* Calendar grid */}
      <Box sx={{ flex: 1, overflow: 'auto', px: 1 }}>
        <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.5 }}>
          {days.map((day) => {
            const dayEvents = getEventsForDay(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());
            return (
              <Box
                key={day.toISOString()}
                sx={{
                  minHeight: 48,
                  p: 0.5,
                  borderRadius: 1,
                  bgcolor: isToday ? 'rgba(255,255,255,0.08)' : 'transparent',
                  opacity: isCurrentMonth ? 1 : 0.3,
                  cursor: 'pointer',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
                }}
                onClick={(e) => {
                  if (dayEvents.length > 0) {
                    // Show event popper
                    setPopperAnchor(e.currentTarget);
                    setPopperDay(day);
                  } else {
                    // Open new event dialog
                    const start = new Date(day);
                    start.setHours(9, 0, 0, 0);
                    const end = new Date(day);
                    end.setHours(10, 0, 0, 0);
                    setFormData({
                      title: '',
                      startTime: start.toISOString().slice(0, 16),
                      endTime: end.toISOString().slice(0, 16),
                      location: '',
                      description: '',
                    });
                    setEditingEvent(null);
                    setPopperAnchor(null);
                    setPopperDay(null);
                    setDialogOpen(true);
                  }
                }}
              >
                <Typography variant="caption" sx={{ fontSize: 11, color: isToday ? 'primary.main' : 'inherit' }}>
                  {format(day, 'd')}
                </Typography>
                {/* Dot indicators for events */}
                {dayEvents.length > 0 && (
                  <Box sx={{ display: 'flex', gap: 0.4, mt: 0.3, flexWrap: 'wrap' }}>
                    {dayEvents.slice(0, 3).map((e) => (
                      <Box
                        key={e.id}
                        sx={{
                          width: 5,
                          height: 5,
                          borderRadius: '50%',
                          bgcolor: 'primary.main',
                          flexShrink: 0,
                        }}
                      />
                    ))}
                    {dayEvents.length > 3 && (
                      <Typography variant="caption" sx={{ fontSize: 8, color: 'text.secondary', lineHeight: '5px' }}>
                        +{dayEvents.length - 3}
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            );
          })}
        </Box>
      </Box>

      {/* Upcoming events */}
      <Box sx={{ borderTop: '1px solid rgba(255,255,255,0.1)', p: 1.5 }}>
        <Typography variant="caption" sx={{ fontSize: 11, color: 'text.secondary', mb: 1, display: 'block' }}>
          {t('calendar.upcoming')}
        </Typography>
        <List dense disablePadding>
          {events
            .filter((e) => new Date(e.startTime) >= new Date())
            .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())
            .slice(0, 5)
            .map((e) => (
              <ListItem
                key={e.id}
                disablePadding
                sx={{ mb: 0.5 }}
                secondaryAction={
                  <IconButton edge="end" size="small" onClick={() => deleteEvent(e.id)}>
                    <DeleteIcon sx={{ fontSize: 14 }} />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={<Typography variant="body2" sx={{ fontSize: 12 }}>{e.title}</Typography>}
                  secondary={<Typography variant="caption" sx={{ fontSize: 10 }}>{format(parseISO(e.startTime), 'MMM d, HH:mm')}</Typography>}
                />
              </ListItem>
            ))}
          {events.filter((e) => new Date(e.startTime) >= new Date()).length === 0 && (
            <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: 11 }}>
              {t('calendar.noEvents')}
            </Typography>
          )}
        </List>
      </Box>

      {/* Event Popper */}
      <Popper
        open={!!popperAnchor && !!popperDay}
        anchorEl={popperAnchor}
        placement="bottom"
        transition
        modifiers={[{ name: 'offset', options: { offset: [0, 4] } }]}
      >
        {({ TransitionProps }) => (
          <Fade {...TransitionProps} timeout={200}>
            <Paper sx={{ maxWidth: 220, p: 1.5, bgcolor: 'rgba(26, 16, 40, 0.98)' }}>
              <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary', display: 'block', mb: 0.5 }}>
                {popperDay ? format(popperDay, 'MMM d, yyyy') : ''} — Events
              </Typography>
              {popperDay && getEventsForDay(popperDay).map((e) => (
                <Box key={e.id} sx={{ mb: 0.75 }}>
                  <Typography variant="body2" sx={{ fontSize: 12, fontWeight: 600 }}>
                    {e.title}
                  </Typography>
                  <Typography variant="caption" sx={{ fontSize: 10, color: 'text.secondary' }}>
                    {format(parseISO(e.startTime), 'HH:mm')} – {format(parseISO(e.endTime), 'HH:mm')}
                    {e.location ? ` · ${e.location}` : ''}
                  </Typography>
                  <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
                    <Button
                      size="small"
                      variant="text"
                      sx={{ fontSize: 10, minWidth: 0, p: '1px 6px', color: 'primary.light' }}
                      onClick={() => {
                        setPopperAnchor(null);
                        setPopperDay(null);
                        handleOpenDialog(e);
                      }}
                    >
                      Edit
                    </Button>
                    <Button
                      size="small"
                      variant="text"
                      sx={{ fontSize: 10, minWidth: 0, p: '1px 6px', color: 'error.main' }}
                      onClick={() => {
                        deleteEvent(e.id);
                        if (getEventsForDay(popperDay!).length <= 1) {
                          setPopperAnchor(null);
                          setPopperDay(null);
                        }
                      }}
                    >
                      Delete
                    </Button>
                  </Box>
                </Box>
              ))}
            </Paper>
          </Fade>
        )}
      </Popper>

      {/* Add/Edit Event Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15 }}>{editingEvent ? t('calendar.editEvent') : t('calendar.addEvent')}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('calendar.eventTitle')}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              size="small"
              fullWidth
              autoFocus
            />
            <TextField
              label={t('calendar.startTime')}
              type="datetime-local"
              value={formData.startTime}
              onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t('calendar.endTime')}
              type="datetime-local"
              value={formData.endTime}
              onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <TextField
              label={t('calendar.location')}
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              size="small"
              fullWidth
            />
            <TextField
              label={t('calendar.description')}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              size="small"
              fullWidth
              multiline
              rows={2}
            />
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} size="small">{t('calendar.cancel')}</Button>
          <Button onClick={handleSave} variant="contained" size="small" disabled={!formData.title || !formData.startTime}>
            {t('calendar.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Calendar;
