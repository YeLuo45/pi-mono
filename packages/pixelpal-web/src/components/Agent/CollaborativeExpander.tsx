import React, { useState } from 'react';

interface AgentThought {
  agentId: string;
  agentName: string;
  agentType: 'main' | 'memory' | 'search' | 'tool' | 'persona';
  content: string;
  timestamp: number;
}

interface CollaborativeExpanderProps {
  thoughts: AgentThought[];
  onThoughtClick?: (agentId: string, timestamp: number) => void;
}

const AGENT_COLORS = {
  main: { bg: '#1a2a4a', border: '#4a9eff', text: '#7ab8ff' },
  memory: { bg: '#2a1a3a', border: '#9b59b6', text: '#c39bd3' },
  search: { bg: '#1a3a2a', border: '#2ecc71', text: '#7dcea0' },
  tool: { bg: '#3a2a1a', border: '#e67e22', text: '#f0b27a' },
  persona: { bg: '#3a1a2a', border: '#e91e63', text: '#f48fb1' },
};

const AGENT_ICONS = {
  main: '🎯',
  memory: '🧠',
  search: '🔍',
  tool: '🔧',
  persona: '🎭',
};

export const CollaborativeExpander: React.FC<CollaborativeExpanderProps> = ({ thoughts, onThoughtClick }) => {
  const [collapsedAgents, setCollapsedAgents] = useState<Set<string>>(new Set());
  const [expandedThoughts, setExpandedThoughts] = useState<Set<string>>(new Set());

  const toggleAgent = (agentId: string) => {
    setCollapsedAgents(prev => {
      const next = new Set(prev);
      if (next.has(agentId)) next.delete(agentId);
      else next.add(agentId);
      return next;
    });
  };

  const toggleThought = (key: string) => {
    setExpandedThoughts(prev => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  // Group thoughts by agent
  const byAgent = new Map<string, AgentThought[]>();
  for (const thought of thoughts) {
    if (!byAgent.has(thought.agentId)) byAgent.set(thought.agentId, []);
    byAgent.get(thought.agentId)!.push(thought);
  }

  return (
    <div style={{ padding: 8 }}>
      <div style={{ fontSize: 12, color: '#888', marginBottom: 8 }}>
        Collaborative Thinking · {thoughts.length} thoughts from {byAgent.size} agents
      </div>

      {Array.from(byAgent.entries()).map(([agentId, agentThoughts]) => {
        const colors = AGENT_COLORS[agentThoughts[0].agentType];
        const isCollapsed = collapsedAgents.has(agentId);

        return (
          <div key={agentId} style={{ marginBottom: 8 }}>
            {/* Agent header */}
            <div
              onClick={() => toggleAgent(agentId)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                background: colors.bg,
                border: `1px solid ${colors.border}`,
                borderRadius: 4,
                cursor: 'pointer',
                marginBottom: isCollapsed ? 0 : 4,
              }}
            >
              <span style={{ fontSize: 16 }}>{AGENT_ICONS[agentThoughts[0].agentType]}</span>
              <span style={{ fontSize: 13, color: colors.text, fontWeight: 600, flex: 1 }}>
                {agentThoughts[0].agentName}
              </span>
              <span style={{ fontSize: 11, color: colors.text }}>
                {agentThoughts.length} thoughts
              </span>
              <span style={{ fontSize: 12, color: '#888' }}>
                {isCollapsed ? '▶' : '▼'}
              </span>
            </div>

            {/* Thoughts */}
            {!isCollapsed && (
              <div style={{ paddingLeft: 16 }}>
                {agentThoughts.map((thought, idx) => {
                  const key = `${agentId}-${idx}`;
                  const isExpanded = expandedThoughts.has(key);
                  const shortContent = thought.content.slice(0, 100);
                  const needsTruncation = thought.content.length > 100;

                  return (
                    <div
                      key={key}
                      style={{
                        padding: '6px 8px',
                        marginBottom: 4,
                        background: '#0d0d1a',
                        borderRadius: 4,
                        borderLeft: `2px solid ${colors.border}`,
                        cursor: 'pointer',
                      }}
                      onClick={() => onThoughtClick?.(agentId, thought.timestamp)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <span style={{ fontSize: 10, color: '#555' }}>
                          {new Date(thought.timestamp).toLocaleTimeString()}
                        </span>
                        {needsTruncation && (
                          <span
                            onClick={(e) => { e.stopPropagation(); toggleThought(key); }}
                            style={{ fontSize: 10, color: colors.border, textDecoration: 'underline' }}
                          >
                            {isExpanded ? 'collapse' : 'expand'}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 12, color: '#ccc', lineHeight: 1.5 }}>
                        {isExpanded || !needsTruncation ? shortContent : `${shortContent}...`}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {thoughts.length === 0 && (
        <div style={{ padding: 16, color: '#555', textAlign: 'center' }}>
          No collaborative thinking yet
        </div>
      )}
    </div>
  );
};

// Mock data
export function createMockThoughts(): AgentThought[] {
  return [
    { agentId: 'main', agentName: 'MainAgent', agentType: 'main', content: 'Analyzing user request: They want to plan a trip to Tokyo. This requires multiple sub-tasks: destination research, flight booking, hotel reservation, and itinerary creation.', timestamp: Date.now() - 5000 },
    { agentId: 'memory', agentName: 'MemoryAgent', agentType: 'memory', content: 'Retrieved from memory: User has visited Japan twice before. Preferred areas: Shibuya, Shinjuku. Budget range: $2000-3000. Travel style: mix of sightseeing and food experiences.', timestamp: Date.now() - 4800 },
    { agentId: 'search', agentName: 'SearchAgent', agentType: 'search', content: 'Searching for: Tokyo travel 2026 best time to visit, flight prices from current location, popular hotel districts.', timestamp: Date.now() - 4500 },
    { agentId: 'main', agentName: 'MainAgent', agentType: 'main', content: 'Based on memory context, user prefers luxury but budget-conscious travel. Planning sub-tasks in parallel: flight search (SearchAgent), hotel search (SearchAgent), itinerary (MainAgent).', timestamp: Date.now() - 3000 },
    { agentId: 'tool', agentName: 'ToolAgent', agentType: 'tool', content: 'Executing tool: fetchWeather(Tokyo, late June). Weather looks favorable. Also executing: currencyConverter for budget planning.', timestamp: Date.now() - 1000 },
  ];
}
