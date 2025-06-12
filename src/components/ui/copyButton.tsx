import { Copy } from "lucide-react";
import { useState } from "react";

function CopyButton({ onClick }: { onClick: () => void }) {
  const [isCopied, setIsCopied] = useState(false);

  return (
    <div className="relative">
      {isCopied && (
        <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded-md animate-fade-in-out">
          Copied!
        </span>
      )}
      <button
        onClick={() => {
          onClick();
          setIsCopied(true);
          setTimeout(() => setIsCopied(false), 1000);
        }}
        className={`bg-white text-sm transition-all duration-200 hover:scale-110 active:translate-y-0.5 active:shadow-sm border-1 border-gray-300 px-3 py-2 focus-visible:ring-0 focus-visible:ring-offset-0 hover:bg-gray-100 rounded-md`}
      >
        <Copy className="w-4 h-4 transition-transform duration-200" />
      </button>
    </div>
  );
}

export { CopyButton };
