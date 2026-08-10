import { useAuthContext } from "../context/AuthContext";

export function useAuth() {
  const { user, isLoading, login, logout } = useAuthContext();
  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    role: user?.role ?? null,
    login,
    logout,
  };
}