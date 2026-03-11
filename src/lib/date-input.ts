const DATE_INPUT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

function padDatePart(value: number) {
  return String(value).padStart(2, '0');
}

function toDateInputValue(date: Date) {
  return `${date.getFullYear()}-${padDatePart(date.getMonth() + 1)}-${padDatePart(date.getDate())}`;
}

function toMiddayDate(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12, 0, 0, 0);
}

export function formatDateInputValue(value?: Date | string | null) {
  if (!value) {
    return toDateInputValue(new Date());
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return toDateInputValue(new Date());
    }

    const exactDateMatch = trimmed.match(DATE_INPUT_PATTERN);
    if (exactDateMatch) {
      return trimmed;
    }

    const parsedDate = new Date(trimmed);
    if (!Number.isNaN(parsedDate.getTime())) {
      return toDateInputValue(parsedDate);
    }

    return toDateInputValue(new Date());
  }

  if (Number.isNaN(value.getTime())) {
    return toDateInputValue(new Date());
  }

  return toDateInputValue(value);
}

export function parseDateInputValue(value: string) {
  const trimmed = value.trim();
  const exactDateMatch = trimmed.match(DATE_INPUT_PATTERN);

  if (exactDateMatch) {
    const [, year, month, day] = exactDateMatch;
    return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
  }

  const parsedDate = new Date(trimmed);
  if (!Number.isNaN(parsedDate.getTime())) {
    return toMiddayDate(parsedDate);
  }

  return toMiddayDate(new Date());
}

export function parseTransactionDateValue(value: unknown) {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : toMiddayDate(value);
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) {
      return null;
    }

    const exactDateMatch = trimmed.match(DATE_INPUT_PATTERN);
    if (exactDateMatch) {
      const [, year, month, day] = exactDateMatch;
      return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
    }

    const parsedDate = new Date(trimmed);
    return Number.isNaN(parsedDate.getTime()) ? null : toMiddayDate(parsedDate);
  }

  if (typeof value === 'number') {
    const parsedDate = new Date(value);
    return Number.isNaN(parsedDate.getTime()) ? null : toMiddayDate(parsedDate);
  }

  return null;
}
