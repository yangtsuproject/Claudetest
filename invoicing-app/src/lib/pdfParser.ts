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
  transport: ['grab', 'gojek', 'taxi', 'mrt', 'bus', 'ez-link', 'ezlink', 'comfort', 'uber', 'bolt', 'petrol', 'shell', 'esso', 'caltex', 'parking'],
  meals: ['restaurant', 'cafe', 'coffee', 'food', 'mcdonald', 'kfc', 'subway', 'starbucks', 'toast box', 'ya kun', 'foodpanda', 'deliveroo', 'grabfood', 'hawker', 'kopitiam', 'prata', 'dim sum', 'sushi', 'ramen', 'pizza', 'burger'],
  groceries: ['ntuc', 'fairprice', 'cold storage', 'sheng siong', 'giant', 'market', 'supermarket', 'redmart', 'grocery'],
  utilities: ['sp services', 'singtel', 'starhub', 'm1', 'electricity', 'water', 'gas', 'internet', 'mobile', 'phone bill'],
  entertainment: ['netflix', 'spotify', 'disney', 'cinema', 'movie', 'golden village', 'shaw', 'cathay', 'gaming', 'steam', 'playstation', 'xbox', 'nintendo'],
  healthcare: ['clinic', 'hospital', 'pharmacy', 'guardian', 'watsons', 'doctor', 'dental', 'medical', 'polyclinic', 'specialist'],
  software: ['adobe', 'microsoft', 'google', 'aws', 'github', 'notion', 'slack', 'zoom', 'figma', 'canva', 'subscription', 'cloud'],
  office_supplies: ['popular', 'officeworks', 'stationery', 'printer', 'ink', 'paper'],
  insurance: ['insurance', 'prudential', 'aia', 'great eastern', 'ntuc income', 'aviva'],
  bank_fees: ['bank fee', 'service charge', 'atm fee', 'transaction fee', 'annual fee'],
  education: ['course', 'udemy', 'coursera', 'skillsfuture', 'tuition', 'school', 'university', 'book', 'kinokuniya'],
  clothing: ['uniqlo', 'h&m', 'zara', 'cotton on', 'charles & keith', 'pedro', 'nike', 'adidas', 'fashion'],
  household: ['ikea', 'courts', 'harvey norman', 'home', 'furniture', 'decor'],
  rent: ['rent', 'rental', 'lease', 'hdb', 'condo'],
  professional_services: ['legal', 'accounting', 'consultant', 'lawyer', 'audit'],
  marketing: ['facebook ads', 'google ads', 'advertising', 'marketing', 'promotion'],
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
function parseDate(dateStr: string): string {
  // Try various formats
  const formats = [
    // DD/MM/YYYY or DD-MM-YYYY
    /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})/,
    // DD MMM YYYY (e.g., 15 Jan 2024)
    /(\d{1,2})\s+(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{4})/i,
    // YYYY-MM-DD
    /(\d{4})-(\d{2})-(\d{2})/,
  ];

  const monthMap: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };

  for (const format of formats) {
    const match = dateStr.match(format);
    if (match) {
      let date: Date;

      if (format === formats[0]) {
        // DD/MM/YYYY
        date = new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
      } else if (format === formats[1]) {
        // DD MMM YYYY
        const month = monthMap[match[2].toLowerCase()];
        date = new Date(parseInt(match[3]), month, parseInt(match[1]));
      } else {
        // YYYY-MM-DD
        date = new Date(parseInt(match[1]), parseInt(match[2]) - 1, parseInt(match[3]));
      }

      if (!isNaN(date.getTime())) {
        return date.toISOString().split('T')[0];
      }
    }
  }

  return new Date().toISOString().split('T')[0];
}

// Parse amount string
function parseAmount(amountStr: string): number {
  // Remove currency symbols and commas
  const cleaned = amountStr.replace(/[S$,\s]/g, '');
  const amount = parseFloat(cleaned);
  return isNaN(amount) ? 0 : Math.abs(amount);
}

// Extract transactions from PDF text
export function extractTransactionsFromText(text: string): ParsedTransaction[] {
  const transactions: ParsedTransaction[] = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l);

  // Common patterns in Singapore bank statements
  // Pattern 1: Date Description Amount
  // Pattern 2: Date | Description | Debit | Credit

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Skip header lines and non-transaction lines
    if (line.toLowerCase().includes('balance brought forward') ||
        line.toLowerCase().includes('opening balance') ||
        line.toLowerCase().includes('closing balance') ||
        line.toLowerCase().includes('total') ||
        line.toLowerCase().includes('page') ||
        line.toLowerCase().includes('statement')) {
      continue;
    }

    // Try to match transaction patterns
    // Pattern: Date followed by description and amount
    const dateMatch = line.match(/^(\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}|\d{1,2}\s+(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{2,4})/i);

    if (dateMatch) {
      const dateStr = dateMatch[1];
      const restOfLine = line.substring(dateMatch[0].length).trim();

      // Look for amounts (numbers with optional decimal)
      const amountMatches = restOfLine.match(/[\d,]+\.?\d{0,2}/g);

      if (amountMatches && amountMatches.length > 0) {
        // Last number is usually the transaction amount
        const amountStr = amountMatches[amountMatches.length - 1];
        const amount = parseAmount(amountStr);

        if (amount > 0) {
          // Description is everything before the amount
          const amountIndex = restOfLine.lastIndexOf(amountStr);
          let description = restOfLine.substring(0, amountIndex).trim();

          // Clean up description
          description = description.replace(/[\d,]+\.?\d{0,2}/g, '').trim();
          description = description.replace(/\s+/g, ' ');

          if (description.length > 2) {
            // Determine if it's debit or credit based on context
            // In most bank statements, debits are spending
            const isCredit = line.toLowerCase().includes('cr') ||
                            line.toLowerCase().includes('credit') ||
                            line.toLowerCase().includes('deposit') ||
                            line.toLowerCase().includes('transfer in');

            transactions.push({
              date: parseDate(dateStr),
              description: description,
              amount: amount,
              type: isCredit ? 'credit' : 'debit',
              suggestedCategory: categorizeTransaction(description),
            });
          }
        }
      }
    }
  }

  return transactions;
}

// Load PDF and extract text using pdf.js
export async function parsePDFFile(file: File): Promise<string> {
  // Dynamic import for client-side only
  const pdfjsLib = await import('pdfjs-dist');

  // Set worker source
  pdfjsLib.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.js`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';

  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const pageText = (textContent.items as any[])
      .filter((item) => typeof item.str === 'string')
      .map((item) => item.str as string)
      .join(' ');
    fullText += pageText + '\n';
  }

  return fullText;
}
