import { useState, useRef, useEffect } from "react";
import { CalendarPlus, Download, Link2, Copy, CheckCircle2, RefreshCw, Loader2 } from "lucide-react";
import { calendarAPI } from "../../services/api";

/**
 * Small popover, dropped into the header of every role's Academic Calendar
 * page, offering two ways to get these events into an external calendar app:
 * a one-time .ics download, and a standing subscription URL (token-based,
 * works with Google/Apple/Outlook "subscribe by URL") that stays in sync as
 * events change since the calendar app re-polls it on its own schedule.
 */
export default function CalendarSyncButton() {
  const [open, setOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [token, setToken] = useState(null);
  const [loadingToken, setLoadingToken] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  function handleOpen() {
    setOpen((prev) => !prev);
    if (!token) {
      setLoadingToken(true);
      calendarAPI
        .getSyncToken()
        .then((res) => setToken(res.data.token))
        .catch(() => {})
        .finally(() => setLoadingToken(false));
    }
  }

  async function handleDownload() {
    setDownloading(true);
    try {
      const res = await calendarAPI.exportIcs();
      const blob = new Blob([res.data], { type: "text/calendar" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "academic-calendar.ics";
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      /* best-effort -- the button stays clickable to retry */
    } finally {
      setDownloading(false);
    }
  }

  async function handleRegenerate() {
    setRegenerating(true);
    try {
      const res = await calendarAPI.regenerateSyncToken();
      setToken(res.data.token);
      setCopied(false);
    } catch (err) {
      /* best-effort */
    } finally {
      setRegenerating(false);
    }
  }

  const subscribeUrl = token
    ? `${(import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1")}/calendar/sync/${token}.ics`
    : "";

  function handleCopy() {
    if (!subscribeUrl) return;
    navigator.clipboard?.writeText(subscribeUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
      >
        <CalendarPlus size={14} /> Sync Calendar
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl border border-slate-200 bg-white p-4 shadow-lg">
          <div className="space-y-3">
            <div>
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Download size={13} /> Download a snapshot
              </h4>
              <p className="mt-1 text-[11px] text-slate-500">A one-time .ics file of everything you can see right now.</p>
              <button
                type="button"
                onClick={handleDownload}
                disabled={downloading}
                className="mt-2 flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
              >
                {downloading ? <Loader2 size={13} className="animate-spin" /> : <Download size={13} />}
                {downloading ? "Preparing..." : "Download .ics"}
              </button>
            </div>

            <div className="border-t border-slate-100 pt-3">
              <h4 className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
                <Link2 size={13} /> Subscribe (stays in sync)
              </h4>
              <p className="mt-1 text-[11px] text-slate-500">
                Add this link in Google/Apple/Outlook Calendar as a subscription -- it updates automatically as events change.
              </p>
              {loadingToken ? (
                <p className="mt-2 text-[11px] text-slate-400">Loading link...</p>
              ) : (
                <>
                  <div className="mt-2 flex items-center gap-1.5">
                    <input
                      readOnly
                      value={subscribeUrl}
                      onFocus={(e) => e.target.select()}
                      className="flex-1 truncate rounded-lg border border-slate-300 bg-slate-50 px-2 py-1.5 text-[11px] text-slate-600"
                    />
                    <button type="button" onClick={handleCopy} title="Copy link" className="rounded-lg border border-slate-300 p-1.5 text-slate-500 hover:bg-slate-50">
                      {copied ? <CheckCircle2 size={13} className="text-emerald-600" /> : <Copy size={13} />}
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleRegenerate}
                    disabled={regenerating}
                    className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-700 disabled:opacity-50"
                  >
                    {regenerating ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                    {regenerating ? "Regenerating..." : "Regenerate link (invalidates the old one)"}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
