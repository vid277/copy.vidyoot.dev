import { Editor } from "primereact/editor";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { CopyButton } from "./ui/copyButton";
import { FileText, Copy, QrCode } from "lucide-react";

const EditorComponent = () => {
  const { shortUrl } = useParams();
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedType, setCopiedType] = useState<
    "rich" | "plain" | "url" | "qr" | null
  >(null);
  const [showQR, setShowQR] = useState(false);
  const navigate = useNavigate();

  const currentUrl = `${window.location.origin}/${shortUrl}`;

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

  const copyUrl = () => {
    navigator.clipboard.writeText(currentUrl);
    setCopiedType("url");
    setTimeout(() => setCopiedType(null), 1000);
  };

  const toggleQR = () => {
    setShowQR(!showQR);
    setCopiedType("qr");
    setTimeout(() => setCopiedType(null), 1000);
  };

  const generateQRCode = (text: string) => {
    const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(
      text,
    )}`;
    return qrUrl;
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
    return null;
  }

  return (
    <div className="flex flex-col gap-4 w-full max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-12">
      <div className="flex justify-between items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="text-base font-bold">Link: </span>
          <span className="text-sm text-gray-600 break-all max-w-xs">
            {currentUrl}
          </span>
          <div className="relative">
            <CopyButton onClick={copyUrl} />
          </div>
        </div>

        <div className="flex gap-2">
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

          <div className="relative">
            <button
              onClick={toggleQR}
              className="bg-white text-sm transition-all duration-200 hover:scale-110 active:translate-y-0.5 active:shadow-sm border-1 border-gray-300 px-3 py-2 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-gray-100 rounded-md flex items-center gap-2"
              title="Generate QR Code"
            >
              <QrCode className="w-4 h-4 transition-transform duration-200" />
              <span className="text-xs">QR</span>
            </button>
          </div>
        </div>
      </div>

      {showQR && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
          onClick={toggleQR}
        >
          <div
            className="bg-white rounded-lg p-6 max-w-sm w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold">QR Code</h3>
              <button
                onClick={toggleQR}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ×
              </button>
            </div>
            <div className="flex justify-center mb-4">
              <img
                src={generateQRCode(currentUrl)}
                alt="QR Code"
                className="border border-gray-300 rounded"
              />
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-600 mb-2">
                Scan to visit this note
              </p>
            </div>
          </div>
        </div>
      )}

      <Editor
        value={text}
        readOnly
        modules={{ toolbar: false }}
        headerTemplate={<></>}
        onTextChange={(e) => setText(e?.htmlValue || "")}
        className="editor w-full"
      />
    </div>
  );
};

export default EditorComponent;
