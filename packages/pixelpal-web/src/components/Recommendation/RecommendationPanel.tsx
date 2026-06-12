import React, { useState, useEffect } from 'react'
import { recommendationEngine } from '../../services/recommendation/recommendationEngine'

interface RecommendationPanelProps {
  onExecute?: (action: string) => void
}

export const RecommendationPanel: React.FC<RecommendationPanelProps> = ({ onExecute }) => {
  const [recommendations, setRecommendations] = useState<any[]>([])

  useEffect(() => {
    const recs = recommendationEngine.getActiveRecommendations(3)
    setRecommendations(recs)
  }, [])

  const handleExecute = (action: string) => {
    if (onExecute) {
      onExecute(action)
    }
  }

  const handleDismiss = (id: string) => {
    recommendationEngine.dismissRecommendation(id)
    setRecommendations(prev => prev.filter(r => r.id !== id))
  }

  if (recommendations.length === 0) return null

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: '12px',
      padding: '16px',
      marginTop: '16px',
    }}>
      <h4 style={{ fontSize: '13px', fontWeight: '600', marginBottom: '12px', color: 'var(--color-text)' }}>
        💡 为您推荐
      </h4>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {recommendations.map(rec => (
          <div key={rec.id} style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px',
            background: 'var(--color-background)',
            borderRadius: '8px',
            cursor: 'pointer',
          }}>
            <div style={{ flex: 1 }} onClick={() => handleExecute(rec.action)}>
              <div style={{ fontSize: '13px', fontWeight: '500', color: 'var(--color-text)' }}>
                {rec.title}
              </div>
              <div style={{ fontSize: '11px', color: 'var(--color-muted)', marginTop: '2px' }}>
                {rec.reason}
              </div>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleDismiss(rec.id) }}
              style={{
                background: 'none',
                border: 'none',
                color: 'var(--color-muted)',
                cursor: 'pointer',
                fontSize: '14px',
                padding: '4px',
              }}
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </div>
  )
}
