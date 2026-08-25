export function formatTime24WithPeriod(value?: string | null) {
  if (!value) return "Sin hora";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Sin hora";

  const numericHours = date.getHours();
  const hours = String(numericHours).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const period = numericHours >= 12 ? "PM" : "AM";

  return `${hours}:${minutes} ${period}`;
}

export function formatDateOnly(
  value?: string | null,
  options: Intl.DateTimeFormatOptions = {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  },
) {
  if (!value) return "Sin fecha";
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!match) return "Sin fecha";

  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])));
  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return date.toLocaleDateString("es-CL", { ...options, timeZone: "UTC" });
}
