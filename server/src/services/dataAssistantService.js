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

const getModel = (recordType) => MODELS[recordType];
const hasValue = (value) => value !== null && value !== undefined && String(value).trim() !== '';

const normalizeName = (recordType, record) => {
  const value = recordType === 'students'
    ? `${record.firstName || ''} ${record.lastName || ''}`
    : record.name || '';
  return value.normalize('NFKD').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
};

const similarity = (left, right) => {
  if (!left || !right) return 0;
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

const validEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
const parseDate = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const buildRecordFlags = (recordType, record) => {
  const flags = [];
  const id = String(record._id);
  const fields = REQUIRED_FIELDS[recordType];

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
        description: `Required field “${field}” is missing.`
      });
    }
  }

  const formatFields = recordType === 'students'
    ? [
        ['registrationNumber', (value) => value.trim().toUpperCase()],
        ['firstName', (value) => value.trim()],
        ['lastName', (value) => value.trim()],
        ['email', (value) => value.trim().toLowerCase()]
      ]
    : [
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
      if (field === 'email' && !validEmail(suggestion)) continue;
      flags.push({
        id: `${id}:inconsistent_format:${field}`,
        recordId: id,
        recordLabel: recordType === 'students'
          ? `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unnamed student'
          : record.name || 'Unnamed program',
        type: 'inconsistent_format',
        field,
        currentValue: value,
        suggestedValue: suggestion,
        relatedRecordId: null,
        description: `${field} has extra whitespace or inconsistent capitalization.`
      });
    }
  }

  if (recordType === 'students') {
    if (hasValue(record.dateOfBirth)) {
      const date = parseDate(record.dateOfBirth);
      if (!date || date > new Date()) {
        flags.push({
          id: `${id}:inconsistent_format:dateOfBirth`,
          recordId: id,
          recordLabel: `${record.firstName || ''} ${record.lastName || ''}`.trim() || 'Unnamed student',
          type: 'inconsistent_format',
          field: 'dateOfBirth',
          currentValue: String(record.dateOfBirth),
          suggestedValue: null,
          relatedRecordId: null,
          description: 'Date of birth is invalid or in the future; review it manually.'
        });
      }
    }
  } else if (record.startDate && record.endDate) {
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
        description: 'Program dates are invalid or the end date comes before the start date.'
      });
    }
  }

  return flags;
};

const areLikelyDuplicates = (recordType, left, right) => {
  if (recordType === 'programs') {
    const sameCode = hasValue(left.code) &&
      String(left.code).trim().toLowerCase() === String(right.code || '').trim().toLowerCase();
    const nameSimilarity = similarity(normalizeName(recordType, left), normalizeName(recordType, right));
    return sameCode || (nameSimilarity >= 0.92 && String(left.type || '').toLowerCase() === String(right.type || '').toLowerCase());
  }

  const nameSimilarity = similarity(normalizeName(recordType, left), normalizeName(recordType, right));
  const sameEmail = hasValue(left.email) &&
    String(left.email).trim().toLowerCase() === String(right.email || '').trim().toLowerCase();
  return (nameSimilarity >= 0.82 && sameEmail) ||
    (nameSimilarity >= 0.96 && !hasValue(left.email) && !hasValue(right.email));
};

const analyzeRecords = async (recordType, ngoFilter) => {
  const Model = getModel(recordType);
  if (!Model) throw Object.assign(new Error('Record type must be students or programs.'), { statusCode: 400 });

  const records = await Model.find(ngoFilter({})).select(
    recordType === 'students'
      ? 'firstName lastName registrationNumber email dateOfBirth createdAt'
      : 'name code type category startDate endDate createdAt'
  ).lean();
  const flags = records.flatMap((record) => buildRecordFlags(recordType, record));

  for (let leftIndex = 0; leftIndex < records.length; leftIndex += 1) {
    for (let rightIndex = leftIndex + 1; rightIndex < records.length; rightIndex += 1) {
      const left = records[leftIndex];
      const right = records[rightIndex];
      if (!areLikelyDuplicates(recordType, left, right)) continue;
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
        description: 'This record closely matches another record. Confirm or dismiss; no records will be merged or deleted.'
      });
    }
  }

  return { flags, scanned: records.length };
};

const sanitizeProposedValue = (recordType, field, proposedValue, record) => {
  if (typeof proposedValue !== 'string' || !proposedValue.trim()) {
    throw Object.assign(new Error('Enter a non-empty corrected value before accepting this fix.'), { statusCode: 400 });
  }
  const value = proposedValue.trim();
  const allowedFields = recordType === 'students'
    ? new Set(['registrationNumber', 'firstName', 'lastName', 'email', 'dateOfBirth'])
    : new Set(['name', 'code', 'type', 'category', 'startDate', 'endDate']);
  if (!allowedFields.has(field)) {
    throw Object.assign(new Error('This field cannot be changed by the data cleaning assistant.'), { statusCode: 400 });
  }

  if (['registrationNumber', 'code'].includes(field)) return value.toUpperCase();
  if (field === 'type') return value.toLowerCase();
  if (field === 'email') {
    const email = value.toLowerCase();
    if (!validEmail(email)) throw Object.assign(new Error('Enter a valid email address.'), { statusCode: 400 });
    return email;
  }
  if (['dateOfBirth', 'startDate', 'endDate'].includes(field)) {
    const date = parseDate(value);
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
      throw Object.assign(new Error('Enter a valid date in YYYY-MM-DD format.'), { statusCode: 400 });
    }
    if (field === 'dateOfBirth' && date > new Date()) {
      throw Object.assign(new Error('Date of birth cannot be in the future.'), { statusCode: 400 });
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

module.exports = { analyzeRecords, applyReview };
