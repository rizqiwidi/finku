import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatDateInputValue,
  getCurrentJakartaMonthYear,
  getJakartaMonthRange,
  parseDateInputValue,
  parseTransactionDateValue,
} from '../date-input';

test('formatDateInputValue preserves exact YYYY-MM-DD strings', () => {
  assert.equal(formatDateInputValue('2026-03-01'), '2026-03-01');
});

test('parseDateInputValue normalizes date input to stable Jakarta storage time', () => {
  const parsedDate = parseDateInputValue('2026-03-01');

  assert.equal(parsedDate.toISOString(), '2026-03-01T12:00:00.000Z');
});

test('parseTransactionDateValue accepts date-only strings safely', () => {
  const parsedDate = parseTransactionDateValue('2026-03-01');

  assert.ok(parsedDate instanceof Date);
  assert.equal(parsedDate?.toISOString(), '2026-03-01T12:00:00.000Z');
});

test('parseTransactionDateValue rejects invalid dates', () => {
  assert.equal(parseTransactionDateValue('not-a-date'), null);
});

test('getJakartaMonthRange returns UTC-safe bounds for a month', () => {
  const range = getJakartaMonthRange(2026, 3);

  assert.equal(range.start.toISOString(), '2026-03-01T00:00:00.000Z');
  assert.equal(range.end.toISOString(), '2026-03-31T23:59:59.999Z');
});

test('getCurrentJakartaMonthYear returns numeric values', () => {
  const current = getCurrentJakartaMonthYear();

  assert.equal(typeof current.month, 'number');
  assert.equal(typeof current.year, 'number');
  assert.ok(current.month >= 1 && current.month <= 12);
  assert.ok(current.year >= 2024);
});
