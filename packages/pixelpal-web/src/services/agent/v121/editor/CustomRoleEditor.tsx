/**
 * CustomRoleEditor - UI component for editing role templates
 */

import React, { useState } from 'react';
import type { RoleTemplate } from '../types';
import { VALID_CAPABILITIES, VALID_TASK_TYPES } from '../templates/RoleTemplate';
import { RoleTemplateManager } from '../templates/RoleTemplateManager';

interface CustomRoleEditorProps {
  template?: RoleTemplate;
  onSave: (template: RoleTemplate) => void;
  onCancel: () => void;
}

const CATEGORIES: { value: RoleTemplate['category']; label: string }[] = [
  { value: 'collaboration', label: 'Collaboration' },
  { value: 'tool', label: 'Tool' },
  { value: 'analysis', label: 'Analysis' },
  { value: 'creative', label: 'Creative' },
  { value: 'utility', label: 'Utility' },
];

export function CustomRoleEditor({ template, onSave, onCancel }: CustomRoleEditorProps) {
  const [name, setName] = useState(template?.name || '');
  const [description, setDescription] = useState(template?.description || '');
  const [capabilities, setCapabilities] = useState<string[]>(template?.capabilities || []);
  const [taskTypes, setTaskTypes] = useState<string[]>(template?.compatibleTaskTypes || []);
  const [category, setCategory] = useState<RoleTemplate['category']>(template?.category || 'utility');
  const [icon, setIcon] = useState(template?.icon || '');
  const [color, setColor] = useState(template?.color || '#4F46E5');
  const [tags, setTags] = useState<string[]>(template?.tags || []);
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');

  const handleToggleCapability = (cap: string) => {
    setCapabilities(prev => prev.includes(cap) ? prev.filter(c => c !== cap) : [...prev, cap]);
  };

  const handleToggleTaskType = (type: string) => {
    setTaskTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const handleAddTag = () => {
    if (tagInput.trim() && !tags.includes(tagInput.trim())) {
      setTags(prev => [...prev, tagInput.trim()]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    setTags(prev => prev.filter(t => t !== tag));
  };

  const handleSubmit = () => {
    if (!name.trim()) { setError('Name is required'); return; }
    if (!description.trim()) { setError('Description is required'); return; }
    if (capabilities.length === 0) { setError('At least one capability is required'); return; }

    const manager = new RoleTemplateManager();
    const data = {
      name: name.trim(),
      description: description.trim(),
      capabilities,
      compatibleTaskTypes: taskTypes,
      category,
      icon: icon.trim(),
      color: color,
      tags,
      isBuiltIn: false,
      rating: 0,
      author: 'User',
    };

    if (template) {
      const result = manager.update(template.id, data);
      if (result.error) { setError(result.error); return; }
      if (result.template) onSave(result.template);
    } else {
      const result = manager.create(data);
      if (result.error) { setError(result.error); return; }
      if (result.template) onSave(result.template);
    }
  };

  return (
    <div className="custom-role-editor">
      <h2>{template ? 'Edit Role Template' : 'Create Role Template'}</h2>

      {error && <div className="error">{error}</div>}

      <div className="field">
        <label>Name *</label>
        <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g., My Custom Role" maxLength={50} />
      </div>

      <div className="field">
        <label>Description *</label>
        <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe what this role does..." rows={3} />
      </div>

      <div className="field">
        <label>Category</label>
        <select value={category} onChange={e => setCategory(e.target.value as RoleTemplate['category'])}>
          {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
        </select>
      </div>

      <div className="field">
        <label>Capabilities *</label>
        <div className="chip-grid">
          {VALID_CAPABILITIES.map(cap => (
            <button key={cap} type="button" className={capabilities.includes(cap) ? 'selected' : ''} onClick={() => handleToggleCapability(cap)}>
              {cap}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label>Task Types</label>
        <div className="chip-grid">
          {VALID_TASK_TYPES.map(type => (
            <button key={type} type="button" className={taskTypes.includes(type) ? 'selected' : ''} onClick={() => handleToggleTaskType(type)}>
              {type}
            </button>
          ))}
        </div>
      </div>

      <div className="field-row">
        <div className="field">
          <label>Icon (emoji)</label>
          <input value={icon} onChange={e => setIcon(e.target.value)} placeholder="e.g., robot" />
        </div>
        <div className="field">
          <label>Color</label>
          <input type="color" value={color} onChange={e => setColor(e.target.value)} />
        </div>
      </div>

      <div className="field">
        <label>Tags</label>
        <div className="tags-input">
          {tags.map(tag => <span key={tag} className="tag">{tag} <button onClick={() => handleRemoveTag(tag)}>x</button></span>)}
          <input value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleAddTag()} placeholder="Add tag" />
        </div>
      </div>

      <div className="actions">
        <button onClick={onCancel}>Cancel</button>
        <button onClick={handleSubmit} className="primary">Save</button>
      </div>
    </div>
  );
}
