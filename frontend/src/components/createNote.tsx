import { Editor } from "primereact/editor";
import { useState, useEffect, useCallback } from "react";
import { Input } from "./ui/input";
import { useNavigate } from "react-router";
import { CopyButton } from "./ui/copyButton";
import ParticleButton from "./submit";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";
import { History } from "lucide-react";

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

type EditorComponentProps = {
  parentId?: number;
  initialText?: string;
  existingShortUrl?: string;
  onSaved?: (rawHtml: string) => void;
};

const EditorComponent = ({
  parentId,
  initialText = "",
  existingShortUrl,
  onSaved,
}: EditorComponentProps) => {
  const isEditMode = !!existingShortUrl;

  const [text, setText] = useState(initialText);
  const [shortUrl, setShortUrl] = useState(existingShortUrl || "");
  const [isEmpty, setIsEmpty] = useState(!isEditMode);
  const [hasInvalidChars, setHasInvalidChars] = useState(false);
  const [isUrlTaken, setIsUrlTaken] = useState(false);
  const [expiration, setExpiration] = useState("30m");
  const navigate = useNavigate();
  const [versions, setVersions] = useState<string[]>([]);

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
    if (isEditMode) return;

    const timeoutId = setTimeout(() => {
      if (shortUrl.trim()) {
        checkUrlAvailability(shortUrl);
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [shortUrl, checkUrlAvailability, isEditMode]);

  useEffect(() => {
    if (!isEditMode || !existingShortUrl) return;
    const key = `notes_app_versions_${existingShortUrl}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setVersions(JSON.parse(stored));
      } catch {
        setVersions([initialText]);
      }
    } else {
      // Seed with the initial content
      setVersions([initialText]);
      localStorage.setItem(key, JSON.stringify([initialText]));
    }
  }, [isEditMode, existingShortUrl, initialText]);

  const isValidUrlPath = (path: string) => {
    return /^[a-zA-Z0-9-_]*$/.test(path);
  };

  const handleUrlChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isEditMode) return;
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
      const identity = getUserIdentity();
      const userHtml = `<div data-author="${identity.name}" data-color="${identity.color}">${text}</div>`;

      if (isEditMode) {
        const res = await fetch(`/api/${shortUrl}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ short_url: shortUrl, content: userHtml }),
        });

        if (!res.ok) throw new Error("Failed to update note");

        if (onSaved) onSaved(userHtml);
        saveVersion(text);
      } else {
        const response = await fetch("/api/create", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: userHtml,
            short_url: shortUrl,
            expires_at,
            ...(parentId !== undefined ? { parent_id: parentId } : {}),
          }),
        });

        if (response.status === 409) {
          setIsUrlTaken(true);
          return;
        }

        if (!response.ok) throw new Error("Failed to create note");

        if (parentId === undefined) {
          const owned: string[] = JSON.parse(
            localStorage.getItem("notes_app_owned_urls") || "[]",
          );
          if (!owned.includes(shortUrl)) {
            owned.push(shortUrl);
            localStorage.setItem("notes_app_owned_urls", JSON.stringify(owned));
          }
        }

        navigate(`/${shortUrl}`);
      }
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

  const saveVersion = (html: string) => {
    if (!isEditMode || !existingShortUrl) return;
    const key = `notes_app_versions_${existingShortUrl}`;
    setVersions((prev) => {
      if (prev[prev.length - 1] === html) return prev;
      const updated = [...prev, html];
      localStorage.setItem(key, JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <div
      className={`flex flex-col gap-4 p-9 lg:px-8 ${
        isEditMode ? "pt-4" : "pt-16"
      }`}
    >
      {!isEditMode && (
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
      )}
      <Editor
        value={text}
        placeholder="Write your note here..."
        onTextChange={(e) => setText(e?.htmlValue || "")}
        headerTemplate={header}
        style={{ height: "320px" }}
      />
      <ParticleButton
        onSuccess={sendNote}
        enabled={
          isEditMode
            ? !!text.trim()
            : !isEmpty && !hasInvalidChars && !isUrlTaken
        }
      >
        {isEditMode ? "Save Changes" : undefined}
      </ParticleButton>
      {versions.length > 0 && (
        <div className="self-end">
          <Popover>
            <PopoverTrigger asChild>
              <button
                className="p-2 rounded-md border border-gray-300 bg-white hover:bg-gray-100"
                title="View edit history"
              >
                <History className="w-4 h-4" />
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-32 p-2 flex flex-col gap-1">
              {versions.map((_, idx) => (
                <button
                  key={idx}
                  className="px-2 py-1 text-left text-sm rounded hover:bg-gray-100"
                  onClick={() => setText(versions[idx])}
                >
                  {`Version ${idx + 1}`}
                </button>
              ))}
            </PopoverContent>
          </Popover>
        </div>
      )}
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
      const identity = getUserIdentity();

      const userHtml = `<div data-author="${identity.name}" data-color="${identity.color}">${text}</div>`;

      const response = await fetch("/api/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: userHtml,
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

// ---------- Identity helpers (used for reply metadata) ----------
function stringToColor(str: string) {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colour = (hash & 0x00ffffff).toString(16).toUpperCase();
  return "#" + "00000".substring(0, 6 - colour.length) + colour;
}

function getUserIdentity() {
  const stored = localStorage.getItem("notes_app_user_identity");
  if (stored) return JSON.parse(stored);

  const adjectives = [
    "Agile",
    "Brave",
    "Calm",
    "Daring",
    "Eager",
    "Fuzzy",
    "Gentle",
    "Happy",
    "Ideal",
    "Jolly",
    "Kind",
    "Lively",
  ];
  const animals = [
    "Aardvark",
    "Bear",
    "Cat",
    "Dolphin",
    "Eagle",
    "Fox",
    "Gorilla",
    "Hedgehog",
    "Iguana",
    "Jaguar",
    "Koala",
    "Llama",
  ];

  const name =
    adjectives[Math.floor(Math.random() * adjectives.length)] +
    " " +
    animals[Math.floor(Math.random() * animals.length)];

  const color = stringToColor(name);
  const identity = { name, color };
  localStorage.setItem("notes_app_user_identity", JSON.stringify(identity));
  return identity;
}

export const editorHeader = header;
