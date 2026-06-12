/**
 * CollaborationBoard - Task kanban board for multi-agent collaboration
 */

import React, { useState } from 'react';
import type { TaskStatus } from '../../services/agent/v114/types';

export interface BoardTask {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  assignedAgentId?: string;
  priority: 'low' | 'medium' | 'high';
  createdAt: number;
  updatedAt: number;
}

interface Column {
  id: TaskStatus;
  title: string;
  color: string;
}

const COLUMNS: Column[] = [
  { id: 'pending', title: 'Pending', color: '#6B7280' },
  { id: 'running', title: 'In Progress', color: '#3B82F6' },
  { id: 'completed', title: 'Done', color: '#10B981' },
  { id: 'failed', title: 'Failed', color: '#EF4444' },
];

interface CollaborationBoardProps {
  tasks: BoardTask[];
  onTaskMove: (taskId: string, newStatus: TaskStatus) => void;
  onTaskClick?: (task: BoardTask) => void;
  onAgentClick?: (agentId: string) => void;
}

export function CollaborationBoard({ tasks, onTaskMove, onTaskClick, onAgentClick }: CollaborationBoardProps) {
  const [draggedTask, setDraggedTask] = useState<string | null>(null);

  const getTasksByStatus = (status: TaskStatus) => tasks.filter(t => t.status === status);

  const handleDragStart = (e: React.DragEvent, taskId: string) => {
    setDraggedTask(taskId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, status: TaskStatus) => {
    e.preventDefault();
    if (draggedTask) {
      onTaskMove(draggedTask, status);
      setDraggedTask(null);
    }
  };

  return (
    <div className="collaboration-board">
      <div className="board-header">
        <h2>Collaboration Board</h2>
        <div className="board-stats">
          {COLUMNS.map(col => (
            <span key={col.id} className="stat" style={{ color: col.color }}>
              {getTasksByStatus(col.id).length} {col.title}
            </span>
          ))}
        </div>
      </div>

      <div className="board-columns">
        {COLUMNS.map(col => {
          const columnTasks = getTasksByStatus(col.id);
          return (
            <div
              key={col.id}
              className="board-column"
              onDragOver={handleDragOver}
              onDrop={e => handleDrop(e, col.id)}
            >
              <div className="column-header" style={{ borderColor: col.color }}>
                <span className="column-title">{col.title}</span>
                <span className="column-count">{columnTasks.length}</span>
              </div>

              <div className="column-tasks">
                {columnTasks.map(task => (
                  <div
                    key={task.id}
                    className={`task-card ${draggedTask === task.id ? 'dragging' : ''}`}
                    draggable
                    onDragStart={e => handleDragStart(e, task.id)}
                    onClick={() => onTaskClick?.(task)}
                  >
                    <div className="task-priority" data-priority={task.priority} />
                    <div className="task-title">{task.title}</div>
                    {task.description && (
                      <div className="task-description">{task.description.slice(0, 60)}</div>
                    )}
                    {task.assignedAgentId && (
                      <div
                        className="task-agent"
                        onClick={e => { e.stopPropagation(); onAgentClick?.(task.assignedAgentId!); }}
                      >
                        🤖 {task.assignedAgentId.slice(0, 8)}
                      </div>
                    )}
                    <div className="task-time">
                      {new Date(task.updatedAt).toLocaleTimeString()}
                    </div>
                  </div>
                ))}

                {columnTasks.length === 0 && (
                  <div className="column-empty">No tasks</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
