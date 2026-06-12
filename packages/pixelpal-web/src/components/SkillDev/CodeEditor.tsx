/**
 * V80 Skill Dev Tools - CodeEditor Component
 * Monaco Editor wrapper with TypeScript support and validation.
 */

import React, { useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { MyTypography, MyChip, MyStack, MyAlert } from '../MUI替代';
import { Box } from '../ui/Box';
import type { editor } from 'monaco-editor';

interface CodeEditorProps {
  code: string;
  onChange: (value: string) => void;
  onValidation?: (errors: ValidationError[]) => void;
  readOnly?: boolean;
}

export interface ValidationError {
  line: number;
  column: number;
  message: string;
  severity: 'error' | 'warning' | 'info';
}

export const CodeEditor: React.FC<CodeEditorProps> = ({
  code,
  onChange,
  onValidation,
  readOnly = false,
}) => {
  const editorRef = useRef<editor.IStandaloneCodeEditor | null>(null);
  const monacoRef = useRef<typeof import('monaco-editor') | null>(null);

  const handleEditorMount = useCallback((editor: editor.IStandaloneCodeEditor, monaco: typeof import('monaco-editor')) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    // Configure TypeScript compiler options
    monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
      target: monaco.languages.typescript.ScriptTarget.ES2020,
      allowNonTsExtensions: true,
      moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
      module: monaco.languages.typescript.ModuleKind.ESNext,
      noEmit: true,
      esModuleInterop: true,
      strict: true,
      jsx: monaco.languages.typescript.JsxEmit.React,
      reactNamespace: 'React',
      allowJs: true,
      typeRoots: ['node_modules/@types'],
    });

    // Add extra type definitions for skill context
    const typeDefs = `
      declare const skill: SkillDefinition;
      declare interface SkillExecutionContext {
        triggerMessage: string;
        recentMessages: Message[];
        personaId: string;
        sceneId?: string;
        metadata: Record<string, unknown>;
        parsedParams: Record<string, string>;
      }
      declare interface SkillExecutionResult {
        skillId: string;
        success: boolean;
        response: string;
        steps?: SkillStepResult[];
        error?: string;
        tokensUsed?: number;
        durationMs: number;
      }
      declare interface SkillStepResult {
        index: number;
        description: string;
        result: string;
        status: 'completed' | 'failed' | 'skipped';
      }
      declare interface Message {
        id: string;
        role: 'user' | 'assistant' | 'system';
        content: string;
        timestamp: number;
      }
      declare type SkillCategory = 'productivity' | 'creative' | 'analysis' | 'lifestyle' | 'developer' | 'entertainment' | 'custom';
      declare interface SkillDefinition {
        id: string;
        name: string;
        description: string;
        icon: string;
        version: string;
        author: string;
        category: SkillCategory;
        tags: string[];
        chatTriggerable: boolean;
        chatKeywords: string[];
        order: number;
        enabled: boolean;
        systemPrompt: string;
        examplePrompts: string[];
        requiredContext: string[];
        optionalContext: string[];
        maxSteps: number;
        showSteps: boolean;
        execute(context: SkillExecutionContext): Promise<SkillExecutionResult>;
      }
    `;

    monaco.languages.typescript.typescriptDefaults.addExtraLib(typeDefs, 'skill-types.d.ts');

    // Listen for model changes and validate
    const model = editor.getModel();
    if (model) {
      const validate = () => {
        const errors: ValidationError[] = [];
        const markers = monaco.editor.getModelMarkers({ resource: model.uri });
        
        markers.forEach(marker => {
          errors.push({
            line: marker.startLineNumber,
            column: marker.startColumn,
            message: marker.message,
            severity: marker.severity === monaco.MarkerSeverity.Error ? 'error' 
                   : marker.severity === monaco.MarkerSeverity.Warning ? 'warning' 
                   : 'info',
          });
        });
        
        onValidation?.(errors);
      };

      model.onDidChangeContent(() => {
        validate();
      });

      // Initial validation
      validate();
    }
  }, [onValidation]);

  const handleChange = useCallback((value: string | undefined) => {
    onChange(value || '');
  }, [onChange]);

  return (
    <Box css={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <Editor
        height="100%"
        defaultLanguage="typescript"
        language="typescript"
        theme="vs"
        value={code}
        onChange={handleChange}
        onMount={handleEditorMount}
        options={{
          readOnly,
          minimap: { enabled: true, scale: 1 },
          fontSize: 13,
          fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
          fontLigatures: true,
          lineNumbers: 'on',
          renderLineHighlight: 'line',
          scrollBeyondLastLine: false,
          automaticLayout: true,
          tabSize: 2,
          wordWrap: 'off',
          contextmenu: true,
          folding: true,
          bracketPairColorization: { enabled: true },
          padding: { top: 8, bottom: 8 },
          scrollbar: {
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8,
          },
        }}
      />
    </Box>
  );
};

export default CodeEditor;
