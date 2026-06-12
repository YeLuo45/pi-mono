import React from 'react'

interface TaskStatus {
  id: string
  type: string
  description: string
  assignedTo: string
  status: 'pending' | 'in_progress' | 'completed' | 'failed'
  result?: unknown
  createdAt: number
  completedAt?: number
}

interface MultiAgentStatusProps {
  tasks: TaskStatus[]
  traceId?: string
  onClose?: () => void
}

export const MultiAgentStatus: React.FC<MultiAgentStatusProps> = ({ tasks, traceId, onClose }) => {
  const statusOrder: Record<string, number> = { pending: 0, in_progress: 1, completed: 2, failed: 3 }

  const sortedTasks = [...tasks].sort((a, b) => {
    const statusDiff = statusOrder[a.status] - statusOrder[b.status]
    if (statusDiff !== 0) return statusDiff
    return a.createdAt - b.createdAt
  })

  const completedCount = tasks.filter(t => t.status === 'completed').length
  const totalCount = tasks.length
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return '#9ca3af'
      case 'in_progress': return '#f59e0b'
      case 'completed': return '#10b981'
      case 'failed': return '#ef4444'
      default: return '#9ca3af'
    }
  }

  const getAgentIcon = (agentId: string) => {
    switch (agentId) {
      case 'orchestrator': return '🎯'
      case 'executor': return '⚡'
      case 'reviewer': return '🔍'
      default: return '🤖'
    }
  }

  return (
    <div style={{
      background: '#1f2937',
      border: '1px solid #374151',
      borderRadius: '12px',
      padding: '16px',
      maxWidth: '400px',
      color: 'white',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
        <h3 style={{ fontSize: '14px', fontWeight: '600', margin: 0 }}>🤖 多Agent协作</h3>
        {traceId && <span style={{ fontSize: '11px', color: '#9ca3af', fontFamily: 'monospace' }}>#{traceId}</span>}
        {onClose && <button onClick={onClose} style={{ marginLeft: 'auto', background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', fontSize: '18px' }}>×</button>}
      </div>

      <div style={{ height: '6px', background: '#374151', borderRadius: '3px', marginBottom: '16px', position: 'relative' }}>
        <div style={{ height: '100%', width: `${progress}%`, background: '#3b82f6', borderRadius: '3px', transition: 'width 0.3s ease' }} />
        <span style={{ position: 'absolute', right: 0, top: '-18px', fontSize: '11px', color: '#9ca3af' }}>{completedCount}/{totalCount} 完成</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {sortedTasks.map(task => (
          <div key={task.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px',
            background: task.status === 'in_progress' ? '#1f2937' : '#111827',
            borderRadius: '8px',
          }}>
            <div style={{ fontSize: '16px' }}>
              {task.status === 'in_progress' ? '⏳' :
               task.status === 'completed' ? '✅' :
               task.status === 'failed' ? '❌' : '⭕'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: '12px', fontWeight: '500' }}>{getAgentIcon(task.assignedTo)} {task.type}</div>
              <div style={{ fontSize: '11px', color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{task.description}</div>
            </div>
            <div style={{
              fontSize: '10px',
              padding: '2px 6px',
              borderRadius: '4px',
              color: 'white',
              backgroundColor: getStatusColor(task.status),
            }}>
              {task.status === 'in_progress' ? '执行中' :
               task.status === 'completed' ? '完成' :
               task.status === 'failed' ? '失败' : '等待'}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
