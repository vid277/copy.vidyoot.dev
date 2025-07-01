import { Editor } from "primereact/editor";
import { useState, useEffect, useCallback } from "react";
import { Input } from "./ui/input";
import { useNavigate } from "react-router";
import { CopyButton } from "./ui/copyButton";
import ParticleButton from "./submit";

const header = (
  <span className="ql-formats">
    <select
      className="ql-header"
      style={{
        width: "120px",
      }}
      defaultValue=""
    >
      <option value="1">Heading 1</option>
      <option value="2">Heading 2</option>
      <option value="3">Heading 3</option>
      <option value="4">Heading 4</option>
      <option value="">Normal</option>
    </select>
    <button className="ql-bold" />
    <button className="ql-italic" />
    <button className="ql-underline" />
    <button className="ql-strike" />
    <span
      className="ql-formats"
      style={{
        borderLeft: "1px solid #ccc",
        margin: "0 8px",
        paddingLeft: "8px",
      }}
    >
      <select className="ql-color" defaultValue="">
        <option value="red" />
        <option value="green" />
        <option value="blue" />
        <option value="orange" />
        <option value="violet" />
        <option value="#d0d0d0" />
        <option value="" />
      </select>
      <select className="ql-background" defaultValue="">
        <option value="red" />
        <option value="green" />
        <option value="blue" />
        <option value="orange" />
        <option value="violet" />
        <option value="#d0d0d0" />
        <option value="" />
      </select>
    </span>
    <span
      className="ql-formats"
      style={{
        borderLeft: "1px solid #ccc",
        margin: "0 8px",
        paddingLeft: "8px",
      }}
    >
      <button className="ql-list" value="ordered" />
      <button className="ql-list" value="bullet" />
      <button className="ql-indent" value="-1" />
      <button className="ql-indent" value="+1" />
    </span>
    <span
      className="ql-formats"
      style={{
        borderLeft: "1px solid #ccc",
        margin: "0 8px",
        paddingLeft: "8px",
      }}
    >
      <button className="ql-link" />
      <button className="ql-image" />
      <button className="ql-code-block" />
      <button className="ql-formula" />
    </span>
    <span
      className="ql-formats"
      style={{
        borderLeft: "1px solid #ccc",
        margin: "0 8px",
        paddingLeft: "8px",
      }}
    >
      <select className="ql-align" defaultValue="">
        <option value="" />
        <option value="center" />
        <option value="right" />
        <option value="justify" />
      </select>
    </span>
  </span>
);

const EditorComponent = ({ parentId }: { parentId?: number } = {}) => {
  const [text, setText] = useState("");
  const [shortUrl, setShortUrl] = useState("");
  const [isEmpty, setIsEmpty] = useState(true);
  const [hasInvalidChars, setHasInvalidChars] = useState(false);
  const [isUrlTaken, setIsUrlTaken] = useState(false);
  const [expiration, setExpiration] = useState("30m");
  const navigate = useNavigate();

  const checkUrlAvailability = useCallback(
    async (url: string) => {
      if (!url.trim() || hasInvalidChars) return;

      try {
        const response = await fetch(`/api/check/${url}`);
        if (response.ok) {
          const data = await response.json();
          setIsUrlTaken(!data.available);
        } else {
          setIsUrlTaken(false);
        }
      } catch {
        setIsUrlTaken(false);
      }
    },
    [hasInvalidChars],
  );

  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (shortUrl.trim()) {
        checkUrlAvailability(shortUrl);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [shortUrl, checkUrlAvailability]);

  const isValidUrlPath = (path: string) => {
    return /^[a-zA-Z0-9-_]*$/.test(path);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setIsEmpty(!value.trim());

    if (!isValidUrlPath(value)) {
      setHasInvalidChars(true);
      setIsUrlTaken(false);
    } else {
      setHasInvalidChars(false);
    }
    setShortUrl(value);
  };

  const copyToClipboard = (text: string) => {
    if (isEmpty) {
      return;
    }
    navigator.clipboard.writeText(text);
  };

  const sendNote = async () => {
    let expires_at = null;
    if (expiration !== "never") {
      const now = new Date();
      const minutes: number =
        {
          "5m": 5,
          "10m": 10,
          "15m": 15,
          "30m": 30,
          "1h": 60,
          "1d": 24 * 60,
        }[expiration] || 30;

      expires_at = new Date(now.getTime() + minutes * 60 * 1000).toISOString();
    }
    try {
      const response = await fetch("/api/create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          content: text,
          short_url: shortUrl,
          expires_at,
          ...(parentId !== undefined ? { parent_id: parentId } : {}),
        }),
      });

      if (response.status === 409) {
        setIsUrlTaken(true);
        return;
      }

      if (!response.ok) {
        throw new Error("Failed to create note");
      }

      navigate(`/${shortUrl}`);
    } catch {
      // Handle error
    }
  };

  const getWarningMessage = () => {
    if (isEmpty) return "Please enter a URL path";
    if (hasInvalidChars)
      return "Only letters, numbers, hyphens, and underscores allowed";
    if (isUrlTaken) return "This URL is already taken";
    return "";
  };

  return (
    <div className="flex flex-col gap-4 p-9 pt-16 lg:px-8">
      <div className="flex flex-col gap-2 justify-center items-center">
        <div className="flex flex-row justify-center items-center gap-2">
          <div className="flex flex-row items-center gap-2">
            <span className="text-sm text-gray-600">
              {window.location.origin}/
            </span>
            <div className="flex flex-row relative">
              {(isEmpty || hasInvalidChars || isUrlTaken) && (
                <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-red-500 text-white text-xs px-2 py-1 rounded-md animate-fade-in-out w-max text-center">
                  {getWarningMessage()}
                </span>
              )}
              <Input
                type="text"
                className="border-1 border-gray-300 rounded-md active:border-gray-300 focus-visible:ring-0 focus-visible:ring-offset-0 h-8"
                value={shortUrl}
                onChange={handleUrlChange}
                placeholder="Enter URL path"
              />
            </div>
            <div className="relative">
              <CopyButton
                onClick={() =>
                  copyToClipboard(`${window.location.origin}/${shortUrl}`)
                }
              />
            </div>
          </div>
        </div>
        <div className="flex flex-row items-center gap-2 mt-2">
          <span className="text-sm font-semibold">Delete after:</span>
          <select
            className="border border-gray-300 rounded-md px-1 py-1 text-sm"
            value={expiration}
            onChange={(e) => setExpiration(e.target.value)}
            name="expiration"
          >
            <option value="5m">5 min</option>
            <option value="10m">10 min</option>
            <option value="15m">15 min</option>
            <option value="30m">30 min</option>
            <option value="1h">1 hour</option>
            <option value="1d">1 day</option>
            <option value="never">Never</option>
          </select>
        </div>
      </div>
      <Editor
        value={text}
        placeholder="Write your note here..."
        onTextChange={(e) => setText(e?.htmlValue || "")}
        headerTemplate={header}
        style={{ height: "320px" }}
      />
      <ParticleButton
        onSuccess={sendNote}
        enabled={!isEmpty && !hasInvalidChars && !isUrlTaken}
      />
    </div>
  );
};

export default EditorComponent;

export function ReplyEditor({
  parentId,
  onSuccess,
  placeholder = "Write a reply...",
}: {
  parentId: number;
  onSuccess?: () => void;
  placeholder?: string;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const sendReply = async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: text,
          short_url: Math.random().toString(36).slice(2, 10),
          parent_id: parentId,
        }),
      });
      if (!response.ok) throw new Error("Failed to create reply");
      setText("");
      if (onSuccess) onSuccess();
    } catch {
      setError("Failed to create reply");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-2 p-0 bg-transparent">
      <Editor
        value={text}
        onTextChange={(e) => setText(e?.htmlValue || "")}
        placeholder={placeholder}
        style={{ height: 120 }}
      />
      {error && <div className="text-red-500 text-xs">{error}</div>}
      <button
        onClick={sendReply}
        disabled={loading || !text.trim()}
        className="self-end bg-black text-white px-3 py-1 rounded disabled:opacity-50"
      >
        {loading ? "Posting..." : "Reply"}
      </button>
    </div>
  );
}
