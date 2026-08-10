import { Footprints, Brain, Flame, Trophy, Moon, CalendarCheck, Award } from "lucide-react";
import mockBadges from "../../data/mockBadges.json";

const ICONS = { Footprints, Brain, Flame, Trophy, Moon, CalendarCheck };

export default function BadgesCard() {
  const earnedCount = mockBadges.filter((b) => b.earned).length;

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-900">Badges</h2>
        <span className="flex items-center gap-1 text-xs text-slate-400">
          <Award size={13} />
          {earnedCount}/{mockBadges.length} earned
        </span>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-6">
        {mockBadges.map((badge) => {
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
              <p className={`text-[11px] font-medium leading-tight ${badge.earned ? "text-slate-700" : "text-slate-350"}`}>
                {badge.name}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}