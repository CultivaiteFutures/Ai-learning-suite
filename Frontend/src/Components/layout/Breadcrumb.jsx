import { Link, useLocation } from "react-router-dom";
import { ChevronRight, Home } from "lucide-react";
import { NAVIGATION_CONFIG } from "../../config/navigation";

const PATH_LABELS = Object.values(NAVIGATION_CONFIG)
  .flat()
  .reduce((acc, item) => {
    acc[item.path] = item.label;
    return acc;
  }, {});

function formatSegment(segment) {
  return segment.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function Breadcrumb() {
  const location = useLocation();
  const segments = location.pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  const crumbs = segments.map((segment, index) => {
    const path = "/" + segments.slice(0, index + 1).join("/");
    let label = PATH_LABELS[path];

    if (!label) {
      if (segment === "edit") {
        label = "Edit";
      } else if (segment === "learn") {
        label = "Course Player";
      } else if (segments[index - 1] === "courses" && segment !== "create") {
        label = "Course Details";
      } else {
        label = formatSegment(segment);
      }
    }

    return { path, label, isLast: index === segments.length - 1 };
  });

  return (
    <nav aria-label="Breadcrumb" className="mb-5 flex items-center text-sm text-slate-500">
      <Link to="/" className="flex items-center hover:text-slate-700">
        <Home size={14} />
      </Link>
      {crumbs.map((crumb) => (
        <span key={crumb.path} className="flex items-center">
          <ChevronRight size={14} className="mx-1.5 text-slate-300" />
          {crumb.isLast ? (
            <span className="font-medium text-slate-900">{crumb.label}</span>
          ) : (
            <Link to={crumb.path} className="hover:text-slate-700">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}