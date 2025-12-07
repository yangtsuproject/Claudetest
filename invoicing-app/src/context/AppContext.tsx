'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
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
  isSyncing: boolean;
  syncError: string | null;

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
  refreshFromServer: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// API functions
const loadFromServer = async (): Promise<AppData | null> => {
  try {
    const response = await fetch('/api/data');
    const result = await response.json();
    if (result.success && result.data && Object.keys(result.data).length > 0) {
      return result.data as AppData;
    }
    return null;
  } catch (error) {
    console.error('Failed to load from server:', error);
    return null;
  }
};

const saveToServer = async (data: AppData): Promise<boolean> => {
  try {
    const response = await fetch('/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const result = await response.json();
    return result.success;
  } catch (error) {
    console.error('Failed to save to server:', error);
    return false;
  }
};

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [data, setData] = useState<AppData>(getDefaultAppData());
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSavedRef = useRef<string>('');

  // Load data on mount
  useEffect(() => {
    const initializeData = async () => {
      // Try to load from server first
      const serverData = await loadFromServer();

      if (serverData) {
        // Merge with defaults to handle any missing fields
        const mergedData = {
          ...getDefaultAppData(),
          ...serverData,
          companyInfo: { ...getDefaultAppData().companyInfo, ...serverData.companyInfo },
          settings: { ...getDefaultAppData().settings, ...serverData.settings },
        };
        setData(mergedData);
        saveData(mergedData); // Also save to localStorage as backup
      } else {
        // Fall back to localStorage
        const localData = loadData();
        setData(localData);

        // Try to sync local data to server
        if (localData.invoices.length > 0 || localData.expenses.length > 0) {
          await saveToServer(localData);
        }
      }

      setIsLoaded(true);
    };

    initializeData();
  }, []);

  // Debounced save to server
  const syncToServer = useCallback(async (newData: AppData) => {
    const dataString = JSON.stringify(newData);

    // Don't save if data hasn't changed
    if (dataString === lastSavedRef.current) {
      return;
    }

    setIsSyncing(true);
    setSyncError(null);

    // Save to localStorage immediately
    saveData(newData);

    // Debounce server save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const success = await saveToServer(newData);
      if (success) {
        lastSavedRef.current = dataString;
        setSyncError(null);
      } else {
        setSyncError('Failed to sync to cloud. Data saved locally.');
      }
      setIsSyncing(false);
    }, 1000); // Wait 1 second before syncing to server
  }, []);

  // Save data when it changes
  useEffect(() => {
    if (isLoaded) {
      syncToServer(data);
    }
  }, [data, isLoaded, syncToServer]);

  const refreshFromServer = async () => {
    setIsSyncing(true);
    const serverData = await loadFromServer();
    if (serverData) {
      const mergedData = {
        ...getDefaultAppData(),
        ...serverData,
        companyInfo: { ...getDefaultAppData().companyInfo, ...serverData.companyInfo },
        settings: { ...getDefaultAppData().settings, ...serverData.settings },
      };
      setData(mergedData);
      lastSavedRef.current = JSON.stringify(mergedData);
    }
    setIsSyncing(false);
  };

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
        isSyncing,
        syncError,
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
        refreshFromServer,
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
