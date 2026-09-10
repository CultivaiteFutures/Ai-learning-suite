import { useState, useEffect } from "react";
import { ShieldCheck, Loader2, Save, CheckCircle2, AlertCircle } from "lucide-react";
import { schoolAdminAPI } from "../../services/api";

const PROVIDER_LABELS = { google: "Google", clever: "Clever", classlink: "ClassLink" };

/**
 * Task #62: School Admin-facing SSO configuration. Deliberately inert until
 * real credentials are entered here -- the backend refuses to start an SSO
 * login for a provider until is_configured() is true (enabled + a
 * real-looking client_id/client_secret), so an unconfigured provider here
 * simply never appears as a "Sign in with ..." button on the login page.
 */
export default function SsoSettingsPanel() {
  const [configs, setConfigs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [drafts, setDrafts] = useState({}); // provider -> { clientId, clientSecret, domainRestriction, isEnabled }
  const [savingProvider, setSavingProvider] = useState(null);
  const [message, setMessage] = useState({ type: "", text: "" });

  function load() {
    setLoading(true);
    schoolAdminAPI
      .getSsoConfig()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        setConfigs(list);
        const d = {};
        list.forEach((c) => {
          d[c.provider] = {
            clientId: c.clientId || "",
            clientSecret: "", // write-only -- never prefilled with a real secret
            domainRestriction: c.domainRestriction || "",
            isEnabled: c.isEnabled,
          };
        });
        setDrafts(d);
      })
      .catch(() => setMessage({ type: "error", text: "Failed to load SSO settings." }))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  function updateDraft(provider, field, value) {
    setDrafts((prev) => ({ ...prev, [provider]: { ...prev[provider], [field]: value } }));
  }

  async function handleSave(provider) {
    setSavingProvider(provider);
    setMessage({ type: "", text: "" });
    const draft = drafts[provider] || {};
    try {
      const payload = {
        isEnabled: !!draft.isEnabled,
        clientId: draft.clientId,
        domainRestriction: draft.domainRestriction,
      };
      // Only send clientSecret if the admin actually typed a new one --
      // an empty field here must never silently wipe an already-saved secret.
      if (draft.clientSecret) payload.clientSecret = draft.clientSecret;

      await schoolAdminAPI.updateSsoConfig(provider, payload);
      setMessage({ type: "success", text: `${PROVIDER_LABELS[provider]} settings saved.` });
      load();
    } catch (err) {
      setMessage({ type: "error", text: err.response?.data?.detail || "Failed to save these settings." });
    } finally {
      setSavingProvider(null);
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading SSO settings...</p>;
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-900">
          <ShieldCheck size={18} className="text-indigo-600" /> Single Sign-On
        </h2>
        <p className="mt-1 text-xs text-slate-500">
          Let your staff and students sign in with Google, Clever, or ClassLink instead of a password. A provider
          only appears on the login page once it's enabled here with real credentials from that provider's developer
          console, and a matching email domain below.
        </p>
      </div>

      {message.text && (
        <div
          className={`flex items-center gap-2 rounded-lg px-4 py-3 text-xs font-semibold ${
            message.type === "error" ? "bg-rose-50 text-rose-800 border border-rose-200" : "bg-emerald-50 text-emerald-800 border border-emerald-200"
          }`}
        >
          {message.type === "error" ? <AlertCircle size={14} /> : <CheckCircle2 size={14} />}
          <span>{message.text}</span>
        </div>
      )}

      {configs.map((c) => {
        const draft = drafts[c.provider] || {};
        return (
          <div key={c.provider} className="rounded-xl border border-slate-200 bg-white p-5 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-800">{c.label}</h3>
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600">
                <input
                  type="checkbox"
                  checked={!!draft.isEnabled}
                  onChange={(e) => updateDraft(c.provider, "isEnabled", e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-200"
                />
                Enabled
              </label>
            </div>

            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">Client ID</label>
                <input
                  value={draft.clientId || ""}
                  onChange={(e) => updateDraft(c.provider, "clientId", e.target.value)}
                  placeholder="From the provider's developer console"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Client Secret {c.hasSecret && <span className="text-emerald-600">(already set)</span>}
                </label>
                <input
                  type="password"
                  value={draft.clientSecret || ""}
                  onChange={(e) => updateDraft(c.provider, "clientSecret", e.target.value)}
                  placeholder={c.hasSecret ? "Leave blank to keep the current secret" : "Not set"}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-slate-400">
                  Email domain (routes matching logins to this school)
                </label>
                <input
                  value={draft.domainRestriction || ""}
                  onChange={(e) => updateDraft(c.provider, "domainRestriction", e.target.value)}
                  placeholder="yourschool.edu"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => handleSave(c.provider)}
              disabled={savingProvider === c.provider}
              className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {savingProvider === c.provider ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />}
              Save
            </button>
          </div>
        );
      })}
    </div>
  );
}
