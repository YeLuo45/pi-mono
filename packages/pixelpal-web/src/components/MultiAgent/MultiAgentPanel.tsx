import React, { useState, useEffect } from 'react'
import { MultiAgentStatus } from './MultiAgentStatus'

interface TaskRecord {
  id: string
  type: string
  description: string
  assignedTo: string
  status: string
  result?: unknown
  createdAt: number
  completedAt?: number
}

export const MultiAgentPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [currentTraceId, setCurrentTraceId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<TaskRecord[]>([])

  useEffect(() => {
    const interval = setInterval(() => {
      const stored = sessionStorage.getItem('multiAgentTasks')
      if (stored) {
        try {
          const parsed = JSON.parse(stored)
          if (parsed.traceId !== currentTraceId) {
            setCurrentTraceId(parsed.traceId)
            setTasks(parsed.tasks || [])
          }
        } catch (e) {
          // ignore
        }
      }
    }, 1000)

    return () => clearInterval(interval)
  }, [currentTraceId])

  const activeCount = tasks.filter(t => t.status === 'in_progress').length

  if (!isOpen && tasks.length === 0) return null

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        title="多Agent协作状态"
        style={{
          position: 'fixed',
          bottom: '80px',
          right: '20px',
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: '#3b82f6',
          color: 'white',
          border: 'none',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
          zIndex: 1000,
          fontSize: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        🤖
        {activeCount > 0 && (
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            background: '#ef4444',
            color: 'white',
            fontSize: '10px',
            width: '18px',
            height: '18px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}>
            {activeCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '140px',
          right: '20px',
          zIndex: 1000,
        }}>
          <MultiAgentStatus
            tasks={tasks as any}
            traceId={currentTraceId || undefined}
            onClose={() => setIsOpen(false)}
          />
        </div>
      )}
    </>
  )
}
