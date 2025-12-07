// Singapore-compliant Invoice Types
export interface Invoice {
  id: string;
  invoiceNumber: string;
  date: string;
  dueDate: string;
  clientName: string;
  clientAddress: string;
  clientEmail?: string;
  items: InvoiceItem[];
  subtotal: number;
  gstRate: number; // Singapore GST (9% as of 2024)
  gstAmount: number;
  total: number;
  status: 'draft' | 'sent' | 'paid' | 'overdue';
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  type: 'company' | 'personal';
  description: string;
  amount: number;
  gstAmount?: number;
  vendor?: string;
  receiptId?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export type ExpenseCategory =
  | 'office_supplies'
  | 'software'
  | 'transport'
  | 'meals'
  | 'utilities'
  | 'rent'
  | 'professional_services'
  | 'marketing'
  | 'insurance'
  | 'bank_fees'
  | 'groceries'
  | 'entertainment'
  | 'healthcare'
  | 'education'
  | 'clothing'
  | 'household'
  | 'other';

export const EXPENSE_CATEGORIES: Record<ExpenseCategory, { label: string; type: 'company' | 'personal' | 'both' }> = {
  office_supplies: { label: 'Office Supplies', type: 'company' },
  software: { label: 'Software & Subscriptions', type: 'company' },
  transport: { label: 'Transport', type: 'both' },
  meals: { label: 'Meals & Entertainment', type: 'both' },
  utilities: { label: 'Utilities', type: 'both' },
  rent: { label: 'Rent', type: 'both' },
  professional_services: { label: 'Professional Services', type: 'company' },
  marketing: { label: 'Marketing', type: 'company' },
  insurance: { label: 'Insurance', type: 'both' },
  bank_fees: { label: 'Bank Fees', type: 'company' },
  groceries: { label: 'Groceries', type: 'personal' },
  entertainment: { label: 'Entertainment', type: 'personal' },
  healthcare: { label: 'Healthcare', type: 'personal' },
  education: { label: 'Education', type: 'personal' },
  clothing: { label: 'Clothing', type: 'personal' },
  household: { label: 'Household', type: 'personal' },
  other: { label: 'Other', type: 'both' },
};

export interface Receipt {
  id: string;
  expenseId?: string;
  fileName: string;
  imageData: string; // Base64 encoded image
  uploadDate: string;
  notes?: string;
}

export interface BankTransaction {
  id: string;
  date: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  balance?: number;
  category?: ExpenseCategory;
  matched?: boolean;
  expenseId?: string;
}

export interface BankStatement {
  id: string;
  fileName: string;
  uploadDate: string;
  transactions: BankTransaction[];
}

export interface CompanyInfo {
  name: string;
  uen: string;
  address: string;
  email: string;
  phone?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
}

export interface AppData {
  companyInfo: CompanyInfo;
  invoices: Invoice[];
  expenses: Expense[];
  receipts: Receipt[];
  bankStatements: BankStatement[];
  settings: AppSettings;
}

export interface AppSettings {
  gstRate: number;
  currency: string;
  invoicePrefix: string;
  nextInvoiceNumber: number;
}

export const DEFAULT_COMPANY_INFO: CompanyInfo = {
  name: 'Akros Digital Consultancy Pte. Ltd.',
  uen: '202540498Z',
  address: 'Singapore',
  email: '',
};

export const DEFAULT_SETTINGS: AppSettings = {
  gstRate: 0, // No GST
  currency: 'SGD',
  invoicePrefix: 'INV',
  nextInvoiceNumber: 1,
};
