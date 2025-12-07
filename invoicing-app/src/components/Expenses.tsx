'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Expense, ExpenseCategory, EXPENSE_CATEGORIES, Receipt, BankStatement, BankTransaction } from '@/types';
import { formatCurrency, formatDate, generateId } from '@/lib/storage';
import { exportExpensesToCSV, parseCSVBankStatement } from '@/lib/csv';
import { parsePDFFile, extractTransactionsFromText, ParsedTransaction, categorizeTransaction } from '@/lib/pdfParser';
import SpendingAnalytics from './SpendingAnalytics';

type ExpenseType = 'company' | 'personal';
type TabView = 'expenses' | 'receipts' | 'bank' | 'analytics';

export default function Expenses() {
  const searchParams = useSearchParams();
  const { data, addExpense, updateExpense, deleteExpense, addReceipt, deleteReceipt, addBankStatement, deleteBankStatement, isLoaded } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [viewType, setViewType] = useState<ExpenseType>('company');
  const [tabView, setTabView] = useState<TabView>('expenses');
  const [filterMonth, setFilterMonth] = useState<string>('');
  const [defaultType, setDefaultType] = useState<ExpenseType>('company');

  // Receipt states
  const [showReceiptUpload, setShowReceiptUpload] = useState(false);
  const [viewReceipt, setViewReceipt] = useState<Receipt | null>(null);

  // Bank states
  const [showBankUpload, setShowBankUpload] = useState(false);
  const [viewStatement, setViewStatement] = useState<BankStatement | null>(null);

  useEffect(() => {
    const typeParam = searchParams.get('type') as ExpenseType;
    if (typeParam === 'company' || typeParam === 'personal') {
      setViewType(typeParam);
      setDefaultType(typeParam);
    }
    if (searchParams.get('new') === 'true') {
      setShowForm(true);
    }
    const tab = searchParams.get('tab') as TabView;
    if (tab === 'receipts' || tab === 'bank' || tab === 'analytics') {
      setTabView(tab);
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

  const handleReceiptUpload = (receipt: Omit<Receipt, 'id'>) => {
    addReceipt(receipt);
    setShowReceiptUpload(false);
  };

  const handleDeleteReceipt = (id: string) => {
    if (confirm('Are you sure you want to delete this receipt?')) {
      deleteReceipt(id);
    }
  };

  const handleBankUpload = (statement: Omit<BankStatement, 'id'>) => {
    addBankStatement(statement);
    setShowBankUpload(false);
  };

  const handleDeleteStatement = (id: string) => {
    if (confirm('Are you sure you want to delete this bank statement?')) {
      deleteBankStatement(id);
    }
  };

  if (!isLoaded) {
    return <div className="text-slate-500">Loading...</div>;
  }

  // Show receipt view
  if (viewReceipt) {
    return (
      <ReceiptView
        receipt={viewReceipt}
        onClose={() => setViewReceipt(null)}
        onDelete={() => {
          handleDeleteReceipt(viewReceipt.id);
          setViewReceipt(null);
        }}
      />
    );
  }

  // Show bank statement view
  if (viewStatement) {
    return (
      <StatementView
        statement={viewStatement}
        onClose={() => setViewStatement(null)}
        onDelete={() => {
          handleDeleteStatement(viewStatement.id);
          setViewStatement(null);
        }}
      />
    );
  }

  // Show receipt upload form
  if (showReceiptUpload) {
    return (
      <ReceiptUpload
        onUpload={handleReceiptUpload}
        onCancel={() => setShowReceiptUpload(false)}
      />
    );
  }

  // Show bank upload form
  if (showBankUpload) {
    return (
      <BankUpload
        onUpload={handleBankUpload}
        onCancel={() => setShowBankUpload(false)}
      />
    );
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

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Expenses</h2>
      </div>

      {/* View Type Toggle (Company/Personal) */}
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

      {/* Tab Navigation */}
      <div className="flex border-b">
        <button
          onClick={() => setTabView('expenses')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tabView === 'expenses'
              ? `${isCompany ? 'border-blue-600 text-blue-600' : 'border-purple-600 text-purple-600'}`
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          💰 Expenses
        </button>
        <button
          onClick={() => setTabView('receipts')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tabView === 'receipts'
              ? `${isCompany ? 'border-blue-600 text-blue-600' : 'border-purple-600 text-purple-600'}`
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🧾 Receipts
        </button>
        <button
          onClick={() => setTabView('bank')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tabView === 'bank'
              ? `${isCompany ? 'border-blue-600 text-blue-600' : 'border-purple-600 text-purple-600'}`
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          🏦 Bank Statements
        </button>
        <button
          onClick={() => setTabView('analytics')}
          className={`px-4 py-2 text-sm font-medium border-b-2 transition ${
            tabView === 'analytics'
              ? `${isCompany ? 'border-blue-600 text-blue-600' : 'border-purple-600 text-purple-600'}`
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          📊 Analytics
        </button>
      </div>

      {/* Expenses Tab */}
      {tabView === 'expenses' && (
        <div className="space-y-4">
          {/* Actions */}
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
              + Add Expense
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
                  Add your first expense
                </button>
              </div>
            ) : (
              <div className="divide-y">
                {filteredExpenses.map((expense) => (
                  <div key={expense.id} className="p-4 flex justify-between items-center hover:bg-slate-50">
                    <div className="flex items-center gap-3">
                      <span className={`w-10 h-10 flex items-center justify-center rounded-full text-lg ${
                        isCompany ? 'bg-blue-100' : 'bg-purple-100'
                      }`}>
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
      )}

      {/* Receipts Tab */}
      {tabView === 'receipts' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowReceiptUpload(true)}
              className={`px-4 py-2 text-white rounded hover:opacity-90 ${
                isCompany ? 'bg-blue-600' : 'bg-purple-600'
              }`}
            >
              + Upload Receipt
            </button>
          </div>

          {data.receipts.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
              <p className="text-4xl mb-4">🧾</p>
              <p>No receipts uploaded yet</p>
              <button
                onClick={() => setShowReceiptUpload(true)}
                className={`mt-4 hover:underline ${isCompany ? 'text-blue-600' : 'text-purple-600'}`}
              >
                Upload your first receipt
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {data.receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  onClick={() => setViewReceipt(receipt)}
                  className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-lg transition group"
                >
                  <div className="aspect-square bg-slate-100 relative">
                    {receipt.fileType === 'pdf' ? (
                      <div className="w-full h-full flex items-center justify-center bg-red-50">
                        <span className="text-4xl">📄</span>
                      </div>
                    ) : (
                      <img
                        src={receipt.imageData}
                        alt={receipt.fileName}
                        className="w-full h-full object-cover"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition" />
                  </div>
                  <div className="p-2">
                    <p className="text-sm font-medium truncate">{receipt.fileName}</p>
                    <p className="text-xs text-slate-500">{formatDate(receipt.uploadDate)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Bank Statements Tab */}
      {tabView === 'bank' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <button
              onClick={() => setShowBankUpload(true)}
              className={`px-4 py-2 text-white rounded hover:opacity-90 ${
                isCompany ? 'bg-blue-600' : 'bg-purple-600'
              }`}
            >
              + Upload Statement
            </button>
          </div>

          {/* Summary */}
          {data.bankStatements.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-slate-500">Total Credits</p>
                <p className="text-2xl font-bold text-green-600">
                  {formatCurrency(
                    data.bankStatements
                      .flatMap((s) => s.transactions)
                      .filter((t) => t.type === 'credit')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </p>
              </div>
              <div className="bg-white rounded-lg shadow p-4">
                <p className="text-sm text-slate-500">Total Debits</p>
                <p className="text-2xl font-bold text-red-600">
                  {formatCurrency(
                    data.bankStatements
                      .flatMap((s) => s.transactions)
                      .filter((t) => t.type === 'debit')
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </p>
              </div>
            </div>
          )}

          {data.bankStatements.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
              <p className="text-4xl mb-4">🏦</p>
              <p>No bank statements uploaded yet</p>
              <p className="text-sm mt-2">Upload PDF or CSV files from your bank</p>
              <button
                onClick={() => setShowBankUpload(true)}
                className={`mt-4 hover:underline ${isCompany ? 'text-blue-600' : 'text-purple-600'}`}
              >
                Upload your first statement
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="divide-y">
                {data.bankStatements.map((statement) => {
                  const credits = statement.transactions
                    .filter((t) => t.type === 'credit')
                    .reduce((sum, t) => sum + t.amount, 0);
                  const debits = statement.transactions
                    .filter((t) => t.type === 'debit')
                    .reduce((sum, t) => sum + t.amount, 0);

                  return (
                    <div
                      key={statement.id}
                      onClick={() => setViewStatement(statement)}
                      className="p-4 flex justify-between items-center hover:bg-slate-50 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">
                          {statement.fileType === 'pdf' ? '📄' : '📊'}
                        </span>
                        <div>
                          <p className="font-medium">{statement.fileName}</p>
                          <p className="text-sm text-slate-500">
                            {statement.transactions.length > 0
                              ? `${statement.transactions.length} transactions`
                              : 'PDF attachment'} • {formatDate(statement.uploadDate)}
                          </p>
                        </div>
                      </div>
                      {statement.transactions.length > 0 && (
                        <div className="text-right">
                          <p className="text-sm text-green-600">+{formatCurrency(credits)}</p>
                          <p className="text-sm text-red-600">-{formatCurrency(debits)}</p>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Analytics Tab */}
      {tabView === 'analytics' && (
        <SpendingAnalytics expenses={data.expenses} type={viewType} />
      )}
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

// Receipt Upload Component
interface ReceiptUploadProps {
  onUpload: (receipt: Omit<Receipt, 'id'>) => void;
  onCancel: () => void;
}

function ReceiptUpload({ onUpload, onCancel }: ReceiptUploadProps) {
  const [imageData, setImageData] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<string>('image');
  const [notes, setNotes] = useState<string>('');
  const [useCamera, setUseCamera] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFileName(file.name);
      setFileType(file.type.includes('pdf') ? 'pdf' : 'image');
      const reader = new FileReader();
      reader.onload = (event) => {
        setImageData(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
      });
      setStream(mediaStream);
      setUseCamera(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      alert('Could not access camera. Please upload a file instead.');
      console.error('Camera error:', error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setUseCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(video, 0, 0);
        const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
        setImageData(dataUrl);
        setFileName(`receipt-${new Date().toISOString().slice(0, 10)}.jpg`);
        setFileType('image');
        stopCamera();
      }
    }
  };

  const handleSubmit = () => {
    if (!imageData) return;

    onUpload({
      fileName,
      imageData,
      fileType,
      uploadDate: new Date().toISOString(),
      notes: notes || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Upload Receipt</h2>
        <button
          onClick={() => {
            stopCamera();
            onCancel();
          }}
          className="text-slate-600 hover:text-slate-800"
        >
          ✕ Close
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {!imageData && !useCamera && (
          <div className="flex flex-col gap-4">
            <button
              onClick={startCamera}
              className="flex items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition"
            >
              <span className="text-3xl">📷</span>
              <span className="text-slate-600">Take Photo</span>
            </button>

            <div className="text-center text-slate-400">or</div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition"
            >
              <span className="text-3xl">📁</span>
              <span className="text-slate-600">Upload File (Image or PDF)</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>
        )}

        {useCamera && !imageData && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full"
              />
            </div>
            <div className="flex gap-4 justify-center">
              <button
                onClick={capturePhoto}
                className="px-6 py-3 bg-blue-600 text-white rounded-full hover:bg-blue-700"
              >
                📸 Capture
              </button>
              <button
                onClick={stopCamera}
                className="px-6 py-3 border rounded-full hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {imageData && (
          <div className="space-y-4">
            <div className="relative">
              {fileType === 'pdf' ? (
                <div className="w-full h-48 flex items-center justify-center bg-red-50 rounded-lg">
                  <div className="text-center">
                    <span className="text-5xl">📄</span>
                    <p className="mt-2 text-slate-600">{fileName}</p>
                  </div>
                </div>
              ) : (
                <img
                  src={imageData}
                  alt="Receipt preview"
                  className="w-full max-h-96 object-contain rounded-lg"
                />
              )}
              <button
                onClick={() => {
                  setImageData(null);
                  setFileName('');
                }}
                className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600"
              >
                ✕
              </button>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">File Name</label>
              <input
                type="text"
                value={fileName}
                onChange={(e) => setFileName(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Notes</label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={2}
                placeholder="Optional notes about this receipt"
              />
            </div>

            <div className="flex gap-4">
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Save Receipt
              </button>
              <button
                onClick={onCancel}
                className="px-6 py-2 border rounded hover:bg-slate-50"
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />
    </div>
  );
}

// Receipt View Component
interface ReceiptViewProps {
  receipt: Receipt;
  onClose: () => void;
  onDelete: () => void;
}

function ReceiptView({ receipt, onClose, onDelete }: ReceiptViewProps) {
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button onClick={onClose} className="text-slate-600 hover:text-slate-800">
          ← Back
        </button>
        <button
          onClick={onDelete}
          className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50"
        >
          🗑️ Delete
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        {receipt.fileType === 'pdf' ? (
          <div className="w-full h-96 flex items-center justify-center bg-red-50 rounded-lg">
            <div className="text-center">
              <span className="text-6xl">📄</span>
              <p className="mt-4 text-slate-600 font-medium">{receipt.fileName}</p>
              <a
                href={receipt.imageData}
                download={receipt.fileName}
                className="mt-4 inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Download PDF
              </a>
            </div>
          </div>
        ) : (
          <img
            src={receipt.imageData}
            alt={receipt.fileName}
            className="w-full max-h-[70vh] object-contain rounded-lg"
          />
        )}

        <div className="mt-4 space-y-2">
          <p className="font-medium">{receipt.fileName}</p>
          <p className="text-sm text-slate-500">Uploaded: {formatDate(receipt.uploadDate)}</p>
          {receipt.notes && (
            <p className="text-sm text-slate-600 mt-2">{receipt.notes}</p>
          )}
        </div>
      </div>
    </div>
  );
}

// Bank Upload Component
interface BankUploadProps {
  onUpload: (statement: Omit<BankStatement, 'id'>) => void;
  onCancel: () => void;
}

function BankUpload({ onUpload, onCancel }: BankUploadProps) {
  const { addExpense } = useApp();
  const [fileName, setFileName] = useState<string>('');
  const [fileType, setFileType] = useState<'csv' | 'pdf' | 'other'>('csv');
  const [fileData, setFileData] = useState<string>('');
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [parsedPdfTransactions, setParsedPdfTransactions] = useState<ParsedTransaction[]>([]);
  const [error, setError] = useState<string>('');
  const [isParsing, setIsParsing] = useState(false);
  const [expenseType, setExpenseType] = useState<'company' | 'personal'>('personal');
  const [selectedTransactions, setSelectedTransactions] = useState<Set<number>>(new Set());
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');
    setTransactions([]);
    setParsedPdfTransactions([]);
    setSelectedTransactions(new Set());

    const extension = file.name.split('.').pop()?.toLowerCase();

    if (extension === 'pdf') {
      setFileType('pdf');
      setIsParsing(true);

      try {
        // Store PDF as base64
        const reader = new FileReader();
        reader.onload = (event) => {
          setFileData(event.target?.result as string);
        };
        reader.readAsDataURL(file);

        // Parse PDF for transactions
        const pdfText = await parsePDFFile(file);
        const extracted = extractTransactionsFromText(pdfText);

        if (extracted.length > 0) {
          setParsedPdfTransactions(extracted);
          // Select all by default
          setSelectedTransactions(new Set(extracted.map((_, i) => i)));
        } else {
          setError('Could not extract transactions from PDF. The statement will be saved as attachment.');
        }
      } catch (err) {
        setError('Failed to parse PDF. The file will be saved as attachment.');
        console.error(err);
      } finally {
        setIsParsing(false);
      }
    } else if (extension === 'csv') {
      setFileType('csv');
      try {
        const content = await file.text();
        setFileData(content);
        const parsed = parseCSVBankStatement(content);

        if (parsed.length === 0) {
          setError('Could not parse transactions. CSV should have: Date, Description, Amount columns');
        } else {
          setTransactions(parsed);
        }
      } catch (err) {
        setError('Failed to read the CSV file.');
        console.error(err);
      }
    } else {
      setFileType('other');
      const reader = new FileReader();
      reader.onload = (event) => {
        setFileData(event.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const toggleTransaction = (index: number) => {
    const newSelected = new Set(selectedTransactions);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedTransactions(newSelected);
  };

  const selectAll = () => {
    setSelectedTransactions(new Set(parsedPdfTransactions.map((_, i) => i)));
  };

  const selectNone = () => {
    setSelectedTransactions(new Set());
  };

  const handleImportAsExpenses = () => {
    const selectedTxns = parsedPdfTransactions.filter((_, i) => selectedTransactions.has(i));

    selectedTxns.forEach((txn) => {
      if (txn.type === 'debit') { // Only import debits as expenses
        addExpense({
          date: txn.date,
          type: expenseType,
          category: txn.suggestedCategory,
          description: txn.description,
          amount: txn.amount,
          vendor: '',
          notes: `Imported from ${fileName}`,
        });
      }
    });

    // Also save the statement
    onUpload({
      fileName,
      fileType,
      fileData,
      uploadDate: new Date().toISOString(),
      transactions: transactions,
    });
  };

  const handleSubmit = () => {
    if (!fileName) return;

    onUpload({
      fileName,
      fileType,
      fileData: fileType !== 'csv' ? fileData : undefined,
      uploadDate: new Date().toISOString(),
      transactions,
    });
  };

  const debitCount = parsedPdfTransactions.filter((t, i) => selectedTransactions.has(i) && t.type === 'debit').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Upload Bank Statement</h2>
        <button onClick={onCancel} className="text-slate-600 hover:text-slate-800">
          ✕ Close
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {!fileName && (
          <>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-blue-800 mb-2">Supported Formats:</p>
              <ul className="text-blue-700 space-y-1">
                <li>• <strong>PDF</strong> - Bank statements (auto-extract & import transactions)</li>
                <li>• <strong>CSV</strong> - Transaction data (auto-parsed)</li>
              </ul>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-slate-300 rounded-lg hover:border-blue-400 hover:bg-blue-50 transition"
            >
              <span className="text-3xl">📄</span>
              <span className="text-slate-600">Select File (PDF, CSV)</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.csv"
              onChange={handleFileSelect}
              className="hidden"
            />
          </>
        )}

        {isParsing && (
          <div className="text-center py-8">
            <div className="animate-spin w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full mx-auto mb-4"></div>
            <p className="text-slate-600">Parsing PDF for transactions...</p>
          </div>
        )}

        {fileName && !isParsing && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-3">
                <span className="text-3xl">
                  {fileType === 'pdf' ? '📄' : fileType === 'csv' ? '📊' : '📁'}
                </span>
                <div>
                  <p className="font-medium">{fileName}</p>
                  <p className="text-sm text-slate-500">
                    {parsedPdfTransactions.length > 0
                      ? `${parsedPdfTransactions.length} transactions extracted`
                      : fileType === 'csv' && transactions.length > 0
                      ? `${transactions.length} transactions found`
                      : 'File attachment'}
                  </p>
                </div>
              </div>
              <button
                onClick={() => {
                  setFileName('');
                  setFileData('');
                  setTransactions([]);
                  setParsedPdfTransactions([]);
                  setError('');
                }}
                className="text-red-600 hover:underline text-sm"
              >
                Remove
              </button>
            </div>

            {error && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-700">
                {error}
              </div>
            )}

            {/* PDF Transaction Import */}
            {parsedPdfTransactions.length > 0 && (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="font-medium text-green-800 mb-2">
                    Import Transactions as Expenses
                  </p>
                  <p className="text-sm text-green-700 mb-3">
                    Select transactions to import and categorize them automatically.
                  </p>

                  {/* Expense Type Selection */}
                  <div className="flex gap-2 mb-3">
                    <button
                      onClick={() => setExpenseType('company')}
                      className={`px-3 py-1 rounded text-sm ${
                        expenseType === 'company'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white border text-slate-600'
                      }`}
                    >
                      Company
                    </button>
                    <button
                      onClick={() => setExpenseType('personal')}
                      className={`px-3 py-1 rounded text-sm ${
                        expenseType === 'personal'
                          ? 'bg-purple-600 text-white'
                          : 'bg-white border text-slate-600'
                      }`}
                    >
                      Personal
                    </button>
                  </div>

                  <div className="flex gap-2 text-sm">
                    <button onClick={selectAll} className="text-blue-600 hover:underline">
                      Select All
                    </button>
                    <span className="text-slate-400">|</span>
                    <button onClick={selectNone} className="text-blue-600 hover:underline">
                      Select None
                    </button>
                    <span className="text-slate-400">|</span>
                    <span className="text-slate-600">
                      {selectedTransactions.size} selected ({debitCount} expenses)
                    </span>
                  </div>
                </div>

                <div className="max-h-64 overflow-auto border rounded-lg">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr>
                        <th className="w-8 p-2"></th>
                        <th className="text-left p-2">Date</th>
                        <th className="text-left p-2">Description</th>
                        <th className="text-left p-2">Category</th>
                        <th className="text-right p-2">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {parsedPdfTransactions.map((t, i) => (
                        <tr
                          key={i}
                          className={`cursor-pointer ${selectedTransactions.has(i) ? 'bg-blue-50' : 'hover:bg-slate-50'}`}
                          onClick={() => toggleTransaction(i)}
                        >
                          <td className="p-2 text-center">
                            <input
                              type="checkbox"
                              checked={selectedTransactions.has(i)}
                              onChange={() => toggleTransaction(i)}
                              className="rounded"
                            />
                          </td>
                          <td className="p-2">{formatDate(t.date)}</td>
                          <td className="p-2 truncate max-w-xs">{t.description}</td>
                          <td className="p-2 text-xs">
                            <span className="px-2 py-1 bg-slate-100 rounded">
                              {EXPENSE_CATEGORIES[t.suggestedCategory]?.label || t.suggestedCategory}
                            </span>
                          </td>
                          <td className={`p-2 text-right ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                            {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex gap-4">
                  <button
                    onClick={handleImportAsExpenses}
                    disabled={debitCount === 0}
                    className={`px-6 py-2 text-white rounded hover:opacity-90 ${
                      expenseType === 'company' ? 'bg-blue-600' : 'bg-purple-600'
                    } ${debitCount === 0 ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    Import {debitCount} Expense{debitCount !== 1 ? 's' : ''}
                  </button>
                  <button
                    onClick={handleSubmit}
                    className="px-6 py-2 border rounded hover:bg-slate-50"
                  >
                    Save Without Import
                  </button>
                </div>
              </div>
            )}

            {/* CSV Transaction Preview */}
            {transactions.length > 0 && (
              <div className="max-h-64 overflow-auto border rounded-lg">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 sticky top-0">
                    <tr>
                      <th className="text-left p-2">Date</th>
                      <th className="text-left p-2">Description</th>
                      <th className="text-right p-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {transactions.slice(0, 10).map((t, i) => (
                      <tr key={i}>
                        <td className="p-2">{formatDate(t.date)}</td>
                        <td className="p-2 truncate max-w-xs">{t.description}</td>
                        <td className={`p-2 text-right ${t.type === 'credit' ? 'text-green-600' : 'text-red-600'}`}>
                          {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {transactions.length > 10 && (
                  <p className="p-2 text-center text-slate-500 text-sm bg-slate-50">
                    ... and {transactions.length - 10} more transactions
                  </p>
                )}
              </div>
            )}

            {/* Submit button for CSV/other files */}
            {parsedPdfTransactions.length === 0 && (
              <div className="flex gap-4">
                <button
                  onClick={handleSubmit}
                  className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  {fileType === 'csv' && transactions.length > 0 ? 'Import Statement' : 'Save Attachment'}
                </button>
                <button
                  onClick={onCancel}
                  className="px-6 py-2 border rounded hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Statement View Component
interface StatementViewProps {
  statement: BankStatement;
  onClose: () => void;
  onDelete: () => void;
}

function StatementView({ statement, onClose, onDelete }: StatementViewProps) {
  const credits = statement.transactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const debits = statement.transactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <button onClick={onClose} className="text-slate-600 hover:text-slate-800">
          ← Back
        </button>
        <button
          onClick={onDelete}
          className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50"
        >
          🗑️ Delete
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-3xl">
            {statement.fileType === 'pdf' ? '📄' : '📊'}
          </span>
          <div>
            <h3 className="font-semibold text-lg">{statement.fileName}</h3>
            <p className="text-sm text-slate-500">Uploaded {formatDate(statement.uploadDate)}</p>
          </div>
        </div>

        {statement.fileType === 'pdf' && statement.fileData && (
          <div className="mb-4">
            <a
              href={statement.fileData}
              download={statement.fileName}
              className="inline-block px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            >
              Download PDF
            </a>
          </div>
        )}

        {statement.transactions.length > 0 && (
          <>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <p className="text-sm text-slate-500">Transactions</p>
                <p className="text-xl font-bold">{statement.transactions.length}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Credits</p>
                <p className="text-xl font-bold text-green-600">{formatCurrency(credits)}</p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Total Debits</p>
                <p className="text-xl font-bold text-red-600">{formatCurrency(debits)}</p>
              </div>
            </div>

            <div className="overflow-x-auto border rounded-lg">
              <table className="w-full">
                <thead className="bg-slate-50 text-left">
                  <tr>
                    <th className="p-3 font-medium text-slate-600">Date</th>
                    <th className="p-3 font-medium text-slate-600">Description</th>
                    <th className="p-3 font-medium text-slate-600 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {statement.transactions.map((t) => (
                    <tr key={t.id} className="hover:bg-slate-50">
                      <td className="p-3 text-slate-600">{formatDate(t.date)}</td>
                      <td className="p-3">{t.description}</td>
                      <td className={`p-3 text-right font-medium ${
                        t.type === 'credit' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}

        {statement.transactions.length === 0 && (
          <p className="text-slate-500 text-center py-4">
            This is a file attachment with no parsed transactions.
          </p>
        )}
      </div>
    </div>
  );
}
