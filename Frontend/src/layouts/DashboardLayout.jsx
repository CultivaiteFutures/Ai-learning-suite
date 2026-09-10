import { useEffect, useState } from "react";
import { Outlet, Navigate } from "react-router-dom";
import { ShieldAlert } from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import Navbar from "../components/layout/Navbar";
import Breadcrumb from "../components/layout/Breadcrumb";
import MainContentArea from "../components/layout/MainContentArea";
import { useAuth } from "../hooks/useAuth";
import { authAPI } from "../services/api";

export default function DashboardLayout() {
  const { isAuthenticated, isLoading, role } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [maintenance, setMaintenance] = useState(null);

  // Super Admin's maintenance-mode toggle (Platform Settings) blocks every
  // other role behind a maintenance screen -- checked once per dashboard
  // load so a school admin/teacher/student/parent can't work around it by
  // navigating client-side. Super Admins are exempt so they can always get
  // in to turn it back off.
  useEffect(() => {
    if (!isAuthenticated || role === "super_admin") return;
    let cancelled = false;
    authAPI
      .getMaintenanceStatus()
      .then((res) => {
        if (!cancelled) setMaintenance(res.data);
      })
      .catch(() => {
        if (!cancelled) setMaintenance(null);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, role]);

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (role !== "super_admin" && maintenance?.maintenanceMode) {
    return (
      <div className="flex h-screen flex-col items-center justify-center bg-slate-50 px-6 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <ShieldAlert size={28} />
        </div>
        <h1 className="mt-4 text-xl font-semibold text-slate-900">We'll be right back</h1>
        <p className="mt-2 max-w-md text-sm text-slate-500">
          {maintenance.maintenanceMessage || "The platform is undergoing scheduled maintenance. Please check back shortly."}
        </p>
      </div>
    );
  }

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="flex flex-1 flex-col overflow-hidden">
        <Navbar onMenuClick={() => setSidebarOpen(true)} />
        <MainContentArea>
          <Breadcrumb />
          <Outlet />
        </MainContentArea>
      </div>
    </div>
  );
}