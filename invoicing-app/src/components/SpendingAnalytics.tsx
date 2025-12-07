'use client';

import React, { useMemo } from 'react';
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory } from '@/types';
import { formatCurrency } from '@/lib/storage';

interface SpendingAnalyticsProps {
  expenses: Expense[];
  type: 'company' | 'personal';
}

export default function SpendingAnalytics({ expenses, type }: SpendingAnalyticsProps) {
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => exp.type === type);
  }, [expenses, type]);

  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};

    filteredExpenses.forEach(exp => {
      const category = exp.category;
      totals[category] = (totals[category] || 0) + exp.amount;
    });

    // Sort by amount descending
    return Object.entries(totals)
      .sort(([, a], [, b]) => b - a)
      .map(([category, amount]) => ({
        category: category as ExpenseCategory,
        amount,
        label: EXPENSE_CATEGORIES[category as ExpenseCategory]?.label || category,
      }));
  }, [filteredExpenses]);

  const totalSpending = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [filteredExpenses]);

  const monthlyTrend = useMemo(() => {
    const months: Record<string, number> = {};

    filteredExpenses.forEach(exp => {
      const date = new Date(exp.date);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months[monthKey] = (months[monthKey] || 0) + exp.amount;
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6) // Last 6 months
      .map(([month, amount]) => ({
        month,
        label: new Date(month + '-01').toLocaleDateString('en-SG', { month: 'short', year: '2-digit' }),
        amount,
      }));
  }, [filteredExpenses]);

  const isCompany = type === 'company';
  const accentColor = isCompany ? 'blue' : 'purple';

  // Get max for scaling bars
  const maxCategoryAmount = Math.max(...categoryTotals.map(c => c.amount), 1);
  const maxMonthAmount = Math.max(...monthlyTrend.map(m => m.amount), 1);

  if (filteredExpenses.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
        <p className="text-4xl mb-4">📊</p>
        <p>No {isCompany ? 'company' : 'personal'} expenses to analyze</p>
        <p className="text-sm mt-2">Add some expenses to see spending insights</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Card */}
      <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${
        isCompany ? 'border-blue-500' : 'border-purple-500'
      }`}>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          Total {isCompany ? 'Company' : 'Personal'} Spending
        </h3>
        <p className={`text-4xl font-bold ${isCompany ? 'text-blue-600' : 'text-purple-600'}`}>
          {formatCurrency(totalSpending)}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Across {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Spending by Category */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">Spending by Category</h3>

        <div className="space-y-4">
          {categoryTotals.map(({ category, amount, label }) => {
            const percentage = totalSpending > 0 ? (amount / totalSpending) * 100 : 0;
            const barWidth = (amount / maxCategoryAmount) * 100;

            return (
              <div key={category}>
                <div className="flex justify-between items-center mb-1">
                  <span className="text-sm font-medium text-slate-700">{label}</span>
                  <span className="text-sm text-slate-500">
                    {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <div
                    className={`h-3 rounded-full transition-all ${
                      isCompany ? 'bg-blue-500' : 'bg-purple-500'
                    }`}
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Monthly Trend */}
      {monthlyTrend.length > 1 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-slate-700 mb-4">Monthly Trend</h3>

          <div className="flex items-end gap-2 h-40">
            {monthlyTrend.map(({ month, label, amount }) => {
              const barHeight = (amount / maxMonthAmount) * 100;

              return (
                <div key={month} className="flex-1 flex flex-col items-center">
                  <div className="text-xs text-slate-500 mb-1">
                    {formatCurrency(amount)}
                  </div>
                  <div className="w-full bg-slate-100 rounded-t flex-1 flex items-end">
                    <div
                      className={`w-full rounded-t transition-all ${
                        isCompany ? 'bg-blue-500' : 'bg-purple-500'
                      }`}
                      style={{ height: `${barHeight}%`, minHeight: '4px' }}
                    />
                  </div>
                  <div className="text-xs text-slate-600 mt-2 font-medium">
                    {label}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Top Expenses */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-4">Top 5 Expenses</h3>

        <div className="divide-y">
          {filteredExpenses
            .sort((a, b) => b.amount - a.amount)
            .slice(0, 5)
            .map((expense) => (
              <div key={expense.id} className="py-3 flex justify-between items-center">
                <div>
                  <p className="font-medium text-slate-800">{expense.description}</p>
                  <p className="text-sm text-slate-500">
                    {EXPENSE_CATEGORIES[expense.category]?.label || expense.category}
                    {expense.vendor && ` • ${expense.vendor}`}
                  </p>
                </div>
                <span className={`font-bold ${isCompany ? 'text-blue-600' : 'text-purple-600'}`}>
                  {formatCurrency(expense.amount)}
                </span>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
