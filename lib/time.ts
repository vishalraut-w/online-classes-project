// Converts local HTML input (e.g., "2026-08-16T10:45") to clean ISO string for DB
export function inputToISO(localDateTimeString: string): string {
  if (!localDateTimeString) return new Date().toISOString();
  return new Date(localDateTimeString).toISOString();
}

// Converts DB ISO string back to local format for HTML <input type="datetime-local">
export function isoToInput(isoString: string): string {
  if (!isoString) return "";
  const d = new Date(isoString);
  const pad = (n: number) => (n < 10 ? "0" + n : n);
  
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

// Displays clean local time for students and admins (e.g. "10:45 AM, Aug 16, 2026")
export function formatDisplayTime(isoString: string): string {
  if (!isoString) return "";
  return new Date(isoString).toLocaleString([], {
    dateStyle: "medium",
    timeStyle: "short",
  });
}