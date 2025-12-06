'use client';

import React, { useState, useRef } from 'react';
import { useApp } from '@/context/AppContext';
import { importDataFromJSON } from '@/lib/storage';

export default function Settings() {
  const { data, updateCompanyInfo, updateSettings, exportData, importData, clearAllData, isLoaded } = useApp();
  const [showImportConfirm, setShowImportConfirm] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [importMessage, setImportMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const importedData = await importDataFromJSON(file);
      setShowImportConfirm(true);

      // Store for confirmation
      (window as unknown as { pendingImportData: typeof importedData }).pendingImportData = importedData;
    } catch (error) {
      setImportMessage({ type: 'error', text: 'Failed to read the backup file. Please ensure it\'s a valid JSON file.' });
    }
  };

  const confirmImport = () => {
    const pendingData = (window as unknown as { pendingImportData: typeof data }).pendingImportData;
    if (pendingData) {
      importData(pendingData);
      setImportMessage({ type: 'success', text: 'Data imported successfully!' });
      setShowImportConfirm(false);
      delete (window as unknown as { pendingImportData?: typeof data }).pendingImportData;
    }
  };

  const handleClearAll = () => {
    clearAllData();
    setShowClearConfirm(false);
  };

  if (!isLoaded) {
    return <div className="text-slate-500">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-slate-800">Settings</h2>

      {/* Company Information */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <h3 className="font-semibold text-slate-700 border-b pb-2">Company Information</h3>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Company Name</label>
          <input
            type="text"
            value={data.companyInfo.name}
            onChange={(e) => updateCompanyInfo({ name: e.target.value })}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">UEN (Unique Entity Number)</label>
          <input
            type="text"
            value={data.companyInfo.uen}
            onChange={(e) => updateCompanyInfo({ uen: e.target.value })}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Address</label>
          <textarea
            value={data.companyInfo.address}
            onChange={(e) => updateCompanyInfo({ address: e.target.value })}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={2}
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Email</label>
          <input
            type="email"
            value={data.companyInfo.email}
            onChange={(e) => updateCompanyInfo({ email: e.target.value })}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Phone (Optional)</label>
          <input
            type="tel"
            value={data.companyInfo.phone || ''}
            onChange={(e) => updateCompanyInfo({ phone: e.target.value })}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      {/* Bank Details (for invoices) */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <h3 className="font-semibold text-slate-700 border-b pb-2">Bank Details (shown on invoices)</h3>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Bank Name</label>
          <input
            type="text"
            value={data.companyInfo.bankName || ''}
            onChange={(e) => updateCompanyInfo({ bankName: e.target.value })}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., DBS Bank"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Account Name</label>
          <input
            type="text"
            value={data.companyInfo.bankAccountName || ''}
            onChange={(e) => updateCompanyInfo({ bankAccountName: e.target.value })}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Account holder name"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Account Number</label>
          <input
            type="text"
            value={data.companyInfo.bankAccountNumber || ''}
            onChange={(e) => updateCompanyInfo({ bankAccountNumber: e.target.value })}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Your bank account number"
          />
        </div>
      </div>

      {/* Invoice Settings */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <h3 className="font-semibold text-slate-700 border-b pb-2">Invoice Settings</h3>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Invoice Prefix</label>
            <input
              type="text"
              value={data.settings.invoicePrefix}
              onChange={(e) => updateSettings({ invoicePrefix: e.target.value })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1">Next Invoice Number</label>
            <input
              type="number"
              value={data.settings.nextInvoiceNumber}
              onChange={(e) => updateSettings({ nextInvoiceNumber: parseInt(e.target.value) || 1 })}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              min="1"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">GST Rate (%)</label>
          <input
            type="number"
            value={data.settings.gstRate}
            onChange={(e) => updateSettings({ gstRate: parseFloat(e.target.value) || 0 })}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            min="0"
            max="100"
            step="0.5"
          />
          <p className="text-xs text-slate-500 mt-1">Singapore GST is currently 9% (as of 2024)</p>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-600 mb-1">Currency</label>
          <select
            value={data.settings.currency}
            onChange={(e) => updateSettings({ currency: e.target.value })}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="SGD">SGD - Singapore Dollar</option>
            <option value="USD">USD - US Dollar</option>
            <option value="EUR">EUR - Euro</option>
            <option value="GBP">GBP - British Pound</option>
          </select>
        </div>
      </div>

      {/* Data Management */}
      <div className="bg-white rounded-lg shadow p-4 space-y-4">
        <h3 className="font-semibold text-slate-700 border-b pb-2">Data Management</h3>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-sm">
          <p className="font-medium text-blue-800 mb-1">Data Storage Information</p>
          <p className="text-blue-700">
            Your data is stored locally in your browser. To keep your data safe across devices or
            browser clears, regularly export backups.
          </p>
        </div>

        {importMessage && (
          <div
            className={`p-4 rounded-lg text-sm ${
              importMessage.type === 'success'
                ? 'bg-green-50 border border-green-200 text-green-700'
                : 'bg-red-50 border border-red-200 text-red-700'
            }`}
          >
            {importMessage.text}
          </div>
        )}

        <div className="flex flex-wrap gap-4">
          <button
            onClick={exportData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            📥 Export Backup (JSON)
          </button>

          <button
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 border border-blue-600 text-blue-600 rounded hover:bg-blue-50"
          >
            📤 Import Backup
          </button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleImport}
            className="hidden"
          />
        </div>

        <div className="border-t pt-4 mt-4">
          <button
            onClick={() => setShowClearConfirm(true)}
            className="px-4 py-2 text-red-600 border border-red-600 rounded hover:bg-red-50"
          >
            🗑️ Clear All Data
          </button>
          <p className="text-xs text-slate-500 mt-2">
            This will permanently delete all your invoices, expenses, receipts, and bank statements.
          </p>
        </div>
      </div>

      {/* Data Summary */}
      <div className="bg-white rounded-lg shadow p-4">
        <h3 className="font-semibold text-slate-700 border-b pb-2 mb-4">Data Summary</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
          <div>
            <p className="text-2xl font-bold text-slate-800">{data.invoices.length}</p>
            <p className="text-sm text-slate-500">Invoices</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{data.expenses.length}</p>
            <p className="text-sm text-slate-500">Expenses</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{data.receipts.length}</p>
            <p className="text-sm text-slate-500">Receipts</p>
          </div>
          <div>
            <p className="text-2xl font-bold text-slate-800">{data.bankStatements.length}</p>
            <p className="text-sm text-slate-500">Bank Statements</p>
          </div>
        </div>
      </div>

      {/* Singapore Compliance Note */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-sm">
        <p className="font-medium text-amber-800 mb-1">Singapore Compliance Reminder</p>
        <p className="text-amber-700">
          Under IRAS requirements, businesses must keep records for at least 5 years. This includes
          invoices, receipts, and bank statements. Regular backups are recommended.
        </p>
      </div>

      {/* Import Confirmation Modal */}
      {showImportConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md m-4">
            <h3 className="text-lg font-semibold text-slate-800 mb-4">Import Backup?</h3>
            <p className="text-slate-600 mb-6">
              This will replace all your current data with the imported backup. This action cannot be undone.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setShowImportConfirm(false)}
                className="px-4 py-2 border rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={confirmImport}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Import
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md m-4">
            <h3 className="text-lg font-semibold text-red-600 mb-4">Delete All Data?</h3>
            <p className="text-slate-600 mb-6">
              This will permanently delete all your invoices, expenses, receipts, and bank statements. This action cannot be undone.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 border rounded hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                onClick={handleClearAll}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
              >
                Delete Everything
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
