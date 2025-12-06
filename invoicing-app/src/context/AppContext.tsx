'use client';

import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import {
  AppData,
  Invoice,
  Expense,
  Receipt,
  BankStatement,
  CompanyInfo,
  AppSettings,
} from '@/types';
import { loadData, saveData, getDefaultAppData, generateId } from '@/lib/storage';

interface AppContextType {
  data: AppData;
  isLoaded: boolean;

  // Company
  updateCompanyInfo: (info: Partial<CompanyInfo>) => void;
  updateSettings: (settings: Partial<AppSettings>) => void;

  // Invoices
  addInvoice: (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>) => Invoice;
  updateInvoice: (id: string, invoice: Partial<Invoice>) => void;
  deleteInvoice: (id: string) => void;
  getNextInvoiceNumber: () => string;

  // Expenses
  addExpense: (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>) => Expense;
  updateExpense: (id: string, expense: Partial<Expense>) => void;
  deleteExpense: (id: string) => void;

  // Receipts
  addReceipt: (receipt: Omit<Receipt, 'id'>) => Receipt;
  deleteReceipt: (id: string) => void;

  // Bank Statements
  addBankStatement: (statement: Omit<BankStatement, 'id'>) => BankStatement;
  deleteBankStatement: (id: string) => void;

  // Data management
  exportData: () => void;
  importData: (data: AppData) => void;
  clearAllData: () => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(getDefaultAppData());
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const loaded = loadData();
    setData(loaded);
    setIsLoaded(true);
  }, []);

  useEffect(() => {
    if (isLoaded) {
      saveData(data);
    }
  }, [data, isLoaded]);

  const updateCompanyInfo = (info: Partial<CompanyInfo>) => {
    setData((prev) => ({
      ...prev,
      companyInfo: { ...prev.companyInfo, ...info },
    }));
  };

  const updateSettings = (settings: Partial<AppSettings>) => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...settings },
    }));
  };

  const getNextInvoiceNumber = (): string => {
    const { invoicePrefix, nextInvoiceNumber } = data.settings;
    return `${invoicePrefix}-${String(nextInvoiceNumber).padStart(4, '0')}`;
  };

  const addInvoice = (invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Invoice => {
    const now = new Date().toISOString();
    const newInvoice: Invoice = {
      ...invoice,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };

    setData((prev) => ({
      ...prev,
      invoices: [newInvoice, ...prev.invoices],
      settings: {
        ...prev.settings,
        nextInvoiceNumber: prev.settings.nextInvoiceNumber + 1,
      },
    }));

    return newInvoice;
  };

  const updateInvoice = (id: string, updates: Partial<Invoice>) => {
    setData((prev) => ({
      ...prev,
      invoices: prev.invoices.map((inv) =>
        inv.id === id ? { ...inv, ...updates, updatedAt: new Date().toISOString() } : inv
      ),
    }));
  };

  const deleteInvoice = (id: string) => {
    setData((prev) => ({
      ...prev,
      invoices: prev.invoices.filter((inv) => inv.id !== id),
    }));
  };

  const addExpense = (expense: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>): Expense => {
    const now = new Date().toISOString();
    const newExpense: Expense = {
      ...expense,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };

    setData((prev) => ({
      ...prev,
      expenses: [newExpense, ...prev.expenses],
    }));

    return newExpense;
  };

  const updateExpense = (id: string, updates: Partial<Expense>) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.map((exp) =>
        exp.id === id ? { ...exp, ...updates, updatedAt: new Date().toISOString() } : exp
      ),
    }));
  };

  const deleteExpense = (id: string) => {
    setData((prev) => ({
      ...prev,
      expenses: prev.expenses.filter((exp) => exp.id !== id),
    }));
  };

  const addReceipt = (receipt: Omit<Receipt, 'id'>): Receipt => {
    const newReceipt: Receipt = {
      ...receipt,
      id: generateId(),
    };

    setData((prev) => ({
      ...prev,
      receipts: [newReceipt, ...prev.receipts],
    }));

    return newReceipt;
  };

  const deleteReceipt = (id: string) => {
    setData((prev) => ({
      ...prev,
      receipts: prev.receipts.filter((r) => r.id !== id),
    }));
  };

  const addBankStatement = (statement: Omit<BankStatement, 'id'>): BankStatement => {
    const newStatement: BankStatement = {
      ...statement,
      id: generateId(),
    };

    setData((prev) => ({
      ...prev,
      bankStatements: [newStatement, ...prev.bankStatements],
    }));

    return newStatement;
  };

  const deleteBankStatement = (id: string) => {
    setData((prev) => ({
      ...prev,
      bankStatements: prev.bankStatements.filter((s) => s.id !== id),
    }));
  };

  const exportData = () => {
    const jsonString = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = `akros-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const importData = (importedData: AppData) => {
    setData({
      ...getDefaultAppData(),
      ...importedData,
    });
  };

  const clearAllData = () => {
    setData(getDefaultAppData());
  };

  return (
    <AppContext.Provider
      value={{
        data,
        isLoaded,
        updateCompanyInfo,
        updateSettings,
        addInvoice,
        updateInvoice,
        deleteInvoice,
        getNextInvoiceNumber,
        addExpense,
        updateExpense,
        deleteExpense,
        addReceipt,
        deleteReceipt,
        addBankStatement,
        deleteBankStatement,
        exportData,
        importData,
        clearAllData,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
