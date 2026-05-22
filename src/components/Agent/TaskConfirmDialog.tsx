/**
 * TaskConfirmDialog - Confirm AI-generated tasks before adding to Tasks panel
 * 
 * Shows a list of tasks generated from a goal. Users can:
 * - Check/uncheck tasks to include or exclude
 * - Remove individual tasks
 * - Adjust task order
 * - Confirm to add selected tasks to the Tasks panel
 */

import React, { useState, useEffect } from 'react';
import { MyDialog, MyCheckbox, MyListItemIcon } from '../MUI替代';
import { MyBox, MyTypography, MyIconButton, MyButton, MyPaper, MyList, MyListItem, MyListItemText, MyTextField, MyChip, MyDivider, MyTooltip } from '../MUI替代';
import {
  Delete as DeleteIcon,
  ArrowUpward as ArrowUpIcon,
  ArrowDownward as ArrowDownIcon,
  CheckBoxOutlineBlank as CheckboxBlankIcon,
  CheckBox as CheckboxIcon,
  TaskAlt as TaskAltIcon,
} from '@mui/icons-material';
import { useStore } from '../../store';
import type { Task as AgentTask } from '../../services/agent/types';
import type { Task, TaskStatus } from '../../types';

interface TaskConfirmDialogProps {
  open: boolean;
  agentTask: AgentTask | null;
  goal: string;
  onClose: () => void;
  onConfirm: (tasks: Task[]) => void;
}

/**
 * Convert Agent Task (with steps) to a user-facing TaskItem for the dialog
 */
interface TaskItem {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  checked: boolean;
}

export const TaskConfirmDialog: React.FC<TaskConfirmDialogProps> = ({
  open,
  agentTask,
  goal,
  onClose,
  onConfirm,
}) => {
  const [taskItems, setTaskItems] = useState<TaskItem[]>([]);

  // Initialize task items from agent task
  useEffect(() => {
    if (agentTask && open) {
      const items: TaskItem[] = agentTask.steps.map((step, index) => ({
        id: step.id || `task-item-${index}`,
        title: step.description.slice(0, 50), // Truncate for title
        description: step.description,
        priority: agentTask.priority === 'urgent' || agentTask.priority === 'high' ? 'high' : 
                  agentTask.priority === 'low' ? 'low' : 'medium',
        checked: true,
      }));
      setTaskItems(items);
    }
  }, [agentTask, open]);

  const toggleCheck = (id: string) => {
    setTaskItems(prev => prev.map(item => 
      item.id === id ? { ...item, checked: !item.checked } : item
    ));
  };

  const removeTask = (id: string) => {
    setTaskItems(prev => prev.filter(item => item.id !== id));
  };

  const moveTask = (id: string, direction: 'up' | 'down') => {
    setTaskItems(prev => {
      const index = prev.findIndex(item => item.id === id);
      if (index === -1) return prev;
      if (direction === 'up' && index === 0) return prev;
      if (direction === 'down' && index === prev.length - 1) return prev;
      
      const newItems = [...prev];
      const targetIndex = direction === 'up' ? index - 1 : index + 1;
      [newItems[index], newItems[targetIndex]] = [newItems[targetIndex], newItems[index]];
      return newItems;
    });
  };

  const handleConfirm = () => {
    const selectedTasks: Task[] = taskItems
      .filter(item => item.checked)
      .map((item, index) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        priority: item.priority,
        status: 'todo' as TaskStatus,
        createdAt: new Date().toISOString(),
      }));
    
    onConfirm(selectedTasks);
    onClose();
  };

  const handleClose = () => {
    // Don't clear taskItems on close - keep them in case user reopens
    onClose();
  };

  const selectedCount = taskItems.filter(item => item.checked).length;

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          bgcolor: 'background.default',
          backgroundImage: 'none',
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <TaskAltIcon sx={{ color: 'primary.main' }} />
        <Typography variant="h6" component="span">
          确认任务计划
        </Typography>
        <Chip 
          label={`${selectedCount}/${taskItems.length} 个任务`} 
          size="small" 
          color={selectedCount > 0 ? 'primary' : 'default'}
          sx={{ ml: 1 }}
        />
      </DialogTitle>
      
      <DialogContent dividers>
        {/* Goal display */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
            目标
          </Typography>
          <Paper sx={{ p: 1.5, bgcolor: 'action.hover' }}>
            <Typography variant="body2">{goal}</Typography>
          </Paper>
        </Box>

        <Divider sx={{ my: 2 }} />

        {/* Task list */}
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          勾选要添加的任务，可调整顺序或删除
        </Typography>
        
        <List dense sx={{ maxHeight: 400, overflow: 'auto' }}>
          {taskItems.map((item, index) => (
            <Paper
              key={item.id}
              sx={{ 
                mb: 1, 
                bgcolor: item.checked ? 'transparent' : 'action.disabledBackground',
                opacity: item.checked ? 1 : 0.6,
                transition: 'all 0.2s',
              }}
            >
              <ListItem
                secondaryAction={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    <Tooltip title="上移">
                      <IconButton 
                        size="small" 
                        onClick={() => moveTask(item.id, 'up')}
                        disabled={index === 0}
                      >
                        <ArrowUpIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="下移">
                      <IconButton 
                        size="small" 
                        onClick={() => moveTask(item.id, 'down')}
                        disabled={index === taskItems.length - 1}
                      >
                        <ArrowDownIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="删除">
                      <IconButton 
                        size="small" 
                        onClick={() => removeTask(item.id)}
                        color="error"
                      >
                        <DeleteIcon fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Box>
                }
                sx={{ pr: 10 }}
              >
                <ListItemIcon sx={{ minWidth: 36 }}>
                  <Checkbox
                    checked={item.checked}
                    onChange={() => toggleCheck(item.id)}
                    icon={<CheckboxBlankIcon />}
                    checkedIcon={<CheckboxIcon />}
                    sx={{ p: 0.5 }}
                  />
                </ListItemIcon>
                <ListItemText
                  primary={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        variant="body2"
                        sx={{ 
                          fontWeight: 500,
                          textDecoration: item.checked ? 'none' : 'line-through',
                        }}
                      >
                        {item.title}
                      </Typography>
                      <Chip 
                        label={item.priority === 'high' ? '高' : item.priority === 'low' ? '低' : '中'} 
                        size="small"
                        color={item.priority === 'high' ? 'error' : item.priority === 'low' ? 'default' : 'primary'}
                        sx={{ height: 18, fontSize: 10 }}
                      />
                    </Box>
                  }
                  secondary={
                    <Typography 
                      variant="caption" 
                      color="text.secondary"
                      sx={{ 
                        display: 'block',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {item.description}
                    </Typography>
                  }
                />
              </ListItem>
            </Paper>
          ))}
        </List>

        {taskItems.length === 0 && (
          <Box sx={{ py: 4, textAlign: 'center' }}>
            <Typography color="text.secondary">
              没有可添加的任务
            </Typography>
          </Box>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button onClick={handleClose} color="inherit">
          取消
        </Button>
        <Button 
          onClick={handleConfirm} 
          variant="contained" 
          color="primary"
          disabled={selectedCount === 0}
          startIcon={<TaskAltIcon />}
        >
          添加 {selectedCount} 个任务
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TaskConfirmDialog;
