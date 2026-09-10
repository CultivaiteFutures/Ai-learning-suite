import { Footprints, Brain, Flame, Trophy, Moon, CalendarCheck, Award } from "lucide-react";
import { useStudentProgress } from "../../context/StudentProgressContext";

const BADGE_CATALOG = [
  { id: "1", name: "First Lesson", icon: "Footprints", description: "Completed your first lesson" },
  { id: "2", name: "Kinematics Novice", icon: "Brain", description: "Finished kinematics introductory module" },
  { id: "3", name: "3-Day Streak", icon: "Flame", description: "Studied 3 days in a row" },
  { id: "4", name: "Quiz Master", icon: "Trophy", description: "Scored 100% on a quiz" },
];

const ICONS = { Footprints, Brain, Flame, Trophy, Moon, CalendarCheck };

export default function BadgesCard() {
  const { badges } = useStudentProgress();
  const earnedBadges = badges || [];

  // "earned" reflects only what the backend has actually recorded in
  // StudentStats.badges -- no XP/streak heuristics here.
  const badgeList = BADGE_CATALOG.map((b) => ({
    ...b,
    earned: earnedBadges.includes(b.name),
  }));

  const earnedCount = badgeList.filter((b) => b.earned).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Badges</h2>
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Award size={13} />
          {earnedCount}/{badgeList.length} earned
        </span>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {badgeList.map((badge) => {
          const Icon = ICONS[badge.icon] || Award;
          return (
            <div key={badge.id} className="flex flex-col items-center gap-1.5 text-center" title={badge.description}>
              <div
                className={`flex h-12 w-12 items-center justify-center rounded-full ${
                  badge.earned ? "bg-indigo-50 text-indigo-600" : "bg-slate-50 text-slate-300"
                }`}
              >
                <Icon size={20} />
              </div>
              <p className={`text-[11px] font-medium leading-tight ${badge.earned ? "text-slate-700" : "text-slate-400"}`}>
                {badge.name}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
