import { Editor } from "primereact/editor";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { CopyButton } from "./ui/copyButton";
import { FileText, Copy } from "lucide-react";

const EditorComponent = () => {
  const { shortUrl } = useParams();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedType, setCopiedType] = useState<"rich" | "plain" | null>(null);
  const navigate = useNavigate();

  const copyRichText = () => {
    navigator.clipboard.writeText(text);
    setCopiedType("rich");
    setTimeout(() => setCopiedType(null), 1000);
  };

  const copyPlainText = () => {
    const tempDiv = document.createElement("div");
    tempDiv.innerHTML = text;
    const plainText = tempDiv.textContent || tempDiv.innerText || "";
    navigator.clipboard.writeText(plainText);
    setCopiedType("plain");
    setTimeout(() => setCopiedType(null), 1000);
  };

  useEffect(() => {
    const getNote = async () => {
      if (shortUrl) {
        try {
          setLoading(true);
          setError(false);
          const response = await fetch(`/api/${shortUrl}`);

          if (response.status === 404) {
            setError(true);
            navigate("/404", { replace: true });
            return;
          }

          if (!response.ok) {
            throw new Error("Failed to fetch note");
          }

          const data = await response.json();
          setText(data.content);
        } catch (err) {
          console.error("Error fetching note:", err);
          setError(true);
          navigate("/404", { replace: true });
        } finally {
          setLoading(false);
        }
      }
    };

    getNote();
  }, [shortUrl, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg text-gray-600">Loading...</div>
      </div>
    );
  }

  if (error) {
    return null; // Will be handled by the 404 route
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end gap-2">
        <div className="relative">
          {copiedType === "rich" && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md animate-fade-in-out">
              Copied!
            </span>
          )}
          <button
            onClick={copyRichText}
            className="bg-white text-sm transition-all duration-200 hover:scale-110 active:translate-y-0.5 active:shadow-sm border-1 border-gray-300 px-3 py-2 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-gray-100 rounded-md flex items-center gap-2"
            title="Copy rich text"
          >
            <FileText className="w-4 h-4 transition-transform duration-200" />
            <span className="text-xs">Rich</span>
          </button>
        </div>

        <div className="relative">
          {copiedType === "plain" && (
            <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md animate-fade-in-out">
              Copied!
            </span>
          )}
          <button
            onClick={copyPlainText}
            className="bg-white text-sm transition-all duration-200 hover:scale-110 active:translate-y-0.5 active:shadow-sm border-1 border-gray-300 px-3 py-2 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-gray-100 rounded-md flex items-center gap-2"
            title="Copy plain text"
          >
            <Copy className="w-4 h-4 transition-transform duration-200" />
            <span className="text-xs">Plain</span>
          </button>
        </div>
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
