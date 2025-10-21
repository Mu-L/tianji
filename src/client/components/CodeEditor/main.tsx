import Editor, { Monaco, OnMount } from '@monaco-editor/react';
import React, { useRef } from 'react';
import { useTheme } from '../../store/settings';
import { useEvent } from '../../hooks/useEvent';
import { sandboxGlobal } from './lib/sandbox';
import { ValidatorFn } from './validator/fetch';

interface CodeEditorProps {
  height?: string | number;
  value?: string;
  readOnly?: boolean;
  onChange?: (code: string) => void;
  codeValidator?: ValidatorFn[];
  language?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = React.memo((props) => {
  const {
    readOnly = false,
    codeValidator = [],
    language = 'typescript',
  } = props;
  const colorScheme = useTheme();
  const theme = colorScheme === 'dark' ? 'vs-dark' : 'light';
  const editorRef = useRef<any>(null);
  const monacoRef = useRef<Monaco | null>(null);

  const validateCode = useEvent(
    (code: string): { isValid: boolean; errors: string[] } => {
      for (const validator of codeValidator) {
        const result = validator(code);
        if (!result.isValid) {
          return result;
        }
      }

      return { isValid: true, errors: [] };
    }
  );

  const handleEditorDidMount: OnMount = useEvent((editor, monaco) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const tsDefaults = monaco.languages.typescript.typescriptDefaults;
    tsDefaults.setCompilerOptions({
      ...tsDefaults.getCompilerOptions(),
      lib: ['es2021'],
    });

    const jsDefaults = monaco.languages.typescript.javascriptDefaults;
    jsDefaults.setCompilerOptions({
      ...jsDefaults.getCompilerOptions(),
      lib: ['es2021'],
    });

    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      sandboxGlobal,
      'global.ts'
    );
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      sandboxGlobal,
      'ts:global.d.ts'
    );

    const validateAndReport = () => {
      const model = editor.getModel();
      if (!model) {
        return;
      }

      const code = model.getValue();
      const validation = validateCode(code);

      if (!validation.isValid) {
        const markers = validation.errors.map((error, index) => ({
          severity: monaco.MarkerSeverity.Error,
          startLineNumber: 1,
          startColumn: 1,
          endLineNumber: 1,
          endColumn: 1,
          message: error,
          source: 'tianji-validator',
        }));

        monaco.editor.setModelMarkers(model, 'tianji-validator', markers);
      } else {
        // Clear custom markers if validation passes
        monaco.editor.setModelMarkers(model, 'tianji-validator', []);
      }
    };

    // Initial validation
    if (props.value) {
      setTimeout(validateAndReport, 100);
    }

    // Listen for content changes
    const model = editor.getModel();
    if (model) {
      model.onDidChangeContent(() => {
        setTimeout(validateAndReport, 300); // Debounce validation
      });
    }
  });

  const handleEditorWillMount = useEvent((monaco: Monaco) => {
    monaco.languages.typescript.javascriptDefaults.addExtraLib(
      sandboxGlobal,
      'global.ts'
    );
    monaco.languages.typescript.typescriptDefaults.addExtraLib(
      sandboxGlobal,
      'ts:global.d.ts'
    );
  });

  return (
    <Editor
      height={props.height}
      theme={theme}
      defaultLanguage={language}
      value={props.value}
      options={{
        tabSize: 2,
        readOnly,
        automaticLayout: true,
        scrollBeyondLastLine: false,
        wordWrap: 'on',
        wrappingIndent: 'indent',
        formatOnPaste: true,
        formatOnType: true,
      }}
      onChange={(val) => props.onChange?.(val ?? '')}
      beforeMount={handleEditorWillMount}
      onMount={handleEditorDidMount}
    />
  );
});
