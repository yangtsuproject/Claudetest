import { AppData, DEFAULT_COMPANY_INFO, DEFAULT_SETTINGS } from '@/types';

const STORAGE_KEY = 'akros_invoicing_data';

export const getDefaultAppData = (): AppData => ({
  companyInfo: DEFAULT_COMPANY_INFO,
  invoices: [],
  expenses: [],
  receipts: [],
  bankStatements: [],
  settings: DEFAULT_SETTINGS,
  customCategories: [],
});

export const loadData = (): AppData => {
  if (typeof window === 'undefined') {
    return getDefaultAppData();
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const data = JSON.parse(stored) as AppData;
      // Merge with defaults to handle any missing fields from older versions
      return {
        ...getDefaultAppData(),
        ...data,
        companyInfo: { ...DEFAULT_COMPANY_INFO, ...data.companyInfo },
        settings: { ...DEFAULT_SETTINGS, ...data.settings },
      };
    }
  } catch (error) {
    console.error('Failed to load data from localStorage:', error);
  }

  return getDefaultAppData();
};

export const saveData = (data: AppData): void => {
  if (typeof window === 'undefined') return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save data to localStorage:', error);
  }
};

export const exportDataAsJSON = (data: AppData): void => {
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

export const importDataFromJSON = (file: File): Promise<AppData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as AppData;
        resolve(data);
      } catch (error) {
        reject(new Error('Invalid JSON file'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

export const generateId = (): string => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

export const formatCurrency = (amount: number, currency: string = 'SGD'): string => {
  return new Intl.NumberFormat('en-SG', {
    style: 'currency',
    currency,
  }).format(amount);
};

export const formatDate = (date: string): string => {
  return new Date(date).toLocaleDateString('en-SG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};
