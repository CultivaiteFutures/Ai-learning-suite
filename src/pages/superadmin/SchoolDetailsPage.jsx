import { useState } from "react";
import { useParams, Link, Navigate } from "react-router-dom";
import { ArrowLeft, Pencil, Building2, Mail, Phone, MapPin, Users, GraduationCap, BookOpen, Activity } from "lucide-react";
import SchoolStatusBadge from "../../components/superadmin/SchoolStatusBadge";
import SubscriptionBadge from "../../components/superadmin/SubscriptionBadge";
import SchoolFormModal from "../../components/superadmin/SchoolFormModal";
import DataTable from "../../components/table/DataTable";
import EmptyState from "../../components/common/EmptyState";
import { useSchools } from "../../context/SchoolContext";
import mockTeachers from "../../data/mockTeachers.json";
import mockStudents from "../../data/mockStudents.json";
import mockCourses from "../../data/mockCourses.json";

const TABS = ["Overview", "School Information", "Admin Information", "Teachers", "Students", "Courses", "Usage Statistics", "Subscription", "Activity Timeline"];

export default function SchoolDetailsPage() {
  const { schoolId } = useParams();
  const { getSchoolById, getSubscriptionBySchool, updateSchool, activityLogs, subscriptions, updateSubscription } = useSchools();
  const [activeTab, setActiveTab] = useState("Overview");
  const [editOpen, setEditOpen] = useState(false);

  const school = getSchoolById(schoolId);
  if (!school) return <Navigate to="/super-admin/schools" replace />;

  const subscription = getSubscriptionBySchool(schoolId);
  const schoolActivity = activityLogs.filter((a) => a.schoolId === schoolId).sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Illustrative roster slice — replace with GET /schools/{id}/teachers|students|courses once the backend exists.
  const sampleTeachers = mockTeachers.slice(0, Math.min(school.teacherCount, mockTeachers.length));
  const sampleStudents = mockStudents.slice(0, Math.min(school.studentCount, mockStudents.length));
  const sampleCourses = mockCourses.slice(0, Math.min(school.courseCount, mockCourses.length));

  async function handleSaveEdit(data) {
    await updateSchool(school.id, data);
    setEditOpen(false);
  }

  function renderTabContent() {
    switch (activeTab) {
      case "Overview":
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatBlock icon={Users} label="Teachers" value={school.teacherCount} />
            <StatBlock icon={GraduationCap} label="Students" value={school.studentCount} />
            <StatBlock icon={BookOpen} label="Courses" value={school.courseCount} />
            <StatBlock icon={Activity} label="Monthly Active Users" value={school.monthlyActiveUsers} />
          </div>
        );

      case "School Information":
        return (
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <InfoRow icon={Mail} label="Contact Email" value={school.email} />
              <InfoRow icon={Phone} label="Phone" value={school.phone} />
              <InfoRow icon={MapPin} label="Address" value={`${school.address}, ${school.city}, ${school.state}, ${school.country}`} />
              <InfoRow icon={Building2} label="Principal" value={school.principalName} />
            </div>
          </div>
        );

      case "Admin Information":
        return (
          <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            <p>School Admin credentials were generated automatically when this school was onboarded.</p>
            <p className="mt-2 text-xs text-slate-400">
              Admin roster & password reset actions will be available once the backend exposes school-scoped admin endpoints.
            </p>
          </div>
        );

      case "Teachers":
        return (
          <DataTable
            columns={[
              { key: "name", label: "Name" }, { key: "email", label: "Email" },
              { key: "subject", label: "Subject" }, { key: "gradeLevel", label: "Grade" },
            ]}
            data={sampleTeachers}
            loading={false}
            keyExtractor={(row) => row.id}
            emptyTitle="No teachers yet"
          />
        );

      case "Students":
        return (
          <DataTable
            columns={[
              { key: "name", label: "Name" }, { key: "email", label: "Email" },
              { key: "grade", label: "Grade" }, { key: "section", label: "Section" },
            ]}
            data={sampleStudents}
            loading={false}
            keyExtractor={(row) => row.id}
            emptyTitle="No students yet"
          />
        );

      case "Courses":
        return (
          <DataTable
            columns={[
              { key: "name", label: "Course" }, { key: "subject", label: "Subject" },
              { key: "grade", label: "Grade" }, { key: "status", label: "Status" },
            ]}
            data={sampleCourses}
            loading={false}
            keyExtractor={(row) => row.id}
            emptyTitle="No courses yet"
          />
        );

      case "Usage Statistics":
        return (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <StatBlock icon={Activity} label="Monthly Active Users" value={school.monthlyActiveUsers} />
            <StatBlock icon={Users} label="AI Usage (calls)" value={school.aiUsageCount.toLocaleString()} />
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
            <p className="mt-1 text-sm text-slate-500">{school.schoolCode} · {school.city}, {school.state}</p>
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