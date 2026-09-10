import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";
import { ROLE_HOME } from "../../config/navigation";

/**
 * Route-level authorization guard. DashboardLayout already checks the user is
 * authenticated at all; this checks the user's ROLE matches the section of the
 * app they're trying to reach (e.g. a Teacher hitting /super-admin/schools by
 * typing the URL). The backend independently re-enforces every one of these
 * boundaries at the API layer -- this guard exists so the UI doesn't render a
 * screen the user isn't allowed to use, not as the source of truth for access.
 */
export default function RoleRoute({ allow }) {
  const { role } = useAuth();
  const normalizedRole = (role || "").toLowerCase();

  if (!allow.includes(normalizedRole)) {
    return <Navigate to={ROLE_HOME[normalizedRole] ?? "/login"} replace />;
  }

  return <Outlet />;
}
