import assert from 'node:assert/strict';
import test from 'node:test';
import { calculateFinancialSummary } from '../finance-summary.ts';

test('calculateFinancialSummary uses the official balance formula', () => {
  const summary = calculateFinancialSummary([
    { type: 'income', amount: 10_000_000 },
    { type: 'expense', amount: 2_500_000 },
    { type: 'savings', amount: 1_500_000 },
  ]);

  assert.deepEqual(summary, {
    income: 10_000_000,
    expenses: 2_500_000,
    savings: 1_500_000,
    balance: 6_000_000,
    savingsRate: 15,
  });
});

test('calculateFinancialSummary handles empty transactions', () => {
  const summary = calculateFinancialSummary([]);

  assert.deepEqual(summary, {
    income: 0,
    expenses: 0,
    savings: 0,
    balance: 0,
    savingsRate: 0,
  });
});
