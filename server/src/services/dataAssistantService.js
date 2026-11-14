const mongoose = require('mongoose');
const Student = require('../models/Student');
const Program = require('../models/Program');

const MODELS = {
  students: Student,
  programs: Program
};

const REQUIRED_FIELDS = {
  students: ['registrationNumber', 'firstName', 'lastName'],
  programs: ['name', 'code', 'type']
};

const CORRECTION_ALLOWED_FIELDS = {
  students: ['registrationNumber', 'firstName', 'lastName', 'email', 'dateOfBirth', 'phone', 'pinCode', 'state', 'address'],
  programs: ['name', 'code', 'type', 'category', 'startDate', 'endDate']
};

const getModel = (recordType) => MODELS[recordType];
const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== '';

const normalizeName = (recordType, record) => {
  const value = recordType === 'students'
    ? `${record.firstName || ''} ${record.lastName || ''}`
    : record.name || '';
  return value.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
};

const getTokens = (normalizedText) => {
  if (!normalizedText) return [];
  return normalizedText.split(/\s+/).filter(Boolean);
};

// Soundex phonetic encoder for blocking keys
const soundex = (text) => {
  if (!text) return '';
  const s = text.toUpperCase().replace(/[^A-Z]/g, '');
  if (!s) return '';
  const first = s[0];
  const map = {
    B: '1', F: '1', P: '1', V: '1',
    C: '2', G: '2', J: '2', K: '2', Q: '2', S: '2', X: '2', Z: '2',
    D: '3', T: '3',
    L: '4',
    M: '5', N: '5',
    R: '6'
  };
  let code = first;
  let prev = map[first] || '0';
  for (let i = 1; i < s.length && code.length < 4; i += 1) {
    const cur = map[s[i]] || '0';
    if (cur !== '0' && cur !== prev) {
      code += cur;
    }
    prev = cur;
  }
  return code.padEnd(4, '0');
};

const similarity = (left, right) => {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const rows = left.length + 1;
  const columns = right.length + 1;
  let previous = Array.from({ length: columns }, (_, index) => index);

  for (let row = 1; row < rows; row += 1) {
    const current = [row];
    for (let column = 1; column < columns; column += 1) {
      const substitutionCost = left[row - 1] === right[column - 1] ? 0 : 1;
      current[column] = Math.min(
        current[column - 1] + 1,
        previous[column] + 1,
        previous[column - 1] + substitutionCost
      );
    }
    previous = current;
  }

  return 1 - previous[columns - 1] / Math.max(left.length, right.length);
};

// Token Sort Ratio (matches swapped first/last name order)
const tokenSortSimilarity = (tokensA, tokensB) => {
  if (!tokensA.length && !tokensB.length) return 1;
  if (!tokensA.length || !tokensB.length) return 0;
  const sortedA = [...tokensA].sort().join(' ');
  const sortedB = [...tokensB].sort().join(' ');
  return similarity(sortedA, sortedB);
};

// Token Set Ratio (handles missing middle names, initials, or sub-strings)
const tokenSetSimilarity = (tokensA, tokensB) => {
  if (!tokensA.length && !tokensB.length) return 1;
  if (!tokensA.length || !tokensB.length) return 0;

  const setA = new Set(tokensA);
  const setB = new Set(tokensB);

  const intersection = [];
  const diffA = [];
  const diffB = [];

  for (const t of setA) {
    if (setB.has(t)) intersection.push(t);
    else diffA.push(t);
  }
  for (const t of setB) {
    if (!setA.has(t)) diffB.push(t);
  }

  intersection.sort();
  diffA.sort();
  diffB.sort();

  const strInter = intersection.join(' ');
  const strA = [...intersection, ...diffA].join(' ');
  const strB = [...intersection, ...diffB].join(' ');

  if (!intersection.length) {
    return similarity(strA, strB);
  }

  const s1 = similarity(strInter, strA);
  const s2 = similarity(strInter, strB);
  const s3 = similarity(strA, strB);

  return Math.max(s1, s2, s3);
};

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const parseDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

// Indian Phone Validator & Normalizer
const parseIndianPhone = (raw) => {
  if (!raw) return { valid: false, reason: 'empty' };
  const str = String(raw).trim();
  const cleaned = str.replace(/[\s\-\(\)\.]/g, '');
  if (!/^\+?[0-9]+$/.test(cleaned)) {
    return { valid: false, reason: 'contains non-numeric characters' };
  }
  let digits = cleaned;
  if (digits.startsWith('+91')) digits = digits.slice(3);
  else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
  else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
  if (/^0+$/.test(digits)) return { valid: false, reason: 'all zeros' };
  if (digits.length !== 10) return { valid: false, reason: `invalid length (${digits.length} digits, expected 10)` };
  if (!/^[6-9]/.test(digits)) return { valid: false, reason: `invalid mobile prefix (${digits[0]})` };

  const normalized = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
  return { valid: true, digits, normalized, needsFormatting: str !== normalized };
};

// Indian PIN Code Validator (Zone 1-8 per Indian Postal System)
const parseIndianPin = (raw) => {
  if (!raw) return { valid: false, reason: 'empty' };
  const str = String(raw).trim();
  const cleaned = str.replace(/\s+/g, '');
  if (!/^[0-9]+$/.test(cleaned)) {
    return { valid: false, reason: 'contains non-numeric characters' };
  }
  if (cleaned.length !== 6) {
    return { valid: false, reason: `invalid length (${cleaned.length} digits, expected 6)` };
  }
  if (/^0+$/.test(cleaned)) return { valid: false, reason: 'all zeros' };
  if (!/^[1-8]/.test(cleaned)) {
    return { valid: false, reason: `invalid postal zone prefix (${cleaned[0]})` };
  }
  return { valid: true, normalized: cleaned, needsFormatting: str !== cleaned };
};

// Title Case Formatter (preserves apostrophes like D'Souza and hyphens)
const toTitleCase = (str) => {
  if (!str) return '';
  return str.split(/(\s+)/).map((part) => {
    if (/^\s+$/.test(part)) return part;
    if (part.includes("'")) {
      return part.split("'").map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("'");
    }
    if (part.includes("-")) {
      return part.split("-").map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase()).join("-");
    }
    return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
  }).join('');
};

// Beneficiary DOB Validator (handles DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD, future dates & age bounds)
const parseBeneficiaryDOB = (raw) => {
  if (!raw) return { valid: false, reason: 'empty' };
  if (raw instanceof Date && !Number.isNaN(raw.getTime())) {
    const now = new Date();
    if (raw > now) return { valid: false, reason: 'future date of birth' };
    const age = (now - raw) / (365.25 * 24 * 3600 * 1000);
    if (age > 100) return { valid: false, reason: 'implausible age (> 100 years)' };
    const iso = raw.toISOString().split('T')[0];
    return { valid: true, date: raw, iso, needsFormatting: false };
  }

  const str = String(raw).trim();
  const dmyMatch = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmyMatch) {
    const day = parseInt(dmyMatch[1], 10);
    const month = parseInt(dmyMatch[2], 10);
    const year = parseInt(dmyMatch[3], 10);
    if (month < 1 || month > 12) return { valid: false, reason: 'invalid month in date of birth' };
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return { valid: false, reason: 'invalid calendar date' };
    const parsed = new Date(Date.UTC(year, month - 1, day));
    const now = new Date();
    if (parsed > now) return { valid: false, reason: 'future date of birth' };
    const age = (now - parsed) / (365.25 * 24 * 3600 * 1000);
    if (age > 100) return { valid: false, reason: 'implausible age (> 100 years)' };
    const mm = String(month).padStart(2, '0');
    const dd = String(day).padStart(2, '0');
    return { valid: true, date: parsed, iso: `${year}-${mm}-${dd}`, needsFormatting: true };
  }

  const isoMatch = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const year = parseInt(isoMatch[1], 10);
    const month = parseInt(isoMatch[2], 10);
    const day = parseInt(isoMatch[3], 10);
    if (month < 1 || month > 12) return { valid: false, reason: 'invalid month in date of birth' };
    const daysInMonth = new Date(year, month, 0).getDate();
    if (day < 1 || day > daysInMonth) return { valid: false, reason: 'invalid calendar date' };
    const parsed = new Date(Date.UTC(year, month - 1, day));
    const now = new Date();
    if (parsed > now) return { valid: false, reason: 'future date of birth' };
    const age = (now - parsed) / (365.25 * 24 * 3600 * 1000);
    if (age > 100) return { valid: false, reason: 'implausible age (> 100 years)' };
    return { valid: true, date: parsed, iso: str, needsFormatting: false };
  }

  const d = new Date(str);
  if (Number.isNaN(d.getTime())) {
    return { valid: false, reason: 'unparseable date string' };
  }
  const now = new Date();
  if (d > now) return { valid: false, reason: 'future date of birth' };
  const age = (now - d) / (365.25 * 24 * 3600 * 1000);
  if (age > 100) return { valid: false, reason: 'implausible age (> 100 years)' };
  return { valid: true, date: d, iso: d.toISOString().split('T')[0], needsFormatting: true };
};

const buildRecordFlags = (recordType, record) => {
  const flags = [];
  const id = String(record._id);
  const fields = REQUIRED_FIELDS[recordType];

  // 1. Missing Required Fields
  for (const field of fields) {
    if (!hasValue(record[field])) {
      flags.push({
        id: `${id}:missing_required:${field}`,
        recordId: id,
        recordLabel: recordType === 'students'
          ? `${record.firstName || 'Unnamed'} ${record.lastName || ''}`.trim()
          : record.name || 'Unnamed program',
        type: 'missing_required',
        field,
        currentValue: '',
        suggestedValue: null,
        relatedRecordId: null,
        severity: 'high',
        description: `Required field “${field}” is missing.`
      });
    }
  }

  // 2. Standard Formats & Casing for Core Fields
  if (recordType === 'students') {
    // Registration Number
    if (hasValue(record.registrationNumber)) {
      const reg = String(record.registrationNumber);
      const cleanedReg = reg.trim().toUpperCase().replace(/\s+/g, '');
      if (cleanedReg !== reg) {
        flags.push({
          id: `${id}:inconsistent_format:registrationNumber`,
          recordId: id,
          recordLabel: `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unnamed student',
          type: 'inconsistent_format',
          field: 'registrationNumber',
          currentValue: reg,
          suggestedValue: cleanedReg,
          relatedRecordId: null,
          severity: 'low',
          description: 'Registration number has extra whitespace or lowercase characters.'
        });
      }
    }

    // First Name
    if (hasValue(record.firstName)) {
      const fn = String(record.firstName);
      if (/[0-9@#$%^&*()_+={}\[\]:;"<>?\/\\|~`]/.test(fn)) {
        flags.push({
          id: `${id}:inconsistent_format:firstName`,
          recordId: id,
          recordLabel: `${fn} ${record.lastName || ''}`.trim() || 'Unnamed student',
          type: 'inconsistent_format',
          field: 'firstName',
          currentValue: fn,
          suggestedValue: null,
          relatedRecordId: null,
          severity: 'high',
          description: 'First name contains invalid numeric or special characters.'
        });
      } else {
        const cleanedFn = toTitleCase(fn.trim().replace(/\s+/g, ' '));
        if (cleanedFn !== fn) {
          flags.push({
            id: `${id}:inconsistent_format:firstName`,
            recordId: id,
            recordLabel: `${fn} ${record.lastName || ''}`.trim() || 'Unnamed student',
            type: 'inconsistent_format',
            field: 'firstName',
            currentValue: fn,
            suggestedValue: cleanedFn,
            relatedRecordId: null,
            severity: 'low',
            description: 'First name has extra whitespace or inconsistent capitalization.'
          });
        }
      }
    }

    // Last Name
    if (hasValue(record.lastName)) {
      const ln = String(record.lastName);
      if (/[0-9@#$%^&*()_+={}\[\]:;"<>?\/\\|~`]/.test(ln)) {
        flags.push({
          id: `${id}:inconsistent_format:lastName`,
          recordId: id,
          recordLabel: `${record.firstName || ''} ${ln}`.trim() || 'Unnamed student',
          type: 'inconsistent_format',
          field: 'lastName',
          currentValue: ln,
          suggestedValue: null,
          relatedRecordId: null,
          severity: 'high',
          description: 'Last name contains invalid numeric or special characters.'
        });
      } else {
        const cleanedLn = toTitleCase(ln.trim().replace(/\s+/g, ' '));
        if (cleanedLn !== ln) {
          flags.push({
            id: `${id}:inconsistent_format:lastName`,
            recordId: id,
            recordLabel: `${record.firstName || ''} ${ln}`.trim() || 'Unnamed student',
            type: 'inconsistent_format',
            field: 'lastName',
            currentValue: ln,
            suggestedValue: cleanedLn,
            relatedRecordId: null,
            severity: 'low',
            description: 'Last name has extra whitespace or inconsistent capitalization.'
          });
        }
      }
    }

    // Email
    if (hasValue(record.email)) {
      const em = String(record.email);
      const cleanedEm = em.trim().toLowerCase();
      if (cleanedEm !== em) {
        if (validEmail(cleanedEm)) {
          flags.push({
            id: `${id}:inconsistent_format:email`,
            recordId: id,
            recordLabel: `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unnamed student',
            type: 'inconsistent_format',
            field: 'email',
            currentValue: em,
            suggestedValue: cleanedEm,
            relatedRecordId: null,
            severity: 'low',
            description: 'Email address has extra whitespace or uppercase characters.'
          });
        } else {
          flags.push({
            id: `${id}:inconsistent_format:email`,
            recordId: id,
            recordLabel: `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unnamed student',
            type: 'inconsistent_format',
            field: 'email',
            currentValue: em,
            suggestedValue: null,
            relatedRecordId: null,
            severity: 'high',
            description: 'Email address format is invalid.'
          });
        }
      } else if (!validEmail(em)) {
        flags.push({
          id: `${id}:inconsistent_format:email`,
          recordId: id,
          recordLabel: `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unnamed student',
          type: 'inconsistent_format',
          field: 'email',
          currentValue: em,
          suggestedValue: null,
          relatedRecordId: null,
          severity: 'high',
          description: 'Email address format is invalid.'
        });
      }
    }

    // Phone (Indian Mobile Validation)
    if (hasValue(record.phone)) {
      const ph = String(record.phone);
      const phoneRes = parseIndianPhone(ph);
      if (!phoneRes.valid) {
        flags.push({
          id: `${id}:inconsistent_format:phone`,
          recordId: id,
          recordLabel: `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unnamed student',
          type: 'inconsistent_format',
          field: 'phone',
          currentValue: ph,
          suggestedValue: null,
          relatedRecordId: null,
          severity: 'high',
          description: `Phone number is invalid (${phoneRes.reason}). Expected 10-digit Indian mobile starting with 6-9.`
        });
      } else if (phoneRes.needsFormatting) {
        flags.push({
          id: `${id}:inconsistent_format:phone`,
          recordId: id,
          recordLabel: `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unnamed student',
          type: 'inconsistent_format',
          field: 'phone',
          currentValue: ph,
          suggestedValue: phoneRes.normalized,
          relatedRecordId: null,
          severity: 'low',
          description: 'Phone number has non-standard formatting; standardized format is +91 XXXXX XXXXX.'
        });
      }
    }

    // PIN Code (Indian Postal Code Validation)
    if (hasValue(record.pinCode)) {
      const pin = String(record.pinCode);
      const pinRes = parseIndianPin(pin);
      if (!pinRes.valid) {
        flags.push({
          id: `${id}:inconsistent_format:pinCode`,
          recordId: id,
          recordLabel: `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unnamed student',
          type: 'inconsistent_format',
          field: 'pinCode',
          currentValue: pin,
          suggestedValue: null,
          relatedRecordId: null,
          severity: 'high',
          description: `PIN code is invalid (${pinRes.reason}). Expected a valid 6-digit Indian PIN starting with digits 1-8.`
        });
      } else if (pinRes.needsFormatting) {
        flags.push({
          id: `${id}:inconsistent_format:pinCode`,
          recordId: id,
          recordLabel: `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unnamed student',
          type: 'inconsistent_format',
          field: 'pinCode',
          currentValue: pin,
          suggestedValue: pinRes.normalized,
          relatedRecordId: null,
          severity: 'low',
          description: 'PIN code contains extra whitespace.'
        });
      }
    }

    // Date of Birth & Age Plausibility
    if (hasValue(record.dateOfBirth)) {
      const dob = record.dateOfBirth;
      const dobRes = parseBeneficiaryDOB(dob);
      if (!dobRes.valid) {
        flags.push({
          id: `${id}:inconsistent_format:dateOfBirth`,
          recordId: id,
          recordLabel: `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unnamed student',
          type: 'inconsistent_format',
          field: 'dateOfBirth',
          currentValue: String(dob),
          suggestedValue: null,
          relatedRecordId: null,
          severity: 'high',
          description: `Date of birth is invalid (${dobRes.reason}).`
        });
      } else if (dobRes.needsFormatting) {
        flags.push({
          id: `${id}:inconsistent_format:dateOfBirth`,
          recordId: id,
          recordLabel: `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unnamed student',
          type: 'inconsistent_format',
          field: 'dateOfBirth',
          currentValue: String(dob),
          suggestedValue: dobRes.iso,
          relatedRecordId: null,
          severity: 'medium',
          description: 'Date of birth is in DD-MM-YYYY format; standardized format is YYYY-MM-DD.'
        });
      }
    }

    // State
    if (hasValue(record.state)) {
      const st = String(record.state);
      const cleanedState = toTitleCase(st.trim().replace(/\s+/g, ' '));
      if (cleanedState !== st) {
        flags.push({
          id: `${id}:inconsistent_format:state`,
          recordId: id,
          recordLabel: `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unnamed student',
          type: 'inconsistent_format',
          field: 'state',
          currentValue: st,
          suggestedValue: cleanedState,
          relatedRecordId: null,
          severity: 'low',
          description: 'State name has inconsistent capitalization or extra whitespace.'
        });
      }
    }

    // Address
    if (hasValue(record.address)) {
      const addr = String(record.address);
      const cleanedAddr = addr.trim().replace(/\s+/g, ' ');
      if (cleanedAddr !== addr) {
        flags.push({
          id: `${id}:inconsistent_format:address`,
          recordId: id,
          recordLabel: `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unnamed student',
          type: 'inconsistent_format',
          field: 'address',
          currentValue: addr,
          suggestedValue: cleanedAddr,
          relatedRecordId: null,
          severity: 'low',
          description: 'Address has leading, trailing, or consecutive whitespace.'
        });
      }
    }
  } else {
    // Programs formatting
    const formatFields = [
      ['name', (value) => value.trim()],
      ['code', (value) => value.trim().toUpperCase()],
      ['type', (value) => value.trim().toLowerCase()],
      ['category', (value) => value.trim()]
    ];

    for (const [field, normalize] of formatFields) {
      const value = record[field];
      if (typeof value !== 'string' || !value) continue;
      const suggestion = normalize(value);
      if (suggestion && suggestion !== value) {
        flags.push({
          id: `${id}:inconsistent_format:${field}`,
          recordId: id,
          recordLabel: record.name || 'Unnamed program',
          type: 'inconsistent_format',
          field,
          currentValue: value,
          suggestedValue: suggestion,
          relatedRecordId: null,
          severity: 'low',
          description: `${field} has extra whitespace or inconsistent capitalization.`
        });
      }
    }

    if (record.startDate && record.endDate) {
      const startDate = parseDate(record.startDate);
      const endDate = parseDate(record.endDate);
      if (!startDate || !endDate || endDate < startDate) {
        flags.push({
          id: `${id}:inconsistent_format:endDate`,
          recordId: id,
          recordLabel: record.name || 'Unnamed program',
          type: 'inconsistent_format',
          field: 'endDate',
          currentValue: String(record.endDate),
          suggestedValue: null,
          relatedRecordId: null,
          severity: 'high',
          description: 'Program dates are invalid or the end date comes before the start date.'
        });
      }
    }
  }

  return flags;
};

// Comprehensive scoring evaluating multiple dimensions (names, tokens, emails, codes, dates)
const scorePair = (recordType, left, right) => {
  if (recordType === 'programs') {
    const sameCode = hasValue(left.code) && hasValue(right.code) &&
      String(left.code).trim().toLowerCase() === String(right.code).trim().toLowerCase();
    if (sameCode) {
      return {
        isMatch: true,
        score: 1.0,
        confidence: 'high',
        matchedFields: ['code'],
        reason: 'Identical program code',
        description: '[High confidence: 100%] Identical program code. Confirm or dismiss; no records will be merged or deleted.'
      };
    }

    const normLeft = normalizeName(recordType, left);
    const normRight = normalizeName(recordType, right);
    const tokensLeft = getTokens(normLeft);
    const tokensRight = getTokens(normRight);
    const rawSim = similarity(normLeft, normRight);
    const sortSim = tokenSortSimilarity(tokensLeft, tokensRight);
    const nameSim = Math.max(rawSim, sortSim);
    const sameType = hasValue(left.type) && hasValue(right.type) &&
      String(left.type).trim().toLowerCase() === String(right.type).trim().toLowerCase();

    if (sameType && nameSim >= 0.88) {
      const confidence = nameSim >= 0.92 ? 'high' : 'medium';
      const pct = Math.round(nameSim * 100);
      return {
        isMatch: true,
        score: Math.round(nameSim * 100) / 100,
        confidence,
        matchedFields: ['name', 'type'],
        reason: `Matching program type and ${pct}% name similarity`,
        description: `[${confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence: ${pct}%] Matching program type and ${pct}% name similarity. Confirm or dismiss; no records will be merged or deleted.`
      };
    }

    if (nameSim >= 0.94) {
      const pct = Math.round(nameSim * 100);
      return {
        isMatch: true,
        score: Math.round(nameSim * 100) / 100,
        confidence: 'medium',
        matchedFields: ['name'],
        reason: `Highly similar program name (${pct}% match)`,
        description: `[Medium confidence: ${pct}%] Highly similar program name (${pct}% match). Confirm or dismiss; no records will be merged or deleted.`
      };
    }

    return { isMatch: false, score: nameSim, confidence: 'low', matchedFields: [], reason: '', description: '' };
  }

  // Beneficiary / Student Duplicate Scoring
  const normLeft = normalizeName(recordType, left);
  const normRight = normalizeName(recordType, right);
  const tokensLeft = getTokens(normLeft);
  const tokensRight = getTokens(normRight);

  const rawSim = similarity(normLeft, normRight);
  const sortSim = tokenSortSimilarity(tokensLeft, tokensRight);
  const setSim = tokenSetSimilarity(tokensLeft, tokensRight);
  const nameSim = Math.max(rawSim, sortSim, setSim);

  const emailLeft = hasValue(left.email) ? String(left.email).trim().toLowerCase() : '';
  const emailRight = hasValue(right.email) ? String(right.email).trim().toLowerCase() : '';
  const sameEmail = Boolean(emailLeft && emailRight && emailLeft === emailRight);
  const emailSim = (emailLeft && emailRight) ? similarity(emailLeft, emailRight) : 0;

  const dobLeft = parseDate(left.dateOfBirth);
  const dobRight = parseDate(right.dateOfBirth);
  const sameDob = Boolean(dobLeft && dobRight && dobLeft.getTime() === dobRight.getTime());

  // Rule 1: Exact email match with high name similarity
  if (sameEmail && nameSim >= 0.80) {
    const combinedScore = Math.round((0.5 * nameSim + 0.5) * 100) / 100;
    const pct = Math.round(nameSim * 100);
    return {
      isMatch: true,
      score: combinedScore,
      confidence: 'high',
      matchedFields: ['name', 'email'],
      reason: `Identical email and ${pct}% name match`,
      description: `[High confidence: ${Math.round(combinedScore * 100)}%] Identical email and ${pct}% name match. Confirm or dismiss; no records will be merged or deleted.`
    };
  }

  // Rule 2: Near-identical name with similar email address (handle variations like aarav@ vs aarav.sharma@)
  if (nameSim >= 0.90 && emailSim >= 0.80) {
    const combinedScore = Math.round((0.6 * nameSim + 0.4 * emailSim) * 100) / 100;
    const pct = Math.round(nameSim * 100);
    return {
      isMatch: true,
      score: combinedScore,
      confidence: 'high',
      matchedFields: ['name', 'email'],
      reason: `Matching name (${pct}%) and similar email address`,
      description: `[High confidence: ${Math.round(combinedScore * 100)}%] Matching name (${pct}%) and similar email address. Confirm or dismiss; no records will be merged or deleted.`
    };
  }

  // Rule 3: Identical Date of Birth and matching name
  if (sameDob && nameSim >= 0.85) {
    const combinedScore = Math.round((0.6 * nameSim + 0.4) * 100) / 100;
    const pct = Math.round(nameSim * 100);
    return {
      isMatch: true,
      score: combinedScore,
      confidence: 'high',
      matchedFields: ['name', 'dateOfBirth'],
      reason: `Identical date of birth and ${pct}% name match`,
      description: `[High confidence: ${Math.round(combinedScore * 100)}%] Identical date of birth and ${pct}% name match. Confirm or dismiss; no records will be merged or deleted.`
    };
  }

  // Rule 4: Swapped name tokens or high token similarity
  if (sortSim >= 0.94) {
    const pct = Math.round(sortSim * 100);
    const confidence = (sameEmail || !emailLeft || !emailRight) ? 'high' : 'medium';
    return {
      isMatch: true,
      score: Math.round(sortSim * 100) / 100,
      confidence,
      matchedFields: ['name'],
      reason: rawSim < 0.85 ? `Swapped name order (${pct}% token match)` : `Highly similar name (${pct}% match)`,
      description: `[${confidence.charAt(0).toUpperCase() + confidence.slice(1)} confidence: ${pct}%] ${rawSim < 0.85 ? 'Swapped name order' : 'Matching name tokens'}. Confirm or dismiss; no records will be merged or deleted.`
    };
  }

  // Rule 5: Pure name similarity when neither has email (legacy/unregistered beneficiaries)
  if (!emailLeft && !emailRight && nameSim >= 0.94) {
    const pct = Math.round(nameSim * 100);
    return {
      isMatch: true,
      score: Math.round(nameSim * 100) / 100,
      confidence: 'medium',
      matchedFields: ['name'],
      reason: `Highly similar beneficiary name (${pct}% match)`,
      description: `[Medium confidence: ${pct}%] Highly similar beneficiary name (${pct}% match). Confirm or dismiss; no records will be merged or deleted.`
    };
  }

  // Rule 6: Identical email with swapped name tokens
  if (sameEmail && sortSim >= 0.85) {
    const combinedScore = Math.round((0.5 * sortSim + 0.5) * 100) / 100;
    const pct = Math.round(sortSim * 100);
    return {
      isMatch: true,
      score: combinedScore,
      confidence: 'high',
      matchedFields: ['name', 'email'],
      reason: `Identical email and matching name tokens in swapped order (${pct}%)`,
      description: `[High confidence: ${Math.round(combinedScore * 100)}%] Identical email and matching name tokens in swapped order. Confirm or dismiss; no records will be merged or deleted.`
    };
  }

  return { isMatch: false, score: nameSim, confidence: 'low', matchedFields: [], reason: '', description: '' };
};

const areLikelyDuplicates = (recordType, left, right) => {
  return scorePair(recordType, left, right).isMatch;
};

// Multi-pass candidate generation (blocking) to eliminate O(N^2) unrestricted loops
const generateCandidatePairs = (recordType, records) => {
  const blocks = new Map();
  const addBlock = (key, idx) => {
    if (!key) return;
    let list = blocks.get(key);
    if (!list) {
      list = [];
      blocks.set(key, list);
    }
    list.push(idx);
  };

  for (let idx = 0; idx < records.length; idx += 1) {
    const rec = records[idx];
    if (recordType === 'programs') {
      if (hasValue(rec.code)) {
        addBlock(`code:${String(rec.code).trim().toLowerCase()}`, idx);
      }
      const norm = normalizeName(recordType, rec);
      const tokens = getTokens(norm);
      if (tokens.length > 0) {
        addBlock(`sort:${[...tokens].sort().join('_')}`, idx);
        if (hasValue(rec.type)) {
          addBlock(`type:${String(rec.type).trim().toLowerCase()}_${tokens[0].slice(0, 3)}`, idx);
        }
      }
    } else {
      const norm = normalizeName(recordType, rec);
      const tokens = getTokens(norm);
      const email = hasValue(rec.email) ? String(rec.email).trim().toLowerCase() : '';

      // Pass 1: Sorted name tokens (catches swapped first/last name order)
      if (tokens.length > 0) {
        addBlock(`sort:${[...tokens].sort().join('_')}`, idx);
        // Pass 2: Phonetic Soundex on sorted tokens (catches spelling variations)
        addBlock(`phonetic:${tokens.map(soundex).sort().join('_')}`, idx);
      }

      // Pass 3: Exact email & email local-part
      if (email) {
        addBlock(`email:${email}`, idx);
        const localPart = email.split('@')[0].replace(/[^a-z0-9]/g, '');
        if (localPart.length >= 4) {
          addBlock(`local:${localPart}`, idx);
        }
      }

      // Pass 4: Token 3-character prefixes (handles minor suffix/prefix edits)
      if (tokens.length >= 2) {
        addBlock(`pfx:${tokens[0].slice(0, 3)}_${tokens[1].slice(0, 3)}`, idx);
        addBlock(`pfx:${tokens[1].slice(0, 3)}_${tokens[0].slice(0, 3)}`, idx);
      }
    }
  }

  // Deduplicate candidate pairs so each pair is evaluated at most once
  const candidatePairs = [];
  const seenPairs = new Set();
  const maxBlockSize = Math.max(50, Math.floor(records.length * 0.05)); // prevent degenerate single-token explosion

  for (const group of blocks.values()) {
    if (group.length > 1 && group.length <= maxBlockSize) {
      for (let i = 0; i < group.length; i += 1) {
        for (let j = i + 1; j < group.length; j += 1) {
          const a = Math.min(group[i], group[j]);
          const b = Math.max(group[i], group[j]);
          const pairKey = `${a}:${b}`;
          if (!seenPairs.has(pairKey)) {
            seenPairs.add(pairKey);
            candidatePairs.push([a, b]);
          }
        }
      }
    }
  }

  return candidatePairs;
};

const analyzeRecords = async (recordType, ngoFilter) => {
  const Model = getModel(recordType);
  if (!Model) throw Object.assign(new Error('Record type must be students or programs.'), { statusCode: 400 });

  const records = await Model.find(ngoFilter({})).select(
    recordType === 'students'
      ? 'firstName lastName registrationNumber email dateOfBirth phone pinCode state address createdAt'
      : 'name code type category startDate endDate createdAt'
  ).lean();

  const flags = records.flatMap((record) => buildRecordFlags(recordType, record));

  // Generate candidate pairs via multi-pass blocking
  const candidatePairs = generateCandidatePairs(recordType, records);

  // Process candidate pairs in non-blocking cooperative chunks
  const CHUNK_SIZE = 500;
  for (let c = 0; c < candidatePairs.length; c += CHUNK_SIZE) {
    const chunk = candidatePairs.slice(c, c + CHUNK_SIZE);
    for (const [leftIndex, rightIndex] of chunk) {
      const left = records[leftIndex];
      const right = records[rightIndex];
      const matchResult = scorePair(recordType, left, right);
      if (!matchResult.isMatch) continue;

      const leftId = String(left._id);
      const rightId = String(right._id);
      flags.push({
        id: `${leftId}:possible_duplicate:${rightId}`,
        recordId: leftId,
        recordLabel: recordType === 'students'
          ? `${left.firstName || ''} ${left.lastName || ''}`.trim() || 'Unnamed student'
          : left.name || 'Unnamed program',
        type: 'possible_duplicate',
        field: '',
        currentValue: '',
        suggestedValue: null,
        relatedRecordId: rightId,
        relatedRecordLabel: recordType === 'students'
          ? `${right.firstName || ''} ${right.lastName || ''}`.trim() || 'Unnamed student'
          : right.name || 'Unnamed program',
        score: matchResult.score,
        confidence: matchResult.confidence,
        matchedFields: matchResult.matchedFields,
        reason: matchResult.reason,
        severity: matchResult.confidence === 'high' ? 'high' : 'medium',
        description: matchResult.description
      });
    }

    // Cooperative yield to keep Express event loop responsive during batch processing
    if (c + CHUNK_SIZE < candidatePairs.length) {
      await new Promise((resolve) => setImmediate(resolve));
    }
  }

  return { flags, scanned: records.length };
};

const sanitizeProposedValue = (recordType, field, proposedValue, record) => {
  if (typeof proposedValue !== 'string' || !proposedValue.trim()) {
    throw Object.assign(new Error('Enter a non-empty corrected value before accepting this fix.'), { statusCode: 400 });
  }
  const value = proposedValue.trim();
  const allowedFields = new Set(CORRECTION_ALLOWED_FIELDS[recordType] || []);
  if (!allowedFields.has(field)) {
    throw Object.assign(new Error('This field cannot be changed by the data cleaning assistant.'), { statusCode: 400 });
  }

  if (['registrationNumber', 'code'].includes(field)) return value.toUpperCase().replace(/\s+/g, '');
  if (field === 'type') return value.toLowerCase();
  if (field === 'email') {
    const email = value.toLowerCase();
    if (!validEmail(email)) throw Object.assign(new Error('Enter a valid email address.'), { statusCode: 400 });
    return email;
  }
  if (field === 'phone') {
    const phoneRes = parseIndianPhone(value);
    if (!phoneRes.valid) throw Object.assign(new Error(`Enter a valid 10-digit Indian mobile number (${phoneRes.reason}).`), { statusCode: 400 });
    return phoneRes.normalized;
  }
  if (field === 'pinCode') {
    const pinRes = parseIndianPin(value);
    if (!pinRes.valid) throw Object.assign(new Error(`Enter a valid 6-digit Indian PIN code (${pinRes.reason}).`), { statusCode: 400 });
    return pinRes.normalized;
  }
  if (['firstName', 'lastName'].includes(field)) {
    if (/[0-9@#$%^&*()_+={}\[\]:;"<>?\/\\|~`]/.test(value)) {
      throw Object.assign(new Error('Name cannot contain numeric or special characters.'), { statusCode: 400 });
    }
    return toTitleCase(value.replace(/\s+/g, ' '));
  }
  if (field === 'state') {
    return toTitleCase(value.replace(/\s+/g, ' '));
  }
  if (field === 'address') {
    return value.replace(/\s+/g, ' ');
  }
  if (['dateOfBirth', 'startDate', 'endDate'].includes(field)) {
    const date = parseDate(value);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw Object.assign(new Error('Enter a valid date in YYYY-MM-DD format.'), { statusCode: 400 });
    }
    if (field === 'dateOfBirth') {
      const dobRes = parseBeneficiaryDOB(date);
      if (!dobRes.valid) {
        throw Object.assign(new Error(`Invalid date of birth: ${dobRes.reason}`), { statusCode: 400 });
      }
    }
    const otherDate = field === 'startDate' ? record.endDate : record.startDate;
    const otherParsed = otherDate ? parseDate(otherDate) : null;
    if (field === 'endDate' && otherParsed && date < otherParsed) {
      throw Object.assign(new Error('Program end date cannot be before its start date.'), { statusCode: 400 });
    }
    if (field === 'startDate' && otherParsed && otherParsed < date) {
      throw Object.assign(new Error('Program end date cannot be before its start date.'), { statusCode: 400 });
    }
    return date;
  }
  if (value.length > 200) {
    throw Object.assign(new Error('Corrected value is too long.'), { statusCode: 400 });
  }
  return value;
};

const applyReview = async ({ recordType, recordId, issueType, field, relatedRecordId, decision, proposedValue, ngoFilter }) => {
  const Model = getModel(recordType);
  if (!Model) throw Object.assign(new Error('Record type must be students or programs.'), { statusCode: 400 });
  const record = await Model.findOne(ngoFilter({ _id: recordId }));
  if (!record) throw Object.assign(new Error('Record not found.'), { statusCode: 404 });

  if (issueType === 'possible_duplicate') {
    if (!relatedRecordId || relatedRecordId === recordId) {
      throw Object.assign(new Error('A valid matching record is required to review a duplicate.'), { statusCode: 400 });
    }
    const relatedRecord = await Model.findOne(ngoFilter({ _id: relatedRecordId }));
    if (!relatedRecord) throw Object.assign(new Error('Matching record not found.'), { statusCode: 404 });
    if (!areLikelyDuplicates(recordType, record, relatedRecord)) {
      throw Object.assign(new Error('These records are no longer flagged as likely duplicates.'), { statusCode: 409 });
    }
  } else if (decision === 'accept') {
    const flags = buildRecordFlags(recordType, record.toObject());
    const issue = flags.find((flag) => flag.type === issueType && flag.field === field);
    if (!issue) throw Object.assign(new Error('This data-quality issue is no longer present.'), { statusCode: 409 });
    const suggestion = issue.suggestedValue;
    const safeValue = suggestion === null
      ? sanitizeProposedValue(recordType, field, proposedValue, record)
      : suggestion;
    record.set(field, safeValue);
    await record.save();
  }

  return { record, applied: issueType !== 'possible_duplicate' && decision === 'accept' };
};

module.exports = {
  analyzeRecords,
  applyReview,
  areLikelyDuplicates,
  scorePair,
  generateCandidatePairs,
  buildRecordFlags,
  CORRECTION_ALLOWED_FIELDS
};
