import { useState, useEffect, useMemo } from "react";
import { Sparkles, Activity, Coins, ChevronDown, ChevronUp } from "lucide-react";
import PlatformStatCard from "../../components/superadmin/PlatformStatCard";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { superAdminAPI } from "../../services/api";

const FEATURE_LABELS = {
  generate_course: "Course Generation",
  generate_assignment: "Assignment Generation",
  generate_course_from_pdf: "Course from PDF",
  tutor_chat: "Student AI Tutor",
  grade_submission: "AI-Assisted Grading",
};

/**
 * Task #56: AI usage/cost metering per school. estimated_tokens is a
 * ~4-chars-per-token approximation (documented in ai_usage_service.py) --
 * useful for comparing relative usage and cost across schools, not a
 * billing-grade token count.
 */
export default function AiUsagePage() {
  const [usage, setUsage] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    superAdminAPI
      .getAiUsage()
      .then((res) => setUsage(Array.isArray(res.data) ? res.data : []))
      .catch(() => setError("Could not load AI usage data."))
      .finally(() => setLoading(false));
  }, []);

  const stats = useMemo(() => ({
    totalCalls: usage.reduce((sum, s) => sum + s.total_calls, 0),
    totalTokens: usage.reduce((sum, s) => sum + s.estimated_tokens, 0),
    schoolsUsingAI: usage.length,
  }), [usage]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">AI Usage &amp; Cost Metering</h1>
        <p className="mt-1 text-sm text-slate-500">
          Estimated AI call volume and token usage per school, across every AI-powered feature on the platform.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <PlatformStatCard label="Total AI Calls" value={stats.totalCalls} icon={Activity} accent="indigo" />
        <PlatformStatCard label="Estimated Tokens Used" value={stats.totalTokens.toLocaleString()} icon={Coins} accent="amber" />
        <PlatformStatCard label="Schools Using AI" value={stats.schoolsUsingAI} icon={Sparkles} accent="emerald" />
      </div>

      {error && <p className="text-sm font-medium text-rose-600">{error}</p>}

      <div className="rounded-xl border border-slate-200 bg-white">
        {loading ? (
          <LoadingState rows={5} columns={4} />
        ) : usage.length === 0 ? (
          <EmptyState title="No AI usage recorded yet" description="Usage will appear here as schools use AI-powered features like the tutor, course generation, and grading." icon={Sparkles} />
        ) : (
          <div className="divide-y divide-slate-100">
            {usage.map((s) => {
              const isExpanded = expandedId === s.school_id;
              return (
                <div key={s.school_id}>
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : s.school_id)}
                    className="flex w-full items-center justify-between px-5 py-4 text-left hover:bg-slate-50"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{s.school_name}</p>
                      <p className="mt-0.5 text-xs text-slate-500">
                        {s.total_calls} AI calls · ~{s.estimated_tokens.toLocaleString()} estimated tokens
                      </p>
                    </div>
                    {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                  </button>
                  {isExpanded && (
                    <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-3">
                      <table className="w-full text-left text-xs">
                        <thead className="text-slate-400">
                          <tr>
                            <th className="py-1.5 font-semibold uppercase tracking-wide">Feature</th>
                            <th className="py-1.5 font-semibold uppercase tracking-wide">Calls</th>
                            <th className="py-1.5 font-semibold uppercase tracking-wide">Estimated Tokens</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Object.entries(s.by_feature).map(([feature, data]) => (
                            <tr key={feature}>
                              <td className="py-1.5 text-slate-700">{FEATURE_LABELS[feature] || feature}</td>
                              <td className="py-1.5 text-slate-700">{data.calls}</td>
                              <td className="py-1.5 text-slate-700">{data.estimated_tokens.toLocaleString()}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
