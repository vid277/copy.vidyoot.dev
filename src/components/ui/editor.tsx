import React, { useImperativeHandle, useRef, forwardRef } from "react";

export type EditorRef = {
  focusEditor: () => void;
  getContent: () => Promise<string>;
  setContent: (data: string) => Promise<void>;
};

type EditorProps = {
  style?: React.CSSProperties;
  showUndoRedo?: boolean;
  showCutCopyPaste?: boolean;
  showAlignments?: boolean;
  showListings?: boolean;
  showColors?: boolean;
  showExtras?: boolean;
  showHeadings?: boolean;
  showTextFormatting?: boolean;
};

const Editor = forwardRef<EditorRef, EditorProps>((props, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useImperativeHandle(ref, () => ({
    focusEditor: () => {
      textareaRef.current?.focus();
    },
    getContent: async () => {
      return textareaRef.current?.value || "";
    },
    setContent: async (data: string) => {
      if (textareaRef.current) textareaRef.current.value = data;
    },
  }));

  return (
    <textarea
      ref={textareaRef}
      style={props.style}
      className="w-full h-full border rounded p-2"
      placeholder="Editor content..."
    />
  );
});

export default Editor;
