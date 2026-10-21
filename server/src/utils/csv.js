/**
 * RFC 4180 Compliant CSV Utility
 * Provides fast, zero-dependency CSV parsing and serialization with privacy masking.
 */

/**
 * Parse CSV text into array of objects using the first row as headers
 * @param {string} csvText - Raw CSV content
 * @returns {Array<Object>} Array of row objects
 */
function parseCSV(csvText) {
  if (!csvText || typeof csvText !== 'string') return [];

  // Remove UTF-8 Byte Order Mark (BOM) if present
  let cleanText = csvText.replace(/^\uFEFF/, '').trim();
  if (!cleanText) return [];

  const rows = [];
  let currentRow = [];
  let currentVal = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          // Escaped quote: "" -> "
          currentVal += '"';
          i++;
        } else {
          // Closing quote
          inQuotes = false;
        }
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ',') {
        currentRow.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\r') {
        if (nextChar === '\n') {
          i++;
        }
        currentRow.push(currentVal.trim());
        rows.push(currentRow);
        currentRow = [];
        currentVal = '';
      } else if (char === '\n') {
        currentRow.push(currentVal.trim());
        rows.push(currentRow);
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }

  // Push final field/row if buffer not empty
  if (currentVal !== '' || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    rows.push(currentRow);
  }

  if (rows.length < 2) return [];

  const headers = rows[0].map((h) => h.toLowerCase().replace(/[^a-z0-9_]+/g, '_').replace(/(^_|_$)/g, ''));
  const parsedRecords = [];

  for (let r = 1; r < rows.length; r++) {
    const row = rows[r];
    // Skip empty lines
    if (row.length === 1 && row[0] === '') continue;

    const rowObj = {};
    headers.forEach((header, idx) => {
      if (header) {
        rowObj[header] = row[idx] !== undefined ? row[idx] : '';
      }
    });
    parsedRecords.push(rowObj);
  }

  return parsedRecords;
}

/**
 * Escape a single cell value for CSV output
 */
function escapeCSVCell(val) {
  if (val === null || val === undefined) return '';
  const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
  if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Serialize an array of records to RFC 4180 CSV string
 * @param {Array<Object>} records - Array of records
 * @param {Array<{key: string, label: string}>|Array<string>} headers - Header definitions
 * @returns {string} Formatted CSV
 */
function toCSV(records = [], headers = []) {
  if (!Array.isArray(records) || records.length === 0) {
    if (headers && headers.length > 0) {
      const headerLine = headers.map((h) => escapeCSVCell(typeof h === 'object' ? h.label : h)).join(',');
      return `${headerLine}\r\n`;
    }
    return '';
  }

  // Extract header keys and labels
  let normalizedHeaders = [];
  if (headers && headers.length > 0) {
    normalizedHeaders = headers.map((h) => (typeof h === 'object' ? h : { key: h, label: h }));
  } else {
    const keys = Object.keys(records[0]);
    normalizedHeaders = keys.map((k) => ({ key: k, label: k }));
  }

  const headerLine = normalizedHeaders.map((h) => escapeCSVCell(h.label)).join(',');
  const rowLines = records.map((rec) => {
    return normalizedHeaders
      .map((h) => {
        const val = rec[h.key] !== undefined ? rec[h.key] : '';
        return escapeCSVCell(val);
      })
      .join(',');
  });

  return [headerLine, ...rowLines].join('\r\n') + '\r\n';
}

/**
 * Apply DPDP/GDPR compliant privacy masking to a value
 * @param {string} val - Raw string value
 * @param {string} [fieldType='text'] - Field type hint ('email', 'phone', 'id', 'text')
 * @returns {string} Masked string
 */
function maskValue(val, fieldType = 'text', fieldKey = '') {
  if (!val || typeof val !== 'string') return val;
  const str = val.trim();
  if (str.length === 0) return '';

  const lowerType = fieldType.toLowerCase();
  const lowerKey = (fieldKey || '').toLowerCase();

  // Email masking: e.g. a***b@domain.com
  if (lowerType.includes('email') || lowerKey.includes('email') || str.includes('@')) {
    const [local, domain] = str.split('@');
    if (!domain) return '***@***.***';
    const visibleStart = local.length > 1 ? local[0] : '';
    const visibleEnd = local.length > 2 ? local[local.length - 1] : '';
    return `${visibleStart}***${visibleEnd}@${domain}`;
  }

  // Phone masking: e.g. +91 ***** 1234
  if (lowerType.includes('phone') || lowerKey.includes('phone') || /^[0-9+\-\s()]{7,}$/.test(str)) {
    const digits = str.replace(/[^0-9]/g, '');
    if (digits.length >= 4) {
      const last4 = digits.slice(-4);
      return `+91 ***** ${last4}`;
    }
    return '+91 ***** ****';
  }

  // Identification (Aadhaar / National ID / Encrypted text): UIDAI standard XXXX XXXX 1234
  if (
    lowerType.includes('id') ||
    lowerType.includes('national') ||
    lowerType.includes('aadhaar') ||
    lowerType.includes('encrypt') ||
    lowerKey.includes('id') ||
    lowerKey.includes('national') ||
    lowerKey.includes('aadhaar')
  ) {
    if (str.length >= 4) {
      const last4 = str.replace(/[^0-9a-zA-Z]/g, '').slice(-4);
      return `XXXX XXXX ${last4}`;
    }
    return 'XXXX XXXX ****';
  }

  // General text masking: keep first and last chars if long enough
  if (str.length > 6) {
    return `${str.slice(0, 2)}****${str.slice(-2)}`;
  }

  return '****';
}

module.exports = {
  parseCSV,
  toCSV,
  escapeCSVCell,
  maskValue
};
