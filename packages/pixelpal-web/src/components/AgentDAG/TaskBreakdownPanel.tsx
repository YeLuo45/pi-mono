// TaskBreakdownPanel - Task breakdown panel with tree list and details

import React, { useState, useMemo } from 'react';
import { MyBox } from '../MUI替代/基础组件/MyBox';
import { MyTypography } from '../MUI替代/基础组件/MyTypography';
import { MyButton } from '../MUI替代/基础组件/MyButton';
import { MyDivider } from '../MUI替代/基础组件/MyDivider';
import { useDAGContext } from './DAGGraph';
import { STATUS_COLORS, AGENT_ROLE_COLORS } from './DAGGraph';
import type { DAGNode, AgentRole } from './DAGGraph';

interface TreeNode {
  node: DAGNode;
  children: TreeNode[];
  depth: number;
  isExpanded: boolean;
}

interface TaskTreeItemProps {
  treeNode: TreeNode;
  isSelected: boolean;
  onSelect: (nodeId: string) => void;
  onToggle: (nodeId: string) => void;
}

const TaskTreeItem: React.FC<TaskTreeItemProps> = ({
  treeNode,
  isSelected,
  onSelect,
  onToggle,
}) => {
  const { node, children, depth, isExpanded } = treeNode;
  const hasChildren = children.length > 0;

  const statusColor = STATUS_COLORS[node.status];
  const roleColor = AGENT_ROLE_COLORS[node.agentRole] || AGENT_ROLE_COLORS.planner;

  return (
    <div
      className="task-tree-item"
      data-node-id={node.id}
      onClick={() => onSelect(node.id)}
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '8px 12px',
        paddingLeft: `${depth * 24 + 12}px`,
        cursor: 'pointer',
        backgroundColor: isSelected ? '#2a2a40' : 'transparent',
        borderLeft: isSelected ? `3px solid ${roleColor}` : '3px solid transparent',
        transition: 'background-color 0.15s ease',
      }}
    >
      {/* Expand/collapse toggle */}
      {hasChildren ? (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onToggle(node.id);
          }}
          style={{
            width: '20px',
            height: '20px',
            border: 'none',
            background: 'transparent',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#666',
            fontSize: '12px',
            marginRight: '4px',
          }}
        >
          {isExpanded ? '▼' : '▶'}
        </button>
      ) : (
        <div style={{ width: '20px', marginRight: '4px' }} />
      )}

      {/* Status indicator */}
      <div
        style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: statusColor,
          marginRight: '10px',
          flexShrink: 0,
        }}
      />

      {/* Node label */}
      <span
        style={{
          flex: 1,
          fontSize: '13px',
          color: isSelected ? '#f7f8f8' : '#ccc',
          fontWeight: isSelected ? 500 : 400,
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
        }}
      >
        {node.label}
      </span>

      {/* Role badge */}
      <span
        style={{
          fontSize: '10px',
          padding: '2px 6px',
          borderRadius: '4px',
          backgroundColor: roleColor,
          color: 'white',
          marginLeft: '8px',
        }}
      >
        {node.agentRole}
      </span>
    </div>
  );
};

export const TaskBreakdownPanel: React.FC = () => {
  const { state } = useDAGContext();
  const { nodes } = state;

  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [expandedNodeIds, setExpandedNodeIds] = useState<Set<string>>(new Set());

  const selectedNode = useMemo(
    () => nodes.find(n => n.id === selectedNodeId),
    [nodes, selectedNodeId]
  );

  // Build tree structure
  const tree = useMemo(() => {
    const nodeMap = new Map<string, DAGNode>();
    const childrenMap = new Map<string, DAGNode[]>();

    nodes.forEach(node => {
      nodeMap.set(node.id, node);
      childrenMap.set(node.id, []);
    });

    nodes.forEach(node => {
      node.dependencies.forEach(depId => {
        const children = childrenMap.get(depId);
        if (children) {
          children.push(node);
        }
      });
    });

    const buildTree = (nodeId: string, depth: number): TreeNode | null => {
      const node = nodeMap.get(nodeId);
      if (!node) return null;

      const children = childrenMap.get(nodeId) || [];
      const treeChildren = children
        .map(child => buildTree(child.id, depth + 1))
        .filter((t): t is TreeNode => t !== null);

      return {
        node,
        children: treeChildren,
        depth,
        isExpanded: expandedNodeIds.has(nodeId),
      };
    };

    // Find root nodes (nodes with no dependencies)
    const rootNodes = nodes.filter(n => n.dependencies.length === 0);
    const treeRoots = rootNodes.map(n => buildTree(n.id, 0)).filter((t): t is TreeNode => t !== null);

    return treeRoots;
  }, [nodes, expandedNodeIds]);

  const handleToggle = (nodeId: string) => {
    setExpandedNodeIds(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  };

  const renderDetailSection = () => {
    if (!selectedNode) {
      return (
        <div style={{ padding: '20px', textAlign: 'center' }}>
          <MyTypography variant="body2" color="secondary">
            Select a task to view details
          </MyTypography>
        </div>
      );
    }

    const statusColor = STATUS_COLORS[selectedNode.status];
    const roleColor = AGENT_ROLE_COLORS[selectedNode.agentRole];

    return (
      <div className="task-details" style={{ padding: '16px' }}>
        {/* Header */}
        <div style={{ marginBottom: '16px' }}>
          <MyTypography variant="h6" color="textPrimary" gutterBottom>
            {selectedNode.label}
          </MyTypography>
          <div style={{ display: 'flex', gap: '8px' }}>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                backgroundColor: roleColor,
                color: 'white',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              {selectedNode.agentRole}
            </span>
            <span
              style={{
                padding: '4px 12px',
                borderRadius: '6px',
                backgroundColor: statusColor,
                color: 'white',
                fontSize: '12px',
                fontWeight: 500,
              }}
            >
              {selectedNode.status}
            </span>
          </div>
        </div>

        <MyDivider />

        {/* Duration */}
        {selectedNode.duration && (
          <div style={{ marginTop: '16px' }}>
            <MyTypography variant="subtitle2" color="secondary" gutterBottom>
              Duration
            </MyTypography>
            <MyTypography variant="body1" color="textPrimary">
              {selectedNode.duration < 1000
                ? `${selectedNode.duration}ms`
                : selectedNode.duration < 60000
                ? `${(selectedNode.duration / 1000).toFixed(1)}s`
                : `${(selectedNode.duration / 60000).toFixed(1)}m`}
            </MyTypography>
          </div>
        )}

        {/* Error */}
        {selectedNode.error && (
          <div style={{ marginTop: '16px' }}>
            <MyTypography variant="subtitle2" color="error" gutterBottom>
              Error
            </MyTypography>
            <div
              style={{
                backgroundColor: '#2a1a1a',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '13px',
                color: '#ef5350',
                fontFamily: 'monospace',
                whiteSpace: 'pre-wrap',
              }}
            >
              {selectedNode.error}
            </div>
          </div>
        )}

        {/* Inputs */}
        <div style={{ marginTop: '16px' }}>
          <MyTypography variant="subtitle2" color="secondary" gutterBottom>
            Inputs ({Object.keys(selectedNode.inputs).length})
          </MyTypography>
          {Object.keys(selectedNode.inputs).length > 0 ? (
            <div
              style={{
                backgroundColor: '#1e1e2e',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '13px',
                fontFamily: 'monospace',
              }}
            >
              {Object.entries(selectedNode.inputs).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#7170ff' }}>{key}</span>
                  <span style={{ color: '#666', margin: '0 8px' }}>:</span>
                  <span style={{ color: '#f7f8f8' }}>{String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <MyTypography variant="body2" color="secondary">
              No inputs
            </MyTypography>
          )}
        </div>

        {/* Outputs */}
        <div style={{ marginTop: '16px' }}>
          <MyTypography variant="subtitle2" color="secondary" gutterBottom>
            Outputs ({Object.keys(selectedNode.outputs).length})
          </MyTypography>
          {Object.keys(selectedNode.outputs).length > 0 ? (
            <div
              style={{
                backgroundColor: '#1e1e2e',
                borderRadius: '8px',
                padding: '12px',
                fontSize: '13px',
                fontFamily: 'monospace',
              }}
            >
              {Object.entries(selectedNode.outputs).map(([key, value]) => (
                <div key={key} style={{ marginBottom: '8px' }}>
                  <span style={{ color: '#4caf50' }}>{key}</span>
                  <span style={{ color: '#666', margin: '0 8px' }}>:</span>
                  <span style={{ color: '#f7f8f8' }}>{String(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <MyTypography variant="body2" color="secondary">
              No outputs yet
            </MyTypography>
          )}
        </div>

        {/* Dependencies */}
        {selectedNode.dependencies.length > 0 && (
          <div style={{ marginTop: '16px' }}>
            <MyTypography variant="subtitle2" color="secondary" gutterBottom>
              Dependencies ({selectedNode.dependencies.length})
            </MyTypography>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {selectedNode.dependencies.map(depId => {
                const depNode = nodes.find(n => n.id === depId);
                return (
                  <div
                    key={depId}
                    onClick={() => setSelectedNodeId(depId)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: '6px',
                      backgroundColor: '#252536',
                      border: '1px solid #3a3a50',
                      cursor: 'pointer',
                      fontSize: '12px',
                    }}
                  >
                    <span style={{ color: '#f7f8f8' }}>
                      {depNode?.label || depId}
                    </span>
                    {depNode && (
                      <span
                        style={{
                          marginLeft: '6px',
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: STATUS_COLORS[depNode.status],
                          display: 'inline-block',
                        }}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Timestamps */}
        {(selectedNode.startTime || selectedNode.endTime) && (
          <div style={{ marginTop: '16px' }}>
            <MyTypography variant="subtitle2" color="secondary" gutterBottom>
              Timestamps
            </MyTypography>
            <div style={{ fontSize: '13px', color: '#aaa' }}>
              {selectedNode.startTime && (
                <div>Started: {new Date(selectedNode.startTime).toLocaleString()}</div>
              )}
              {selectedNode.endTime && (
                <div>Ended: {new Date(selectedNode.endTime).toLocaleString()}</div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="task-breakdown-panel" data-testid="task-breakdown-panel">
      <MyBox
        sx={{
          display: 'flex',
          height: '100%',
          backgroundColor: '#1a1a2e',
        }}
      >
        {/* Tree view */}
        <div
          style={{
            width: '50%',
            borderRight: '1px solid #333',
            overflow: 'auto',
          }}
        >
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #333',
              backgroundColor: '#1e1e2e',
            }}
          >
            <MyTypography variant="subtitle1" color="textPrimary">
              Task Breakdown
            </MyTypography>
          </div>

          <div className="task-tree">
            {tree.length > 0 ? (
              tree.map(treeNode => (
                <div key={treeNode.node.id}>
                  <TaskTreeItem
                    treeNode={treeNode}
                    isSelected={selectedNodeId === treeNode.node.id}
                    onSelect={setSelectedNodeId}
                    onToggle={handleToggle}
                  />
                  {treeNode.isExpanded && treeNode.children.length > 0 && (
                    <div className="task-tree-children">
                      {treeNode.children.map(child => (
                        <TaskTreeItem
                          key={child.node.id}
                          treeNode={child}
                          isSelected={selectedNodeId === child.node.id}
                          onSelect={setSelectedNodeId}
                          onToggle={handleToggle}
                        />
                      ))}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <div style={{ padding: '20px', textAlign: 'center' }}>
                <MyTypography variant="body2" color="secondary">
                  No tasks yet
                </MyTypography>
              </div>
            )}
          </div>
        </div>

        {/* Details view */}
        <div style={{ width: '50%', overflow: 'auto' }}>
          <div
            style={{
              padding: '12px 16px',
              borderBottom: '1px solid #333',
              backgroundColor: '#1e1e2e',
            }}
          >
            <MyTypography variant="subtitle1" color="textPrimary">
              Task Details
            </MyTypography>
          </div>

          {renderDetailSection()}
        </div>
      </MyBox>
    </div>
  );
};

export default TaskBreakdownPanel;