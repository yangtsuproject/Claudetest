'use client';

import React, { useMemo, useState } from 'react';
import { Expense, EXPENSE_CATEGORIES, ExpenseCategory } from '@/types';
import { formatCurrency } from '@/lib/storage';

interface SpendingAnalyticsProps {
  expenses: Expense[];
  type: 'company' | 'personal';
}

// Color palette for pie chart
const CATEGORY_COLORS: Record<string, string> = {
  transport: '#3B82F6',      // blue
  meals: '#F59E0B',          // amber
  groceries: '#10B981',      // emerald
  utilities: '#6366F1',      // indigo
  entertainment: '#EC4899',  // pink
  healthcare: '#EF4444',     // red
  software: '#8B5CF6',       // violet
  office_supplies: '#14B8A6', // teal
  insurance: '#F97316',      // orange
  bank_fees: '#64748B',      // slate
  education: '#06B6D4',      // cyan
  clothing: '#D946EF',       // fuchsia
  household: '#84CC16',      // lime
  rent: '#0EA5E9',           // sky
  professional_services: '#A855F7', // purple
  marketing: '#22C55E',      // green
  other: '#94A3B8',          // gray
};

export default function SpendingAnalytics({ expenses, type }: SpendingAnalyticsProps) {
  const [selectedMonth, setSelectedMonth] = useState<string>('');

  // Get available months from expenses
  const availableMonths = useMemo(() => {
    const months = new Set<string>();
    expenses
      .filter(exp => exp.type === type)
      .forEach(exp => {
        const date = new Date(exp.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        months.add(monthKey);
      });
    return Array.from(months).sort().reverse();
  }, [expenses, type]);

  // Filter expenses by type and month
  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => {
      if (exp.type !== type) return false;

      if (selectedMonth) {
        const date = new Date(exp.date);
        const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
        if (monthKey !== selectedMonth) return false;
      }

      return true;
    });
  }, [expenses, type, selectedMonth]);

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
        color: CATEGORY_COLORS[category] || '#94A3B8',
      }));
  }, [filteredExpenses]);

  const totalSpending = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [filteredExpenses]);

  // Generate pie chart gradient
  const pieChartStyle = useMemo(() => {
    if (categoryTotals.length === 0 || totalSpending === 0) {
      return { background: '#e2e8f0' };
    }

    let currentAngle = 0;
    const gradientParts: string[] = [];

    categoryTotals.forEach(({ amount, color }) => {
      const percentage = (amount / totalSpending) * 100;
      const startAngle = currentAngle;
      const endAngle = currentAngle + (percentage * 3.6); // Convert to degrees

      gradientParts.push(`${color} ${startAngle}deg ${endAngle}deg`);
      currentAngle = endAngle;
    });

    return {
      background: `conic-gradient(${gradientParts.join(', ')})`,
    };
  }, [categoryTotals, totalSpending]);

  const isCompany = type === 'company';

  // Get month label
  const getMonthLabel = (monthKey: string) => {
    return new Date(monthKey + '-01').toLocaleDateString('en-SG', {
      month: 'long',
      year: 'numeric'
    });
  };

  if (filteredExpenses.length === 0 && !selectedMonth) {
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
      {/* Month Filter */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-wrap items-center gap-4">
          <label className="text-sm font-medium text-slate-600">Filter by Month:</label>
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">All Time</option>
            {availableMonths.map(month => (
              <option key={month} value={month}>
                {getMonthLabel(month)}
              </option>
            ))}
          </select>
          {selectedMonth && (
            <button
              onClick={() => setSelectedMonth('')}
              className="text-sm text-slate-500 hover:text-slate-700"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Summary Card */}
      <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${
        isCompany ? 'border-blue-500' : 'border-purple-500'
      }`}>
        <h3 className="text-lg font-semibold text-slate-700 mb-2">
          {selectedMonth
            ? `${isCompany ? 'Company' : 'Personal'} Spending - ${getMonthLabel(selectedMonth)}`
            : `Total ${isCompany ? 'Company' : 'Personal'} Spending`
          }
        </h3>
        <p className={`text-4xl font-bold ${isCompany ? 'text-blue-600' : 'text-purple-600'}`}>
          {formatCurrency(totalSpending)}
        </p>
        <p className="text-sm text-slate-500 mt-1">
          Across {filteredExpenses.length} expense{filteredExpenses.length !== 1 ? 's' : ''}
        </p>
      </div>

      {filteredExpenses.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
          <p className="text-4xl mb-4">📊</p>
          <p>No expenses for {getMonthLabel(selectedMonth)}</p>
        </div>
      ) : (
        <>
          {/* Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">
              Spending Breakdown {selectedMonth && `- ${getMonthLabel(selectedMonth)}`}
            </h3>

            <div className="flex flex-col md:flex-row items-center gap-8">
              {/* Pie Chart */}
              <div className="relative">
                <div
                  className="w-48 h-48 rounded-full shadow-lg"
                  style={pieChartStyle}
                />
                {/* Center hole for donut effect */}
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-24 h-24 bg-white rounded-full flex flex-col items-center justify-center shadow-inner">
                    <span className="text-xs text-slate-500">Total</span>
                    <span className={`text-sm font-bold ${isCompany ? 'text-blue-600' : 'text-purple-600'}`}>
                      {formatCurrency(totalSpending)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Legend */}
              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-2">
                {categoryTotals.map(({ category, amount, label, color }) => {
                  const percentage = totalSpending > 0 ? (amount / totalSpending) * 100 : 0;
                  return (
                    <div key={category} className="flex items-center gap-2 p-2 rounded hover:bg-slate-50">
                      <div
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700 truncate">{label}</p>
                        <p className="text-xs text-slate-500">
                          {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Category Breakdown (Bar Chart) */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">Category Details</h3>

            <div className="space-y-4">
              {categoryTotals.map(({ category, amount, label, color }) => {
                const percentage = totalSpending > 0 ? (amount / totalSpending) * 100 : 0;

                return (
                  <div key={category}>
                    <div className="flex justify-between items-center mb-1">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-sm"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm font-medium text-slate-700">{label}</span>
                      </div>
                      <span className="text-sm text-slate-500">
                        {formatCurrency(amount)} ({percentage.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 rounded-full h-3">
                      <div
                        className="h-3 rounded-full transition-all"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Top Expenses for the period */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold text-slate-700 mb-4">
              Top 5 Expenses {selectedMonth && `- ${getMonthLabel(selectedMonth)}`}
            </h3>

            <div className="divide-y">
              {filteredExpenses
                .sort((a, b) => b.amount - a.amount)
                .slice(0, 5)
                .map((expense) => (
                  <div key={expense.id} className="py-3 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-3 h-3 rounded-sm flex-shrink-0"
                        style={{ backgroundColor: CATEGORY_COLORS[expense.category] || '#94A3B8' }}
                      />
                      <div>
                        <p className="font-medium text-slate-800">{expense.description}</p>
                        <p className="text-sm text-slate-500">
                          {EXPENSE_CATEGORIES[expense.category]?.label || expense.category}
                          {expense.vendor && ` • ${expense.vendor}`}
                          <span className="text-slate-400"> • {new Date(expense.date).toLocaleDateString('en-SG', { day: 'numeric', month: 'short' })}</span>
                        </p>
                      </div>
                    </div>
                    <span className={`font-bold ${isCompany ? 'text-blue-600' : 'text-purple-600'}`}>
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
