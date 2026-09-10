import { useCallback, useEffect, useMemo, useState } from "react";
import { Gamepad2, Trophy, Users, Pencil, Trash2 } from "lucide-react";
import DashboardCard from "../../components/dashboard/DashboardCard";
import DataTable from "../../components/table/DataTable";
import TableToolbar from "../../components/table/TableToolbar";
import Pagination from "../../components/table/Pagination";
import ConfirmationDialog from "../../components/common/ConfirmationDialog";
import GameFormModal from "../../components/teacher/GameFormModal";
import { useDataTable } from "../../hooks/useDataTable";
import { gamesAPI, teacherAPI } from "../../services/api";

const GAME_TYPE_LABELS = {
  quiz_match: "Quiz Match",
  trivia: "Trivia",
  flashcard: "Flashcards",
  memory: "Memory Match",
  matching: "Matching",
  puzzle: "Word Puzzle",
};

export default function ManageGamesPage() {
  const [games, setGames] = useState([]);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [formError, setFormError] = useState("");
  const [editingGame, setEditingGame] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([gamesAPI.getGames(), teacherAPI.getCourses()])
      .then(([gamesRes, coursesRes]) => {
        setGames(Array.isArray(gamesRes.data) ? gamesRes.data : []);
        setCourses(Array.isArray(coursesRes.data) ? coursesRes.data : []);
        setError("");
      })
      .catch(() => setError("Could not load your games. Please try again."))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const courseNameById = useMemo(() => {
    const map = {};
    courses.forEach((c) => {
      map[c.id] = c.title || c.name;
    });
    return map;
  }, [courses]);

  const enrichedGames = useMemo(
    () =>
      games.map((g) => ({
        ...g,
        courseName: courseNameById[g.courseId] || "Unknown Course",
        gameTypeLabel: GAME_TYPE_LABELS[g.gameType] || g.gameType,
      })),
    [games, courseNameById]
  );

  const courseOptions = useMemo(
    () => [{ value: "all", label: "All Courses" }, ...courses.map((c) => ({ value: c.id, label: c.title || c.name }))],
    [courses]
  );

  const {
    paginatedData,
    searchTerm,
    setSearchTerm,
    filters,
    setFilter,
    sortConfig,
    handleSort,
    currentPage,
    setCurrentPage,
    totalPages,
    pageSize,
    totalItems,
  } = useDataTable({
    data: enrichedGames,
    searchFields: ["title", "courseName", "gameTypeLabel"],
    defaultSort: { key: "createdAt", direction: "desc" },
  });

  const stats = useMemo(
    () => ({
      total: games.length,
      published: games.filter((g) => g.isPublished).length,
      totalAttempts: games.reduce((sum, g) => sum + (g.attemptCount || 0), 0),
    }),
    [games]
  );

  function openCreate() {
    setEditingGame(null);
    setFormError("");
    setFormOpen(true);
  }

  function openEdit(game) {
    setEditingGame(game);
    setFormError("");
    setFormOpen(true);
  }

  async function handleSave(payload) {
    setSaving(true);
    try {
      if (editingGame) {
        await gamesAPI.updateGame(editingGame.id, payload);
      } else {
        await gamesAPI.createGame(payload);
      }
      setFormOpen(false);
      load();
    } catch (err) {
      setFormError(err?.response?.data?.detail || "Could not save this game. Please check your inputs.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await gamesAPI.deleteGame(deleteTarget.id);
      setDeleteTarget(null);
      load();
    } catch (err) {
      setError(err?.response?.data?.detail || "Could not delete this game.");
    } finally {
      setDeleting(false);
    }
  }

  const columns = [
    { key: "title", label: "Title", sortable: true },
    { key: "gameTypeLabel", label: "Type", sortable: true },
    { key: "courseName", label: "Course", sortable: true },
    {
      key: "attemptCount",
      label: "Attempts",
      render: (row) => row.attemptCount ?? 0,
    },
    {
      key: "averageScore",
      label: "Avg. Score",
      render: (row) => (row.averageScore != null ? `${Math.round(row.averageScore)}` : "--"),
    },
    {
      key: "isPublished",
      label: "Status",
      render: (row) => (
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
            row.isPublished ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"
          }`}
        >
          {row.isPublished ? "Published" : "Draft"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button onClick={() => openEdit(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-indigo-600">
            <Pencil size={15} />
          </button>
          <button onClick={() => setDeleteTarget(row)} className="rounded-md p-1.5 text-slate-400 hover:bg-rose-50 hover:text-rose-600">
            <Trash2 size={15} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Fun Games</h1>
        <p className="mt-1 text-sm text-slate-500">Create interactive games and track how your students are playing them.</p>
      </div>

      {error && <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</div>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardCard label="Total Games" value={stats.total} icon={Gamepad2} accent="indigo" />
        <DashboardCard label="Published" value={stats.published} icon={Trophy} accent="emerald" />
        <DashboardCard label="Total Attempts" value={stats.totalAttempts} icon={Users} accent="amber" />
      </div>

      <div className="rounded-xl border border-slate-200 bg-white">
        <TableToolbar
          searchTerm={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search games by title, course, or type..."
          filters={[
            { key: "courseId", value: filters.courseId || "all", onChange: (v) => setFilter("courseId", v), options: courseOptions },
          ]}
          onAddClick={openCreate}
          addLabel="Create Game"
        />

        <DataTable
          columns={columns}
          data={paginatedData}
          loading={loading}
          keyExtractor={(row) => row.id}
          sortConfig={sortConfig}
          onSort={handleSort}
          emptyTitle="No games yet"
          emptyDescription="Create your first interactive game for students to play."
          emptyIcon={Gamepad2}
        />

        {!loading && totalItems > 0 && (
          <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} totalItems={totalItems} pageSize={pageSize} />
        )}
      </div>

      <GameFormModal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        onSave={handleSave}
        initialData={editingGame}
        courses={courses}
        saving={saving}
        error={formError}
      />

      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete game"
        message={`Are you sure you want to delete "${deleteTarget?.title}"? This cannot be undone.`}
        confirmLabel="Delete"
        loading={deleting}
      />
    </div>
  );
}
