export function generateSchoolCode(schoolName) {
  const initials = (schoolName || "SCH")
    .split(" ")
    .filter(Boolean)
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 4);
  const suffix = Math.floor(100 + Math.random() * 900);
  return `${initials}${suffix}`;
}

export function generateTempPassword() {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let result = "";
  for (let i = 0; i < 8; i++) {
    result += chars[Math.floor(Math.random() * chars.length)];
  }
  return `${result}!`;
}

export function generateAdminEmail(schoolCode) {
  return `admin@${schoolCode.toLowerCase()}.edu`;
}