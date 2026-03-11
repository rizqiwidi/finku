const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
const JAKARTA_TIME_ZONE = 'Asia/Jakarta';
const JAKARTA_STORAGE_HOUR = 12;

const JAKARTA_DATE_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: JAKARTA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

const JAKARTA_DATE_TIME_FORMATTER = new Intl.DateTimeFormat('en-CA', {
  timeZone: JAKARTA_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hourCycle: 'h23',
});

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function extractDateParts(
  formatter: Intl.DateTimeFormat,
  date: Date
) {
  const parts = formatter.formatToParts(date);

  return {
    year: Number(parts.find((part) => part.type === 'year')?.value ?? '0'),
    month: Number(parts.find((part) => part.type === 'month')?.value ?? '0'),
    day: Number(parts.find((part) => part.type === 'day')?.value ?? '0'),
    hour: Number(parts.find((part) => part.type === 'hour')?.value ?? '0'),
    minute: Number(parts.find((part) => part.type === 'minute')?.value ?? '0'),
    second: Number(parts.find((part) => part.type === 'second')?.value ?? '0'),
  };
}

function toDateInputValue(parts: { year: number; month: number; day: number }) {
  return `${parts.year}-${padDatePart(parts.month)}-${padDatePart(parts.day)}`;
}

function toStoredDate(year: number, month: number, day: number, hour = JAKARTA_STORAGE_HOUR) {
  return new Date(Date.UTC(year, month - 1, day, hour, 0, 0, 0));
}

function getJakartaDatePartsInternal(date: Date) {
  return extractDateParts(JAKARTA_DATE_FORMATTER, date);
}

export function getJakartaDateParts(date: Date) {
  const { year, month, day } = getJakartaDatePartsInternal(date);
  return { year, month, day };
}

export function getCurrentJakartaMonthYear() {
  const { year, month } = getJakartaDatePartsInternal(new Date());
  return { year, month };
}

export function getJakartaMonthRange(year: number, month: number) {
  return {
    start: new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0)),
    end: new Date(Date.UTC(year, month, 0, 23, 59, 59, 999)),
  };
}

export function getJakartaNowTimestamp() {
  const parts = extractDateParts(JAKARTA_DATE_TIME_FORMATTER, new Date());
  return new Date(
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second, 0)
  );
}

export function formatDateInputValue(value?: Date | string | null) {
  if (!value) {
    return toDateInputValue(getJakartaDatePartsInternal(new Date()));
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return toDateInputValue(getJakartaDatePartsInternal(new Date()));
    }

    const exactDateMatch = trimmed.match(DATE_INPUT_PATTERN);
    if (exactDateMatch) {
      return trimmed;
    }

    const parsedDate = new Date(trimmed);
    if (!Number.isNaN(parsedDate.getTime())) {
      return toDateInputValue(getJakartaDatePartsInternal(parsedDate));
    }

    return toDateInputValue(getJakartaDatePartsInternal(new Date()));
  }

  if (Number.isNaN(value.getTime())) {
    return toDateInputValue(getJakartaDatePartsInternal(new Date()));
  }

  return toDateInputValue(getJakartaDatePartsInternal(value));
}

export function parseDateInputValue(value: string) {
  const trimmed = value.trim();
  const exactDateMatch = trimmed.match(DATE_INPUT_PATTERN);

  if (exactDateMatch) {
    const [, year, month, day] = exactDateMatch;
    return toStoredDate(Number(year), Number(month), Number(day));
  }

  const parsedDate = new Date(trimmed);
  if (!Number.isNaN(parsedDate.getTime())) {
    const parts = getJakartaDatePartsInternal(parsedDate);
    return toStoredDate(parts.year, parts.month, parts.day);
  }

  const today = getJakartaDatePartsInternal(new Date());
  return toStoredDate(today.year, today.month, today.day);
}

export function parseTransactionDateValue(value: unknown) {
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return null;
    }

    const parts = getJakartaDatePartsInternal(value);
    return toStoredDate(parts.year, parts.month, parts.day);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const exactDateMatch = trimmed.match(DATE_INPUT_PATTERN);
    if (exactDateMatch) {
      const [, year, month, day] = exactDateMatch;
      return toStoredDate(Number(year), Number(month), Number(day));
    }

    const parsedDate = new Date(trimmed);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    const parts = getJakartaDatePartsInternal(parsedDate);
    return toStoredDate(parts.year, parts.month, parts.day);
  }

  if (typeof value === 'number') {
    const parsedDate = new Date(value);
    if (Number.isNaN(parsedDate.getTime())) {
      return null;
    }

    const parts = getJakartaDatePartsInternal(parsedDate);
    return toStoredDate(parts.year, parts.month, parts.day);
  }

  return null;
}
