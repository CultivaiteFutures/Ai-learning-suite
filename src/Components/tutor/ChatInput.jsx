import { useState, useRef, useEffect } from "react";
import { Send, Mic, ImagePlus, X } from "lucide-react";

export default function ChatInput({ onSend, isDark, disabled }) {
  const [value, setValue] = useState("");
  const [attachment, setAttachment] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef(null);
  const fileInputRef = useRef(null);
  const recordTimeoutRef = useRef(null);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 160)}px`;
    }
  }, [value]);

  useEffect(() => {
    return () => {
      if (recordTimeoutRef.current) clearTimeout(recordTimeoutRef.current);
      if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAttachment({ name: file.name, previewUrl: URL.createObjectURL(file) });
    e.target.value = "";
  }

  function removeAttachment() {
    if (attachment?.previewUrl) URL.revokeObjectURL(attachment.previewUrl);
    setAttachment(null);
  }

  function toggleVoice() {
    setIsRecording((prev) => {
      const next = !prev;
      if (next) {
        recordTimeoutRef.current = setTimeout(() => setIsRecording(false), 2500);
      } else if (recordTimeoutRef.current) {
        clearTimeout(recordTimeoutRef.current);
      }
      return next;
    });
  }

  function handleSend() {
    if (disabled) return;
    if (!value.trim() && !attachment) return;
    onSend(value, attachment);
    setValue("");
    removeAttachment();
  }

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      className={`border-t p-3 sm:p-4 ${isDark ? "border-slate-700 bg-slate-900" : "border-slate-200 bg-white"}`}
    >
      {attachment && (
        <div className="mb-2 flex items-center gap-2">
          <div className="relative">
            <img src={attachment.previewUrl} alt={attachment.name} className="h-14 w-14 rounded-lg border border-slate-200 object-cover" />
            <button
              onClick={removeAttachment}
              className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-slate-700 text-white hover:bg-slate-800"
            >
              <X size={11} />
            </button>
          </div>
          <span className={`truncate text-xs ${isDark ? "text-slate-400" : "text-slate-500"}`}>{attachment.name}</span>
        </div>
      )}

      <div
        className={`
          flex items-end gap-2 rounded-2xl border px-3 py-2
          ${isDark ? "border-slate-700 bg-slate-800" : "border-slate-200 bg-slate-50"}
        `}
      >
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />

        <button
          onClick={() => fileInputRef.current?.click()}
          title="Attach an image (UI only)"
          className={`shrink-0 rounded-lg p-2 ${
            isDark ? "text-slate-400 hover:bg-slate-700 hover:text-slate-200" : "text-slate-400 hover:bg-slate-200 hover:text-slate-600"
          }`}
        >
          <ImagePlus size={18} />
        </button>

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Message your AI Tutor..."
          rows={1}
          className={`
            max-h-40 flex-1 resize-none bg-transparent py-1.5 text-sm focus:outline-none
            ${isDark ? "text-slate-100 placeholder:text-slate-500" : "text-slate-800 placeholder:text-slate-400"}
          `}
        />

        <button
          onClick={toggleVoice}
          title="Voice input (UI only)"
          className={`
            shrink-0 rounded-lg p-2 transition-colors
            ${
              isRecording
                ? "bg-rose-500 text-white animate-pulse"
                : isDark
                ? "text-slate-400 hover:bg-slate-700 hover:text-slate-200"
                : "text-slate-400 hover:bg-slate-200 hover:text-slate-600"
            }
          `}
        >
          <Mic size={18} />
        </button>

        <button
          onClick={handleSend}
          disabled={disabled || (!value.trim() && !attachment)}
          className="shrink-0 rounded-lg bg-indigo-600 p-2 text-white hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Send size={16} />
        </button>
      </div>

      <p className={`mt-2 text-center text-[11px] ${isDark ? "text-slate-500" : "text-slate-400"}`}>
        AI Tutor can make mistakes. Double-check important information.
      </p>
    </div>
  );
}