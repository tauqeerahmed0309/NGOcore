const { RecordType, Record } = require('./model');
const { PREDEFINED_RECORD_TYPES } = require('./predefinedTypes');
const { encrypt, decrypt } = require('../../utils/encryption');
const { parseCSV, toCSV, maskValue } = require('../../utils/csv');
const { AuditLog } = require('../audit/model');
const { AppError } = require('../../utils/errors');

class RecordsService {
  /**
   * Seed standard non-profit record templates for an NGO
   */
  async seedPredefinedRecordTypes(ngoId) {
    const seededTypes = [];
    for (const t of PREDEFINED_RECORD_TYPES) {
      const doc = await RecordType.findOneAndUpdate(
        { ngoId, slug: t.slug },
        {
          $setOnInsert: {
            ngoId,
            name: t.name,
            slug: t.slug,
            prefix: t.prefix,
            icon: t.icon,
            description: t.description,
            fields: t.fields,
            isPredefined: true,
            isArchived: false
          }
        },
        { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
      );
      seededTypes.push(doc);
    }
    return seededTypes;
  }

  /**
   * Retrieve all record types for an NGO (auto-seeds defaults if none found)
   */
  async getRecordTypes(ngoId) {
    let types = await RecordType.find({ ngoId, isArchived: false }).sort({ isPredefined: -1, name: 1 });
    if (types.length === 0) {
      types = await this.seedPredefinedRecordTypes(ngoId);
    }
    return types;
  }

  /**
   * Create a new custom record type
   */
  async createRecordType(ngoId, { name, description, prefix, icon, fields }, user = null) {
    if (!name) {
      throw new AppError(400, 'Record type name is required');
    }

    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    const existing = await RecordType.findOne({ ngoId, slug });
    if (existing) {
      throw new AppError(409, `Record type with slug "${slug}" already exists for this organization`);
    }

    // Process and validate fields
    const processedFields = (fields || []).map((f) => {
      const key = f.key || f.name.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
      const isSensitive = Boolean(f.isSensitive || f.type === 'Encrypted Text');
      return {
        name: f.name,
        key,
        type: f.type || 'Text',
        required: Boolean(f.required),
        options: Array.isArray(f.options) ? f.options : [],
        isSensitive,
        placeholder: f.placeholder || ''
      };
    });

    const newType = await RecordType.create({
      ngoId,
      name,
      slug,
      prefix: (prefix || 'REC').toUpperCase(),
      icon: icon || 'FileText',
      description,
      fields: processedFields,
      isPredefined: false
    });

    if (user) {
      await AuditLog.create({
        ngoId,
        userId: user._id,
        action: 'CREATE_RECORD_TYPE',
        resource: 'record_types',
        resourceId: newType._id,
        details: { name: newType.name, slug: newType.slug, fieldCount: processedFields.length }
      }).catch(err => console.warn('AuditLog failed:', err.message));
    }

    return newType;
  }

  /**
   * Generate next sequential human-readable record number (e.g. BEN-2026-00001)
   */
  async generateRecordNumber(ngoId, recordType) {
    const year = new Date().getFullYear();
    const prefix = recordType.prefix || 'REC';
    const count = await Record.countDocuments({ ngoId, recordTypeId: recordType._id });
    const sequence = String(count + 1).padStart(5, '0');
    return `${prefix}-${year}-${sequence}`;
  }

  /**
   * Create a new record within a record type
   */
  async createRecord(ngoId, { recordTypeId, data, status = 'Submitted', tags = [] }, user = null, ip = null, userAgent = null) {
    const recordType = await RecordType.findOne({ _id: recordTypeId, ngoId, isArchived: false });
    if (!recordType) {
      throw new AppError(404, 'Record type not found or is archived');
    }

    // Validate payload against schema fields
    const payload = data instanceof Map ? Object.fromEntries(data) : (data || {});
    const processedData = {};
    const encryptedFields = [];

    for (const field of recordType.fields) {
      const val = payload[field.key];

      // Required validation
      if (field.required && (val === undefined || val === null || val === '')) {
        throw new AppError(400, `Field "${field.name}" (${field.key}) is required`);
      }

      if (val !== undefined && val !== null && val !== '') {
        if (field.isSensitive || field.type === 'Encrypted Text') {
          processedData[field.key] = encrypt(val);
          encryptedFields.push(field.key);
        } else {
          processedData[field.key] = val;
        }
      }
    }

    // Copy any extra arbitrary fields if supplied
    for (const [k, v] of Object.entries(payload)) {
      if (processedData[k] === undefined && v !== undefined) {
        processedData[k] = v;
      }
    }

    const recordNumber = await this.generateRecordNumber(ngoId, recordType);

    const record = await Record.create({
      ngoId,
      recordTypeId: recordType._id,
      recordNumber,
      status,
      data: processedData,
      encryptedFields,
      tags: Array.isArray(tags) ? tags : [],
      createdBy: user?._id || null,
      updatedBy: user?._id || null
    });

    // Write deterministic cryptographic audit log
    if (user) {
      await AuditLog.create({
        ngoId,
        userId: user._id,
        action: 'CREATE_RECORD',
        resource: 'records',
        resourceId: record._id,
        details: {
          recordNumber: record.recordNumber,
          recordType: recordType.name,
          encryptedFieldsCount: encryptedFields.length
        },
        ip,
        userAgent
      }).catch(err => console.warn('AuditLog failed:', err.message));
    }

    return this.decryptRecord(record, recordType);
  }

  /**
   * Query records with pagination, status filtering, and search
   */
  async getRecords(ngoId, {
    recordTypeId,
    status,
    search,
    page = 1,
    limit = 20,
    sort = '-createdAt'
  } = {}) {
    const query = { ngoId, isDeleted: false };

    if (recordTypeId) {
      query.recordTypeId = recordTypeId;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { recordNumber: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') }
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
    const skip = (pageNum - 1) * limitNum;

    const [records, total] = await Promise.all([
      Record.find(query)
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .populate('recordTypeId', 'name slug prefix icon fields')
        .populate('createdBy', 'name email')
        .lean(),
      Record.countDocuments(query)
    ]);

    // Decrypt records for consumer
    const decryptedRecords = records.map((rec) => {
      const typeFields = rec.recordTypeId?.fields || [];
      const sensitiveKeys = new Set(
        typeFields.filter((f) => f.isSensitive || f.type === 'Encrypted Text').map((f) => f.key)
      );

      const dataObj = rec.data instanceof Map ? Object.fromEntries(rec.data) : (rec.data || {});
      const plainData = {};

      for (const [k, v] of Object.entries(dataObj)) {
        if (sensitiveKeys.has(k) || (rec.encryptedFields && rec.encryptedFields.includes(k))) {
          plainData[k] = decrypt(v);
        } else {
          plainData[k] = v;
        }
      }

      return {
        ...rec,
        data: plainData
      };
    });

    return {
      records: decryptedRecords,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        pages: Math.ceil(total / limitNum)
      }
    };
  }

  /**
   * Get single record by ID with populated references and decrypted data
   */
  async getRecordById(ngoId, recordId) {
    const record = await Record.findOne({ _id: recordId, ngoId, isDeleted: false })
      .populate('recordTypeId', 'name slug prefix icon fields')
      .populate('createdBy', 'name email designation')
      .populate('updatedBy', 'name email designation');

    if (!record) {
      throw new AppError(404, 'Record not found');
    }

    return this.decryptRecord(record, record.recordTypeId);
  }

  /**
   * Update an existing record
   */
  async updateRecord(ngoId, recordId, { data, status, tags }, user = null, ip = null, userAgent = null) {
    const record = await Record.findOne({ _id: recordId, ngoId, isDeleted: false })
      .populate('recordTypeId');

    if (!record) {
      throw new AppError(404, 'Record not found');
    }

    const recordType = record.recordTypeId;
    const existingData = record.data instanceof Map ? Object.fromEntries(record.data) : (record.data || {});

    if (data) {
      const newPayload = data instanceof Map ? Object.fromEntries(data) : data;
      for (const [k, v] of Object.entries(newPayload)) {
        const fieldMeta = recordType.fields.find((f) => f.key === k);
        if (fieldMeta && (fieldMeta.isSensitive || fieldMeta.type === 'Encrypted Text')) {
          existingData[k] = encrypt(v);
          if (!record.encryptedFields.includes(k)) {
            record.encryptedFields.push(k);
          }
        } else {
          existingData[k] = v;
        }
      }
      record.data = existingData;
    }

    if (status) {
      record.status = status;
    }

    if (Array.isArray(tags)) {
      record.tags = tags;
    }

    if (user) {
      record.updatedBy = user._id;
    }

    await record.save();

    if (user) {
      await AuditLog.create({
        ngoId,
        userId: user._id,
        action: 'UPDATE_RECORD',
        resource: 'records',
        resourceId: record._id,
        details: { recordNumber: record.recordNumber, updatedFields: Object.keys(data || {}) },
        ip,
        userAgent
      }).catch(err => console.warn('AuditLog failed:', err.message));
    }

    return this.decryptRecord(record, recordType);
  }

  /**
   * Soft delete a record
   */
  async deleteRecord(ngoId, recordId, user = null, ip = null, userAgent = null) {
    const record = await Record.findOne({ _id: recordId, ngoId, isDeleted: false });
    if (!record) {
      throw new AppError(404, 'Record not found');
    }

    record.isDeleted = true;
    record.deletedAt = new Date();
    if (user) {
      record.deletedBy = user._id;
    }
    await record.save();

    if (user) {
      await AuditLog.create({
        ngoId,
        userId: user._id,
        action: 'DELETE_RECORD',
        resource: 'records',
        resourceId: record._id,
        details: { recordNumber: record.recordNumber, softDeleted: true },
        ip,
        userAgent
      }).catch(err => console.warn('AuditLog failed:', err.message));
    }

    return { success: true, message: 'Record safely archived (soft deleted)' };
  }

  /**
   * Generate downloadable CSV template for a specific record type
   */
  async generateTemplate(ngoId, recordTypeId) {
    const recordType = await RecordType.findOne({ _id: recordTypeId, ngoId, isArchived: false });
    if (!recordType) {
      throw new AppError(404, 'Record type not found');
    }

    const headers = recordType.fields.map((f) => f.name);
    const instructions = recordType.fields.map((f) => {
      const parts = [];
      parts.push(f.required ? 'Required' : 'Optional');
      if (f.isSensitive || f.type === 'Encrypted Text') parts.push('AES-256 Encrypted');
      if (f.type === 'Dropdown' && f.options?.length > 0) parts.push(`Options: ${f.options.slice(0, 3).join('/')}`);
      else parts.push(f.type);
      return `[${parts.join(' - ')}]`;
    });

    const sampleRow = recordType.fields.map((f) => {
      if (f.type === 'Date') return '2026-01-15';
      if (f.type === 'Number') return '10';
      if (f.type === 'Phone') return '+1 555-0199';
      if (f.type === 'Email') return 'sample@domain.org';
      if (f.type === 'Dropdown' && f.options?.length > 0) return f.options[0];
      return `Sample ${f.name}`;
    });

    const csvContent = [
      headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','),
      instructions.map(i => `"${i.replace(/"/g, '""')}"`).join(','),
      sampleRow.map(s => `"${s.replace(/"/g, '""')}"`).join(',')
    ].join('\r\n') + '\r\n';

    return {
      csv: csvContent,
      filename: `${recordType.slug}_template.csv`,
      recordType
    };
  }

  /**
   * Bulk import records from CSV or JSON row array with validation & AES encryption
   */
  async bulkImport(ngoId, recordTypeId, { csvText, rows, defaultStatus = 'Submitted', tags = [] }, user = null, ip = null, userAgent = null) {
    const recordType = await RecordType.findOne({ _id: recordTypeId, ngoId, isArchived: false });
    if (!recordType) {
      throw new AppError(404, 'Record type not found');
    }

    const rawRows = csvText ? parseCSV(csvText) : (Array.isArray(rows) ? rows : []);
    if (!rawRows || rawRows.length === 0) {
      throw new AppError(400, 'No records found in upload payload');
    }

    // Filter out instruction row if user kept the second row of the template
    const candidateRows = rawRows.filter(row => {
      const firstVal = String(Object.values(row)[0] || '');
      return !firstVal.startsWith('[');
    });

    const validDocs = [];
    const errors = [];

    // Map fields for fuzzy header matching
    const fieldMap = new Map();
    recordType.fields.forEach(f => {
      fieldMap.set(f.key.toLowerCase(), f);
      fieldMap.set(f.name.toLowerCase().replace(/[^a-z0-9_]+/g, '_'), f);
    });

    const startCount = await Record.countDocuments({ ngoId, recordTypeId: recordType._id });
    const year = new Date().getFullYear();
    const prefix = recordType.prefix || 'REC';

    for (let i = 0; i < candidateRows.length; i++) {
      const row = candidateRows[i];
      const rowNum = i + 1;
      const processedData = {};
      const encryptedFields = [];
      let rowValid = true;

      for (const field of recordType.fields) {
        // Find matching key in uploaded row
        let cellVal = undefined;
        const normKey = field.key.toLowerCase();
        const normName = field.name.toLowerCase().replace(/[^a-z0-9_]+/g, '_');

        for (const [k, v] of Object.entries(row)) {
          const cleanK = k.toLowerCase().replace(/[^a-z0-9_]+/g, '_');
          if (cleanK === normKey || cleanK === normName) {
            cellVal = v;
            break;
          }
        }

        // Validate required field
        if (field.required && (cellVal === undefined || cellVal === null || String(cellVal).trim() === '')) {
          errors.push({ row: rowNum, field: field.name, error: `Mandatory field "${field.name}" is missing or empty` });
          rowValid = false;
          break;
        }

        if (cellVal !== undefined && cellVal !== null && String(cellVal).trim() !== '') {
          const strVal = String(cellVal).trim();
          if (field.isSensitive || field.type === 'Encrypted Text') {
            processedData[field.key] = encrypt(strVal);
            encryptedFields.push(field.key);
          } else {
            processedData[field.key] = field.type === 'Number' ? Number(strVal) : strVal;
          }
        }
      }

      if (rowValid) {
        const seq = String(startCount + validDocs.length + 1).padStart(5, '0');
        const recordNumber = `${prefix}-${year}-${seq}`;

        validDocs.push({
          ngoId,
          recordTypeId: recordType._id,
          recordNumber,
          status: defaultStatus,
          data: processedData,
          encryptedFields,
          tags: Array.isArray(tags) ? tags : [],
          createdBy: user?._id || null,
          updatedBy: user?._id || null
        });
      }
    }

    let insertedRecords = [];
    if (validDocs.length > 0) {
      insertedRecords = await Record.insertMany(validDocs);
    }

    // Write deterministic cryptographic audit log
    if (user) {
      await AuditLog.create({
        ngoId,
        userId: user._id,
        action: 'BULK_IMPORT_RECORDS',
        resource: 'records',
        details: {
          recordType: recordType.name,
          totalRows: candidateRows.length,
          importedCount: insertedRecords.length,
          failedCount: errors.length
        },
        ip,
        userAgent
      }).catch(err => console.warn('AuditLog failed:', err.message));
    }

    return {
      totalRows: candidateRows.length,
      importedCount: insertedRecords.length,
      failedCount: errors.length,
      errors,
      sampleImported: insertedRecords.slice(0, 3).map(r => this.decryptRecord(r, recordType))
    };
  }

  /**
   * Bulk export records with optional privacy field masking
   */
  async bulkExport(ngoId, { recordTypeId, status, search, masked = false }, user = null, ip = null, userAgent = null) {
    const query = { ngoId, isDeleted: false };
    if (recordTypeId) query.recordTypeId = recordTypeId;
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { recordNumber: new RegExp(search, 'i') },
        { tags: new RegExp(search, 'i') }
      ];
    }

    const records = await Record.find(query)
      .sort({ createdAt: -1 })
      .limit(10000)
      .populate('recordTypeId', 'name slug prefix fields')
      .populate('createdBy', 'name email')
      .lean();

    // Determine all fields
    const headers = [
      { key: 'recordNumber', label: 'Record ID' },
      { key: 'recordType', label: 'Record Type' },
      { key: 'status', label: 'Status' },
      { key: 'createdAt', label: 'Created At' },
      { key: 'createdBy', label: 'Created By' }
    ];

    const dynamicKeysMap = new Map();
    records.forEach(r => {
      const typeFields = r.recordTypeId?.fields || [];
      typeFields.forEach(f => {
        if (!dynamicKeysMap.has(f.key)) {
          dynamicKeysMap.set(f.key, { label: f.name, type: f.type, isSensitive: f.isSensitive });
        }
      });
    });

    dynamicKeysMap.forEach((meta, k) => {
      headers.push({ key: `data_${k}`, label: meta.label });
    });

    const exportRows = records.map(r => {
      const dataObj = r.data instanceof Map ? Object.fromEntries(r.data) : (r.data || {});
      const row = {
        recordNumber: r.recordNumber,
        recordType: r.recordTypeId?.name || 'Standard',
        status: r.status,
        createdAt: r.createdAt ? new Date(r.createdAt).toISOString() : '',
        createdBy: r.createdBy?.name || 'System'
      };

      dynamicKeysMap.forEach((meta, k) => {
        let val = dataObj[k];
        if (val !== undefined && val !== null) {
          // Decrypt if encrypted
          val = decrypt(val);
          // Apply privacy masking if requested
          if (masked && (meta.isSensitive || meta.type === 'Encrypted Text' || meta.type === 'Phone' || meta.type === 'Email')) {
            val = maskValue(String(val), meta.type, k);
          }
        } else {
          val = '';
        }
        row[`data_${k}`] = val;
      });

      return row;
    });

    const csvContent = toCSV(exportRows, headers);

    if (user) {
      await AuditLog.create({
        ngoId,
        userId: user._id,
        action: 'EXPORT_RECORDS',
        resource: 'records',
        details: {
          exportedCount: records.length,
          masked: Boolean(masked),
          recordTypeId: recordTypeId || 'all'
        },
        ip,
        userAgent
      }).catch(err => console.warn('AuditLog failed:', err.message));
    }

    return {
      csv: csvContent,
      filename: `records_export_${masked ? 'masked_' : ''}${new Date().toISOString().slice(0, 10)}.csv`,
      count: records.length
    };
  }

  /**
   * Helper to decrypt sensitive fields in a record document
   */
  decryptRecord(recordDoc, recordType) {
    const recObj = recordDoc.toObject ? recordDoc.toObject() : { ...recordDoc };
    const fields = recordType?.fields || [];
    const sensitiveKeys = new Set(
      fields.filter((f) => f.isSensitive || f.type === 'Encrypted Text').map((f) => f.key)
    );

    const rawData = recObj.data instanceof Map ? Object.fromEntries(recObj.data) : (recObj.data || {});
    const plainData = {};

    for (const [k, v] of Object.entries(rawData)) {
      if (sensitiveKeys.has(k) || (recObj.encryptedFields && recObj.encryptedFields.includes(k))) {
        plainData[k] = decrypt(v);
      } else {
        plainData[k] = v;
      }
    }

    recObj.data = plainData;
    return recObj;
  }
}

module.exports = new RecordsService();
