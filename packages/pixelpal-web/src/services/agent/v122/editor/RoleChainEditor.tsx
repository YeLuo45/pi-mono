/**
 * RoleChainEditor - Visual editor for creating/editing role chains
 */

import React, { useState } from 'react';
import type { RoleChain, ChainNode, ChainNodeType } from '../types';
import { createRoleChain, createChainNode } from '../chain/RoleChain';
import { RoleDependencyGraph } from '../graph/RoleDependencyGraph';
import { GraphVisualizer } from '../graph/GraphVisualizer';

interface RoleChainEditorProps {
  chain?: RoleChain;
  onSave: (chain: RoleChain) => void;
  onCancel: () => void;
}

const NODE_TYPES: { value: ChainNodeType; label: string; icon: string }[] = [
  { value: 'role', label: 'Role', icon: '🤖' },
  { value: 'condition', label: 'Condition', icon: '❓' },
  { value: 'parallel', label: 'Parallel', icon: '⚡' },
  { value: 'aggregator', label: 'Aggregator', icon: '📦' },
];

export function RoleChainEditor({ chain, onSave, onCancel }: RoleChainEditorProps) {
  const [name, setName] = useState(chain?.name || '');
  const [description, setDescription] = useState(chain?.description || '');
  const [nodes, setNodes] = useState<ChainNode[]>(chain?.nodes || []);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const selectedNode = nodes.find(n => n.id === selectedNodeId);
  const graph = nodes.length > 0 ? new RoleDependencyGraph().buildGraph({
    id: '',
    name,
    description,
    nodes,
    entryNodeId: nodes[0]?.id || '',
    variables: {},
    isBuiltIn: false,
    version: 1,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  }) : null;

  const handleAddNode = (type: ChainNodeType) => {
    const newNode = createChainNode(type, {
      roleId: type === 'role' ? 'Executor' : undefined,
    });
    setNodes(prev => [...prev, newNode]);
    setSelectedNodeId(newNode.id);
  };

  const handleDeleteNode = (nodeId: string) => {
    setNodes(prev => prev.filter(n => n.id !== nodeId));
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  const handleUpdateNode = (nodeId: string, updates: Partial<ChainNode>) => {
    setNodes(prev => prev.map(n => n.id === nodeId ? { ...n, ...updates } : n));
  };

  const handleSave = () => {
    if (!name.trim() || nodes.length === 0) return;

    const newChain = createRoleChain({
      name: name.trim(),
      description: description.trim(),
      nodes,
      entryNodeId: nodes[0].id,
      variables: {},
      isBuiltIn: false,
    });

    onSave(newChain);
  };

  return (
    <div className="role-chain-editor">
      <div className="editor-header">
        <h2>{chain ? 'Edit Role Chain' : 'Create Role Chain'}</h2>
        <div className="header-actions">
          <button onClick={() => setShowPreview(!showPreview)}>
            {showPreview ? 'Hide' : 'Show'} Preview
          </button>
          <button onClick={onCancel}>Cancel</button>
          <button onClick={handleSave} className="primary" disabled={!name.trim() || nodes.length === 0}>
            Save
          </button>
        </div>
      </div>

      <div className="editor-content">
        <div className="editor-sidebar">
          <div className="field">
            <label>Chain Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., Code Review Pipeline" />
          </div>

          <div className="field">
            <label>Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} rows={2} placeholder="Describe this chain..." />
          </div>

          <div className="divider">Add Nodes</div>

          <div className="node-type-grid">
            {NODE_TYPES.map(nt => (
              <button key={nt.value} onClick={() => handleAddNode(nt.value)} className="node-type-btn">
                <span>{nt.icon}</span>
                <span>{nt.label}</span>
              </button>
            ))}
          </div>

          {selectedNode && (
            <div className="node-properties">
              <h3>Node Properties</h3>
              <div className="field">
                <label>Type</label>
                <span>{selectedNode.type}</span>
              </div>

              {selectedNode.type === 'role' && (
                <>
                  <div className="field">
                    <label>Role ID</label>
                    <input
                      value={selectedNode.roleId || ''}
                      onChange={e => handleUpdateNode(selectedNode.id, { roleId: e.target.value })}
                    />
                  </div>
                  <div className="field">
                    <label>Next Node</label>
                    <select
                      value={selectedNode.nextNodeId || ''}
                      onChange={e => handleUpdateNode(selectedNode.id, { nextNodeId: e.target.value || undefined })}
                    >
                      <option value="">End of chain</option>
                      {nodes.filter(n => n.id !== selectedNode.id).map(n => (
                        <option key={n.id} value={n.id}>{n.type}: {n.roleId || n.condition?.slice(0, 15)}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              {selectedNode.type === 'condition' && (
                <>
                  <div className="field">
                    <label>Condition (JS expression)</label>
                    <input
                      value={selectedNode.condition || ''}
                      onChange={e => handleUpdateNode(selectedNode.id, { condition: e.target.value })}
                      placeholder="e.g., result.success"
                    />
                  </div>
                  <div className="field">
                    <label>If True →</label>
                    <select
                      value={selectedNode.conditionNodes?.trueNodeId || ''}
                      onChange={e => handleUpdateNode(selectedNode.id, {
                        conditionNodes: { ...selectedNode.conditionNodes, trueNodeId: e.target.value || undefined }
                      })}
                    >
                      <option value="">End</option>
                      {nodes.filter(n => n.id !== selectedNode.id).map(n => (
                        <option key={n.id} value={n.id}>{n.roleId || n.condition?.slice(0, 15)}</option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label>If False →</label>
                    <select
                      value={selectedNode.conditionNodes?.falseNodeId || ''}
                      onChange={e => handleUpdateNode(selectedNode.id, {
                        conditionNodes: { ...selectedNode.conditionNodes, falseNodeId: e.target.value || undefined }
                      })}
                    >
                      <option value="">End</option>
                      {nodes.filter(n => n.id !== selectedNode.id).map(n => (
                        <option key={n.id} value={n.id}>{n.roleId || n.condition?.slice(0, 15)}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <button onClick={() => handleDeleteNode(selectedNode.id)} className="danger">
                Delete Node
              </button>
            </div>
          )}
        </div>

        <div className="editor-main">
          {showPreview && graph ? (
            <GraphVisualizer graph={graph} />
          ) : (
            <div className="nodes-list">
              <h3>Chain Nodes ({nodes.length})</h3>
              {nodes.length === 0 ? (
                <p className="empty-hint">Click "Add Nodes" to start building your chain</p>
              ) : (
                <div className="node-sequence">
                  {nodes.map((node, i) => (
                    <React.Fragment key={node.id}>
                      <div
                        className={`node-card ${selectedNodeId === node.id ? 'selected' : ''}`}
                        onClick={() => setSelectedNodeId(node.id)}
                      >
                        <span className="node-index">{i + 1}</span>
                        <span className="node-type">{node.type}</span>
                        {node.roleId && <span className="node-role">{node.roleId}</span>}
                        {node.condition && <span className="node-condition">{node.condition.slice(0, 30)}</span>}
                      </div>
                      {i < nodes.length - 1 && <div className="connector">→</div>}
                    </React.Fragment>
                  ))}
                </div>
              )}
            </div>
          )}

          {graph && graph.cycles.length > 0 && (
            <div className="cycle-warning">
              ⚠ Cycle detected! Please remove cyclic dependencies.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
