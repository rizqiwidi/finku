import assert from 'node:assert/strict';
import test from 'node:test';
import {
  formatDateInputValue,
  parseDateInputValue,
  parseTransactionDateValue,
} from '../date-input.ts';

test('formatDateInputValue preserves exact YYYY-MM-DD strings', () => {
  assert.equal(formatDateInputValue('2026-03-01'), '2026-03-01');
});

test('parseDateInputValue normalizes date input to local midday', () => {
  const parsedDate = parseDateInputValue('2026-03-01');

  assert.equal(parsedDate.getFullYear(), 2026);
  assert.equal(parsedDate.getMonth(), 2);
  assert.equal(parsedDate.getDate(), 1);
  assert.equal(parsedDate.getHours(), 12);
});

test('parseTransactionDateValue accepts date-only strings safely', () => {
  const parsedDate = parseTransactionDateValue('2026-03-01');

  assert.ok(parsedDate instanceof Date);
  assert.equal(parsedDate?.getFullYear(), 2026);
  assert.equal(parsedDate?.getMonth(), 2);
  assert.equal(parsedDate?.getDate(), 1);
  assert.equal(parsedDate?.getHours(), 12);
});

test('parseTransactionDateValue rejects invalid dates', () => {
  assert.equal(parseTransactionDateValue('not-a-date'), null);
});
