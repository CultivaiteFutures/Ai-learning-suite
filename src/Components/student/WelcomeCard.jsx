import { Flame } from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useStudentProgress } from "../../context/StudentProgressContext";

export default function WelcomeCard() {
  const { user } = useAuth();
  const { streakDays } = useStudentProgress();
  const firstName = user?.name?.split(" ")[0] || "there";

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="rounded-xl border border-indigo-100 bg-gradient-to-br from-indigo-600 to-indigo-700 p-6 text-white shadow-sm">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className="text-xl font-semibold sm:text-2xl">
            {greeting}, {firstName} 👋
          </h1>
          <p className="mt-1 text-sm text-indigo-100">Ready to pick up where you left off?</p>
        </div>
        <div className="flex items-center gap-2 self-start rounded-full bg-white/15 px-4 py-2 backdrop-blur">
          <Flame size={18} className="text-amber-300" />
          <span className="text-sm font-semibold">{streakDays}-day streak</span>
        </div>
      </div>
    </div>
  );
}