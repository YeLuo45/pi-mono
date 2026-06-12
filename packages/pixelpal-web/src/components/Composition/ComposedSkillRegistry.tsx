import React from 'react';
import type { ComposedSkill } from '../../services/composition/ComposedSkillStore';

interface Props { skills: ComposedSkill[]; }

export function ComposedSkillRegistry({ skills }: Props) {
  if (skills.length === 0) return <div className="muted">No composed skills yet.</div>;
  return (
    <div className="composed-skill-registry">
      {skills.map(s => (
        <div key={s.id} className="composed-skill-card">
          <h5>{s.name} <span className="version">v{s.version}</span></h5>
          <p>Components: {s.componentSkills.join(', ')}</p>
          <p className="meta">Compiled: {new Date(s.createdAt).toLocaleDateString()}</p>
        </div>
      ))}
    </div>
  );
}