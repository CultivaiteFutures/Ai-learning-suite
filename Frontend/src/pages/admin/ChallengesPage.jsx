import { useState, useEffect, useCallback } from "react";
import { Swords, Globe2, GraduationCap, Trash2, Pencil, BarChart3, Zap, Award, HelpCircle } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import ChallengeFormModal from "../../components/common/ChallengeFormModal";
import ChallengeLeaderboard from "../../components/common/ChallengeLeaderboard";
import Modal from "../../components/ui/Modal";
import { useDataTable } from "../../hooks/useDataTable";
import { challengesAPI, schoolAdminAPI } from "../../services/api";

const STATUS_STYLES = {
  upcoming: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
  ended: "bg-slate-200 text-slate-600",
};

export default function ChallengesPage() {
  const [challenges, setChallenges] = useState([]);
  const [grades, setGrades] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editingChallenge, setEditingChallenge] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [leaderboardTarget, setLeaderboardTarget] = useState(null);
  const [leaderboardData, setLeaderboardData] = useState(null);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardError, setLeaderboardError] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([challengesAPI.getChallenges(), schoolAdminAPI.getGrades()])
      .then(([challengeRes, gradeRes]) => {
        setChallenges(Array.isArray(challengeRes.data) ? challengeRes.data : []);
        setGrades(Array.isArray(gradeRes.data) ? gradeRes.data : []);
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

  function openCreate() {
    setEditingChallenge(null);
    setFormOpen(true);
  }

  function openEdit(challenge) {
    challengesAPI
      .getChallenge(challenge.id)
      .then((res) => {
        setEditingChallenge(res.data);
        setFormOpen(true);
      })
      .catch(() => setError("Could not load this challenge for editing."));
  }

  async function handleSave(payload) {
    setSaving(true);
    try {
      if (editingChallenge) {
        await challengesAPI.updateChallenge(editingChallenge.id, payload);
      } else {
        await challengesAPI.createChallenge(payload);
      }
      setFormOpen(false);
      setEditingChallenge(null);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not save this challenge.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await challengesAPI.deleteChallenge(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not delete the challenge.");
    } finally {
      setDeleting(false);
    }
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
            onClick={() => openLeaderboard(row)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
            title="View leaderboard"
          >
            <BarChart3 size={15} />
          </button>
          <button
            onClick={() => openEdit(row)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-indigo-50 hover:text-indigo-600"
            title="Edit"
          >
            <Pencil size={15} />
          </button>
          <button
            onClick={() => setDeleteTarget(row)}
            className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
            title="Delete"
          >
            <Trash2 size={15} />
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
          Author a school-wide quiz for one or more grades -- teachers can view it, students take it, and it's
          auto-graded the moment they submit.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <DashboardCard label="Total Challenges" value={challenges.length} icon={Swords} accent="indigo" />
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
          onAddClick={openCreate}
          addLabel="New Challenge"
        />

        <DataTable
          columns={columns}
          data={paginatedData}
          loading={loading}
          keyExtractor={(row) => row.id}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyTitle="No challenges yet"
          emptyDescription="Create a school-wide quiz for one or more grades."
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

      <ChallengeFormModal
        isOpen={formOpen}
        onClose={() => {
          setFormOpen(false);
          setEditingChallenge(null);
        }}
        onSave={handleSave}
        grades={grades}
        initialData={editingChallenge}
        saving={saving}
      />

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete challenge"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />

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
