'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { useApp } from '@/context/AppContext';
import { Invoice, InvoiceItem } from '@/types';
import { formatCurrency, formatDate, generateId } from '@/lib/storage';
import { exportInvoicesToCSV } from '@/lib/csv';

export default function Invoices() {
  const searchParams = useSearchParams();
  const { data, addInvoice, updateInvoice, deleteInvoice, getNextInvoiceNumber, isLoaded } = useApp();
  const [showForm, setShowForm] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [viewInvoice, setViewInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (searchParams.get('new') === 'true') {
      setShowForm(true);
    }
  }, [searchParams]);

  const filteredInvoices = data.invoices.filter((inv) => {
    if (filterStatus === 'all') return true;
    return inv.status === filterStatus;
  });

  const handleSave = (invoiceData: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingInvoice) {
      updateInvoice(editingInvoice.id, invoiceData);
    } else {
      addInvoice(invoiceData);
    }
    setShowForm(false);
    setEditingInvoice(null);
  };

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setShowForm(true);
  };

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this invoice?')) {
      deleteInvoice(id);
    }
  };

  const handleMarkPaid = (invoice: Invoice) => {
    updateInvoice(invoice.id, { status: 'paid' });
  };

  if (!isLoaded) {
    return <div className="text-slate-500">Loading...</div>;
  }

  if (viewInvoice) {
    return (
      <InvoiceView
        invoice={viewInvoice}
        companyInfo={data.companyInfo}
        onClose={() => setViewInvoice(null)}
      />
    );
  }

  if (showForm) {
    return (
      <InvoiceForm
        invoice={editingInvoice}
        nextInvoiceNumber={getNextInvoiceNumber()}
        gstRate={data.settings.gstRate}
        onSave={handleSave}
        onCancel={() => {
          setShowForm(false);
          setEditingInvoice(null);
        }}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h2 className="text-2xl font-bold text-slate-800">Invoices</h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportInvoicesToCSV(data.invoices)}
            className="px-4 py-2 text-slate-600 border rounded hover:bg-slate-50"
          >
            Export CSV
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            + New Invoice
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {['all', 'draft', 'sent', 'paid', 'overdue'].map((status) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1 rounded-full text-sm whitespace-nowrap ${
              filterStatus === status
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Invoice List */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {filteredInvoices.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>No invoices found</p>
            <button
              onClick={() => setShowForm(true)}
              className="mt-4 text-blue-600 hover:underline"
            >
              Create your first invoice
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="p-4 font-medium text-slate-600">Invoice</th>
                  <th className="p-4 font-medium text-slate-600">Client</th>
                  <th className="p-4 font-medium text-slate-600">Date</th>
                  <th className="p-4 font-medium text-slate-600">Amount</th>
                  <th className="p-4 font-medium text-slate-600">Status</th>
                  <th className="p-4 font-medium text-slate-600">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {filteredInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50">
                    <td className="p-4">
                      <button
                        onClick={() => setViewInvoice(invoice)}
                        className="font-medium text-blue-600 hover:underline"
                      >
                        {invoice.invoiceNumber}
                      </button>
                    </td>
                    <td className="p-4">{invoice.clientName}</td>
                    <td className="p-4 text-slate-500">{formatDate(invoice.date)}</td>
                    <td className="p-4 font-medium">{formatCurrency(invoice.total)}</td>
                    <td className="p-4">
                      <span
                        className={`px-2 py-1 rounded text-xs ${
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
                    </td>
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setViewInvoice(invoice)}
                          className="text-slate-600 hover:text-blue-600"
                          title="View"
                        >
                          👁️
                        </button>
                        <button
                          onClick={() => handleEdit(invoice)}
                          className="text-slate-600 hover:text-blue-600"
                          title="Edit"
                        >
                          ✏️
                        </button>
                        {invoice.status !== 'paid' && (
                          <button
                            onClick={() => handleMarkPaid(invoice)}
                            className="text-slate-600 hover:text-green-600"
                            title="Mark as Paid"
                          >
                            ✅
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(invoice.id)}
                          className="text-slate-600 hover:text-red-600"
                          title="Delete"
                        >
                          🗑️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// Invoice Form Component
interface InvoiceFormProps {
  invoice: Invoice | null;
  nextInvoiceNumber: string;
  gstRate: number;
  onSave: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onCancel: () => void;
}

function InvoiceForm({ invoice, nextInvoiceNumber, gstRate, onSave, onCancel }: InvoiceFormProps) {
  const [formData, setFormData] = useState({
    invoiceNumber: invoice?.invoiceNumber || nextInvoiceNumber,
    date: invoice?.date || new Date().toISOString().split('T')[0],
    dueDate: invoice?.dueDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    clientName: invoice?.clientName || '',
    clientAddress: invoice?.clientAddress || '',
    clientEmail: invoice?.clientEmail || '',
    status: invoice?.status || 'draft' as const,
    notes: invoice?.notes || '',
  });

  const [items, setItems] = useState<InvoiceItem[]>(
    invoice?.items || [
      { id: generateId(), description: '', quantity: 1, unitPrice: 0, amount: 0 },
    ]
  );

  const addItem = () => {
    setItems([...items, { id: generateId(), description: '', quantity: 1, unitPrice: 0, amount: 0 }]);
  };

  const removeItem = (id: string) => {
    if (items.length > 1) {
      setItems(items.filter((item) => item.id !== id));
    }
  };

  const updateItem = (id: string, field: keyof InvoiceItem, value: string | number) => {
    setItems(
      items.map((item) => {
        if (item.id !== id) return item;

        const updated = { ...item, [field]: value };

        if (field === 'quantity' || field === 'unitPrice') {
          updated.amount = updated.quantity * updated.unitPrice;
        }

        return updated;
      })
    );
  };

  const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
  const gstAmount = subtotal * (gstRate / 100);
  const total = subtotal + gstAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    onSave({
      ...formData,
      items,
      subtotal,
      gstRate,
      gstAmount,
      total,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-slate-800">
          {invoice ? 'Edit Invoice' : 'New Invoice'}
        </h2>
        <button onClick={onCancel} className="text-slate-600 hover:text-slate-800">
          ✕ Close
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h3 className="font-semibold text-slate-700">Invoice Details</h3>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Invoice Number
              </label>
              <input
                type="text"
                value={formData.invoiceNumber}
                onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Invoice Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Status</label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value as Invoice['status'] })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="draft">Draft</option>
              <option value="sent">Sent</option>
              <option value="paid">Paid</option>
              <option value="overdue">Overdue</option>
            </select>
          </div>
        </div>

        {/* Client Info */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h3 className="font-semibold text-slate-700">Client Details</h3>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Client Name *</label>
            <input
              type="text"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Company name"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Client Address *</label>
            <textarea
              value={formData.clientAddress}
              onChange={(e) => setFormData({ ...formData, clientAddress: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              rows={2}
              placeholder="Full address"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Client Email</label>
            <input
              type="email"
              value={formData.clientEmail}
              onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="email@example.com"
            />
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-lg shadow p-4 space-y-4">
          <h3 className="font-semibold text-slate-700">Line Items</h3>

          <div className="space-y-4">
            {items.map((item, index) => (
              <div key={item.id} className="grid grid-cols-12 gap-2 items-end">
                <div className="col-span-12 sm:col-span-5">
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {index === 0 ? 'Description' : ''}
                  </label>
                  <input
                    type="text"
                    value={item.description}
                    onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Service description"
                    required
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {index === 0 ? 'Qty' : ''}
                  </label>
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="col-span-4 sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {index === 0 ? 'Unit Price' : ''}
                  </label>
                  <input
                    type="number"
                    value={item.unitPrice}
                    onChange={(e) => updateItem(item.id, 'unitPrice', parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <div className="col-span-3 sm:col-span-2">
                  <label className="block text-sm font-medium text-slate-600 mb-1">
                    {index === 0 ? 'Amount' : ''}
                  </label>
                  <div className="px-3 py-2 bg-slate-50 border rounded text-slate-700">
                    {formatCurrency(item.amount)}
                  </div>
                </div>
                <div className="col-span-1">
                  {items.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeItem(item.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={addItem}
            className="text-blue-600 hover:underline text-sm"
          >
            + Add Line Item
          </button>

          {/* Totals */}
          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between text-slate-600">
              <span>Subtotal</span>
              <span>{formatCurrency(subtotal)}</span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>GST ({gstRate}%)</span>
              <span>{formatCurrency(gstAmount)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(total)}</span>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow p-4">
          <label className="block text-sm font-medium text-slate-600 mb-1">Notes</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
            placeholder="Additional notes for the client"
          />
        </div>

        {/* Actions */}
        <div className="flex gap-4">
          <button
            type="submit"
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            {invoice ? 'Update Invoice' : 'Create Invoice'}
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

// Invoice View Component
interface InvoiceViewProps {
  invoice: Invoice;
  companyInfo: { name: string; uen: string; address: string; email: string; bankName?: string; bankAccountNumber?: string; bankAccountName?: string };
  onClose: () => void;
}

function InvoiceView({ invoice, companyInfo, onClose }: InvoiceViewProps) {
  const printInvoice = () => {
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center print:hidden">
        <button onClick={onClose} className="text-slate-600 hover:text-slate-800">
          ← Back to Invoices
        </button>
        <button
          onClick={printInvoice}
          className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          🖨️ Print / Save PDF
        </button>
      </div>

      {/* Printable Invoice */}
      <div className="bg-white rounded-lg shadow p-8 print:shadow-none print:p-0">
        {/* Header */}
        <div className="flex justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">{companyInfo.name}</h1>
            <p className="text-slate-600">UEN: {companyInfo.uen}</p>
            <p className="text-slate-600">{companyInfo.address}</p>
            {companyInfo.email && <p className="text-slate-600">{companyInfo.email}</p>}
          </div>
          <div className="text-right">
            <h2 className="text-3xl font-bold text-slate-400">INVOICE</h2>
            <p className="text-lg font-medium mt-2">{invoice.invoiceNumber}</p>
          </div>
        </div>

        {/* Dates and Client */}
        <div className="grid grid-cols-2 gap-8 mb-8">
          <div>
            <h3 className="font-semibold text-slate-600 mb-2">Bill To:</h3>
            <p className="font-medium">{invoice.clientName}</p>
            <p className="text-slate-600 whitespace-pre-line">{invoice.clientAddress}</p>
            {invoice.clientEmail && <p className="text-slate-600">{invoice.clientEmail}</p>}
          </div>
          <div className="text-right">
            <p><span className="text-slate-600">Invoice Date:</span> {formatDate(invoice.date)}</p>
            <p><span className="text-slate-600">Due Date:</span> {formatDate(invoice.dueDate)}</p>
            <p className="mt-2">
              <span
                className={`px-3 py-1 rounded text-sm ${
                  invoice.status === 'paid'
                    ? 'bg-green-100 text-green-700'
                    : invoice.status === 'overdue'
                    ? 'bg-red-100 text-red-700'
                    : invoice.status === 'sent'
                    ? 'bg-yellow-100 text-yellow-700'
                    : 'bg-slate-100 text-slate-700'
                }`}
              >
                {invoice.status.toUpperCase()}
              </span>
            </p>
          </div>
        </div>

        {/* Line Items */}
        <table className="w-full mb-8">
          <thead>
            <tr className="border-b-2 border-slate-200">
              <th className="text-left py-3 text-slate-600">Description</th>
              <th className="text-right py-3 text-slate-600">Qty</th>
              <th className="text-right py-3 text-slate-600">Unit Price</th>
              <th className="text-right py-3 text-slate-600">Amount</th>
            </tr>
          </thead>
          <tbody>
            {invoice.items.map((item) => (
              <tr key={item.id} className="border-b border-slate-100">
                <td className="py-3">{item.description}</td>
                <td className="text-right py-3">{item.quantity}</td>
                <td className="text-right py-3">{formatCurrency(item.unitPrice)}</td>
                <td className="text-right py-3">{formatCurrency(item.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* Totals */}
        <div className="flex justify-end">
          <div className="w-64">
            <div className="flex justify-between py-2">
              <span className="text-slate-600">Subtotal</span>
              <span>{formatCurrency(invoice.subtotal)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-slate-600">GST ({invoice.gstRate}%)</span>
              <span>{formatCurrency(invoice.gstAmount)}</span>
            </div>
            <div className="flex justify-between py-2 border-t-2 font-bold text-lg">
              <span>Total</span>
              <span>{formatCurrency(invoice.total)}</span>
            </div>
          </div>
        </div>

        {/* Payment Details */}
        {companyInfo.bankName && (
          <div className="mt-8 p-4 bg-slate-50 rounded">
            <h3 className="font-semibold text-slate-700 mb-2">Payment Details</h3>
            <p className="text-slate-600">Bank: {companyInfo.bankName}</p>
            <p className="text-slate-600">Account Name: {companyInfo.bankAccountName}</p>
            <p className="text-slate-600">Account Number: {companyInfo.bankAccountNumber}</p>
          </div>
        )}

        {/* Notes */}
        {invoice.notes && (
          <div className="mt-8">
            <h3 className="font-semibold text-slate-700 mb-2">Notes</h3>
            <p className="text-slate-600 whitespace-pre-line">{invoice.notes}</p>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-8 border-t text-center text-slate-500 text-sm">
          <p>Thank you for your business!</p>
        </div>
      </div>
    </div>
  );
}
