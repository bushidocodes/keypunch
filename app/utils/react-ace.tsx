import ace from 'ace-builds';
import { useEffect, useRef } from 'react';

interface AceEditorProps {
  mode?: string;
  theme?: string;
  name?: string;
  value?: string;
  readOnly?: boolean;
  editorProps?: Record<string, unknown>;
  onChange?: (value: string) => void;
  width?: string;
  height?: string;
  fontSize?: number;
}

export default function AceEditor({
  mode,
  theme,
  name,
  value = '',
  readOnly = false,
  onChange,
  width = '100%',
  height = '100%',
  fontSize = 12,
}: AceEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<ace.Ace.Editor | null>(null);
  // Keep a stable ref so the change listener always calls the latest onChange
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  useEffect(() => {
    if (!containerRef.current) return;
    const editor = ace.edit(containerRef.current);
    editorRef.current = editor;
    editor.on('change', () => {
      onChangeRef.current?.(editor.getValue());
    });
    return () => {
      editor.destroy();
      editorRef.current = null;
    };
  }, []);

  useEffect(() => {
    editorRef.current?.setTheme(theme ? `ace/theme/${theme}` : '');
  }, [theme]);

  useEffect(() => {
    editorRef.current?.session.setMode(mode ? `ace/mode/${mode}` : '');
  }, [mode]);

  useEffect(() => {
    editorRef.current?.setFontSize(fontSize);
  }, [fontSize]);

  useEffect(() => {
    editorRef.current?.setReadOnly(readOnly);
  }, [readOnly]);

  // Avoid resetting cursor when the change originated from the editor itself
  useEffect(() => {
    const editor = editorRef.current;
    if (editor && editor.getValue() !== value) {
      editor.setValue(value ?? '', -1);
    }
  }, [value]);

  return <div ref={containerRef} id={name} style={{ width, height }} />;
}
