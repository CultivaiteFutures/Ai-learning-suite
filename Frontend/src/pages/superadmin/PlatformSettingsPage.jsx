import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, ShieldAlert, Building2 } from "lucide-react";
import { superAdminAPI } from "../../services/api";

export default function PlatformSettingsPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(false);
  const [message, setMessage] = useState("");
  const [savedAt, setSavedAt] = useState(null);
  const [error, setError] = useState("");

  const [brandingLoading, setBrandingLoading] = useState(true);
  const [brandingSaving, setBrandingSaving] = useState(false);
  const [platformName, setPlatformName] = useState("");
  const [supportEmail, setSupportEmail] = useState("");
  const [brandingSavedAt, setBrandingSavedAt] = useState(null);
  const [brandingError, setBrandingError] = useState("");

  useEffect(() => {
    let cancelled = false;
    superAdminAPI
      .getPlatformSettings()
      .then((res) => {
        if (cancelled) return;
        setPlatformName(res.data.platformName || "");
        setSupportEmail(res.data.supportEmail || "");
      })
      .catch(() => {
        if (!cancelled) setBrandingError("Couldn't load general settings.");
      })
      .finally(() => {
        if (!cancelled) setBrandingLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSaveBranding(e) {
    e.preventDefault();
    setBrandingSaving(true);
    setBrandingError("");
    try {
      const res = await superAdminAPI.updatePlatformSettings({
        platformName: platformName.trim(),
        supportEmail: supportEmail.trim(),
      });
      setPlatformName(res.data.platformName || "");
      setSupportEmail(res.data.supportEmail || "");
      setBrandingSavedAt(new Date());
    } catch (err) {
      setBrandingError(err.response?.data?.detail || "Couldn't save general settings. Please try again.");
    } finally {
      setBrandingSaving(false);
    }
  }

  useEffect(() => {
    let cancelled = false;
    superAdminAPI
      .getMaintenanceSettings()
      .then((res) => {
        if (cancelled) return;
        setEnabled(!!res.data.maintenanceMode);
        setMessage(res.data.maintenanceMessage || "");
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load maintenance settings.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function handleSave(nextEnabled) {
    setSaving(true);
    setError("");
    try {
      const res = await superAdminAPI.updateMaintenanceSettings({
        maintenanceMode: nextEnabled,
        maintenanceMessage: message,
      });
      setEnabled(!!res.data.maintenanceMode);
      setMessage(res.data.maintenanceMessage || "");
      setSavedAt(new Date());
    } catch {
      setError("Couldn't save maintenance settings. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Platform Settings</h1>
        <p className="mt-1 text-sm text-slate-500">Platform-wide configuration and maintenance controls.</p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${enabled ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-400"}`}>
              <ShieldAlert size={18} />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-900">Maintenance Mode</h2>
              <p className="mt-1 max-w-xl text-xs text-slate-500">
                When enabled, everyone except Super Admins sees a maintenance screen with the message below instead of the app. Use this for planned downtime, upgrades, or incident response.
              </p>
            </div>
          </div>

          {!loading && (
            <button
              type="button"
              role="switch"
              aria-checked={enabled}
              disabled={saving}
              onClick={() => handleSave(!enabled)}
              className={`relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors disabled:opacity-60 ${
                enabled ? "bg-amber-500" : "bg-slate-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  enabled ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          )}
        </div>

        {loading ? (
          <p className="mt-4 text-xs text-slate-400">Loading current settings...</p>
        ) : (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">
                Message shown to users
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                placeholder="We're performing scheduled maintenance and will be back shortly. Thanks for your patience!"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs">
                {error && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertTriangle size={13} /> {error}
                  </span>
                )}
                {!error && savedAt && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 size={13} /> Saved {savedAt.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleSave(enabled)}
                disabled={saving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Message"}
              </button>
            </div>

            {enabled && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                Maintenance mode is currently <strong>ON</strong>. Non-Super-Admin users are seeing the maintenance screen right now.
              </div>
            )}
          </div>
        )}
      </div>

      <form onSubmit={handleSaveBranding} className="rounded-xl border border-slate-200 bg-white p-5">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <Building2 size={18} />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-slate-900">General</h2>
            <p className="mt-1 max-w-xl text-xs text-slate-500">
              Platform name and support contact, shown on the sign-in landing page and wherever the platform identifies itself.
            </p>
          </div>
        </div>

        {brandingLoading ? (
          <p className="mt-4 text-xs text-slate-400">Loading current settings...</p>
        ) : (
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4">
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Platform Name</label>
              <input
                type="text"
                value={platformName}
                onChange={(e) => setPlatformName(e.target.value)}
                placeholder="AI Learning Suite"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-slate-400">Support Contact Email</label>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@yourschoolplatform.com"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="flex items-center justify-between">
              <div className="text-xs">
                {brandingError && (
                  <span className="flex items-center gap-1 text-red-600">
                    <AlertTriangle size={13} /> {brandingError}
                  </span>
                )}
                {!brandingError && brandingSavedAt && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <CheckCircle2 size={13} /> Saved {brandingSavedAt.toLocaleTimeString()}
                  </span>
                )}
              </div>
              <button
                type="submit"
                disabled={brandingSaving}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm transition hover:bg-indigo-700 disabled:opacity-60"
              >
                {brandingSaving ? "Saving..." : "Save General Settings"}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
