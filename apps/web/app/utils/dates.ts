/** Travel dates are civil dates, including API midnight-UTC serializations. */
function civilDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  )
    return null;
  return date;
}
const formats = {
  short: new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }),
  editorial: new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    day: "numeric",
    month: "long",
    year: "numeric",
  }),
  caption: new Intl.DateTimeFormat("fr-FR", {
    timeZone: "UTC",
    month: "short",
    year: "numeric",
  }),
};
export function formatDate(
  value: string | null | undefined,
  style: keyof typeof formats = "short",
): string {
  const date = civilDate(value);
  return date ? formats[style].format(date) : "";
}
export function formatTripPeriod(start: string, end?: string | null): string {
  const first = formatDate(start, "editorial");
  const last = formatDate(end, "editorial");
  return last ? first + " → " + last : first;
}
export function civilYear(value: string | null | undefined): number | null {
  return civilDate(value)?.getUTCFullYear() ?? null;
}
