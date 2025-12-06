'use client';

import React, { useMemo } from 'react';
import { useApp } from '@/context/AppContext';
import { formatCurrency } from '@/lib/storage';
import Link from 'next/link';

export default function Dashboard() {
  const { data, isLoaded } = useApp();

  const stats = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filter for current month
    const currentMonthExpenses = data.expenses.filter((e) => {
      const date = new Date(e.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const companyExpenses = currentMonthExpenses
      .filter((e) => e.type === 'company')
      .reduce((sum, e) => sum + e.amount, 0);

    const personalExpenses = currentMonthExpenses
      .filter((e) => e.type === 'personal')
      .reduce((sum, e) => sum + e.amount, 0);

    // Invoice stats
    const totalInvoiced = data.invoices
      .filter((i) => i.status !== 'draft')
      .reduce((sum, i) => sum + i.total, 0);

    const unpaidInvoices = data.invoices.filter(
      (i) => i.status === 'sent' || i.status === 'overdue'
    );
    const unpaidTotal = unpaidInvoices.reduce((sum, i) => sum + i.total, 0);

    const paidThisMonth = data.invoices
      .filter((i) => {
        if (i.status !== 'paid') return false;
        const date = new Date(i.updatedAt);
        return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
      })
      .reduce((sum, i) => sum + i.total, 0);

    // YTD totals
    const ytdExpenses = data.expenses
      .filter((e) => new Date(e.date).getFullYear() === currentYear)
      .reduce((sum, e) => sum + e.amount, 0);

    const ytdIncome = data.invoices
      .filter((i) => i.status === 'paid' && new Date(i.updatedAt).getFullYear() === currentYear)
      .reduce((sum, i) => sum + i.total, 0);

    return {
      companyExpenses,
      personalExpenses,
      totalExpenses: companyExpenses + personalExpenses,
      totalInvoiced,
      unpaidTotal,
      unpaidCount: unpaidInvoices.length,
      paidThisMonth,
      ytdExpenses,
      ytdIncome,
      ytdProfit: ytdIncome - data.expenses
        .filter((e) => e.type === 'company' && new Date(e.date).getFullYear() === currentYear)
        .reduce((sum, e) => sum + e.amount, 0),
    };
  }, [data.expenses, data.invoices]);

  const recentInvoices = data.invoices.slice(0, 5);
  const recentExpenses = data.expenses.slice(0, 5);

  if (!isLoaded) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-slate-500">Loading...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Dashboard</h2>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-green-500">
          <p className="text-sm text-slate-500">Revenue (Paid)</p>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(stats.paidThisMonth)}
          </p>
          <p className="text-xs text-slate-400 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-yellow-500">
          <p className="text-sm text-slate-500">Unpaid Invoices</p>
          <p className="text-2xl font-bold text-yellow-600">
            {formatCurrency(stats.unpaidTotal)}
          </p>
          <p className="text-xs text-slate-400 mt-1">{stats.unpaidCount} invoice(s)</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-blue-500">
          <p className="text-sm text-slate-500">Company Expenses</p>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(stats.companyExpenses)}
          </p>
          <p className="text-xs text-slate-400 mt-1">This month</p>
        </div>

        <div className="bg-white rounded-lg shadow p-4 border-l-4 border-purple-500">
          <p className="text-sm text-slate-500">Personal Expenses</p>
          <p className="text-2xl font-bold text-purple-600">
            {formatCurrency(stats.personalExpenses)}
          </p>
          <p className="text-xs text-slate-400 mt-1">This month</p>
        </div>
      </div>

      {/* YTD Summary */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-slate-700 mb-3">Year to Date Summary</h3>
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-sm text-slate-500">Income</p>
            <p className="text-lg font-bold text-green-600">{formatCurrency(stats.ytdIncome)}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Company Expenses</p>
            <p className="text-lg font-bold text-red-600">{formatCurrency(
              data.expenses
                .filter((e) => e.type === 'company' && new Date(e.date).getFullYear() === new Date().getFullYear())
                .reduce((sum, e) => sum + e.amount, 0)
            )}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Net Profit</p>
            <p className={`text-lg font-bold ${stats.ytdProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(stats.ytdProfit)}
            </p>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Invoices */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">Recent Invoices</h3>
            <Link href="/invoices" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y">
            {recentInvoices.length === 0 ? (
              <p className="p-4 text-slate-500 text-sm">No invoices yet</p>
            ) : (
              recentInvoices.map((invoice) => (
                <div key={invoice.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{invoice.invoiceNumber}</p>
                    <p className="text-sm text-slate-500">{invoice.clientName}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{formatCurrency(invoice.total)}</p>
                    <span
                      className={`text-xs px-2 py-1 rounded ${
                        invoice.status === 'paid'
                          ? 'bg-green-100 text-green-700'
                          : invoice.status === 'overdue'
                          ? 'bg-red-100 text-red-700'
                          : invoice.status === 'sent'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      {invoice.status}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-4 border-b flex justify-between items-center">
            <h3 className="font-semibold text-slate-700">Recent Expenses</h3>
            <Link href="/expenses" className="text-sm text-blue-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y">
            {recentExpenses.length === 0 ? (
              <p className="p-4 text-slate-500 text-sm">No expenses yet</p>
            ) : (
              recentExpenses.map((expense) => (
                <div key={expense.id} className="p-4 flex justify-between items-center">
                  <div>
                    <p className="font-medium">{expense.description}</p>
                    <p className="text-sm text-slate-500">
                      {expense.type === 'company' ? '🏢' : '👤'} {expense.vendor || 'No vendor'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600">-{formatCurrency(expense.amount)}</p>
                    <p className="text-xs text-slate-400">{new Date(expense.date).toLocaleDateString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-slate-700 mb-3">Quick Actions</h3>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/invoices?new=true"
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            + New Invoice
          </Link>
          <Link
            href="/expenses?new=true"
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
          >
            + Add Expense
          </Link>
          <Link
            href="/receipts?new=true"
            className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition"
          >
            + Upload Receipt
          </Link>
        </div>
      </div>
    </div>
  );
}
