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
  transport: ['grab', 'gojek', 'taxi', 'mrt', 'bus', 'ez-link', 'ezlink', 'comfort', 'uber', 'bolt', 'petrol', 'shell', 'esso', 'caltex', 'parking', 'lta', 'transit', 'comfortdelgro'],
  meals: ['restaurant', 'cafe', 'coffee', 'food', 'mcdonald', 'kfc', 'subway', 'starbucks', 'toast box', 'ya kun', 'foodpanda', 'deliveroo', 'grabfood', 'hawker', 'kopitiam', 'prata', 'dim sum', 'sushi', 'ramen', 'pizza', 'burger', 'dining', 'eatery', 'kitchen', 'gong cha', 'liho', 'koi', 'bakery', 'bento', 'noodle', 'chicken rice', 'mala', 'bbq', 'grill'],
  groceries: ['ntuc', 'fairprice', 'cold storage', 'sheng siong', 'giant', 'market', 'supermarket', 'redmart', 'grocery', 'don don donki', 'daiso', 'prime'],
  utilities: ['sp services', 'singtel', 'starhub', 'm1', 'electricity', 'water', 'gas', 'internet', 'mobile', 'phone bill', 'circles', 'simba'],
  entertainment: ['netflix', 'spotify', 'disney', 'cinema', 'movie', 'golden village', 'shaw', 'cathay', 'gaming', 'steam', 'playstation', 'xbox', 'nintendo', 'youtube', 'prime video'],
  healthcare: ['clinic', 'hospital', 'pharmacy', 'guardian', 'watsons', 'doctor', 'dental', 'medical', 'polyclinic', 'specialist', 'health'],
  software: ['adobe', 'microsoft', 'google', 'aws', 'github', 'notion', 'slack', 'zoom', 'figma', 'canva', 'subscription', 'cloud', 'apple.com', 'icloud', 'openai', 'chatgpt'],
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
function parseDate(dateStr: string, defaultYear?: number): string | null {
  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  const currentYear = defaultYear || new Date().getFullYear();

  // DD MMM YYYY or DD MMM YY (e.g., 15 Jan 2024, 15 Jan 24)
  let match = dateStr.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{2,4})/i);
  if (match) {
    const day = parseInt(match[1]);
    const month = monthMap[match[2].toLowerCase()];
    let year = parseInt(match[3]);
    if (year < 100) year += 2000;
    // Sanity check - if year is before 2020 or after 2030, it's likely wrong
    if (year < 2020 || year > 2030) year = currentYear;
    const date = new Date(year, month, day);
    if (!isNaN(date.getTime())) {
      return date.toISOString().split('T')[0];
    }
  }

  // DD MMM (without year - use current/default year)
  match = dateStr.match(/(\d{1,2})\s*(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?!\s*\d)/i);
  if (match) {
    const day = parseInt(match[1]);
    const month = monthMap[match[2].toLowerCase()];
    const date = new Date(currentYear, month, day);
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
    if (year < 2020 || year > 2030) year = currentYear;
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

// Keywords that indicate balance entries (not actual transactions)
const BALANCE_KEYWORDS = [
  'outstanding balance',
  'previous balance',
  'balance brought forward',
  'balance b/f',
  'balance bf',
  'brought forward',
  'b/f',
  'opening balance',
  'closing balance',
  'beginning balance',
  'ending balance',
  'statement balance',
  'current balance',
  'available balance',
  'total balance',
  'minimum payment',
  'minimum due',
  'amount due',
  'payment due',
  'credit limit',
  'available credit',
  'last statement',
  'previous statement',
  'carried forward',
  'carry forward',
  'c/f',
];

// Check if a description is a balance entry (should be excluded)
function isBalanceEntry(description: string): boolean {
  const lowerDesc = description.toLowerCase();
  return BALANCE_KEYWORDS.some(keyword => lowerDesc.includes(keyword));
}

// Detect if this is a Trust Bank statement
function isTrustBankStatement(text: string): boolean {
  return /trust\s*bank|trust\s*card/i.test(text);
}

// Detect if this is a DBS/POSB statement
function isDBSStatement(text: string): boolean {
  return /dbs\s*bank|posb|development\s*bank\s*of\s*singapore/i.test(text);
}

// Detect if this is a Citibank statement
function isCitibankStatement(text: string): boolean {
  return /citibank|citi\s*card/i.test(text);
}

// Extract transactions from PDF text - improved version
export function extractTransactionsFromText(text: string): ParsedTransaction[] {
  // Log extracted text for debugging
  console.log('Extracted PDF text (first 3000 chars):', text.substring(0, 3000));
  console.log('Full text length:', text.length);

  let transactions: ParsedTransaction[] = [];

  // Detect bank and use appropriate parser
  if (isTrustBankStatement(text)) {
    console.log('Detected: Trust Bank statement');
    transactions = parseTrustBankFormat(text);
  } else if (isDBSStatement(text)) {
    console.log('Detected: DBS/POSB statement');
    transactions = parseDBSFormat(text);
  } else if (isCitibankStatement(text)) {
    console.log('Detected: Citibank statement');
    transactions = parseCitibankFormat(text);
  } else {
    console.log('Using generic parser');
    transactions = parseLineByLine(text);
  }

  // If specific parser found nothing, try generic
  if (transactions.length === 0) {
    console.log('Specific parser found nothing, trying generic...');
    transactions = parseLineByLine(text);
  }

  // Filter out balance entries (outstanding balance, previous balance, etc.)
  transactions = transactions.filter(txn => !isBalanceEntry(txn.description));

  console.log('Total transactions found (after filtering balances):', transactions.length);

  // Sort by date
  transactions.sort((a, b) => a.date.localeCompare(b.date));

  return transactions;
}

// Parse line by line - most reliable approach for table-based PDFs
function parseLineByLine(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');
  const currentYear = new Date().getFullYear();

  for (const line of lines) {
    // Skip empty lines and headers
    if (!line.trim() || line.length < 10) continue;
    if (/^(date|description|amount|balance|total|page|transaction)/i.test(line.trim())) continue;

    // Look for pattern: Date at start, amount somewhere, description in middle
    // Pattern: "DD MMM" or "DD/MM" at start
    const dateMatch = line.match(/^(\d{1,2}\s*(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)|\d{1,2}\/\d{1,2}(?:\/\d{2,4})?)/i);
    if (!dateMatch) continue;

    const dateStr = dateMatch[1];
    const date = parseDate(dateStr, currentYear);
    if (!date) continue;

    // Look for amount - typically SGD or just number with 2 decimals, possibly with - or +
    const amountMatch = line.match(/(?:SGD\s*)?([\-\+]?\s*\d{1,3}(?:,\d{3})*\.\d{2})\s*$/);
    if (!amountMatch) continue;

    const amountStr = amountMatch[1].replace(/\s/g, '');
    const amount = parseAmount(amountStr);
    if (amount < 0.01) continue;

    // Description is between date and amount
    const dateEndIndex = line.indexOf(dateMatch[0]) + dateMatch[0].length;
    const amountStartIndex = line.lastIndexOf(amountMatch[0]);
    let description = line.substring(dateEndIndex, amountStartIndex).trim();

    // Clean up description
    description = description.replace(/\s+/g, ' ').trim();
    description = description.replace(/^[\s\-\|]+/, '').replace(/[\s\-\|]+$/, '');

    if (description.length < 2 || description.length > 200) continue;

    // Determine if credit or debit
    const isCredit = amountStr.startsWith('+') || /\b(CR|CREDIT|DEPOSIT|SALARY|REFUND|CASHBACK|RECEIVED)\b/i.test(line);

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

// Trust Bank specific format - completely rewritten
function parseTrustBankFormat(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');
  const currentYear = new Date().getFullYear();

  console.log('Trust Bank parser - processing', lines.length, 'lines');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line || line.length < 5) continue;

    // Trust Bank format variations:
    // 1. "29 Oct GRAB TRANSPORT -45.70"
    // 2. "29 Oct 2024 GRAB TRANSPORT SGD -45.70"
    // 3. Date on one line, description on next, amount on another

    // Pattern 1: All on one line - Date Description Amount
    const singleLineMatch = line.match(/^(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+\d{4})?)\s+(.+?)\s+([\-\+]?\d{1,3}(?:,\d{3})*\.\d{2})$/i);

    if (singleLineMatch) {
      const date = parseDate(singleLineMatch[1], currentYear);
      if (!date) continue;

      let description = singleLineMatch[2].trim();
      const amountStr = singleLineMatch[3];
      const amount = parseAmount(amountStr);

      if (amount < 0.01) continue;

      // Clean SGD prefix from description if present
      description = description.replace(/SGD\s*$/i, '').trim();

      if (description.length < 2) continue;
      if (/^(date|description|amount|balance)/i.test(description)) continue;

      const isCredit = amountStr.startsWith('+');

      transactions.push({
        date,
        description,
        amount,
        type: isCredit ? 'credit' : 'debit',
        suggestedCategory: categorizeTransaction(description),
      });
      continue;
    }

    // Pattern 2: Date only on this line, look for description and amount nearby
    const dateOnlyMatch = line.match(/^(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+\d{4})?)$/i);

    if (dateOnlyMatch && i + 1 < lines.length) {
      const date = parseDate(dateOnlyMatch[1], currentYear);
      if (!date) continue;

      // Next line(s) should have description and amount
      let description = '';
      let amountStr = '';

      // Look at next few lines
      for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
        const nextLine = lines[j].trim();
        if (!nextLine) continue;

        // Check if this line is a new date (new transaction)
        if (/^\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)/i.test(nextLine)) {
          break;
        }

        // Check for amount
        const amtMatch = nextLine.match(/([\-\+]?\d{1,3}(?:,\d{3})*\.\d{2})$/);
        if (amtMatch) {
          amountStr = amtMatch[1];
          // Everything before amount is description
          const beforeAmount = nextLine.substring(0, nextLine.lastIndexOf(amtMatch[0])).trim();
          if (beforeAmount && !description) {
            description = beforeAmount;
          }
          break;
        } else if (!description) {
          // This line is description
          description = nextLine;
        }
      }

      if (date && description && amountStr) {
        const amount = parseAmount(amountStr);
        if (amount >= 0.01 && description.length >= 2) {
          description = description.replace(/SGD\s*$/i, '').trim();

          if (!/^(date|description|amount|balance)/i.test(description)) {
            const isCredit = amountStr.startsWith('+');

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
    }
  }

  // If the above didn't work well, try finding amounts and working backwards
  if (transactions.length === 0) {
    console.log('Trying alternate Trust Bank parsing...');

    // Look for lines with amounts and try to extract transaction info
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();

      // Find lines ending with amount pattern
      const amountMatch = line.match(/([\-\+]?\d{1,3}(?:,\d{3})*\.\d{2})\s*$/);
      if (!amountMatch) continue;

      const amount = parseAmount(amountMatch[1]);
      if (amount < 0.01 || amount > 100000) continue; // Skip unreasonable amounts

      // Look backwards for a date
      let date: string | null = null;
      let description = line.substring(0, line.lastIndexOf(amountMatch[0])).trim();

      // Check if line starts with date
      const lineDateMatch = line.match(/^(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+\d{4})?)/i);
      if (lineDateMatch) {
        date = parseDate(lineDateMatch[1], currentYear);
        description = line.substring(lineDateMatch[0].length, line.lastIndexOf(amountMatch[0])).trim();
      } else {
        // Look at previous lines for date
        for (let j = i - 1; j >= Math.max(0, i - 3); j--) {
          const prevLine = lines[j].trim();
          const prevDateMatch = prevLine.match(/(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)(?:\s+\d{4})?)/i);
          if (prevDateMatch) {
            date = parseDate(prevDateMatch[1], currentYear);
            break;
          }
        }
      }

      if (!date) continue;

      // Clean description
      description = description.replace(/SGD\s*/gi, '').trim();
      description = description.replace(/^[\s\-\|]+/, '').replace(/[\s\-\|]+$/, '');

      if (description.length < 2 || description.length > 200) continue;
      if (/^(date|description|amount|balance|total|page)/i.test(description)) continue;

      const isCredit = amountMatch[1].startsWith('+');

      transactions.push({
        date,
        description,
        amount,
        type: isCredit ? 'credit' : 'debit',
        suggestedCategory: categorizeTransaction(description),
      });
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return transactions.filter(txn => {
    const key = `${txn.date}-${txn.amount.toFixed(2)}-${txn.description.substring(0, 15)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// DBS/POSB specific format
function parseDBSFormat(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');
  const currentYear = new Date().getFullYear();

  for (const line of lines) {
    if (!line.trim() || line.length < 10) continue;

    // DBS format: DD MMM Description Amount or multiple amounts (withdrawal/deposit/balance)
    const dateMatch = line.match(/^(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))/i);
    if (!dateMatch) continue;

    const date = parseDate(dateMatch[1], currentYear);
    if (!date) continue;

    const rest = line.substring(dateMatch[0].length);

    // Find all amounts
    const amounts = rest.match(/\d{1,3}(?:,\d{3})*\.\d{2}/g);
    if (!amounts || amounts.length === 0) continue;

    // First amount is usually the transaction amount
    const amount = parseAmount(amounts[0]);
    if (amount < 0.01) continue;

    // Description is between date and first amount
    const firstAmountIndex = rest.indexOf(amounts[0]);
    let description = rest.substring(0, firstAmountIndex).trim();

    description = description.replace(/\s+/g, ' ').trim();
    if (description.length < 2 || description.length > 200) continue;
    if (/^(date|description|withdrawal|deposit|balance)/i.test(description)) continue;

    transactions.push({
      date,
      description,
      amount,
      type: 'debit',
      suggestedCategory: categorizeTransaction(description),
    });
  }

  return transactions;
}

// Citibank specific format
function parseCitibankFormat(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n');
  const currentYear = new Date().getFullYear();

  for (const line of lines) {
    if (!line.trim() || line.length < 10) continue;

    // Citibank shows: DD MMM DD MMM Description Amount (trans date, post date, desc, amt)
    const match = line.match(/^(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))\s+(\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec))?\s*(.+?)\s+(\d{1,3}(?:,\d{3})*\.\d{2})\s*$/i);

    if (!match) continue;

    const date = parseDate(match[1], currentYear);
    if (!date) continue;

    let description = match[3].trim();
    const amount = parseAmount(match[4]);

    if (amount < 0.01) continue;

    description = description.replace(/\s+/g, ' ').trim();
    if (description.length < 2 || description.length > 200) continue;
    if (/^(date|description|amount|balance)/i.test(description)) continue;

    transactions.push({
      date,
      description,
      amount,
      type: 'debit',
      suggestedCategory: categorizeTransaction(description),
    });
  }

  return transactions;
}

// Text item with position info
interface TextItemWithPosition {
  str: string;
  x: number;
  y: number;
  width: number;
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

    // Extract items with position info
    const textItems: TextItemWithPosition[] = [];

    for (const item of items) {
      if (typeof item.str !== 'string' || !item.str.trim()) continue;

      textItems.push({
        str: item.str,
        x: Math.round(item.transform?.[4] || 0),
        y: Math.round(item.transform?.[5] || 0),
        width: item.width || 0,
      });
    }

    // Group by Y position (rows), with tolerance for slight variations
    const rows: Map<number, TextItemWithPosition[]> = new Map();
    const yTolerance = 3; // pixels

    for (const item of textItems) {
      // Find existing row within tolerance
      let foundY: number | null = null;
      for (const existingY of rows.keys()) {
        if (Math.abs(existingY - item.y) <= yTolerance) {
          foundY = existingY;
          break;
        }
      }

      if (foundY !== null) {
        rows.get(foundY)!.push(item);
      } else {
        rows.set(item.y, [item]);
      }
    }

    // Sort rows by Y (top to bottom = descending Y in PDF coords)
    const sortedYs = Array.from(rows.keys()).sort((a, b) => b - a);

    for (const y of sortedYs) {
      // Sort items in row by X (left to right)
      const rowItems = rows.get(y)!.sort((a, b) => a.x - b.x);

      // Join with spaces, being careful about spacing
      let lineText = '';
      let lastX = 0;

      for (const item of rowItems) {
        // Add space if there's a gap
        if (lineText && item.x - lastX > 10) {
          lineText += ' ';
        }
        lineText += item.str;
        lastX = item.x + (item.width || item.str.length * 5);
      }

      lineText = lineText.trim();
      if (lineText) {
        fullText += lineText + '\n';
      }
    }

    fullText += '\n';
  }

  return fullText;
}
