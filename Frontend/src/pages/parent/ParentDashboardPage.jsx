import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Users, GraduationCap, Mail, ChevronRight, UserX } from "lucide-react";
import LoadingState from "../../components/common/LoadingState";
import EmptyState from "../../components/common/EmptyState";
import { parentAPI } from "../../services/api";

export default function ParentDashboardPage() {
  const [children, setChildren] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");

  function loadChildren() {
    setLoading(true);
    setLoadError("");
    parentAPI
      .getChildren()
      .then((res) => {
        setChildren(Array.isArray(res.data) ? res.data : []);
        setLoading(false);
      })
      .catch((err) => {
        setLoadError(err.response?.data?.detail || "Failed to load your children's accounts.");
        setLoading(false);
      });
  }

  useEffect(() => {
    loadChildren();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">My Children</h1>
        <p className="mt-1 text-sm text-slate-500">
          View your children's courses, assignments, and grades. This view is read-only.
        </p>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="text-sm font-semibold text-slate-900">Linked Students</h2>
        </div>

        {loading ? (
          <LoadingState rows={3} columns={3} />
        ) : loadError ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm font-medium text-rose-600">{loadError}</p>
            <button
              onClick={loadChildren}
              className="mt-3 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
            >
              Try again
            </button>
          </div>
        ) : children.length === 0 ? (
          <EmptyState
            title="No linked children yet"
            description="Your school hasn't linked any student accounts to your profile yet. Contact your school's front office if you believe this is a mistake."
            icon={UserX}
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {children.map((child) => (
              <Link
                key={child.id}
                to={`/parent/children/${child.id}`}
                className="flex flex-col gap-2 px-5 py-4 transition hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                    <GraduationCap size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{child.name || "Student"}</p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-slate-400">
                      {child.email && (
                        <span className="flex items-center gap-1">
                          <Mail size={11} /> {child.email}
                        </span>
                      )}
                      {child.gradeName && (
                        <span className="flex items-center gap-1">
                          <Users size={11} /> {child.gradeName}
                          {child.section ? ` · Section ${child.section}` : ""}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-3 sm:ml-4">
                  {!child.isActive && (
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      Inactive
                    </span>
                  )}
                  <span className="flex items-center gap-1 text-xs font-semibold text-indigo-600">
                    View Progress
                    <ChevronRight size={13} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
