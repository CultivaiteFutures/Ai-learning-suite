export function formatRelativeDate(dateStr) {
  if (!dateStr) return "Not started yet";

  const date = new Date(dateStr);
  const today = new Date();
  const diffMs = today.setHours(0, 0, 0, 0) - new Date(dateStr).setHours(0, 0, 0, 0);
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays > 1 && diffDays < 7) return `${diffDays} days ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}