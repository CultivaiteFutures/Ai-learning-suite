import { useState, useEffect, useCallback } from "react";
import { Swords, Globe2, GraduationCap, BarChart3, Zap, Award, HelpCircle, Eye } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import ChallengeLeaderboard from "../../components/common/ChallengeLeaderboard";
import Modal from "../../components/ui/Modal";
import { useDataTable } from "../../hooks/useDataTable";
import { challengesAPI } from "../../services/api";

const STATUS_STYLES = {
  upcoming: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  ended: "bg-slate-200 text-slate-600",
};

/**
 * Teacher's Challenges page is VIEW ONLY -- School Admin is the only role
 * that can author, edit, or delete a challenge now (see the school-admin
 * ChallengesPage). A teacher only sees challenges that reach one of their
 * own students' grades (enforced server-side in
 * app/api/v1/challenges.py's _visible_challenges), and can look at the full
 * quiz content plus the leaderboard so they can point students to it.
 */
export default function ChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [viewTarget, setViewTarget] = useState(null);
  const [viewDetail, setViewDetail] = useState(null);
  const [viewLoading, setViewLoading] = useState(false);
  const [leaderboardTarget, setLeaderboardTarget] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    challengesAPI
      .getChallenges()
      .then((res) => {
        setChallenges(Array.isArray(res.data) ? res.data : []);
        setError("");
      })
      .catch(() => setError("Could not load challenges. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const {
    paginatedData,
    searchTerm,
    setSearchTerm,
    sortConfig,
    handleSort,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    totalItems,
  } = useDataTable({
    data: challenges,
    searchFields: ["title", "subject"],
    defaultSort: { key: "startDate", direction: "desc" },
  });

  function openView(challenge) {
    setViewTarget(challenge);
    setViewDetail(null);
    setViewLoading(true);
    challengesAPI
      .getChallenge(challenge.id)
      .then((res) => setViewDetail(res.data))
      .finally(() => setViewLoading(false));
  }

  function openLeaderboard(challenge) {
    setLeaderboardTarget(challenge);
    setLeaderboardData(null);
    setLeaderboardError("");
    setLeaderboardLoading(true);
    challengesAPI
      .getLeaderboard(challenge.id)
      .then((res) => setLeaderboardData(res.data))
      .catch(() => setLeaderboardError("Could not load the leaderboard."))
      .finally(() => setLeaderboardLoading(false));
  }

  const columns = [
    { key: "title", label: "Title", sortable: true },
    {
      key: "grades",
      label: "Grades",
      render: (row) => (
        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
          {row.targetGradeIds?.length ? <GraduationCap size={13} /> : <Globe2 size={13} />}
          {row.targetGradeIds?.length ? row.targetGradeNames.join(", ") : "All grades"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium capitalize ${
            STATUS_STYLES[row.status] || "bg-slate-100 text-slate-600"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      key: "window",
      label: "Window",
      render: (row) => (
        <span className="text-xs text-slate-500">
          {new Date(row.startDate).toLocaleDateString()} &rarr; {new Date(row.endDate).toLocaleDateString()}
        </span>
      ),
    },
    {
      key: "questionCount",
      label: "Questions",
      render: (row) => (
        <span className="inline-flex items-center gap-1 text-xs text-slate-600">
          <HelpCircle size={12} /> {row.questionCount}
        </span>
      ),
    },
    {
      key: "reward",
      label: "Reward",
      render: (row) => (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <span className="inline-flex items-center gap-1">
            <Zap size={12} className="text-amber-500" /> {row.bonusXp} XP
          </span>
          {row.badgeName && (
            <span className="inline-flex items-center gap-1">
              <Award size={12} className="text-indigo-500" /> {row.badgeName}
            </span>
          )}
        </div>
      ),
    },
    { key: "participantCount", label: "Participants", sortable: true },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            onClick={() => openView(row)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
            title="View quiz"
          >
            <Eye size={15} />
          </button>
          <button
            onClick={() => openLeaderboard(row)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
            title="View leaderboard"
          >
            <BarChart3 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Challenges &amp; Competitions</h1>
        <p className="mt-1 text-sm text-slate-500">
          School-wide quizzes your school admin has posted for your students' grades. View the questions and
          leaderboard here -- School Admin is the one who creates and edits these.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DashboardCard label="Visible to Your Students" value={challenges.length} icon={Swords} accent="indigo" />
        <DashboardCard
          label="Currently Active"
          value={challenges.filter((c) => c.status === "active").length}
          icon={Zap}
          accent="emerald"
        />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search challenges..."
        />

        <DataTable
          columns={columns}
          data={paginatedData}
          loading={loading}
          keyExtractor={(row) => row.id}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyTitle="No challenges yet"
          emptyDescription="Once your school admin posts a challenge for your students' grades, it'll show up here."
          emptyIcon={Swords}
        />

        {!loading && totalItems > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={totalItems}
            pageSize={pageSize}
          />
        )}
      </div>

      <Modal
        isOpen={!!viewTarget}
        onClose={() => setViewTarget(null)}
        title={viewTarget ? viewTarget.title : "Challenge"}
        maxWidth="max-w-2xl"
      >
        {viewLoading ? (
          <p className="py-8 text-center text-sm text-slate-400">Loading...</p>
        ) : (
          <div className="space-y-3">
            {viewDetail?.description && <p className="text-sm text-slate-600">{viewDetail.description}</p>}
            <div className="max-h-[55vh] space-y-3 overflow-y-auto pr-1">
              {(viewDetail?.questions || []).map((q, qIndex) => (
                <div key={q.id} className="rounded-lg border border-slate-200 p-3.5">
                  <p className="text-sm font-medium text-slate-800">
                    {qIndex + 1}. {q.text}
                  </p>
                  <p className="mt-1.5 text-xs text-slate-500">
                    {q.type === "mcq" ? (
                      <>
                        Options: {q.options?.join(" / ")} &mdash; correct:{" "}
                        <span className="font-medium text-emerald-600">{q.options?.[q.correctIndex]}</span>
                      </>
                    ) : (
                      <>
                        Correct answer: <span className="font-medium text-emerald-600">{q.correctAnswer ? "True" : "False"}</span>
                      </>
                    )}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!leaderboardTarget}
        onClose={() => setLeaderboardTarget(null)}
        title={leaderboardTarget ? `Leaderboard — ${leaderboardTarget.title}` : "Leaderboard"}
      >
        <ChallengeLeaderboard
          entries={leaderboardData?.entries || []}
          currentStudent={leaderboardData?.currentStudent || null}
          loading={leaderboardLoading}
          error={leaderboardError}
        />
      </Modal>
    </div>
  );
}
