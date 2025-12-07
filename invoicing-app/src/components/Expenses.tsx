'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Expense, ExpenseCategory, EXPENSE_CATEGORIES } from '@/types';
import { formatCurrency, formatDate } from '@/lib/storage';
import { exportExpensesToCSV } from '@/lib/csv';

type ExpenseType = 'company' | 'personal';

export default function Expenses() {
  const searchParams = useSearchParams();
  const { data, addExpense, updateExpense, deleteExpense, isLoaded } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewType, setViewType] = useState<ExpenseType>('company');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [defaultType, setDefaultType] = useState<ExpenseType>('company');

  useEffect(() => {
    const typeParam = searchParams.get('type') as ExpenseType;
    if (typeParam === 'company' || typeParam === 'personal') {
      setViewType(typeParam);
      setDefaultType(typeParam);
    }
    if (searchParams.get('new') === 'true') {
      setShowForm(true);
    }
  }, [searchParams]);

  const filteredExpenses = useMemo(() => {
    return data.expenses.filter((exp) => {
      if (exp.type !== viewType) return false;

      if (filterMonth) {
        const expDate = new Date(exp.date);
        const [year, month] = filterMonth.split('-');
        if (expDate.getFullYear() !== parseInt(year) || expDate.getMonth() !== parseInt(month) - 1) {
          return false;
        }
      }

      return true;
    });
  }, [data.expenses, viewType, filterMonth]);

  const monthlyTotal = useMemo(() => {
    return filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  }, [filteredExpenses]);

  const handleSave = (expenseData: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingExpense) {
      updateExpense(editingExpense.id, expenseData);
    } else {
      addExpense(expenseData);
    }
    setShowForm(false);
    setEditingExpense(null);
  };

  const handleEdit = (expense: Expense) => {
    setEditingExpense(expense);
    setDefaultType(expense.type);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this expense?')) {
      deleteExpense(id);
    }
  };

  const handleAddNew = () => {
    setDefaultType(viewType);
    setShowForm(true);
  };

  if (!isLoaded) {
    return <div className="text-slate-500">Loading...</div>;
  }

  if (showForm) {
    return (
      <ExpenseForm
        expense={editingExpense}
        defaultType={defaultType}
        onSave={handleSave}
        onCancel={() => {
          setShowForm(false);
          setEditingExpense(null);
        }}
      />
    );
  }

  const isCompany = viewType === 'company';
  const accentColor = isCompany ? 'blue' : 'purple';

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Expenses</h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportExpensesToCSV(filteredExpenses)}
            className="px-4 py-2 text-slate-600 border rounded hover:bg-slate-50"
          >
            Export CSV
          </button>
          <button
            onClick={handleAddNew}
            className={`px-4 py-2 text-white rounded hover:opacity-90 ${
              isCompany ? 'bg-blue-600' : 'bg-purple-600'
            }`}
          >
            + Add {isCompany ? 'Company' : 'Personal'} Expense
          </button>
        </div>
      </div>

      {/* View Type Toggle */}
      <div className="flex bg-slate-200 rounded-lg p-1 w-fit">
        <button
          onClick={() => setViewType('company')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            viewType === 'company'
              ? 'bg-blue-600 text-white'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Company
        </button>
        <button
          onClick={() => setViewType('personal')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${
            viewType === 'personal'
              ? 'bg-purple-600 text-white'
              : 'text-slate-600 hover:text-slate-800'
          }`}
        >
          Personal
        </button>
      </div>

      {/* Month Filter */}
      <div className="flex flex-wrap gap-4 items-center">
        <input
          type="month"
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="px-3 py-1 border rounded text-sm"
        />

        {filterMonth && (
          <button
            onClick={() => setFilterMonth('')}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            Clear filter
          </button>
        )}
      </div>

      {/* Summary */}
      <div className={`bg-white rounded-lg shadow p-4 border-l-4 ${
        isCompany ? 'border-blue-500' : 'border-purple-500'
      }`}>
        <div className="flex justify-between items-center">
          <span className="text-slate-600">
            {filterMonth
              ? `${isCompany ? 'Company' : 'Personal'} expenses for ${new Date(filterMonth + '-01').toLocaleDateString('en-SG', { month: 'long', year: 'numeric' })}`
              : `Total ${isCompany ? 'Company' : 'Personal'} Expenses`}
          </span>
          <span className={`text-2xl font-bold ${isCompany ? 'text-blue-600' : 'text-purple-600'}`}>
            {formatCurrency(monthlyTotal)}
          </span>
        </div>
      </div>

      {/* Expense List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredExpenses.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>No {isCompany ? 'company' : 'personal'} expenses found</p>
            <button
              onClick={handleAddNew}
              className={`mt-4 hover:underline ${isCompany ? 'text-blue-600' : 'text-purple-600'}`}
            >
              Add your first {isCompany ? 'company' : 'personal'} expense
            </button>
          </div>
        ) : (
          <div className="divide-y">
            {filteredExpenses.map((expense) => (
              <div key={expense.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                <div className="flex items-center gap-3">
                  <span
                    className={`w-10 h-10 flex items-center justify-center rounded-full text-lg ${
                      isCompany ? 'bg-blue-100' : 'bg-purple-100'
                    }`}
                  >
                    {isCompany ? '🏢' : '👤'}
                  </span>
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-sm text-slate-500">
                      {EXPENSE_CATEGORIES[expense.category]?.label || expense.category}
                      {expense.vendor && ` • ${expense.vendor}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className={`font-medium ${isCompany ? 'text-blue-600' : 'text-purple-600'}`}>
                      -{formatCurrency(expense.amount)}
                    </p>
                    <p className="text-xs text-slate-400">{formatDate(expense.date)}</p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(expense)}
                      className="text-slate-400 hover:text-blue-600"
                      title="Edit"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => handleDelete(expense.id)}
                      className="text-slate-400 hover:text-red-600"
                      title="Delete"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Expense Form Component
interface ExpenseFormProps {
  expense: Expense | null;
  defaultType: ExpenseType;
  onSave: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

function ExpenseForm({ expense, defaultType, onSave, onCancel }: ExpenseFormProps) {
  const [formData, setFormData] = useState({
    date: expense?.date || new Date().toISOString().split('T')[0],
    type: expense?.type || defaultType,
    category: expense?.category || 'other' as ExpenseCategory,
    description: expense?.description || '',
    amount: expense?.amount || 0,
    gstAmount: expense?.gstAmount || 0,
    vendor: expense?.vendor || '',
    notes: expense?.notes || '',
    receiptId: expense?.receiptId || '',
  });

  const availableCategories = Object.entries(EXPENSE_CATEGORIES).filter(
    ([, config]) => config.type === 'both' || config.type === formData.type
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  const isCompany = formData.type === 'company';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">
          {expense ? 'Edit Expense' : `Add ${isCompany ? 'Company' : 'Personal'} Expense`}
        </h2>
        <button onClick={onCancel} className="text-slate-600 hover:text-slate-800">
          ✕ Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          {/* Type Toggle */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-2">Type</label>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'company', category: 'other' })}
                className={`flex-1 py-2 rounded ${
                  formData.type === 'company'
                    ? 'bg-blue-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Company
              </button>
              <button
                type="button"
                onClick={() => setFormData({ ...formData, type: 'personal', category: 'other' })}
                className={`flex-1 py-2 rounded ${
                  formData.type === 'personal'
                    ? 'bg-purple-600 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                Personal
              </button>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Date</label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Category</label>
            <select
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value as ExpenseCategory })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {availableCategories.map(([key, config]) => (
                <option key={key} value={key}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Description *</label>
            <input
              type="text"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="What was this expense for?"
              required
            />
          </div>

          {/* Amount */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Amount (SGD) *</label>
            <input
              type="number"
              value={formData.amount || ''}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="0"
              step="0.01"
              placeholder="0.00"
              required
            />
          </div>

          {/* Vendor */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Vendor / Merchant</label>
            <input
              type="text"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Store or company name"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Additional notes"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            className={`px-6 py-2 text-white rounded hover:opacity-90 ${
              isCompany ? 'bg-blue-600' : 'bg-purple-600'
            }`}
          >
            {expense ? 'Update Expense' : 'Add Expense'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2 border rounded hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}
