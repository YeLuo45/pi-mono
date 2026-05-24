import React, { useState, useRef } from 'react';

interface Props {
  initialValue?: string;
  onCompile: (dsl: string) => void;
  compiling: boolean;
}

const SAMPLE_DSL = `skill smart_reply_composer version 1.0.0
when message.received(template)
do intent_classifier(input: template)
     → sentiment_analyzer(input: intent_classified)
if sentiment_analyzer.valence < 0.3
then response_generator(tone: "empathetic")
else response_generator(tone: "neutral")
using intent_classifier, sentiment_analyzer, response_generator
yield response_generator.output as reply`;

export function DSLEditor({ initialValue, onCompile, compiling }: Props) {
  const [value, setValue] = useState(initialValue ?? SAMPLE_DSL);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTab = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const next = value.substring(0, start) + '  ' + value.substring(end);
      setValue(next);
      setTimeout(() => {
        if (textareaRef.current) {
          textareaRef.current.selectionStart = start + 2;
          textareaRef.current.selectionEnd = start + 2;
        }
      }, 0);
    }
  };

  return (
    <div className="dsl-editor">
      <div className="editor-toolbar">
        <span>Skill DSL</span>
        <button onClick={() => onCompile(value)} disabled={compiling}>{compiling ? 'Compiling...' : 'Compile'}</button>
      </div>
      <textarea
        ref={textareaRef}
        className="dsl-textarea"
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={handleTab}
        spellCheck={false}
        rows={20}
      />
    </div>
  );
}