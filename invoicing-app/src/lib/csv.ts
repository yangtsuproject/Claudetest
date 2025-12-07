import { Invoice, Expense, BankTransaction, EXPENSE_CATEGORIES } from '@/types';
import { formatDate } from './storage';

export const exportInvoicesToCSV = (invoices: Invoice[]): void => {
  const headers = [
    'Invoice Number',
    'Date',
    'Due Date',
    'Client Name',
    'Client Address',
    'Total',
    'Status',
  ];

  const rows = invoices.map((inv) => [
    inv.invoiceNumber,
    formatDate(inv.date),
    formatDate(inv.dueDate),
    inv.clientName,
    inv.clientAddress,
    inv.total.toFixed(2),
    inv.status,
  ]);

  downloadCSV(headers, rows, 'invoices');
};

export const exportExpensesToCSV = (expenses: Expense[]): void => {
  const headers = [
    'Date',
    'Type',
    'Category',
    'Description',
    'Vendor',
    'Amount',
    'Notes',
  ];

  const rows = expenses.map((exp) => [
    formatDate(exp.date),
    exp.type,
    EXPENSE_CATEGORIES[exp.category]?.label || exp.category,
    exp.description,
    exp.vendor || '',
    exp.amount.toFixed(2),
    exp.notes || '',
  ]);

  downloadCSV(headers, rows, 'expenses');
};

export const exportBankTransactionsToCSV = (transactions: BankTransaction[]): void => {
  const headers = [
    'Date',
    'Description',
    'Type',
    'Amount',
    'Balance',
    'Category',
    'Matched',
  ];

  const rows = transactions.map((t) => [
    formatDate(t.date),
    t.description,
    t.type,
    t.amount.toFixed(2),
    t.balance?.toFixed(2) || '',
    t.category ? EXPENSE_CATEGORIES[t.category]?.label : '',
    t.matched ? 'Yes' : 'No',
  ]);

  downloadCSV(headers, rows, 'bank-transactions');
};

const downloadCSV = (headers: string[], rows: string[][], filename: string): void => {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

// Parse CSV bank statement (basic format: Date, Description, Amount)
export const parseCSVBankStatement = (content: string): BankTransaction[] => {
  const lines = content.trim().split('\n');
  if (lines.length < 2) return [];

  const transactions: BankTransaction[] = [];

  // Skip header row
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cells = parseCSVLine(line);

    if (cells.length >= 3) {
      const date = cells[0];
      const description = cells[1];
      const amountStr = cells[2].replace(/[,$]/g, '');
      const amount = parseFloat(amountStr);

      if (!isNaN(amount) && date) {
        transactions.push({
          id: `${Date.now()}-${i}`,
          date: normalizeDate(date),
          description,
          amount: Math.abs(amount),
          type: amount >= 0 ? 'credit' : 'debit',
          balance: cells[3] ? parseFloat(cells[3].replace(/[,$]/g, '')) : undefined,
        });
      }
    }
  }

  return transactions;
};

const parseCSVLine = (line: string): string[] => {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      cells.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  cells.push(current.trim());

  return cells;
};

const normalizeDate = (dateStr: string): string => {
  // Try to parse various date formats
  const date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date.toISOString().split('T')[0];
  }

  // Try DD/MM/YYYY format (common in Singapore)
  const parts = dateStr.split(/[\/\-\.]/);
  if (parts.length === 3) {
    const [day, month, year] = parts;
    const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    if (!isNaN(d.getTime())) {
      return d.toISOString().split('T')[0];
    }
  }

  return dateStr;
};
