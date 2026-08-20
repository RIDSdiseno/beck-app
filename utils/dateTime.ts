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
