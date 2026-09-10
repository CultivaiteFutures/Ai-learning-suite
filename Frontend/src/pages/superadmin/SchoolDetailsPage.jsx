import { useEffect, useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Pencil, Building2, Mail, Phone, MapPin, Users, GraduationCap, BookOpen, Activity } from "lucide-react";
import SchoolStatusBadge from "../../components/superadmin/SchoolStatusBadge";
import SubscriptionBadge from "../../components/superadmin/SubscriptionBadge";
import SchoolFormModal from "../../components/superadmin/SchoolFormModal";
import SupportToolsPanel from "../../components/superadmin/SupportToolsPanel";
import DataTable from "../../components/table/DataTable";
import EmptyState from "../../components/common/EmptyState";
import { useSchools } from "../../context/SchoolContext";
import { superAdminAPI } from "../../services/api";

const TABS = ["Overview", "School Information", "Admin Information", "Teachers", "Students", "Courses", "Usage Statistics", "Subscription", "Activity Timeline", "Support Tools"];

export default function SchoolDetailsPage() {
  const { schoolId } = useParams();
  const { getSchoolById, schoolsLoading, getSubscriptionBySchool, updateSchool, activityLogs } = useSchools();
  const [activeTab, setActiveTab] = useState("Overview");
  const [editOpen, setEditOpen] = useState(false);
  const [teachers, setTeachers] = useState([]);
  const [students, setStudents] = useState([]);
  const [courses, setCourses] = useState([]);
  const [listsLoading, setListsLoading] = useState(true);

  const school = getSchoolById(schoolId);

  useEffect(() => {
    let cancelled = false;
    setListsLoading(true);
    Promise.all([
      superAdminAPI.getSchoolTeachers(schoolId),
      superAdminAPI.getSchoolStudents(schoolId),
      superAdminAPI.getSchoolCourses(schoolId),
    ])
      .then(([teachersRes, studentsRes, coursesRes]) => {
        if (cancelled) return;
        setTeachers(teachersRes.data || []);
        setStudents(studentsRes.data || []);
        setCourses(coursesRes.data || []);
      })
      .catch(() => {
        if (cancelled) return;
        setTeachers([]);
        setStudents([]);
        setCourses([]);
      })
      .finally(() => {
        if (!cancelled) setListsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [schoolId]);

  // Wait for the initial schools fetch before concluding this id doesn't
  // exist -- on a hard refresh/direct link, `schools` starts empty and this
  // would otherwise incorrectly bounce a real school back to the list.
  if (!school && schoolsLoading) {
    return <div className="flex h-64 items-center justify-center text-sm text-slate-400">Loading school...</div>;
  }
  if (!school) return <Navigate to="/super-admin/schools" replace />;

  const subscription = getSubscriptionBySchool(schoolId);
  const schoolActivity = activityLogs.filter((a) => a.schoolId === schoolId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  async function handleSaveEdit(data) {
    await updateSchool(school.id, data);
    setEditOpen(false);
  }

  function renderTabContent() {
    switch (activeTab) {
      case "Overview":
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBlock icon={Users} label="Teachers" value={school.teacherCount || 0} />
            <StatBlock icon={GraduationCap} label="Students" value={school.studentCount || 0} />
            <StatBlock icon={BookOpen} label="Courses" value={school.courseCount || 0} />
            <StatBlock icon={Activity} label="Monthly Active Users" value={school.monthlyActiveUsers || 0} />
          </div>
        );

      case "School Information":
        return (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
              <InfoRow icon={Building2} label="School Name" value={school.schoolName || school.name} />
              <InfoRow icon={Mail} label="Domain / URL" value={school.domain || "—"} />
              <InfoRow icon={Activity} label="AI Engine Provider" value={school.aiProvider === "gemini" ? "Google Gemini (Active)" : "Anthropic Claude"} />
              <InfoRow icon={Building2} label="Subscription Plan" value={school.subscriptionPlan || "Professional"} />
              <InfoRow icon={Mail} label="Contact Email" value={school.email || school.adminEmail || "—"} />
              <InfoRow icon={Phone} label="Phone Number" value={school.phone || "—"} />
              <InfoRow icon={MapPin} label="Full Address" value={[school.address, school.city, school.state, school.country].filter(Boolean).join(", ") || "—"} />
              <InfoRow icon={Users} label="School Status" value={school.status === "active" ? "Active" : "Suspended"} />
            </div>
          </div>
        );

      case "Admin Information":
        return (
          <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
              <div className="space-y-4 flex-1">
                <div className="flex items-center gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 font-bold text-lg">
                    {(school.adminName || "SA").slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-base font-semibold text-slate-900">{school.adminName || "School Administrator"}</h3>
                    <p className="text-xs text-slate-500">Authorized School Administrator</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 pt-2 sm:grid-cols-2">
                  <InfoRow icon={Mail} label="Admin Login Email" value={school.adminEmail || `admin@${school.domain || "school.edu"}`} />
                  <InfoRow icon={Users} label="Account Role" value="School Admin (Role: ADMIN)" />
                  <InfoRow icon={Activity} label="Status" value={school.status === "active" ? "Active & Authorized" : "Suspended"} />
                  <InfoRow icon={Building2} label="Associated School" value={school.schoolName || school.name} />
                </div>
              </div>

              <div className="shrink-0 pt-2">
                <button
                  onClick={() => setEditOpen(true)}
                  className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 transition"
                >
                  <Pencil size={14} />
                  Edit Admin / Reset Password
                </button>
              </div>
            </div>
          </div>
        );

      case "Teachers":
        return (
          <DataTable
            columns={[
              { key: "name", label: "Name" }, { key: "email", label: "Email" },
              { key: "subject", label: "Subject" }, { key: "gradeLevel", label: "Grade" },
            ]}
            data={teachers}
            loading={listsLoading}
            keyExtractor={(row) => row.id}
            emptyTitle="No teachers yet"
            emptyDescription="Teachers onboarded in this school will appear here."
          />
        );

      case "Students":
        return (
          <DataTable
            columns={[
              { key: "name", label: "Name" }, { key: "email", label: "Email" },
              { key: "grade", label: "Grade" }, { key: "section", label: "Section" },
            ]}
            data={students}
            loading={listsLoading}
            keyExtractor={(row) => row.id}
            emptyTitle="No students yet"
            emptyDescription="Students enrolled in this school will appear here."
          />
        );

      case "Courses":
        return (
          <DataTable
            columns={[
              { key: "name", label: "Course" }, { key: "subject", label: "Subject" },
              { key: "grade", label: "Grade" }, { key: "status", label: "Status" },
            ]}
            data={courses}
            loading={listsLoading}
            keyExtractor={(row) => row.id}
            emptyTitle="No courses yet"
            emptyDescription="Courses created for this school will appear here."
          />
        );

      case "Usage Statistics":
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatBlock icon={Activity} label="Monthly Active Users" value={school.monthlyActiveUsers || 0} />
            <StatBlock icon={Users} label="AI Usage (calls)" value={(school.aiUsageCount || 0).toLocaleString()} />
          </div>
        );

      case "Subscription":
        return subscription ? (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="mb-3 flex items-center gap-3">
              <SubscriptionBadge plan={subscription.plan} />
              <SchoolStatusBadge status={subscription.status} />
            </div>
            <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
              <InfoRow label="Started" value={subscription.startedDate} />
              <InfoRow label="Expiry Date" value={subscription.expiryDate} />
              <InfoRow label="Renewal Date" value={subscription.renewalDate} />
              <InfoRow label="Student Limit" value={subscription.studentLimit} />
              <InfoRow label="Teacher Limit" value={subscription.teacherLimit} />
            </div>
          </div>
        ) : (
          <EmptyState title="No subscription found" />
        );

      case "Activity Timeline":
        return (
          <div className="space-y-3">
            {schoolActivity.length === 0 ? (
              <EmptyState title="No activity yet" />
            ) : (
              schoolActivity.map((a) => (
                <div key={a.id} className="flex gap-3 rounded-lg border border-slate-100 bg-white p-4">
                  <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />
                  <div>
                    <p className="text-sm text-slate-700">{a.message}</p>
                    <p className="mt-0.5 text-xs text-slate-400">{new Date(a.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        );

      case "Support Tools":
        return <SupportToolsPanel school={school} />;

      default:
        return null;
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link to="/super-admin/schools" className="mb-3 inline-flex items-center gap-1 text-sm font-medium text-slate-500 hover:text-slate-700">
          <ArrowLeft size={15} /> Back to Schools
        </Link>
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-start">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-slate-900">{school.schoolName}</h1>
              <SchoolStatusBadge status={school.status} />
            </div>
            <p className="mt-1 text-sm text-slate-500">{school.schoolCode}{[school.city, school.state].filter(Boolean).length ? ` · ${[school.city, school.state].filter(Boolean).join(", ")}` : ""}</p>
          </div>
          <button
            onClick={() => setEditOpen(true)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            <Pencil size={15} /> Edit School
          </button>
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto border-b border-slate-200">
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`shrink-0 border-b-2 px-4 py-2.5 text-sm font-medium transition-colors ${
              activeTab === tab ? "border-indigo-600 text-indigo-700" : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {renderTabContent()}

      <SchoolFormModal isOpen={editOpen} onClose={() => setEditOpen(false)} onSave={handleSaveEdit} initialData={school} />
    </div>
  );
}

function StatBlock({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center gap-2 text-slate-400">
        <Icon size={16} />
        <p className="text-sm">{label}</p>
      </div>
      <p className="mt-2 text-2xl font-semibold text-slate-900">{value}</p>
    </div>
  );
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-slate-400">
        {Icon && <Icon size={12} />} {label}
      </p>
      <p className="mt-1 text-sm text-slate-700">{value || "—"}</p>
    </div>
  );
}