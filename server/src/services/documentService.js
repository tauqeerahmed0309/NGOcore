const mongoose = require('mongoose');
const Document = require('../models/Document');
const Ngo = require('../models/Ngo');
const AuditLog = require('../models/AuditLog');
const { writeAuditLog } = require('./auditService');
const logger = require('../utils/logger');

const formatDocumentNumber = (seq) => `DOC-${String(seq).padStart(4, '0')}`;

const allocateNextDocumentNumber = async (ngoId) => {
  const ngo = await Ngo.findOneAndUpdate(
    { _id: ngoId },
    { $inc: { documentSequence: 1 } },
    { returnDocument: 'after', upsert: false }
  );

  if (!ngo) {
    throw new Error('Organization not found for document sequence allocation.');
  }

  return formatDocumentNumber(ngo.documentSequence);
};

const syncDocumentSequenceIfHigher = async (ngoId, customCode) => {
  const match = customCode.match(/^DOC-(\d+)$/i);
  if (match) {
    const customSeq = parseInt(match[1], 10);
    if (!isNaN(customSeq)) {
      await Ngo.updateOne(
        { _id: ngoId, documentSequence: { $lt: customSeq } },
        { $set: { documentSequence: customSeq } }
      );
    }
  }
};

const createDocument = async (docData, ngoId, actorUser) => {
  const maxRetries = 5;
  let attempt = 0;
  const isCustom = Boolean(docData.documentNumber?.trim());

  while (attempt < maxRetries) {
    attempt++;
    let candidateNumber;

    if (isCustom) {
      candidateNumber = docData.documentNumber.trim();
      const existing = await Document.findOne({ ngoId, documentNumber: candidateNumber });
      if (existing) {
        const err = new Error(`Document with number '${candidateNumber}' already exists in this organization.`);
        err.statusCode = 409;
        throw err;
      }
    } else {
      candidateNumber = await allocateNextDocumentNumber(ngoId);
    }

    try {
      const document = await Document.create({
        ...docData,
        documentNumber: candidateNumber,
        ngoId,
        uploadedBy: actorUser._id,
        verifiedBy: actorUser.role === 'admin' ? actorUser._id : null,
        verifiedAt: actorUser.role === 'admin' ? new Date() : null
      });

      if (isCustom) {
        await syncDocumentSequenceIfHigher(ngoId, candidateNumber);
      }

      try {
        await writeAuditLog({
          actor: actorUser,
          ngoId,
          action: 'create',
          entityType: 'document',
          entityId: document._id,
          metadata: {
            documentNumber: document.documentNumber,
            title: document.title,
            category: document.category,
            fileName: document.fileName
          }
        });
      } catch (auditErr) {
        logger.warn(`Failed to log document creation audit: ${auditErr.message}`);
      }

      logger.info(`Document created: [${document.documentNumber}] "${document.title}"`);
      return document;
    } catch (err) {
      if (err.code === 11000 && attempt < maxRetries && !isCustom) {
        logger.warn(`Document sequence collision on ${candidateNumber}. Retrying (attempt ${attempt}/${maxRetries})...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error('Failed to generate a unique document number after maximum retries.');
};

const verifyDocument = async (id, verificationData, ngoId, actorUser) => {
  const document = await Document.findOne({ _id: id, ngoId, isArchived: false });
  if (!document) {
    const err = new Error('Document record not found.');
    err.statusCode = 404;
    throw err;
  }

  document.status = verificationData.status;
  document.verifiedBy = actorUser._id;
  document.verifiedAt = new Date();
  await document.save();

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'update',
      entityType: 'document',
      entityId: document._id,
      metadata: {
        documentNumber: document.documentNumber,
        actionDetail: 'document_verified',
        newStatus: verificationData.status,
        notes: verificationData.verificationNotes || ''
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log document verification audit: ${auditErr.message}`);
  }

  return document;
};

const getDocuments = async (query = {}, ngoId) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = { ngoId, isArchived: false };

  if (query.category && query.category !== 'all') {
    filter.category = query.category;
  }

  if (query.status && query.status !== 'all') {
    filter.status = query.status;
  }

  if (query.associatedEntityType && query.associatedEntityType !== 'all') {
    filter.associatedEntityType = query.associatedEntityType;
  }

  if (query.expiredOnly) {
    filter.expiryDate = { $lte: new Date() };
  }

  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    const regex = new RegExp(term, 'i');
    filter.$or = [
      { title: regex },
      { documentNumber: regex },
      { fileName: regex },
      { description: regex },
      { tags: regex }
    ];
  }

  const sortField = query.sortBy || 'createdAt';
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortDirection };

  const [documents, total] = await Promise.all([
    Document.find(filter)
      .populate('uploadedBy', 'firstName lastName email role')
      .populate('verifiedBy', 'firstName lastName email role')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Document.countDocuments(filter)
  ]);

  return {
    documents,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

const getDocumentById = async (id, ngoId) => {
  const document = await Document.findOne({ _id: id, ngoId })
    .populate('uploadedBy', 'firstName lastName email role')
    .populate('verifiedBy', 'firstName lastName email role')
    .lean();

  if (!document) {
    const err = new Error('Document record not found.');
    err.statusCode = 404;
    throw err;
  }

  const auditLogs = await AuditLog.find({
    ngoId,
    entityType: 'document',
    entityId: id
  })
    .sort({ timestamp: -1 })
    .limit(20)
    .populate('actorId', 'firstName lastName email role')
    .lean();

  return {
    ...document,
    auditLogs
  };
};

const updateDocument = async (id, updateData, ngoId, actorUser) => {
  const document = await Document.findOne({ _id: id, ngoId, isArchived: false });
  if (!document) {
    const err = new Error('Document record not found.');
    err.statusCode = 404;
    throw err;
  }

  const allowedFields = [
    'title',
    'category',
    'associatedEntityType',
    'associatedEntityId',
    'status',
    'expiryDate',
    'tags',
    'description'
  ];

  const modifiedFields = [];
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      document[field] = updateData[field];
      modifiedFields.push(field);
    }
  });

  await document.save();

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'update',
      entityType: 'document',
      entityId: document._id,
      metadata: {
        documentNumber: document.documentNumber,
        modifiedFields
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log document update audit: ${auditErr.message}`);
  }

  return document;
};

const getDocumentSummary = async (ngoId) => {
  const objectIdNgo = new mongoose.Types.ObjectId(ngoId);
  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86400000);

  const [aggregationResult] = await Document.aggregate([
    { $match: { ngoId: objectIdNgo, isArchived: false } },
    {
      $facet: {
        statusCounts: [
          { $group: { _id: '$status', count: { $sum: 1 } } }
        ],
        categoryCounts: [
          { $group: { _id: '$category', count: { $sum: 1 } } }
        ],
        expiredCount: [
          {
            $match: {
              expiryDate: { $ne: null, $lte: now }
            }
          },
          { $count: 'count' }
        ],
        expiringSoonCount: [
          {
            $match: {
              expiryDate: { $gt: now, $lte: in30Days }
            }
          },
          { $count: 'count' }
        ],
        totals: [
          {
            $group: {
              _id: null,
              totalDocuments: { $sum: 1 },
              totalFileSize: { $sum: '$fileSize' }
            }
          }
        ]
      }
    }
  ]);

  const totals = aggregationResult?.totals?.[0] || {
    totalDocuments: 0,
    totalFileSize: 0
  };

  const statusMap = {
    active: 0,
    expired: 0,
    pending_verification: 0,
    archived: 0
  };
  (aggregationResult?.statusCounts || []).forEach((s) => {
    if (statusMap[s._id] !== undefined) statusMap[s._id] = s.count;
  });

  const categoryMap = {};
  (aggregationResult?.categoryCounts || []).forEach((c) => {
    categoryMap[c._id] = c.count;
  });

  const expiredCount = aggregationResult?.expiredCount?.[0]?.count || 0;
  const expiringSoonCount = aggregationResult?.expiringSoonCount?.[0]?.count || 0;

  return {
    totalDocuments: totals.totalDocuments,
    totalFileSize: totals.totalFileSize,
    statusCounts: statusMap,
    categoryCounts: categoryMap,
    expiredCount,
    expiringSoonCount
  };
};

const deleteDocument = async (id, ngoId, actorUser) => {
  const document = await Document.findOne({ _id: id, ngoId });
  if (!document) {
    const err = new Error('Document record not found.');
    err.statusCode = 404;
    throw err;
  }

  document.isArchived = true;
  document.status = 'archived';
  await document.save();

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'delete',
      entityType: 'document',
      entityId: id,
      metadata: {
        documentNumber: document.documentNumber,
        title: document.title
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log document archive audit: ${auditErr.message}`);
  }

  return { message: 'Document archived successfully.' };
};

const exportDocumentsCsv = async (query = {}, ngoId) => {
  const result = await getDocuments({ ...query, limit: 10000 }, ngoId);
  const documents = result.documents;

  const headers = [
    'Document #',
    'Title',
    'Category',
    'File Name',
    'File Size (KB)',
    'Status',
    'Expiry Date',
    'Associated Entity Type',
    'Uploaded By',
    'Verified By'
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    if (/^[=+@\-\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str}"`;
  };

  const rows = documents.map((doc) => [
    escapeCsv(doc.documentNumber),
    escapeCsv(doc.title),
    escapeCsv(doc.category),
    escapeCsv(doc.fileName),
    escapeCsv(Math.round(doc.fileSize / 1024)),
    escapeCsv(doc.status),
    escapeCsv(doc.expiryDate ? new Date(doc.expiryDate).toISOString().slice(0, 10) : 'None'),
    escapeCsv(doc.associatedEntityType),
    escapeCsv(doc.uploadedBy ? `${doc.uploadedBy.firstName} ${doc.uploadedBy.lastName}` : ''),
    escapeCsv(doc.verifiedBy ? `${doc.verifiedBy.firstName} ${doc.verifiedBy.lastName}` : 'Unverified')
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
};

module.exports = {
  createDocument,
  verifyDocument,
  getDocuments,
  getDocumentById,
  updateDocument,
  getDocumentSummary,
  deleteDocument,
  exportDocumentsCsv
};
