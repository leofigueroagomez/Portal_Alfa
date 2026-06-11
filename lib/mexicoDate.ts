export const MEXICO_TIME_ZONE = "America/Mexico_City";

type DateTimeParts = {
  year: string;
  month: string;
  day: string;
  hour: string;
  minute: string;
  second: string;
};

function getMexicoDateTimeParts(date = new Date()): DateTimeParts {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEXICO_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
    hourCycle: "h23",
  });
  const parts = formatter.formatToParts(date);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value || "00";

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: value("hour"),
    minute: value("minute"),
    second: value("second"),
  };
}

export function getMexicoDate(date = new Date()) {
  const parts = getMexicoDateTimeParts(date);

  return `${parts.year}-${parts.month}-${parts.day}`;
}

export function getMexicoFacturamaDateTime(date = new Date()) {
  const parts = getMexicoDateTimeParts(date);

  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}`;
}

export function getMexicoDateAtNoon(dateValue: string) {
  return `${dateValue}T12:00:00`;
}

export function normalizeMexicoDateInput(value: string | null | undefined) {
  if (!value) return getMexicoDate();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  return getMexicoDate(new Date(value));
}

export function addMonthsToMexicoDate(value: string, months: number) {
  if (!value) return "";
  const date = new Date(`${value}T12:00:00`);
  date.setMonth(date.getMonth() + Number(months || 0));

  return getMexicoDate(date);
}

export function getMexicoCurrentMonthRange(now = new Date()) {
  const [yearValue, monthValue] = getMexicoDate(now).split("-");
  const year = Number(yearValue);
  const month = Number(monthValue);
  const nextMonth = month === 12 ? 1 : month + 1;
  const nextYear = month === 12 ? year + 1 : year;

  return {
    start: `${yearValue}-${monthValue}-01`,
    end: `${String(nextYear).padStart(4, "0")}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}
