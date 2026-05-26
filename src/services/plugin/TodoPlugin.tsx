// TodoPlugin — Built-in task management plugin
import React, { useState } from 'react';
import { MyDialog as Dialog, MyCheckbox as Checkbox , MyDialogActions as DialogActions, MyDialogContent as DialogContent, MyDialogTitle as DialogTitle, MyFormControl as FormControl, MyInputLabel as InputLabel, MyMenuItem as MenuItem } from '../../components/MUI替代';
import { MyBox as Box, MyTypography as Typography, MyIconButton as IconButton, MyButton as Button, MyTextField as TextField, MySelect as Select, MyList as List, MyListItem as ListItem, MyListItemText as ListItemText, MyChip as Chip } from '../../components/MUI替代';
import { Add as AddIcon, Delete as DeleteIcon } from '@mui/icons-material';
import type { Plugin } from './types';
import { PluginService } from './PluginService';

// Re-export TodoItem type for use elsewhere
export interface TodoItem {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  dueDate?: string; // ISO date
  createdAt: string;
  updatedAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: '#4CAF50',
  medium: '#FF9800',
  high: '#F44336',
};

// Panel component
export const TodoPluginPanel: React.FC<{ pluginId: string }> = ({ pluginId: _pluginId }) => {
  const [items, setItems] = useState<TodoItem[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<TodoItem | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    priority: 'medium' as TodoItem['priority'],
  });

  const handleOpenDialog = (item?: TodoItem) => {
    if (item) {
      setEditingItem(item);
      setFormData({
        title: item.title,
        description: item.description || '',
        dueDate: item.dueDate ? item.dueDate.slice(0, 10) : '',
        priority: item.priority,
      });
    } else {
      setEditingItem(null);
      setFormData({ title: '', description: '', dueDate: '', priority: 'medium' });
    }
    setDialogOpen(true);
  };

  const handleToggleComplete = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: item.status === 'completed' ? 'pending' : 'completed',
              updatedAt: new Date().toISOString(),
            }
          : item
      )
    );
  };

  const handleSave = () => {
    if (!formData.title) return;
    const now = new Date().toISOString();
    if (editingItem) {
      setItems((prev) =>
        prev.map((item) =>
          item.id === editingItem.id
            ? {
                ...item,
                title: formData.title,
                description: formData.description || undefined,
                dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
                priority: formData.priority,
                updatedAt: now,
              }
            : item
        )
      );
    } else {
      setItems((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          title: formData.title,
          description: formData.description || undefined,
          status: 'pending',
          priority: formData.priority,
          dueDate: formData.dueDate ? new Date(formData.dueDate).toISOString() : undefined,
          createdAt: now,
          updatedAt: now,
        },
      ]);
    }
    setDialogOpen(false);
  };

  const handleDelete = (itemId: string) => {
    setItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const filteredItems = items
    .filter((item) => {
      if (filter === 'pending') return item.status === 'pending';
      if (filter === 'completed') return item.status === 'completed';
      return true;
    })
    .sort((a, b) => {
      if (a.status !== b.status) return a.status === 'pending' ? -1 : 1;
      const po = { high: 0, medium: 1, low: 2 };
      return (po[a.priority] - po[b.priority]);
    });

  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const completedCount = items.filter((i) => i.status === 'completed').length;

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <Box sx={{ p: 2, borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: 1 }}>
        <Typography variant="h6" sx={{ fontSize: 15, fontWeight: 600, flex: 1 }}>
          ✅ Todo Plugin
        </Typography>
        <Chip label={`${pendingCount} pending`} size="small" sx={{ fontSize: 10, height: 20 }} />
        <Chip
          label={`${completedCount} done`}
          size="small"
          sx={{ fontSize: 10, height: 20, bgcolor: 'rgba(76,175,80,0.2)', color: '#4CAF50' }}
        />
        <IconButton size="small" color="primary" onClick={() => handleOpenDialog()}>
          <AddIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Filter tabs */}
      <Box sx={{ display: 'flex', gap: 1, px: 2, py: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        {(['all', 'pending', 'completed'] as const).map((f) => (
          <Typography
            key={f}
            component="button"
            onClick={() => setFilter(f)}
            sx={{
              fontSize: 11,
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: filter === f ? 'primary.main' : 'text.secondary',
              textTransform: 'capitalize',
              px: 1, py: 0.5, borderRadius: 1,
              bgcolor: filter === f ? 'rgba(255,255,255,0.08)' : 'transparent',
            }}
          >
            {f}
          </Typography>
        ))}
      </Box>

      {/* Task list */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 1 }}>
        {filteredItems.length === 0 ? (
          <Box sx={{ textAlign: 'center', mt: 4, opacity: 0.5 }}>
            <Typography variant="body2" sx={{ fontSize: 13 }}>
              No tasks yet. Click + to add one!
            </Typography>
          </Box>
        ) : (
          <List dense disablePadding>
            {filteredItems.map((item) => (
              <ListItem
                key={item.id}
                disablePadding
                sx={{
                  mb: 0.5, borderRadius: 1,
                  bgcolor: 'rgba(255,255,255,0.03)',
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.07)' },
                }}
                secondaryAction={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <IconButton edge="end" size="small" onClick={() => handleOpenDialog(item)}>
                      <DeleteIcon sx={{ fontSize: 14, opacity: 0.5 }} />
                    </IconButton>
                    <IconButton edge="end" size="small" onClick={() => handleDelete(item.id)}>
                      <DeleteIcon sx={{ fontSize: 14 }} color="error" />
                    </IconButton>
                  </Box>
                }
              >
                <Checkbox
                  checked={item.status === 'completed'}
                  onChange={() => handleToggleComplete(item.id)}
                  size="small"
                  sx={{ mr: 0.5, '& .MuiSvgIcon-root': { fontSize: 18 } }}
                />
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography
                        variant="body2"
                        sx={{
                          fontSize: 13,
                          textDecoration: item.status === 'completed' ? 'line-through' : 'none',
                          opacity: item.status === 'completed' ? 0.5 : 1,
                        }}
                      >
                        {item.title}
                      </Typography>
                      <Box
                        sx={{
                          width: 6, height: 6, borderRadius: '50%',
                          bgcolor: PRIORITY_COLORS[item.priority], flexShrink: 0,
                        }}
                      />
                    </Box>
                  }
                  secondary={
                    item.dueDate ? (
                      <Typography variant="caption" sx={{ fontSize: 10 }}>
                        {new Date(item.dueDate).toLocaleDateString()}
                      </Typography>
                    ) : undefined
                  }
                />
              </ListItem>
            ))}
          </List>
        )}
      </Box>

      {/* Add/Edit Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontSize: 15 }}>{editingItem ? 'Edit Task' : 'New Task'}</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <TextField
              label="Title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              size="small" fullWidth autoFocus
            />
            <TextField
              label="Description (optional)"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              size="small" fullWidth multiline rows={2}
            />
            <TextField
              label="Due Date (optional)"
              type="date"
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              size="small" fullWidth InputLabelProps={{ shrink: true }}
            />
            <FormControl size="small" fullWidth>
              <InputLabel>Priority</InputLabel>
              <Select
                value={formData.priority}
                label="Priority"
                onChange={(e) => setFormData({ ...formData, priority: e.target.value as TodoItem['priority'] })}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>
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

// AI tool implementations
const addTodoTool = async (args: unknown): Promise<unknown> => {
  const { title, priority = 'medium', dueDate } = args as {
    title: string;
    priority?: TodoItem['priority'];
    dueDate?: string;
  };
  const now = new Date().toISOString();
  const item: TodoItem = {
    id: crypto.randomUUID(),
    title,
    priority,
    status: 'pending',
    dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
    createdAt: now,
    updatedAt: now,
  };
  return { success: true, item };
};

const listTodosTool = async (_args: unknown): Promise<unknown> => {
  return { success: true, items: [] };
};

const updateTodoStatusTool = async (args: unknown): Promise<unknown> => {
  const { id, status } = args as { id: string; status: TodoItem['status'] };
  return { success: true, id, status };
};

// Plugin definition
export const todoPlugin: Plugin = {
  id: 'todo',
  name: 'Todo',
  version: '1.0.0',
  icon: '✅',
  panel: TodoPluginPanel,
  capabilities: [
    { type: 'panel' },
    { type: 'ai_tool', name: 'add_todo' },
    { type: 'ai_tool', name: 'list_todos' },
    { type: 'ai_tool', name: 'update_todo_status' },
  ],

  onInit() {
    // Register AI tool handlers
    PluginService.registerTool('todo', 'add_todo', addTodoTool);
    PluginService.registerTool('todo', 'list_todos', listTodosTool);
    PluginService.registerTool('todo', 'update_todo_status', updateTodoStatusTool);
  },
};
