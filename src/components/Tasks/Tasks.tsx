import React, { useState } from 'react';
import {
  Box, Typography, IconButton, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  TextField, FormControl, InputLabel, Select, MenuItem,
  Chip,
} from '@mui/material';
import { Delete as DeleteIcon } from '@mui/icons-material';
import { Add as AddIcon } from '@mui/icons-material';
import {
  DndContext,
  DragOverlay,
  type DragEndEvent,
} from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useStore } from '../../store';
import type { Task, TaskStatus } from '../../types';
import { format, parseISO, isPast, isSameDay } from 'date-fns';
import { useTranslation } from 'react-i18next';

const COLUMNS: { id: TaskStatus; labelKey: string }[] = [
  { id: 'ai_suggestion', labelKey: 'tasks.aiSuggestion' },
  { id: 'todo', labelKey: 'tasks.todo' },
  { id: 'in_progress', labelKey: 'tasks.inProgress' },
  { id: 'done', labelKey: 'tasks.done' },
];

const COLUMN_COLORS: Record<TaskStatus, string> = {
  ai_suggestion: '#9C27B0',
  todo: '#2196F3',
  in_progress: '#FF9800',
  done: '#4CAF50',
};

const PRIORITY_COLORS: Record<string, string> = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
};

// ---------- TaskCard (sortable) ----------
interface TaskCardProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const TaskCard: React.FC<TaskCardProps> = ({ task, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  const isOverdue =
    task.status !== 'done' &&
    task.dueDate &&
    isPast(parseISO(task.dueDate)) &&
    !isSameDay(parseISO(task.dueDate), new Date());

  return (
    <Box
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      sx={{
        bgcolor: isOverdue ? 'rgba(244, 67, 54, 0.1)' : 'rgba(255,255,255,0.05)',
        borderRadius: 1,
        p: 1,
        mb: 0.5,
        borderLeft: `3px solid ${isOverdue ? '#F44336' : PRIORITY_COLORS[task.priority]}`,
        cursor: 'grab',
        opacity: isDragging ? 0.5 : 1,
        '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
        userSelect: 'none',
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5 }}>
        <Typography
          variant="body2"
          sx={{
            fontSize: 12,
            flex: 1,
            textDecoration: task.status === 'done' ? 'line-through' : 'none',
            opacity: task.status === 'done' ? 0.5 : 1,
            color: isOverdue ? '#F44336' : 'inherit',
          }}
        >
          {task.title}
        </Typography>
        <IconButton
          edge="end"
          size="small"
          onClick={(e) => { e.stopPropagation(); onEdit(task); }}
          sx={{ opacity: 0.5, '&:hover': { opacity: 1 }, p: 0.2 }}
        >
          <DeleteIcon sx={{ fontSize: 13 }} />
        </IconButton>
        <IconButton
          edge="end"
          size="small"
          onClick={(e) => { e.stopPropagation(); onDelete(task.id); }}
          sx={{ opacity: 0.5, '&:hover': { opacity: 1 }, p: 0.2, color: 'error.main' }}
        >
          <DeleteIcon sx={{ fontSize: 13 }} />
        </IconButton>
      </Box>
      {task.dueDate && (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
          <Typography variant="caption" sx={{ fontSize: 10, color: isOverdue ? '#F44336' : 'text.secondary' }}>
            {isOverdue ? '⚠️ ' : ''}{format(parseISO(task.dueDate), 'MMM d')}
          </Typography>
          {isOverdue && (
            <Chip
              label={t('tasks.overdue')}
              size="small"
              sx={{
                height: 14,
                fontSize: 8,
                bgcolor: 'rgba(244,67,54,0.2)',
                color: '#F44336',
                '& .MuiChip-label': { px: 0.5 },
              }}
            />
          )}
        </Box>
      )}
    </Box>
  );
};

// ---------- KanbanColumn ----------
interface KanbanColumnProps {
  columnId: TaskStatus;
  tasks: Task[];
  labelKey: string;
  onEdit: (task: Task) => void;
  onDelete: (id: string) => void;
}

const KanbanColumn: React.FC<KanbanColumnProps> = ({ columnId, tasks, labelKey, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const { setNodeRef } = useSortable({ id: columnId, data: { type: 'column', columnId } });

  return (
    <Box
      sx={{
        flex: 1,
        minWidth: 180,
        maxWidth: 260,
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Column header */}
      <Box
        sx={{
          p: 1,
          borderBottom: `2px solid ${COLUMN_COLORS[columnId]}`,
          display: 'flex',
          alignItems: 'center',
          gap: 0.5,
          mb: 1,
        }}
      >
        <Box
          sx={{
            width: 8,
            height: 8,
            borderRadius: '50%',
            bgcolor: COLUMN_COLORS[columnId],
          }}
        />
        <Typography variant="caption" sx={{ fontSize: 11, fontWeight: 600, flex: 1 }}>
          {t(labelKey)}
        </Typography>
        <Chip
          label={tasks.length}
          size="small"
          sx={{
            height: 16,
            fontSize: 10,
            bgcolor: 'rgba(255,255,255,0.1)',
            '& .MuiChip-label': { px: 0.5 },
          }}
        />
      </Box>

      {/* Droppable area */}
      <Box
        ref={setNodeRef}
        sx={{
          flex: 1,
          minHeight: 100,
          overflow: 'auto',
          px: 0.5,
        }}
      >
        {tasks.length === 0 ? (
          <Typography
            variant="caption"
            sx={{
              fontSize: 10,
              color: 'text.secondary',
              opacity: 0.5,
              display: 'block',
              textAlign: 'center',
              mt: 2,
            }}
          >
            {t('tasks.noTasksInColumn')}
          </Typography>
        ) : (
          tasks.map((task) => (
            <TaskCard key={task.id} task={task} onEdit={onEdit} onDelete={onDelete} />
          ))
        )}
      </Box>
    </Box>
  );
};

// ---------- Root Tasks Component ----------
export const Tasks: React.FC = () => {
  const { t } = useTranslation();
  const tasks = useStore((s) => s.tasks);
  const addTask = useStore((s) => s.addTask);
  const updateTask = useStore((s) => s.updateTask);
  const deleteTask = useStore((s) => s.deleteTask);
  const moveTask = useStore((s) => s.moveTask);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    dueDate: '',
    priority: 'medium' as Task['priority'],
    status: 'todo' as TaskStatus,
  });

  const handleOpenDialog = (task?: Task) => {
    if (task) {
      setEditingTask(task);
      setFormData({
        title: task.title,
        dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
        priority: task.priority,
        status: task.status,
      });
    } else {
      setEditingTask(null);
      setFormData({ title: '', dueDate: '', priority: 'medium', status: 'todo' });
    }
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!formData.title) return;
    const taskData: Task = {
      id: editingTask?.id || crypto.randomUUID(),
      title: formData.title,
      dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
      priority: formData.priority,
      status: formData.status,
      createdAt: editingTask?.createdAt || new Date().toISOString(),
      completedAt: editingTask?.completedAt,
    };
    if (editingTask) {
      updateTask(editingTask.id, taskData);
    } else {
      addTask(taskData);
    }
    setDialogOpen(false);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const isColumn = COLUMNS.some((c) => c.id === overId);
    const targetColumn: TaskStatus = isColumn
      ? (overId as TaskStatus)
      : (tasks.find((t) => t.id === overId)?.status ?? 'todo');

    const activeTask = tasks.find((t) => t.id === activeId);
    if (activeTask && activeTask.status !== targetColumn) {
      moveTask(activeId, targetColumn);
    }
  };

  const tasksByColumn = (columnId: TaskStatus) =>
    tasks
      .filter((t) => t.status === columnId)
      .sort((a, b) => {
        const priorityOrder = { high: 0, medium: 1, low: 2 };
        if (priorityOrder[a.priority] !== priorityOrder[b.priority]) {
          return priorityOrder[a.priority] - priorityOrder[b.priority];
        }
        return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      });

  const totalCount = tasks.length;
  const doneCount = tasks.filter((t) => t.status === 'done').length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <Box
        sx={{
          p: 2,
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          display: 'flex',
          alignItems: 'center',
          gap: 1,
        }}
      >
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600, flex: 1 }}>
          ✅ {t('tasks.title')}
        </Typography>
        <Chip
          label={`${doneCount}/${totalCount} ${t('tasks.done')}`}
          size="small"
          sx={{
            fontSize: 10,
            height: 20,
            bgcolor: 'rgba(76,175,80,0.2)',
            color: '#4CAF50',
          }}
        />
        <IconButton size="small" color="primary" onClick={() => handleOpenDialog()}>
          <AddIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Kanban Board */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        <DndContext sensors={[]} onDragEnd={handleDragEnd}>
          <DragOverlay>
            <Box
              sx={{
                bgcolor: 'rgba(255,255,255,0.1)',
                borderRadius: 1,
                p: 1,
                opacity: 0.9,
              }}
            >
              <Typography variant="body2" sx={{ fontSize: 12 }}>
                {t('tasks.dragHint')}
              </Typography>
            </Box>
          </DragOverlay>
          <Box
            sx={{
              display: 'flex',
              gap: 1,
              height: '100%',
              alignItems: 'flex-start',
            }}
          >
            {COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                columnId={col.id}
                tasks={tasksByColumn(col.id)}
                labelKey={col.labelKey}
                onEdit={handleOpenDialog}
                onDelete={deleteTask}
              />
            ))}
          </Box>
        </DndContext>
      </Box>

      {/* Add/Edit Task Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15 }}>
          {editingTask ? t('tasks.editTask') : t('tasks.addTask')}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label={t('tasks.taskTitle')}
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              size="small"
              fullWidth
              autoFocus
            />
            <TextField
              label={t('tasks.dueDate')}
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              size="small"
              fullWidth
              InputLabelProps={{ shrink: true }}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>{t('tasks.priority')}</InputLabel>
              <Select
                value={formData.priority}
                label={t('tasks.priority')}
                onChange={(e) =>
                  setFormData({ ...formData, priority: e.target.value as Task['priority'] })
                }
              >
                <MenuItem value="low">{t('tasks.priorityLow')}</MenuItem>
                <MenuItem value="medium">{t('tasks.priorityMedium')}</MenuItem>
                <MenuItem value="high">{t('tasks.priorityHigh')}</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small" fullWidth>
              <InputLabel>{t('tasks.status')}</InputLabel>
              <Select
                value={formData.status}
                label={t('tasks.status')}
                onChange={(e) =>
                  setFormData({ ...formData, status: e.target.value as TaskStatus })
                }
              >
                <MenuItem value="ai_suggestion">{t('tasks.aiSuggestion')}</MenuItem>
                <MenuItem value="todo">{t('tasks.todo')}</MenuItem>
                <MenuItem value="in_progress">{t('tasks.inProgress')}</MenuItem>
                <MenuItem value="done">{t('tasks.done')}</MenuItem>
              </Select>
            </FormControl>
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} size="small">{t('tasks.cancel')}</Button>
          <Button
            onClick={handleSave}
            variant="contained"
            size="small"
            disabled={!formData.title}
          >
            {t('tasks.save')}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Tasks;
