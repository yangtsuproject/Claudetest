'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { BankStatement, BankTransaction } from '@/types';
import { formatCurrency, formatDate } from '@/lib/storage';
import { parseCSVBankStatement, exportBankTransactionsToCSV } from '@/lib/csv';

export default function BankStatements() {
  const { data, addBankStatement, deleteBankStatement, isLoaded } = useApp();
  const [showUpload, setShowUpload] = useState(false);
  const [viewStatement, setViewStatement] = useState<BankStatement | null>(null);

  const handleUpload = (statement: Omit<BankStatement, 'id'>) => {
    addBankStatement(statement);
    setShowUpload(false);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this bank statement?')) {
      deleteBankStatement(id);
    }
  };

  if (!isLoaded) {
    return <div className="text-slate-500">Loading...</div>;
  }

  if (viewStatement) {
    return (
      <StatementView
        statement={viewStatement}
        onClose={() => setViewStatement(null)}
        onDelete={() => {
          handleDelete(viewStatement.id);
          setViewStatement(null);
        }}
      />
    );
  }

  if (showUpload) {
    return (
      <StatementUpload
        onUpload={handleUpload}
        onCancel={() => setShowUpload(false)}
      />
    );
  }

  // Calculate totals from all statements
  const allTransactions = data.bankStatements.flatMap((s) => s.transactions);
  const totalCredits = allTransactions
    .filter((t) => t.type === 'credit')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalDebits = allTransactions
    .filter((t) => t.type === 'debit')
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Bank Statements</h2>
        <button
          onClick={() => setShowUpload(true)}
          className="px-4 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
        >
          + Upload Statement
        </button>
      </div>

      {/* Summary */}
      {allTransactions.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-slate-500">Total Credits</p>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(totalCredits)}</p>
          </div>
          <div className="bg-white rounded-lg shadow p-4">
            <p className="text-sm text-slate-500">Total Debits</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(totalDebits)}</p>
          </div>
        </div>
      )}

      {/* Statement List */}
      {data.bankStatements.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center text-slate-500">
          <p className="text-4xl mb-4">🏦</p>
          <p>No bank statements uploaded yet</p>
          <p className="text-sm mt-2">Upload a CSV file from your bank</p>
          <button
            onClick={() => setShowUpload(true)}
            className="mt-4 text-teal-600 hover:underline"
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
                  <div>
                    <p className="font-medium">{statement.fileName}</p>
                    <p className="text-sm text-slate-500">
                      {statement.transactions.length} transactions • Uploaded {formatDate(statement.uploadDate)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-green-600">+{formatCurrency(credits)}</p>
                    <p className="text-sm text-red-600">-{formatCurrency(debits)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// Statement Upload Component
interface StatementUploadProps {
  onUpload: (statement: Omit<BankStatement, 'id'>) => void;
  onCancel: () => void;
}

function StatementUpload({ onUpload, onCancel }: StatementUploadProps) {
  const [fileName, setFileName] = useState<string>('');
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [error, setError] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setError('');

    try {
      const content = await file.text();
      const parsed = parseCSVBankStatement(content);

      if (parsed.length === 0) {
        setError('Could not parse any transactions from this file. Please ensure it has columns: Date, Description, Amount');
        return;
      }

      setTransactions(parsed);
    } catch (err) {
      setError('Failed to read the file. Please upload a valid CSV file.');
      console.error(err);
    }
  };

  const handleSubmit = () => {
    if (transactions.length === 0) return;

    onUpload({
      fileName,
      uploadDate: new Date().toISOString(),
      transactions,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">Upload Bank Statement</h2>
        <button onClick={onCancel} className="text-slate-600 hover:text-slate-800">
          ✕ Close
        </button>
      </div>

      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        {/* Upload Area */}
        {transactions.length === 0 && (
          <>
            <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-sm">
              <p className="font-medium text-teal-800 mb-2">CSV Format Expected:</p>
              <p className="text-teal-700">Your CSV should have columns in this order:</p>
              <p className="text-teal-700 font-mono mt-1">Date, Description, Amount, Balance (optional)</p>
              <p className="text-teal-600 mt-2 text-xs">
                Common bank CSV exports should work. Negative amounts are treated as debits.
              </p>
            </div>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center justify-center gap-2 w-full py-8 border-2 border-dashed border-slate-300 rounded-lg hover:border-teal-400 hover:bg-teal-50 transition"
            >
              <span className="text-3xl">📄</span>
              <span className="text-slate-600">Select CSV File</span>
            </button>

            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="hidden"
            />

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
                {error}
              </div>
            )}
          </>
        )}

        {/* Preview */}
        {transactions.length > 0 && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">{fileName}</p>
                <p className="text-sm text-slate-500">{transactions.length} transactions found</p>
              </div>
              <button
                onClick={() => {
                  setTransactions([]);
                  setFileName('');
                }}
                className="text-red-600 hover:underline text-sm"
              >
                Remove
              </button>
            </div>

            {/* Transaction Preview Table */}
            <div className="max-h-64 overflow-auto border rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Date</th>
                    <th className="text-left p-2">Description</th>
                    <th className="text-right p-2">Amount</th>
                    <th className="text-center p-2">Type</th>
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
                      <td className="p-2 text-center">
                        <span className={`px-2 py-0.5 rounded text-xs ${
                          t.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                        }`}>
                          {t.type}
                        </span>
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

            <div className="flex gap-4">
              <button
                onClick={handleSubmit}
                className="px-6 py-2 bg-teal-600 text-white rounded hover:bg-teal-700"
              >
                Import Statement
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
          ← Back to Statements
        </button>
        <div className="flex gap-2">
          <button
            onClick={() => exportBankTransactionsToCSV(statement.transactions)}
            className="px-4 py-2 text-slate-600 border rounded hover:bg-slate-50"
          >
            Export CSV
          </button>
          <button
            onClick={onDelete}
            className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50"
          >
            🗑️ Delete
          </button>
        </div>
      </div>

      {/* Header */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-lg">{statement.fileName}</h3>
        <p className="text-sm text-slate-500">Uploaded {formatDate(statement.uploadDate)}</p>

        <div className="grid grid-cols-3 gap-4 mt-4">
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
      </div>

      {/* Transaction List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50 text-left">
              <tr>
                <th className="p-4 font-medium text-slate-600">Date</th>
                <th className="p-4 font-medium text-slate-600">Description</th>
                <th className="p-4 font-medium text-slate-600 text-right">Amount</th>
                <th className="p-4 font-medium text-slate-600 text-center">Type</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {statement.transactions.map((t) => (
                <tr key={t.id} className="hover:bg-slate-50">
                  <td className="p-4 text-slate-600">{formatDate(t.date)}</td>
                  <td className="p-4">{t.description}</td>
                  <td className={`p-4 text-right font-medium ${
                    t.type === 'credit' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {t.type === 'credit' ? '+' : '-'}{formatCurrency(t.amount)}
                  </td>
                  <td className="p-4 text-center">
                    <span className={`px-2 py-1 rounded text-xs ${
                      t.type === 'credit' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                    }`}>
                      {t.type}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
