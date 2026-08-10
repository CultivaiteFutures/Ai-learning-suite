import { Menu } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { ROLE_LABELS } from "../../config/navigation";
import SearchBar from "./SearchBar";
import NotificationIcon from "./NotificationIcon";
import UserProfileDropdown from "./UserProfileDropdown";

export default function Navbar({ onMenuClick }) {
  const { user } = useAuth();

  return (
    <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b border-slate-200 bg-white/80 backdrop-blur px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="rounded-md p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={20} />
        </button>
        <div className="hidden sm:block">
          <p className="text-sm font-semibold text-slate-900">
            {ROLE_LABELS[user?.role] ?? "Dashboard"}
          </p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-end gap-3">
        <SearchBar />
        <NotificationIcon />
        <UserProfileDropdown />
      </div>
    </header>
  );
}