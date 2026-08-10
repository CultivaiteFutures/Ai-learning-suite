import { Link } from "react-router-dom";
import { Building2, Users, GraduationCap, MapPin } from "lucide-react";
import SchoolStatusBadge from "./SchoolStatusBadge";
import SubscriptionBadge from "./SubscriptionBadge";

export default function SchoolCard({ school }) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
            <Building2 size={20} />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-900">{school.schoolName}</p>
            <p className="text-xs text-slate-500">{school.schoolCode}</p>
          </div>
        </div>
        <SchoolStatusBadge status={school.status} />
      </div>

      <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500">
        <MapPin size={13} /> {school.city}, {school.state}, {school.country}
      </p>

      <div className="mt-3 flex items-center gap-4 text-xs text-slate-500">
        <span className="flex items-center gap-1">
          <Users size={13} /> {school.teacherCount} teachers
        </span>
        <span className="flex items-center gap-1">
          <GraduationCap size={13} /> {school.studentCount} students
        </span>
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
        <SubscriptionBadge plan={school.subscriptionPlan} />
        <Link to={`/super-admin/schools/${school.id}`} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700">
          View Details →
        </Link>
      </div>
    </div>
  );
}