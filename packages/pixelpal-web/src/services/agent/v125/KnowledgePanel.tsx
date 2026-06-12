/**
 * KnowledgePanel - Side panel for knowledge details and editing
 */

import React, { useState } from 'react';
import type { KnowledgeEntity, KnowledgeRelation, EntityType, RelationType } from './types';

interface KnowledgePanelProps {
  entity?: KnowledgeEntity;
  relations: KnowledgeRelation[];
  allEntities: KnowledgeEntity[];
  onUpdate: (id: string, updates: Partial<KnowledgeEntity>) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
  onCreateRelation: (sourceId: string, targetId: string, type: RelationType) => void;
}

const ENTITY_TYPE_LABELS: Record<EntityType, string> = {
  agent: 'Agent',
  task: 'Task',
  concept: 'Concept',
  document: 'Document',
  skill: 'Skill',
};

export function KnowledgePanel({
  entity,
  relations,
  allEntities,
  onUpdate,
  onDelete,
  onClose,
  onCreateRelation,
}: KnowledgePanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(entity?.name || '');
  const [editDescription, setEditDescription] = useState(entity?.description || '');
  const [newRelationTarget, setNewRelationTarget] = useState('');
  const [newRelationType, setNewRelationType] = useState<RelationType>('related_to');

  if (!entity) {
    return (
      <div className="knowledge-panel empty">
        <p>Select an entity to view details</p>
      </div>
    );
  }

  const entityRelations = relations.filter(r => r.sourceId === entity.id || r.targetId === entity.id);

  const handleSave = () => {
    onUpdate(entity.id, { name: editName, description: editDescription });
    setIsEditing(false);
  };

  const handleAddRelation = () => {
    if (newRelationTarget && newRelationTarget !== entity.id) {
      onCreateRelation(entity.id, newRelationTarget, newRelationType);
      setNewRelationTarget('');
    }
  };

  return (
    <div className="knowledge-panel">
      <div className="panel-header">
        <span className="entity-type-badge" data-type={entity.type}>
          {ENTITY_TYPE_LABELS[entity.type]}
        </span>
        <button onClick={onClose}>×</button>
      </div>

      {isEditing ? (
        <div className="panel-edit">
          <div className="field">
            <label>Name</label>
            <input value={editName} onChange={e => setEditName(e.target.value)} />
          </div>
          <div className="field">
            <label>Description</label>
            <textarea value={editDescription} onChange={e => setEditDescription(e.target.value)} rows={4} />
          </div>
          <div className="actions">
            <button onClick={() => setIsEditing(false)}>Cancel</button>
            <button onClick={handleSave} className="primary">Save</button>
          </div>
        </div>
      ) : (
        <div className="panel-view">
          <h2>{entity.name}</h2>
          <p className="description">{entity.description}</p>

          <div className="meta">
            <span>Version {entity.version}</span>
            <span>Updated {new Date(entity.updatedAt).toLocaleString()}</span>
          </div>

          {entity.ownerAgentId && (
            <div className="owner">
              <span>Owner:</span> 🤖 {entity.ownerAgentId.slice(0, 8)}
            </div>
          )}

          <div className="actions">
            <button onClick={() => setIsEditing(true)}>Edit</button>
            <button onClick={() => onDelete(entity.id)} className="danger">Delete</button>
          </div>
        </div>
      )}

      {/* Relations */}
      <div className="relations-section">
        <h3>Relations ({entityRelations.length})</h3>

        <div className="relations-list">
          {entityRelations.map(rel => {
            const otherId = rel.sourceId === entity.id ? rel.targetId : rel.sourceId;
            const other = allEntities.find(e => e.id === otherId);
            return (
              <div key={rel.id} className="relation-item">
                <span className="relation-type">{rel.type}</span>
                <span className="relation-target">{other?.name || otherId.slice(0, 8)}</span>
              </div>
            );
          })}
        </div>

        {/* Add relation */}
        <div className="add-relation">
          <select value={newRelationType} onChange={e => setNewRelationType(e.target.value as RelationType)}>
            <option value="knows">knows</option>
            <option value="depends_on">depends_on</option>
            <option value="produces">produces</option>
            <option value="requires">requires</option>
            <option value="related_to">related_to</option>
            <option value="part_of">part_of</option>
          </select>
          <select value={newRelationTarget} onChange={e => setNewRelationTarget(e.target.value)}>
            <option value="">Select entity...</option>
            {allEntities.filter(e => e.id !== entity.id).map(e => (
              <option key={e.id} value={e.id}>{e.name}</option>
            ))}
          </select>
          <button onClick={handleAddRelation} disabled={!newRelationTarget}>Add</button>
        </div>
      </div>
    </div>
  );
}
