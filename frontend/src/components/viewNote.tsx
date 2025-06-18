import { Editor } from "primereact/editor";
import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { CopyButton } from "./ui/copyButton";

const EditorComponent = () => {
  const { shortUrl } = useParams();
  const [text, setText] = useState("");

  const copyToClipboard = () => {
    navigator.clipboard.writeText(text);
  };

  useEffect(() => {
    const getNote = async () => {
      if (shortUrl) {
        const response = await fetch(`/api/${shortUrl}`);
        const data = await response.json();
        setText(data.content);
      }
    };

    getNote();
  }, [shortUrl]);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <CopyButton onClick={copyToClipboard} />
      </div>
      <Editor
        className="editor"
        value={text}
        readOnly
        modules={{ toolbar: false }}
        headerTemplate={<></>}
        onTextChange={(e) => setText(e?.htmlValue || "")}
      />
    </div>
  );
};

export default EditorComponent;
