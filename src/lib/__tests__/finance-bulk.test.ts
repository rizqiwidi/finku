import assert from 'node:assert/strict';
import test from 'node:test';
import {
  FinanceBulkValidationError,
  normalizeBulkAllocationSavePayload,
  normalizeBulkImportTransactions,
  normalizeCategoryKey,
} from '../finance-bulk';

test('normalizeCategoryKey folds whitespace and casing', () => {
  assert.equal(
    normalizeCategoryKey('expense', '  Makan   Siang '),
    'expense:makan siang'
  );
});

test('normalizeBulkImportTransactions normalizes a valid batch row', () => {
  const [transaction] = normalizeBulkImportTransactions([
    {
      amount: 25000,
      category: '  Makanan  ',
      date: '2026-03-01',
      description: 'Makan siang',
      notes: 'kantin',
      type: 'expense',
    },
  ]);

  assert.equal(transaction.amount, 25000);
  assert.equal(transaction.category, 'Makanan');
  assert.equal(transaction.description, 'Makan siang');
  assert.equal(transaction.notes, 'kantin');
  assert.equal(transaction.date.toISOString(), '2026-03-01T12:00:00.000Z');
});

test('normalizeBulkImportTransactions rejects dangerous formula text', () => {
  assert.throws(
    () =>
      normalizeBulkImportTransactions([
        {
          amount: 25000,
          category: 'Makanan',
          date: '2026-03-01',
          description: '=SUM(A1:A2)',
          type: 'expense',
        },
      ]),
    (error: unknown) =>
      error instanceof FinanceBulkValidationError &&
      error.message.includes('awalan formula')
  );
});

test('normalizeBulkAllocationSavePayload derives budget amounts from monthly income', () => {
  const payload = normalizeBulkAllocationSavePayload({
    allocations: [
      { categoryId: 'cat-expense', allocationPercentage: 12.5 },
      { categoryId: 'cat-savings', allocationPercentage: 7.5 },
    ],
    month: 3,
    monthlyIncome: 10_000_000,
    year: 2026,
  });

  assert.equal(payload.month, 3);
  assert.equal(payload.year, 2026);
  assert.equal(payload.monthlyIncome, 10_000_000);
  assert.deepEqual(payload.allocations, [
    {
      amount: 1_250_000,
      allocationPercentage: 12.5,
      categoryId: 'cat-expense',
    },
    {
      amount: 750_000,
      allocationPercentage: 7.5,
      categoryId: 'cat-savings',
    },
  ]);
});

test('normalizeBulkAllocationSavePayload rejects totals above 100 percent', () => {
  assert.throws(
    () =>
      normalizeBulkAllocationSavePayload({
        allocations: [
          { categoryId: 'cat-1', allocationPercentage: 60 },
          { categoryId: 'cat-2', allocationPercentage: 50 },
        ],
        month: 3,
        monthlyIncome: 10_000_000,
        year: 2026,
      }),
    (error: unknown) =>
      error instanceof FinanceBulkValidationError &&
      error.message.includes('tidak boleh melebihi 100%')
  );
});
