import { ExpenseCategory } from '@/types';

export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  type: 'debit' | 'credit';
  suggestedCategory: ExpenseCategory;
}

// Keywords for auto-categorization
const CATEGORY_KEYWORDS: Record<ExpenseCategory, string[]> = {
  transport: ['grab', 'gojek', 'taxi', 'mrt', 'bus', 'ez-link', 'ezlink', 'comfort', 'uber', 'bolt', 'petrol', 'shell', 'esso', 'caltex', 'parking', 'lta', 'transit'],
  meals: ['restaurant', 'cafe', 'coffee', 'food', 'mcdonald', 'kfc', 'subway', 'starbucks', 'toast box', 'ya kun', 'foodpanda', 'deliveroo', 'grabfood', 'hawker', 'kopitiam', 'prata', 'dim sum', 'sushi', 'ramen', 'pizza', 'burger', 'dining', 'eatery', 'kitchen', 'gong cha', 'liho', 'koi', 'bakery'],
  groceries: ['ntuc', 'fairprice', 'cold storage', 'sheng siong', 'giant', 'market', 'supermarket', 'redmart', 'grocery', 'don don donki', 'daiso'],
  utilities: ['sp services', 'singtel', 'starhub', 'm1', 'electricity', 'water', 'gas', 'internet', 'mobile', 'phone bill', 'circles', 'simba'],
  entertainment: ['netflix', 'spotify', 'disney', 'cinema', 'movie', 'golden village', 'shaw', 'cathay', 'gaming', 'steam', 'playstation', 'xbox', 'nintendo', 'youtube', 'prime video'],
  healthcare: ['clinic', 'hospital', 'pharmacy', 'guardian', 'watsons', 'doctor', 'dental', 'medical', 'polyclinic', 'specialist', 'health'],
  software: ['adobe', 'microsoft', 'google', 'aws', 'github', 'notion', 'slack', 'zoom', 'figma', 'canva', 'subscription', 'cloud', 'apple.com', 'icloud'],
  office_supplies: ['popular', 'officeworks', 'stationery', 'printer', 'ink', 'paper'],
  insurance: ['insurance', 'prudential', 'aia', 'great eastern', 'ntuc income', 'aviva', 'singlife'],
  bank_fees: ['bank fee', 'service charge', 'atm fee', 'transaction fee', 'annual fee', 'interest charge'],
  education: ['course', 'udemy', 'coursera', 'skillsfuture', 'tuition', 'school', 'university', 'book', 'kinokuniya', 'times bookstore'],
  clothing: ['uniqlo', 'h&m', 'zara', 'cotton on', 'charles & keith', 'pedro', 'nike', 'adidas', 'fashion', 'love bonito'],
  household: ['ikea', 'courts', 'harvey norman', 'home', 'furniture', 'decor', 'shopee', 'lazada', 'amazon'],
  rent: ['rent', 'rental', 'lease', 'hdb', 'condo'],
  professional_services: ['legal', 'accounting', 'consultant', 'lawyer', 'audit'],
  marketing: ['facebook ads', 'google ads', 'advertising', 'marketing', 'promotion', 'meta ads'],
  other: [],
};

export function categorizeTransaction(description: string): ExpenseCategory {
  const lowerDesc = description.toLowerCase();

  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    for (const keyword of keywords) {
      if (lowerDesc.includes(keyword.toLowerCase())) {
        return category as ExpenseCategory;
      }
    }
  }

  return 'other';
}

// Parse Singapore date formats
function parseDate(dateStr: string): string | null {
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  // DD MMM YYYY or DD MMM YY (e.g., 15 Jan 2024, 15 Jan 24)
  let match = dateStr.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{2,4})/i);
  if (match) {
    const day = parseInt(match[1]);
    const month = monthMap[match[2].toLowerCase()];
    let year = parseInt(match[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // DD/MM/YYYY or DD-MM-YYYY or DD.MM.YYYY
  match = dateStr.match(/(\d{1,2})[\/\-\.](\d{1,2})[\/\-\.](\d{2,4})/);
  if (match) {
    const day = parseInt(match[1]);
    const month = parseInt(match[2]) - 1;
    let year = parseInt(match[3]);
    if (year < 100) year += 2000;
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // YYYY-MM-DD
  match = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (match) {
    const date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  return null;
}

// Parse amount string
function parseAmount(amountStr: string): number {
  // Remove currency symbols, commas, spaces
  const cleaned = amountStr.replace(/[S$,\s\(\)]/g, '').replace(/SGD/gi, '');
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : Math.abs(amount);
}

// Extract transactions from PDF text - improved version
export function extractTransactionsFromText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Log extracted text for debugging (remove in production)
  console.log('Extracted PDF text:', text.substring(0, 2000));

  // Try multiple parsing strategies
  const results = [
    ...parseGenericFormat(text),
    ...parseTrustBankFormat(text),
    ...parseDBSFormat(text),
    ...parseCitibankFormat(text),
  ];

  // Deduplicate by date + amount + description similarity
  const seen = new Set<string>();
  for (const txn of results) {
    const key = `${txn.date}-${txn.amount.toFixed(2)}-${txn.description.substring(0, 20)}`;
    if (!seen.has(key) && txn.amount > 0) {
      seen.add(key);
      transactions.push(txn);
    }
  }

  // Sort by date
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  return transactions;
}

// Generic format parser - looks for date + description + amount patterns
function parseGenericFormat(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Pattern: Find dates followed by text and amounts
  // Matches patterns like "15 Jan 2024 GRAB TRANSPORT 25.50"
  const datePattern = /(\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{2,4}|\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})/gi;
  const amountPattern = /\b(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)\b/g;

  // Split by potential transaction boundaries
  const chunks = text.split(datePattern).filter(Boolean);

  for (let i = 0; i < chunks.length - 1; i++) {
    const dateStr = chunks[i];
    const date = parseDate(dateStr);

    if (date) {
      const content = chunks[i + 1] || '';
      const amounts = content.match(amountPattern);

      if (amounts && amounts.length > 0) {
        // Take the last significant amount (usually the transaction amount)
        const amountStr = amounts.find(a => parseAmount(a) >= 0.01) || amounts[amounts.length - 1];
        const amount = parseAmount(amountStr);

        if (amount >= 0.01) {
          // Extract description - everything before the amount
          const amountIndex = content.indexOf(amountStr);
          let description = content.substring(0, amountIndex).trim();

          // Clean up description
          description = description.replace(/[\d,]+\.\d{2}/g, '').trim();
          description = description.replace(/\s+/g, ' ').trim();

          // Remove common non-description text
          description = description.replace(/^(DR|CR|DBT|CDT)\s*/i, '');

          if (description.length >= 3 && description.length < 200) {
            const isCredit = /\b(CR|CDT|CREDIT|DEPOSIT|SALARY|REFUND|CASHBACK)\b/i.test(content);

            transactions.push({
              date,
              description,
              amount,
              type: isCredit ? 'credit' : 'debit',
              suggestedCategory: categorizeTransaction(description),
            });
          }
        }
      }
      i++; // Skip the content chunk
    }
  }

  return transactions;
}

// Trust Bank specific format
function parseTrustBankFormat(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Trust Bank format: often has clear date, merchant, amount structure
  // Pattern: DD MMM YYYY Merchant Name SGD XX.XX or -XX.XX
  const pattern = /(\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{2,4})\s+([A-Za-z][A-Za-z0-9\s\*\-\.\/&']+?)\s+(?:SGD\s*)?([\-\+]?\d{1,3}(?:,\d{3})*(?:\.\d{2}))/gi;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    const date = parseDate(match[1]);
    if (!date) continue;

    let description = match[2].trim();
    const amountStr = match[3];
    const amount = parseAmount(amountStr);

    if (amount < 0.01) continue;
    if (description.length < 3 || description.length > 200) continue;

    // Skip if description looks like a header or footer
    if (/^(date|description|amount|balance|total|page)/i.test(description)) continue;

    const isCredit = amountStr.startsWith('+') || /\b(CR|CREDIT|DEPOSIT|SALARY|REFUND)\b/i.test(description);

    transactions.push({
      date,
      description,
      amount,
      type: isCredit ? 'credit' : 'debit',
      suggestedCategory: categorizeTransaction(description),
    });
  }

  return transactions;
}

// DBS/POSB specific format
function parseDBSFormat(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // DBS format variations
  // Pattern 1: DD MMM Description Amount
  // Pattern 2: DD/MM/YYYY Description Withdrawal Deposit Balance

  // Try to find DBS-style transaction lines
  const lines = text.split(/(?=\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)|\d{1,2}\/\d{1,2}\/\d{2,4})/i);

  for (const line of lines) {
    // Extract date from start
    const dateMatch = line.match(/^(\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*\d{0,4}|\d{1,2}\/\d{1,2}\/\d{2,4})/i);
    if (!dateMatch) continue;

    let dateStr = dateMatch[1];
    // If year is missing, add current year
    if (!/\d{4}/.test(dateStr) && !/\d{2}\/\d{2}\/\d{2}/.test(dateStr)) {
      dateStr += ' ' + new Date().getFullYear();
    }

    const date = parseDate(dateStr);
    if (!date) continue;

    const rest = line.substring(dateMatch[0].length);

    // Find amounts in the rest of the line
    const amounts = rest.match(/\d{1,3}(?:,\d{3})*\.\d{2}/g);
    if (!amounts || amounts.length === 0) continue;

    // DBS usually shows: Description | Withdrawal | Deposit | Balance
    // We want the withdrawal or deposit amount
    const amount = parseAmount(amounts[0]);
    if (amount < 0.01) continue;

    // Description is everything before the first amount
    const firstAmountIndex = rest.indexOf(amounts[0]);
    let description = rest.substring(0, firstAmountIndex).trim();

    // Clean up
    description = description.replace(/\s+/g, ' ').trim();

    if (description.length < 3 || description.length > 200) continue;
    if (/^(date|description|withdrawal|deposit|balance|total)/i.test(description)) continue;

    // Determine debit/credit - in DBS, first amount is usually withdrawal (debit)
    const isCredit = amounts.length > 1 && amounts[1] && parseAmount(amounts[1]) > 0 && rest.indexOf(amounts[1]) > rest.indexOf(amounts[0]);

    transactions.push({
      date,
      description,
      amount,
      type: isCredit ? 'credit' : 'debit',
      suggestedCategory: categorizeTransaction(description),
    });
  }

  return transactions;
}

// Citibank specific format
function parseCitibankFormat(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];

  // Citibank format: DD MMM Merchant Name Amount
  // Sometimes with reference numbers
  const pattern = /(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))\s+(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))?\s*([A-Za-z][^\d]*?)\s+(\d{1,3}(?:,\d{3})*\.\d{2})/gi;

  let match;
  while ((match = pattern.exec(text)) !== null) {
    // Citibank shows transaction date and posting date
    const dateStr = match[1] + ' ' + new Date().getFullYear();
    const date = parseDate(dateStr);
    if (!date) continue;

    let description = match[3].trim();
    const amount = parseAmount(match[4]);

    if (amount < 0.01) continue;

    // Clean description
    description = description.replace(/\s+/g, ' ').trim();

    if (description.length < 3 || description.length > 200) continue;
    if (/^(date|description|amount|balance|total|page)/i.test(description)) continue;

    transactions.push({
      date,
      description,
      amount,
      type: 'debit', // Citibank statement usually shows spending
      suggestedCategory: categorizeTransaction(description),
    });
  }

  return transactions;
}

// Load PDF and extract text using pdf.js - improved version
export async function parsePDFFile(file: File): Promise<string> {
  // Dynamic import for client-side only
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker source - use unpkg which mirrors npm packages directly
  // pdfjs-dist v5.x uses .mjs extension
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const items = textContent.items as any[];

    // Try to preserve some structure by grouping items by Y position
    const lineGroups: Map<number, string[]> = new Map();

    for (const item of items) {
      if (typeof item.str !== 'string') continue;

      // Round Y position to group items on same line
      const y = Math.round(item.transform?.[5] || 0);

      if (!lineGroups.has(y)) {
        lineGroups.set(y, []);
      }
      lineGroups.get(y)!.push(item.str);
    }

    // Sort by Y position (top to bottom, so descending)
    const sortedYs = Array.from(lineGroups.keys()).sort((a, b) => b - a);

    for (const y of sortedYs) {
      const lineText = lineGroups.get(y)!.join(' ').trim();
      if (lineText) {
        fullText += lineText + '\n';
      }
    }

    fullText += '\n--- PAGE BREAK ---\n';
  }

  return fullText;
}
