import { useState, useCallback } from 'react';
import { compileDSL, type CompileResult } from '../services/composition/SkillCompiler';
import { saveComposedSkill, listComposedSkills } from '../services/composition/ComposedSkillStore';
import type { ComposedSkill } from '../services/composition/ComposedSkillStore';

export function useComposition() {
  const [skills, setSkills] = useState<ComposedSkill[]>([]);
  const [result, setResult] = useState<CompileResult | null>(null);
  const [compiling, setCompiling] = useState(false);

  const compile = useCallback(async (dsl: string) => {
    setCompiling(true);
    try {
      const res = compileDSL(dsl);
      setResult(res);
      return res;
    } finally {
      setCompiling(false);
    }
  }, []);

  const saveSkill = useCallback(async (skill: ComposedSkill) => {
    await saveComposedSkill(skill);
    setSkills(await listComposedSkills());
  }, []);

  const loadSkills = useCallback(async () => {
    setSkills(await listComposedSkills());
  }, []);

  return { skills, result, compiling, compile, saveSkill, loadSkills };
}