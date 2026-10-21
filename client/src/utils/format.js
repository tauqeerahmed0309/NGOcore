/**
 * Central Indian Localization & Formatting Utilities for NGOcore
 */

export const INDIAN_STATES = [
  // 28 States
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  // 8 Union Territories
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi (NCT)',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry'
];

export const NGO_REGISTRATION_TYPES = [
  'Registered Public Charitable Trust',
  'Registered Society (Societies Registration Act, 1860)',
  'Section 8 Company (Companies Act, 2013)',
  'Special Statutory Non-Profit Body'
];

export const CASTE_CATEGORIES = [
  'General',
  'Other Backward Classes (OBC)',
  'Scheduled Castes (SC)',
  'Scheduled Tribes (ST)',
  'Prefer not to disclose'
];

export const RATION_CARD_TYPES = [
  'Antyodaya Anna Yojana (AAY - Poorest of poor)',
  'Below Poverty Line (BPL / PHH Priority Household)',
  'Above Poverty Line (APL / Non-Priority)',
  'No Ration Card'
];

export const BENEFICIARY_PROGRAMS = [
  'Education Support & Scholarships',
  'Healthcare & Mobile Health Camps',
  'Nutrition & Food Security Drive',
  'Livelihood & Skill Training',
  'Disaster Relief & Rehabilitation',
  'Women Empowerment & Self Help',
  'Water & Sanitation (WASH)'
];

/**
 * Format currency to Indian Rupees with Indian digit grouping: ₹12,34,567
 */
export function formatCurrency(amount, includeSymbol = true) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return includeSymbol ? '₹0' : '0';
  }
  const num = Number(amount);
  const formatted = new Intl.NumberFormat('en-IN', {
    style: includeSymbol ? 'currency' : 'decimal',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(num);
  return formatted;
}

/**
 * Format large amounts into compact Indian units: ₹1.2 Lakh, ₹3.5 Crore
 */
export function formatIndianCompact(amount) {
  if (amount === null || amount === undefined || isNaN(Number(amount))) {
    return '₹0';
  }
  const num = Math.abs(Number(amount));
  const sign = Number(amount) < 0 ? '-' : '';

  if (num >= 10000000) {
    const cr = (num / 10000000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1');
    return `${sign}₹${cr} Crore`;
  }
  if (num >= 100000) {
    const lk = (num / 100000).toFixed(2).replace(/\.00$/, '').replace(/(\.[1-9])0$/, '$1');
    return `${sign}₹${lk} Lakh`;
  }
  if (num >= 1000) {
    const k = (num / 1000).toFixed(1).replace(/\.0$/, '');
    return `${sign}₹${k} K`;
  }
  return `${sign}${formatCurrency(num)}`;
}

/**
 * Format integer/numbers to Indian digit grouping (e.g. 12,34,567)
 */
export function formatIndianNumber(num) {
  if (num === null || num === undefined || isNaN(Number(num))) {
    return '0';
  }
  return new Intl.NumberFormat('en-IN').format(Number(num));
}

/**
 * Normalize Indian mobile numbers:
 * Accepts: "+91 98765 43210", "09876543210", "9876543210", "+919876543210"
 * Returns: "+919876543210" (E.164 compliant) or cleaned string
 */
export function normalizeIndianPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/[^0-9]/g, '');
  if (digits.length === 12 && digits.startsWith('91')) {
    return `+${digits}`;
  }
  if (digits.length === 11 && digits.startsWith('0')) {
    return `+91${digits.slice(1)}`;
  }
  if (digits.length === 10) {
    return `+91${digits}`;
  }
  return phone.trim();
}

/**
 * Display formatted phone: "+91 98765 43210"
 */
export function formatIndianPhone(phone) {
  if (!phone) return '';
  const digits = String(phone).replace(/[^0-9]/g, '');
  let mobile10 = '';
  if (digits.length === 12 && digits.startsWith('91')) {
    mobile10 = digits.slice(2);
  } else if (digits.length === 11 && digits.startsWith('0')) {
    mobile10 = digits.slice(1);
  } else if (digits.length === 10) {
    mobile10 = digits;
  }
  if (mobile10 && mobile10.length === 10) {
    return `+91 ${mobile10.slice(0, 5)} ${mobile10.slice(5)}`;
  }
  return phone;
}

/**
 * Validation Regexes
 */
export const INDIAN_PHONE_REGEX = /^(?:\+91|0)?[6-9]\d{9}$/;
export const INDIAN_PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const INDIAN_PINCODE_REGEX = /^[1-9][0-9]{5}$/;
export const INDIAN_GSTIN_REGEX = /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
export const NGO_DARPAN_REGEX = /^[A-Z]{2}\/\d{4}\/\d{7}$/i;
export const CSR1_REGEX = /^CSR\d{8}$/i;

export function isValidIndianPhone(phone) {
  if (!phone) return false;
  return INDIAN_PHONE_REGEX.test(String(phone).replace(/[\s\-]/g, ''));
}

export function isValidPan(pan) {
  if (!pan) return false;
  return INDIAN_PAN_REGEX.test(String(pan).trim().toUpperCase());
}

export function isValidPincode(pincode) {
  if (!pincode) return false;
  return INDIAN_PINCODE_REGEX.test(String(pincode).trim());
}

/**
 * Mask Aadhaar to standard Indian DPDP / UIDAI display format:
 * 'XXXX XXXX 1234'
 */
export function maskAadhaar(aadhaar) {
  if (!aadhaar) return '';
  const digits = String(aadhaar).replace(/[^0-9]/g, '');
  if (digits.length >= 4) {
    const last4 = digits.slice(-4);
    return `XXXX XXXX ${last4}`;
  }
  return 'XXXX XXXX ****';
}

/**
 * Format date in Indian convention (DD/MM/YYYY) in Asia/Kolkata
 */
export function formatDateIST(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    timeZone: 'Asia/Kolkata'
  }).format(d);
}

/**
 * Format datetime in Indian convention (DD/MM/YYYY, hh:mm A) in Asia/Kolkata
 */
export function formatDateTimeIST(date) {
  if (!date) return '';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    timeZone: 'Asia/Kolkata'
  }).format(d);
}

/**
 * Get Indian Financial Year (April 1 to March 31):
 * e.g. Oct 2026 -> "FY 2026-27", Feb 2026 -> "FY 2025-26"
 */
export function getCurrentFinancialYear(date = new Date()) {
  const d = new Date(date);
  const month = d.getMonth(); // 0 is January, 3 is April
  const year = d.getFullYear();
  if (month >= 3) {
    const nextYear = String(year + 1).slice(-2);
    return `FY ${year}-${nextYear}`;
  } else {
    const prevYear = year - 1;
    const curYear = String(year).slice(-2);
    return `FY ${prevYear}-${curYear}`;
  }
}
