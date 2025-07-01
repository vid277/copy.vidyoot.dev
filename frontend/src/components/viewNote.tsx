import { Editor } from "primereact/editor";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router";
import { CopyButton } from "./ui/copyButton";
import { FileText, Copy, QrCode, Plus, Pencil, History } from "lucide-react";
import CreateNoteEditor, { ReplyEditor } from "./createNote";
import ParticleButton from "./submit";
import { Popover, PopoverTrigger, PopoverContent } from "./ui/popover";

type Note = {
  id: number;
  short_url: string;
  content: string;
  created_at: string;
  expires_at: string | null;
  parent_id: number | null;
};

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

function parseReplyContent(rawHtml: string) {
  let author = "Anonymous";
  let color = stringToColor(author);
  let cleanHtml = rawHtml;

  try {
    const dom = new DOMParser().parseFromString(rawHtml, "text/html");
    const firstEl = dom.body.firstElementChild as HTMLElement | null;
    if (firstEl && firstEl.dataset && firstEl.dataset.author) {
      author = firstEl.dataset.author;
      color = firstEl.dataset.color || stringToColor(author);
      cleanHtml = firstEl.innerHTML.trim() || "";
    }
  } catch (e) {
    console.error(e);
  }

  return { author, color, html: cleanHtml };
}

function timeAgo(date: string) {
  const seconds = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  const intervals: { label: string; secs: number }[] = [
    { label: "year", secs: 31536000 },
    { label: "month", secs: 2592000 },
    { label: "day", secs: 86400 },
    { label: "hour", secs: 3600 },
    { label: "minute", secs: 60 },
  ];
  for (const i of intervals) {
    const count = Math.floor(seconds / i.secs);
    if (count >= 1) return `${count} ${i.label}${count > 1 ? "s" : ""} ago`;
  }
  return "just now";
}

const EditorComponent = () => {
  const { shortUrl } = useParams();
  const [text, setText] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [copiedType, setCopiedType] = useState<
    "rich" | "plain" | "url" | "qr" | null
  >(null);
  const [showQR, setShowQR] = useState(false);
  const navigate = useNavigate();
  const [noteId, setNoteId] = useState<number | null>(null);
  const [replies, setReplies] = useState<Note[]>([]);
  const [showReplyEditor, setShowReplyEditor] = useState(false);
  const [canEdit, setCanEdit] = useState(false);
  const [versions, setVersions] = useState<string[]>([]);

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

  const refreshReplies = () => {
    if (noteId !== null) {
      fetch(`/api/threads/${noteId}`)
        .then((res) => res.json())
        .then((data) => setReplies(data))
        .catch(() => setReplies([]));
    }
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
          const parsed = parseReplyContent(data.content);
          setText(parsed.html);
          const identity = getUserIdentity();
          let editable = identity.name === parsed.author;
          if (!editable) {
            const owned: string[] = JSON.parse(
              localStorage.getItem("notes_app_owned_urls") || "[]",
            );
            editable = owned.includes(shortUrl);
          }
          setCanEdit(editable);
          setNoteId(data.id);
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

  useEffect(() => {
    if (noteId !== null) {
      fetch(`/api/threads/${noteId}`)
        .then((res) => res.json())
        .then((data) => setReplies(data))
        .catch(() => setReplies([]));
    }
  }, [noteId]);

  useEffect(() => {
    getUserIdentity();
  }, []);

  useEffect(() => {
    if (!shortUrl) return;
    const key = `notes_app_versions_${shortUrl}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setVersions(JSON.parse(stored));
      } catch {
        setVersions([]);
      }
    }
  }, [shortUrl, isEditing]);

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
    <div className="flex flex-col gap-4 p-9 pt-16 lg:px-8">
      <div className="flex flex-col sm:flex-row justify-center items-start sm:items-center gap-4">
        <div className="flex items-center justify-center gap-2 w-full sm:w-auto">
          <span className="text-sm text-gray-600 break-all max-w-xs justify-center">
            {currentUrl}
          </span>
          <div className="relative">
            <CopyButton onClick={copyUrl} />
          </div>
        </div>

        <div className="flex gap-2 w-full sm:w-auto justify-center">
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

          <div className="relative flex gap-2">
            {versions.length > 0 && (
              <Popover>
                <PopoverTrigger asChild>
                  <button
                    className="bg-white text-sm transition-all duration-200 hover:scale-110 active:translate-y-0.5 active:shadow-sm border-1 border-gray-300 px-3 py-2 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-gray-100 rounded-md flex items-center gap-2"
                    title="View edit history"
                  >
                    <History className="w-4 h-4" />
                    <span className="text-xs">Versions</span>
                  </button>
                </PopoverTrigger>
                <PopoverContent className="w-32 p-2 flex flex-col gap-1 bg-white">
                  {versions.map((_, idx) => (
                    <button
                      key={idx}
                      className="px-2 py-1 text-left text-sm rounded hover:bg-gray-100"
                      onClick={() => {
                        const key = `notes_app_versions_${shortUrl}`;
                        const stored = localStorage.getItem(key);
                        if (!stored) return;
                        try {
                          const arr: string[] = JSON.parse(stored);
                          setText(parseReplyContent(arr[idx]).html);
                        } catch {
                          // ignore
                        }
                      }}
                    >
                      {`Version ${idx + 1}`}
                    </button>
                  ))}
                </PopoverContent>
              </Popover>
            )}
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

      {isEditing ? (
        <CreateNoteEditor
          existingShortUrl={shortUrl || ""}
          initialText={text}
          onSaved={(newRaw: string) => {
            setText(parseReplyContent(newRaw).html);
            setIsEditing(false);
          }}
        />
      ) : (
        <div className="comment-card relative">
          <Editor
            value={text}
            readOnly
            modules={{ toolbar: false }}
            headerTemplate={<></>}
            className="editor w-full"
          />

          {canEdit && (
            <div className="absolute top-2 right-2 flex gap-2">
              <button
                className="text-gray-500 hover:text-gray-700"
                title="Edit note"
                onClick={() => setIsEditing(true)}
              >
                <Pencil className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}

      {noteId && (
        <div className="mt-4 w-full flex flex-col items-center">
          <h3 className="text-xl font-semibold mb-2 text-center">Replies</h3>
          <div className="mt-4 space-y-4">
            {replies.length === 0 && (
              <div className="text-gray-500">No replies yet.</div>
            )}
            {replies.map((reply) => {
              const parsed = parseReplyContent(reply.content);
              const initials = parsed.author
                .split(" ")
                .map((w) => w.charAt(0))
                .join("")
                .slice(0, 2)
                .toUpperCase();

              return (
                <div key={reply.id} className="comment-card relative">
                  <button
                    className="absolute top-2 right-2 text-gray-400 hover:text-gray-600"
                    title="Copy reply"
                    onClick={() => {
                      const tempDiv = document.createElement("div");
                      tempDiv.innerHTML = parsed.html;
                      const plainText =
                        tempDiv.textContent || tempDiv.innerText || "";
                      navigator.clipboard.writeText(plainText);
                    }}
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                  <div className="flex items-start gap-4">
                    <div
                      className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-semibold"
                      style={{ backgroundColor: parsed.color }}
                    >
                      {initials}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="font-semibold text-sm">
                          {parsed.author}
                        </span>
                        <span className="text-xs text-gray-500">
                          {timeAgo(reply.created_at)}
                        </span>
                      </div>
                      <Editor
                        value={parsed.html}
                        readOnly
                        modules={{ toolbar: false }}
                        headerTemplate={<></>}
                        className="reply-quill"
                        style={{
                          minHeight: 0,
                          maxHeight: "none",
                          height: "min-content",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex items-center mt-6">
            {!showReplyEditor && (
              <ParticleButton
                onSuccess={() => setShowReplyEditor(true)}
                enabled={true}
              >
                <span className="flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Reply
                </span>
              </ParticleButton>
            )}
          </div>
          {showReplyEditor && (
            <div className="mt-4 reply-card">
              <ReplyEditor
                parentId={noteId}
                onSuccess={() => {
                  setShowReplyEditor(false);
                  refreshReplies();
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default EditorComponent;
