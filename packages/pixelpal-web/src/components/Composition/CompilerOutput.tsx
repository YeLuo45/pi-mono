import React from 'react';
import type { CompileResult } from '../../services/composition/SkillCompiler';

interface Props { result: CompileResult | null; }

export function CompilerOutput({ result }: Props) {
  if (!result) return <div className="compiler-output muted">Compile your DSL to see output.</div>;
  return (
    <div className={`compiler-output ${result.success ? 'success' : 'error'}`}>
      {result.cycleDetected && <div className="warning">Cycle detected in dependencies</div>}
      {result.errors.map((e, i) => <div key={i} className="error-line">{e}</div>)}
      {result.warnings.map((w, i) => <div key={i} className="warning-line">{w}</div>)}
      {result.success && result.pipeline && (
        <div className="success-block">
          <h5>Pipeline compiled successfully</h5>
          <p>Name: {result.pipeline.name} · Steps: {result.pipeline.steps.length}</p>
        </div>
      )}
    </div>
  );
}