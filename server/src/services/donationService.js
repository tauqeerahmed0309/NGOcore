const Donation = require('../models/Donation');
const Donor = require('../models/Donor');
const Program = require('../models/Program');
const Ngo = require('../models/Ngo');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const PDFDocument = require('pdfkit');
const { generateCsv, generateExcel, generatePdf } = require('../utils/exportGenerators');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

/**
 * Lazy-initializes and synchronizes the tenant donation sequence counter on the Ngo model.
 */
const ensureDonationSequenceSynchronized = async (ngoId) => {
  const ngo = await Ngo.findById(ngoId).select('donationSequence').lean();
  if (!ngo || ngo.donationSequence === undefined || ngo.donationSequence === null) {
    const existingDonations = await Donation.find({
      ngoId,
      donationNumber: /^DON-\d+$/
    })
      .select('donationNumber')
      .lean();

    let maxSeq = 0;
    for (const d of existingDonations) {
      const match = d.donationNumber.match(/^DON-(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxSeq) maxSeq = val;
      }
    }

    await Ngo.updateOne(
      {
        _id: ngoId,
        $or: [{ donationSequence: { $exists: false } }, { donationSequence: null }]
      },
      { $set: { donationSequence: maxSeq } },
      { timestamps: false }
    );
  }
};

/**
 * Atomically allocates the next sequential donation identifier scoped by NGO tenant.
 * Uses atomic $inc on the Ngo document. Format: DON-0001, DON-0002, ...
 */
const allocateNextDonationNumber = async (ngoId) => {
  await ensureDonationSequenceSynchronized(ngoId);

  const updatedNgo = await Ngo.findOneAndUpdate(
    { _id: ngoId },
    { $inc: { donationSequence: 1 } },
    { returnDocument: 'after', timestamps: false }
  );

  const seq = updatedNgo?.donationSequence || 1;
  return `DON-${String(seq).padStart(4, '0')}`;
};

/**
 * Lazy-initializes and synchronizes the tenant receipt sequence counter on the Ngo model.
 */
const ensureReceiptSequenceSynchronized = async (ngoId) => {
  const ngo = await Ngo.findById(ngoId).select('receiptSequence').lean();
  if (!ngo || ngo.receiptSequence === undefined || ngo.receiptSequence === null) {
    const existingReceipts = await Donation.find({
      ngoId,
      receiptNumber: /^RCP-\d+$/
    })
      .select('receiptNumber')
      .lean();

    let maxSeq = 0;
    for (const d of existingReceipts) {
      const match = d.receiptNumber?.match(/^RCP-(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxSeq) maxSeq = val;
      }
    }

    await Ngo.updateOne(
      {
        _id: ngoId,
        $or: [{ receiptSequence: { $exists: false } }, { receiptSequence: null }]
      },
      { $set: { receiptSequence: maxSeq } },
      { timestamps: false }
    );
  }
};

/**
 * Atomically allocates the next sequential receipt identifier scoped by NGO tenant.
 * Format: RCP-0001, RCP-0002, ...
 */
const allocateNextReceiptNumber = async (ngoId) => {
  await ensureReceiptSequenceSynchronized(ngoId);

  const updatedNgo = await Ngo.findOneAndUpdate(
    { _id: ngoId },
    { $inc: { receiptSequence: 1 } },
    { returnDocument: 'after', timestamps: false }
  );

  const seq = updatedNgo?.receiptSequence || 1;
  return `RCP-${String(seq).padStart(4, '0')}`;
};

/**
 * Decimal-safe round helper
 */
const roundCurrency = (val) => Math.round(Number(val) * 100) / 100;

/**
 * Create a new donation record
 */
const createDonation = async (data, user, ngoId, ngoFilter) => {
  // 1. Resolve Donor details & Snapshot
  let donor = null;
  let donorSnapshot = {
    name: 'Anonymous Donor',
    email: '',
    phone: '',
    donorNumber: '',
    type: 'individual'
  };

  if (data.donorId) {
    donor = await Donor.findOne(ngoFilter({ _id: data.donorId })).lean();
    if (!donor) {
      throw httpError(404, 'Specified donor record does not exist in this organization.');
    }
    donorSnapshot = {
      name: donor.name,
      email: donor.email || '',
      phone: donor.phone || '',
      donorNumber: donor.donorNumber || '',
      type: donor.type || 'individual'
    };
  } else if (data.donorSnapshot?.name) {
    donorSnapshot = {
      name: data.donorSnapshot.name.trim(),
      email: data.donorSnapshot.email?.trim().toLowerCase() || '',
      phone: data.donorSnapshot.phone?.trim() || '',
      donorNumber: data.donorSnapshot.donorNumber?.trim() || '',
      type: data.donorSnapshot.type || 'individual'
    };
  } else if (data.donorName) {
    donorSnapshot = {
      name: data.donorName.trim(),
      email: '',
      phone: '',
      donorNumber: '',
      type: 'individual'
    };
  }

  // 2. Resolve Program linkage (optional)
  if (data.programId) {
    const program = await Program.findOne(ngoFilter({ _id: data.programId })).select('_id name code').lean();
    if (!program) {
      throw httpError(404, 'Specified program does not exist in this organization.');
    }
  }

  // 3. Duplicate transaction reference check (for non-cash payments)
  const transactionReference = data.transactionReference?.trim().toUpperCase() || '';
  if (transactionReference && data.paymentMethod !== 'cash') {
    const duplicateTx = await Donation.findOne(
      ngoFilter({
        transactionReference,
        status: { $nin: ['cancelled', 'reversed'] }
      })
    ).lean();

    if (duplicateTx) {
      throw httpError(
        409,
        `A donation with transaction reference '${transactionReference}' already exists in this organization.`
      );
    }
  }

  // 4. Handle custom vs. auto-generated donationNumber
  let donationNumber = data.donationNumber?.trim().toUpperCase();
  const isAutoGenerated = !donationNumber;

  if (!isAutoGenerated) {
    const existing = await Donation.findOne(ngoFilter({ donationNumber })).lean();
    if (existing) {
      throw httpError(409, `Donation with number '${donationNumber}' already exists in this organization.`);
    }

    const donMatch = donationNumber.match(/^DON-(\d+)$/);
    if (donMatch) {
      const manualSeq = parseInt(donMatch[1], 10);
      if (!isNaN(manualSeq) && manualSeq > 0) {
        await ensureDonationSequenceSynchronized(ngoId);
        await Ngo.updateOne(
          { _id: ngoId, donationSequence: { $lt: manualSeq } },
          { $set: { donationSequence: manualSeq } },
          { timestamps: false }
        );
      }
    }
  }

  const safeAmount = roundCurrency(data.amount);
  const MAX_RETRIES = 5;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt++;
    if (isAutoGenerated) {
      donationNumber = await allocateNextDonationNumber(ngoId);
    }

    try {
      const donation = await Donation.create({
        ngoId,
        donationNumber,
        donorId: data.donorId || null,
        donorSnapshot,
        donationType: data.donationType || 'monetary',
        amount: safeAmount,
        currency: data.currency ? data.currency.toUpperCase() : 'INR',
        inKindDescription: data.inKindDescription?.trim() || '',
        donationDate: data.donationDate ? new Date(data.donationDate) : new Date(),
        paymentMethod: data.paymentMethod,
        transactionReference,
        category: data.category || 'general',
        purpose: data.purpose?.trim() || '',
        programId: data.programId || null,
        status: 'pending',
        notes: data.notes?.trim() || '',
        createdBy: user._id
      });

      logger.info(
        `Donation created: [${donation.donationNumber}] ${donation.currency} ${donation.amount} from ${donation.donorSnapshot.name}`
      );
      return donation;
    } catch (err) {
      const isDuplicateKey = err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000);
      if (isDuplicateKey) {
        if (!isAutoGenerated) {
          throw httpError(409, `Donation with number '${donationNumber}' already exists in this organization.`);
        }
        logger.warn(
          `Collision on auto-generated donation number '${donationNumber}' for NGO ${ngoId}. Retrying with next sequence (attempt ${attempt}/${MAX_RETRIES})...`
        );
        continue;
      }
      throw err;
    }
  }

  throw httpError(500, 'Failed to allocate a unique donation number after maximum retries.');
};

/**
 * List donations with search, filtering, sorting, and pagination
 */
const listDonations = async (queryParams, ngoFilter) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    donorId,
    programId,
    paymentMethod,
    category,
    status,
    currency,
    dateFrom,
    dateTo,
    sortBy = 'donationDate',
    sortOrder = 'desc'
  } = queryParams;

  const query = ngoFilter({});

  // Search across donationNumber, donor name, email, transactionReference, notes
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { donationNumber: searchRegex },
      { 'donorSnapshot.name': searchRegex },
      { 'donorSnapshot.email': searchRegex },
      { transactionReference: searchRegex },
      { notes: searchRegex }
    ];
  }

  // Exact filters
  if (donorId && donorId !== 'all') {
    query.donorId = donorId;
  }

  if (programId && programId !== 'all') {
    query.programId = programId;
  }

  if (paymentMethod && paymentMethod !== 'all') {
    query.paymentMethod = paymentMethod.trim().toLowerCase();
  }

  if (category && category !== 'all') {
    query.category = category.trim().toLowerCase();
  }

  if (status && status !== 'all') {
    query.status = status.trim().toLowerCase();
  }

  if (currency && currency !== 'all') {
    query.currency = currency.trim().toUpperCase();
  }

  // Date range
  if (dateFrom || dateTo) {
    query.donationDate = {};
    if (dateFrom) {
      query.donationDate.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      query.donationDate.$lte = toDate;
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const [totalDonations, donations] = await Promise.all([
    Donation.countDocuments(query),
    Donation.find(query)
      .populate('createdBy', 'firstName lastName email role')
      .populate('donorId', 'donorNumber name type email phone')
      .populate('programId', 'code name type')
      .populate('verifiedBy', 'firstName lastName email role')
      .populate('approvedBy', 'firstName lastName email role')
      .populate('cancelledBy', 'firstName lastName email role')
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true })
  ]);

  const totalPages = Math.max(1, Math.ceil(totalDonations / limitNum));

  return {
    donations,
    pagination: {
      totalDonations,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};

/**
 * Retrieve donation details with audit trail
 */
const getDonationById = async (id, ngoFilter) => {
  const donation = await Donation.findOne(ngoFilter({ _id: id }))
    .populate('createdBy', 'firstName lastName email role')
    .populate('donorId', 'donorNumber name type email phone address city state category')
    .populate('programId', 'code name type category status')
    .populate('verifiedBy', 'firstName lastName email role')
    .populate('approvedBy', 'firstName lastName email role')
    .populate('cancelledBy', 'firstName lastName email role')
    .populate('receiptIssuedBy', 'firstName lastName email role')
    .lean({ virtuals: true });

  if (!donation) {
    throw httpError(404, 'Donation record not found.');
  }

  const auditLogs = await AuditLog.find(
    ngoFilter({
      entityType: 'donation',
      entityId: String(id)
    })
  )
    .populate('actorId', 'firstName lastName email role')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return { donation, auditLogs };
};

/**
 * Update permitted fields on a donation
 * Guard: If status is 'approved' or 'verified', financial attributes are locked.
 */
const updateDonation = async (id, data, user, ngoFilter) => {
  const donation = await Donation.findOne(ngoFilter({ _id: id }));
  if (!donation) {
    throw httpError(404, 'Donation record not found.');
  }

  if (donation.status === 'cancelled' || donation.status === 'reversed') {
    throw httpError(400, `Cannot modify a donation in '${donation.status}' state.`);
  }

  const isFinancialLocked = donation.status === 'approved' || donation.status === 'verified';
  const modifiedFields = [];

  // Check if financial fields are being modified on a locked record
  const financialFields = ['amount', 'currency', 'donorId', 'donationType'];
  if (isFinancialLocked) {
    for (const f of financialFields) {
      if (data[f] !== undefined && data[f] !== null) {
        if (f === 'amount' && roundCurrency(data[f]) !== donation.amount) {
          throw httpError(
            400,
            `Financial integrity safeguard: Amount cannot be modified on an ${donation.status} donation. You must reverse/cancel this record with an audit justification.`
          );
        }
        if (f === 'currency' && data[f].toUpperCase() !== donation.currency) {
          throw httpError(
            400,
            `Financial integrity safeguard: Currency cannot be modified on an ${donation.status} donation.`
          );
        }
        if (f === 'donorId' && String(data[f]) !== String(donation.donorId)) {
          throw httpError(
            400,
            `Financial integrity safeguard: Linked donor cannot be changed on an ${donation.status} donation.`
          );
        }
      }
    }
  }

  // If pending, allow updating financial fields
  if (!isFinancialLocked) {
    if (data.amount !== undefined) {
      const newAmount = roundCurrency(data.amount);
      if (newAmount <= 0) {
        throw httpError(400, 'Donation amount must be strictly positive.');
      }
      if (donation.amount !== newAmount) {
        donation.amount = newAmount;
        modifiedFields.push('amount');
      }
    }

    if (data.currency && data.currency.toUpperCase() !== donation.currency) {
      donation.currency = data.currency.toUpperCase();
      modifiedFields.push('currency');
    }

    if (data.donationType && data.donationType !== donation.donationType) {
      donation.donationType = data.donationType;
      modifiedFields.push('donationType');
    }

    if (data.donorId !== undefined && String(data.donorId) !== String(donation.donorId)) {
      if (data.donorId) {
        const donor = await Donor.findOne(ngoFilter({ _id: data.donorId })).lean();
        if (!donor) throw httpError(404, 'Specified donor record does not exist.');
        donation.donorId = donor._id;
        donation.donorSnapshot = {
          name: donor.name,
          email: donor.email || '',
          phone: donor.phone || '',
          donorNumber: donor.donorNumber || '',
          type: donor.type || 'individual'
        };
      } else {
        donation.donorId = null;
      }
      modifiedFields.push('donorId');
    }
  }

  // Duplicate transaction reference check if changing reference
  if (data.transactionReference !== undefined) {
    const cleanRef = data.transactionReference.trim().toUpperCase();
    if (cleanRef !== donation.transactionReference) {
      if (cleanRef && (data.paymentMethod || donation.paymentMethod) !== 'cash') {
        const conflict = await Donation.findOne(
          ngoFilter({
            transactionReference: cleanRef,
            _id: { $ne: id },
            status: { $nin: ['cancelled', 'reversed'] }
          })
        ).lean();

        if (conflict) {
          throw httpError(
            409,
            `A donation with transaction reference '${cleanRef}' already exists in this organization.`
          );
        }
      }
      donation.transactionReference = cleanRef;
      modifiedFields.push('transactionReference');
    }
  }

  // Non-financial fields
  const nonFinancialFields = [
    'paymentMethod',
    'category',
    'purpose',
    'inKindDescription',
    'notes'
  ];

  nonFinancialFields.forEach((f) => {
    if (data[f] !== undefined && data[f] !== donation[f]) {
      donation[f] = typeof data[f] === 'string' ? data[f].trim() : data[f];
      modifiedFields.push(f);
    }
  });

  if (data.donationDate) {
    const newDate = new Date(data.donationDate);
    if (!isNaN(newDate.getTime()) && newDate.getTime() !== donation.donationDate.getTime()) {
      donation.donationDate = newDate;
      modifiedFields.push('donationDate');
    }
  }

  if (data.programId !== undefined && String(data.programId) !== String(donation.programId)) {
    if (data.programId) {
      const prog = await Program.findOne(ngoFilter({ _id: data.programId })).select('_id').lean();
      if (!prog) throw httpError(404, 'Specified program does not exist.');
      donation.programId = prog._id;
    } else {
      donation.programId = null;
    }
    modifiedFields.push('programId');
  }

  await donation.save();
  await donation.populate([
    { path: 'createdBy', select: 'firstName lastName email role' },
    { path: 'donorId', select: 'donorNumber name type' },
    { path: 'programId', select: 'code name' }
  ]);

  logger.info(
    `Donation updated: [${donation.donationNumber}] (modified: ${modifiedFields.join(', ') || 'none'})`
  );

  return { donation, modifiedFields };
};

/**
 * Verify a donation (Verification stage)
 */
const verifyDonation = async (id, user, ngoFilter) => {
  const donation = await Donation.findOne(ngoFilter({ _id: id }));
  if (!donation) {
    throw httpError(404, 'Donation record not found.');
  }

  if (donation.status === 'cancelled' || donation.status === 'reversed') {
    throw httpError(400, `Cannot verify a ${donation.status} donation.`);
  }

  if (donation.status === 'verified' || donation.status === 'approved') {
    throw httpError(400, `Donation is already in '${donation.status}' status.`);
  }

  donation.status = 'verified';
  donation.verifiedBy = user._id;
  donation.verifiedAt = new Date();

  await donation.save();
  await donation.populate('verifiedBy', 'firstName lastName email role');

  logger.info(`Donation verified: [${donation.donationNumber}] by ${user.email}`);
  return donation;
};

/**
 * Approve a donation (Approval stage)
 * Enforces separation of duties: Staff who created the donation CANNOT approve it.
 */
const approveDonation = async (id, user, ngoFilter) => {
  const donation = await Donation.findOne(ngoFilter({ _id: id }));
  if (!donation) {
    throw httpError(404, 'Donation record not found.');
  }

  if (donation.status === 'cancelled' || donation.status === 'reversed') {
    throw httpError(400, `Cannot approve a ${donation.status} donation.`);
  }

  if (donation.status === 'approved') {
    throw httpError(400, 'Donation is already approved.');
  }

  // Separation of duties rule: Staff cannot approve their own recorded donation
  if (user.role === 'staff' && String(donation.createdBy) === String(user._id)) {
    throw httpError(
      403,
      'Separation of duties violation: Staff members cannot approve donations they recorded. An administrator or another staff member must approve this donation.'
    );
  }

  donation.status = 'approved';
  donation.approvedBy = user._id;
  donation.approvedAt = new Date();

  // If not verified, also stamp verification
  if (!donation.verifiedBy) {
    donation.verifiedBy = user._id;
    donation.verifiedAt = new Date();
  }

  await donation.save();
  await donation.populate([
    { path: 'approvedBy', select: 'firstName lastName email role' },
    { path: 'verifiedBy', select: 'firstName lastName email role' }
  ]);

  logger.info(`Donation approved: [${donation.donationNumber}] by ${user.email} (${user.role})`);
  return donation;
};

/**
 * Cancel or reverse a donation
 * - If pending: marks 'cancelled'
 * - If verified or approved: marks 'reversed'
 * - Mandatory reason required
 */
const reverseDonation = async (id, reason, user, ngoFilter) => {
  if (!reason || reason.trim().length < 5) {
    throw httpError(400, 'A detailed reversal or cancellation reason of at least 5 characters is required.');
  }

  const donation = await Donation.findOne(ngoFilter({ _id: id }));
  if (!donation) {
    throw httpError(404, 'Donation record not found.');
  }

  if (donation.status === 'cancelled' || donation.status === 'reversed') {
    throw httpError(400, `Donation is already ${donation.status}.`);
  }

  const prevStatus = donation.status;
  const newStatus = prevStatus === 'pending' ? 'cancelled' : 'reversed';

  donation.status = newStatus;
  donation.reversalReason = reason.trim();
  donation.cancelledBy = user._id;
  donation.cancelledAt = new Date();

  await donation.save();
  await donation.populate('cancelledBy', 'firstName lastName email role');

  logger.info(`Donation ${newStatus}: [${donation.donationNumber}] reason: "${donation.reversalReason}" by ${user.email}`);
  return { donation, previousStatus: prevStatus, newStatus };
};

/**
 * In-process promise locks keyed by donation ID to prevent race conditions during sequence allocation.
 */
const donationReceiptLocks = new Map();

const withDonationReceiptLock = async (donationId, fn) => {
  const key = String(donationId);
  while (donationReceiptLocks.has(key)) {
    await donationReceiptLocks.get(key);
  }
  let resolveLock;
  const lockPromise = new Promise((resolve) => {
    resolveLock = resolve;
  });
  donationReceiptLocks.set(key, lockPromise);
  try {
    return await fn();
  } finally {
    donationReceiptLocks.delete(key);
    resolveLock();
  }
};

/**
 * Validates that a donation is eligible for receipt issuance or download.
 * Enforces donation.status === 'approved'.
 */
const validateReceiptEligibility = (donation) => {
  if (donation.status === 'cancelled') {
    throw httpError(400, 'Cannot generate receipt for a cancelled donation.');
  }
  if (donation.status === 'reversed') {
    throw httpError(400, 'Cannot generate receipt for a reversed donation.');
  }
  if (donation.status !== 'approved') {
    throw httpError(
      400,
      `Receipts can only be issued for approved donations. Current status: ${donation.status}.`
    );
  }
};

/**
 * Issue or retrieve receipt for an approved donation (state-mutating).
 * Uses atomic conditional update and keyed in-process locking to guarantee exact-once allocation.
 */
const issueReceipt = async (id, user, ngoFilter) => {
  return await withDonationReceiptLock(id, async () => {
    const donation = await Donation.findOne(ngoFilter({ _id: id }));
    if (!donation) {
      throw httpError(404, 'Donation record not found.');
    }

    validateReceiptEligibility(donation);

    // If receipt is already issued, return existing receipt without sequence drift
    if (donation.receiptNumber) {
      await donation.populate('receiptIssuedBy', 'firstName lastName email role');
      return {
        receiptNumber: donation.receiptNumber,
        issuedAt: donation.receiptIssuedAt,
        isExisting: true,
        donation
      };
    }

    // Atomically allocate next receipt number for this NGO tenant
    const receiptNumber = await allocateNextReceiptNumber(donation.ngoId);
    const now = new Date();

    // Conditional atomic assignment on the document: ensures no concurrent overwrite
    const updated = await Donation.findOneAndUpdate(
      ngoFilter({
        _id: id,
        status: 'approved',
        $or: [
          { receiptNumber: { $exists: false } },
          { receiptNumber: null },
          { receiptNumber: '' }
        ]
      }),
      {
        $set: {
          receiptNumber,
          receiptIssuedAt: now,
          receiptIssuedBy: user._id
        }
      },
      { returnDocument: 'after' }
    ).populate('receiptIssuedBy', 'firstName lastName email role');

    if (updated) {
      logger.info(`Receipt generated: [${receiptNumber}] for donation [${updated.donationNumber}] by ${user.email}`);
      return {
        receiptNumber: updated.receiptNumber,
        issuedAt: updated.receiptIssuedAt,
        isExisting: false,
        donation: updated
      };
    }

    // If another request concurrently won the race, fetch the winning receipt
    const winningRecord = await Donation.findOne(ngoFilter({ _id: id }))
      .populate('receiptIssuedBy', 'firstName lastName email role');

    return {
      receiptNumber: winningRecord.receiptNumber,
      issuedAt: winningRecord.receiptIssuedAt,
      isExisting: true,
      donation: winningRecord
    };
  });
};

/**
 * Pure read-only retrieval of existing receipt metadata.
 * Never mutates state or allocates sequence numbers.
 */
const getReceiptMetadata = async (id, ngoFilter) => {
  const donation = await Donation.findOne(ngoFilter({ _id: id }))
    .populate('receiptIssuedBy', 'firstName lastName email role')
    .lean({ virtuals: true });

  if (!donation) {
    throw httpError(404, 'Donation record not found.');
  }

  if (!donation.receiptNumber) {
    throw httpError(404, 'No receipt has been issued for this donation.');
  }

  return {
    receiptNumber: donation.receiptNumber,
    issuedAt: donation.receiptIssuedAt,
    issuedBy: donation.receiptIssuedBy,
    donation
  };
};

/**
 * Generate PDF buffer for an official donation receipt using PDFKit.
 * Strictly read-only: requires approved status and pre-issued receiptNumber.
 */
const generateReceiptPdfBuffer = async (id, ngoFilter) => {
  const donation = await Donation.findOne(ngoFilter({ _id: id }))
    .populate('donorId')
    .populate('ngoId')
    .populate('createdBy', 'firstName lastName')
    .populate('approvedBy', 'firstName lastName')
    .populate('receiptIssuedBy', 'firstName lastName email role')
    .lean();

  if (!donation) {
    throw httpError(404, 'Donation record not found.');
  }

  validateReceiptEligibility(donation);

  if (!donation.receiptNumber) {
    throw httpError(
      400,
      'Cannot download receipt PDF. An official receipt has not been issued for this donation yet. Please issue a receipt first.'
    );
  }

  const ngo = await Ngo.findById(donation.ngoId).lean();
  const receiptNumber = donation.receiptNumber;

  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const buffers = [];

      doc.on('data', (chunk) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', (err) => reject(err));

      const pageWidth = doc.page.width;
      const contentWidth = pageWidth - 80;

      // Outer Decorative Border
      doc.rect(30, 30, pageWidth - 60, doc.page.height - 60)
        .lineWidth(1.5)
        .strokeColor('#0F766E') // Teal-700
        .stroke();

      doc.rect(34, 34, pageWidth - 68, doc.page.height - 68)
        .lineWidth(0.5)
        .strokeColor('#99F6E4')
        .stroke();

      // Top Banner
      doc.rect(35, 35, pageWidth - 70, 70).fill('#0F766E');

      doc.fontSize(18).font('Helvetica-Bold').fillColor('#FFFFFF')
        .text((ngo?.name || 'NGO ORGANIZATION').toUpperCase(), 45, 45, { align: 'center' });

      doc.fontSize(10).font('Helvetica').fillColor('#CCFBF1')
        .text('DONATION ACKNOWLEDGMENT RECEIPT', 45, 68, { align: 'center' });

      if (ngo?.registrationNumber) {
        doc.fontSize(8).fillColor('#E6FFFA')
          .text(`Reg. No: ${ngo.registrationNumber}`, 45, 83, { align: 'center' });
      }

      // Receipt Meta Header Box
      let y = 125;
      doc.rect(45, y, contentWidth, 40).fill('#F0FDFA');
      doc.rect(45, y, contentWidth, 40).lineWidth(0.5).strokeColor('#99F6E4').stroke();

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F766E')
        .text(`Receipt No: ${receiptNumber}`, 55, y + 10);
      doc.fontSize(9).font('Helvetica').fillColor('#334155')
        .text(`Date of Issue: ${new Date(donation.receiptIssuedAt || Date.now()).toLocaleDateString('en-IN')}`, 55, y + 24);

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#0F766E')
        .text(`Donation No: ${donation.donationNumber}`, 320, y + 10);
      doc.fontSize(9).font('Helvetica').fillColor('#334155')
        .text(`Donation Date: ${new Date(donation.donationDate).toLocaleDateString('en-IN')}`, 320, y + 24);

      // Donor Information Block
      y = 180;
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F766E')
        .text('DONOR DETAILS', 45, y);
      y += 18;

      doc.fontSize(9).font('Helvetica-Bold').fillColor('#1E293B')
        .text('Received with gratitude from:', 45, y);
      doc.font('Helvetica').fillColor('#334155')
        .text(donation.donorSnapshot?.name || 'Valued Supporter', 190, y);
      y += 16;

      if (donation.donorSnapshot?.donorNumber) {
        doc.font('Helvetica-Bold').fillColor('#1E293B').text('Donor ID:', 45, y);
        doc.font('Helvetica').fillColor('#334155').text(donation.donorSnapshot.donorNumber, 190, y);
        y += 16;
      }

      if (donation.donorSnapshot?.email) {
        doc.font('Helvetica-Bold').fillColor('#1E293B').text('Email Address:', 45, y);
        doc.font('Helvetica').fillColor('#334155').text(donation.donorSnapshot.email, 190, y);
        y += 16;
      }

      if (donation.donorSnapshot?.phone) {
        doc.font('Helvetica-Bold').fillColor('#1E293B').text('Phone:', 45, y);
        doc.font('Helvetica').fillColor('#334155').text(donation.donorSnapshot.phone, 190, y);
        y += 16;
      }

      // Divider line
      y += 8;
      doc.moveTo(45, y).lineTo(45 + contentWidth, y).strokeColor('#E2E8F0').lineWidth(0.5).stroke();
      y += 16;

      // Contribution Particulars Table
      doc.fontSize(11).font('Helvetica-Bold').fillColor('#0F766E')
        .text('CONTRIBUTION DETAILS', 45, y);
      y += 18;

      doc.rect(45, y, contentWidth, 22).fill('#14B8A6');
      doc.fontSize(9).font('Helvetica-Bold').fillColor('#FFFFFF')
        .text('Description / Purpose', 55, y + 6);
      doc.text('Payment Method', 240, y + 6);
      doc.text('Reference No.', 360, y + 6);
      doc.text(`Amount (${donation.currency})`, 45 + contentWidth - 85, y + 6, { align: 'right', width: 75 });
      y += 22;

      // Table Row
      doc.rect(45, y, contentWidth, 32).fill('#F8FAFC');
      doc.rect(45, y, contentWidth, 32).lineWidth(0.5).strokeColor('#CBD5E1').stroke();

      const purposeText = `${donation.category?.toUpperCase()}${donation.purpose ? ` — ${donation.purpose}` : ''}`;
      doc.fontSize(8.5).font('Helvetica').fillColor('#1E293B')
        .text(purposeText, 55, y + 8, { width: 175, ellipsis: true });
      doc.text(donation.paymentMethod?.replace('_', ' ').toUpperCase(), 240, y + 8);
      doc.text(donation.transactionReference || 'N/A', 360, y + 8, { width: 90, ellipsis: true });
      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0F766E')
        .text(`${donation.amount.toFixed(2)}`, 45 + contentWidth - 85, y + 8, { align: 'right', width: 75 });
      y += 42;

      // Total Callout Banner
      doc.rect(45, y, contentWidth, 38).fill('#F0FDFA');
      doc.rect(45, y, contentWidth, 38).lineWidth(1).strokeColor('#0F766E').stroke();

      doc.fontSize(10).font('Helvetica-Bold').fillColor('#0F766E')
        .text('TOTAL AMOUNT RECEIVED:', 55, y + 13);
      doc.fontSize(13).font('Helvetica-Bold').fillColor('#0F766E')
        .text(`${donation.currency} ${donation.amount.toFixed(2)}`, 45 + contentWidth - 160, y + 11, {
          align: 'right',
          width: 150
        });
      y += 54;

      if (donation.donationType === 'in_kind' && donation.inKindDescription) {
        doc.fontSize(9).font('Helvetica-Bold').fillColor('#1E293B').text('In-Kind Details:', 45, y);
        doc.font('Helvetica').fillColor('#475569').text(donation.inKindDescription, 140, y, { width: contentWidth - 100 });
        y += 26;
      }

      // Legal & Compliance Disclaimer
      y = Math.max(y + 10, doc.page.height - 180);
      doc.rect(45, y, contentWidth, 45).fill('#F8FAFC');
      doc.rect(45, y, contentWidth, 45).lineWidth(0.5).strokeColor('#E2E8F0').stroke();

      doc.fontSize(7.5).font('Helvetica-Bold').fillColor('#475569')
        .text('STATUTORY AND RECEIPT NOTICE:', 55, y + 7);
      doc.font('Helvetica').fillColor('#64748B').text(
        'This receipt officially acknowledges voluntary contribution of funds/goods for social welfare and charitable causes. It is systematically issued from NGOcore. Eligibility for tax deduction (e.g., Section 80G / 501(c)(3)) requires verified statutory certificates on file with the organization.',
        55,
        y + 18,
        { width: contentWidth - 20, lineGap: 1.5 }
      );
      y += 55;

      // Authorized Signatory Block
      doc.fontSize(8.5).font('Helvetica-Bold').fillColor('#334155')
        .text('Authorized Signatory', 45 + contentWidth - 150, y, { align: 'center', width: 140 });
      doc.fontSize(7.5).font('Helvetica').fillColor('#64748B')
        .text(ngo?.name || 'NGO Organization', 45 + contentWidth - 150, y + 12, { align: 'center', width: 140 });

      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};

/**
 * Get tenant-scoped donation summaries and analytics
 */
const getDonationSummary = async (ngoFilter) => {
  const pipeline = [
    { $match: ngoFilter({}) },
    {
      $facet: {
        statusCounts: [
          {
            $group: {
              _id: '$status',
              count: { $sum: 1 }
            }
          }
        ],
        currencyTotals: [
          {
            $group: {
              _id: { $ifNull: ['$currency', 'INR'] },
              count: { $sum: 1 },
              grossCents: {
                $sum: {
                  $cond: [
                    { $ne: ['$status', 'cancelled'] },
                    { $round: [{ $multiply: [{ $ifNull: ['$amount', 0] }, 100] }, 0] },
                    0
                  ]
                }
              },
              netCents: {
                $sum: {
                  $cond: [
                    { $in: ['$status', ['verified', 'approved']] },
                    { $round: [{ $multiply: [{ $ifNull: ['$amount', 0] }, 100] }, 0] },
                    0
                  ]
                }
              },
              pendingCents: {
                $sum: {
                  $cond: [
                    { $eq: ['$status', 'pending'] },
                    { $round: [{ $multiply: [{ $ifNull: ['$amount', 0] }, 100] }, 0] },
                    0
                  ]
                }
              },
              reversedCents: {
                $sum: {
                  $cond: [
                    { $eq: ['$status', 'reversed'] },
                    { $round: [{ $multiply: [{ $ifNull: ['$amount', 0] }, 100] }, 0] },
                    0
                  ]
                }
              }
            }
          }
        ],
        paymentMethods: [
          {
            $match: {
              status: { $ne: 'cancelled' }
            }
          },
          {
            $group: {
              _id: { $ifNull: ['$paymentMethod', 'other'] },
              count: { $sum: 1 }
            }
          }
        ],
        categories: [
          {
            $match: {
              status: { $ne: 'cancelled' }
            }
          },
          {
            $group: {
              _id: { $ifNull: ['$category', 'general'] },
              count: { $sum: 1 }
            }
          }
        ],
        monthlyTrends: [
          {
            $match: {
              status: { $ne: 'cancelled' },
              donationDate: { $type: 'date' }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m',
                  date: '$donationDate'
                }
              },
              count: { $sum: 1 },
              amountCents: {
                $sum: { $round: [{ $multiply: [{ $ifNull: ['$amount', 0] }, 100] }, 0] }
              }
            }
          },
          {
            $sort: { _id: 1 }
          }
        ]
      }
    }
  ];

  const results = await Donation.aggregate(pipeline);
  const facetResult = results[0] || {};

  const statusCounts = {
    pending: 0,
    verified: 0,
    approved: 0,
    cancelled: 0,
    reversed: 0,
    total: 0
  };
  let total = 0;
  (facetResult.statusCounts || []).forEach((item) => {
    if (item._id && statusCounts[item._id] !== undefined) {
      statusCounts[item._id] = item.count;
    }
    total += item.count;
  });
  statusCounts.total = total;

  const formattedCurrencies = {};
  (facetResult.currencyTotals || []).forEach((c) => {
    const cur = c._id;
    formattedCurrencies[cur] = {
      currency: cur,
      gross: Math.round(c.grossCents) / 100,
      netCollected: Math.round(c.netCents) / 100,
      pending: Math.round(c.pendingCents) / 100,
      reversed: Math.round(c.reversedCents) / 100,
      count: c.count
    };
  });

  const paymentMethodBreakdown = {};
  (facetResult.paymentMethods || []).forEach((item) => {
    if (item._id) {
      paymentMethodBreakdown[item._id] = item.count;
    }
  });

  const categoryBreakdown = {};
  (facetResult.categories || []).forEach((item) => {
    if (item._id) {
      categoryBreakdown[item._id] = item.count;
    }
  });

  const monthlyTrends = (facetResult.monthlyTrends || [])
    .filter((m) => m._id)
    .sort((a, b) => a._id.localeCompare(b._id))
    .slice(-12)
    .map((m) => ({
      month: m._id,
      count: m.count,
      amount: Math.round(m.amountCents) / 100
    }));

  return {
    statusCounts,
    totalsByCurrency: formattedCurrencies,
    paymentMethodBreakdown,
    categoryBreakdown,
    monthlyTrends
  };
};

/**
 * Export donation records using standard exportGenerators (CSV, XLSX, PDF)
 */
const exportDonations = async (queryParams, format = 'csv', ngoFilter, ngoName = 'NGO Organization') => {
  const query = ngoFilter({});

  if (queryParams.status && queryParams.status !== 'all') {
    query.status = queryParams.status;
  }
  if (queryParams.paymentMethod && queryParams.paymentMethod !== 'all') {
    query.paymentMethod = queryParams.paymentMethod;
  }
  if (queryParams.currency && queryParams.currency !== 'all') {
    query.currency = queryParams.currency;
  }

  const donations = await Donation.find(query).sort({ donationDate: -1 }).limit(1000).lean();

  const columns = [
    { header: 'Donation #', key: 'donationNumber', widthWeight: 1.2 },
    { header: 'Date', key: 'dateStr', widthWeight: 1 },
    { header: 'Donor Name', key: 'donorName', widthWeight: 1.5 },
    { header: 'Amount', key: 'amountStr', widthWeight: 1 },
    { header: 'Currency', key: 'currency', widthWeight: 0.8 },
    { header: 'Method', key: 'paymentMethod', widthWeight: 1 },
    { header: 'Reference', key: 'transactionReference', widthWeight: 1.2 },
    { header: 'Category', key: 'category', widthWeight: 1.2 },
    { header: 'Status', key: 'status', widthWeight: 1 },
    { header: 'Receipt #', key: 'receiptNumber', widthWeight: 1.1 }
  ];

  const exportData = donations.map((d) => ({
    donationNumber: d.donationNumber,
    dateStr: new Date(d.donationDate).toISOString().slice(0, 10),
    donorName: d.donorSnapshot?.name || 'Anonymous',
    amountStr: d.amount.toFixed(2),
    currency: d.currency,
    paymentMethod: d.paymentMethod?.replace('_', ' ').toUpperCase(),
    transactionReference: d.transactionReference || 'N/A',
    category: d.category,
    status: d.status?.toUpperCase(),
    receiptNumber: d.receiptNumber || 'N/A'
  }));

  const exportConfig = {
    title: 'Donation Records Report',
    ngoName,
    generatedAt: new Date(),
    filters: queryParams,
    columns,
    data: exportData
  };

  if (format === 'xlsx') {
    return {
      buffer: await generateExcel(exportConfig),
      contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      filename: `donations-export-${Date.now()}.xlsx`
    };
  }

  if (format === 'pdf') {
    return {
      buffer: await generatePdf({ ...exportConfig, isLandscape: true }),
      contentType: 'application/pdf',
      filename: `donations-export-${Date.now()}.pdf`
    };
  }

  // Default: CSV
  return {
    content: generateCsv(exportConfig),
    contentType: 'text/csv; charset=utf-8',
    filename: `donations-export-${Date.now()}.csv`
  };
};

module.exports = {
  createDonation,
  listDonations,
  getDonationById,
  updateDonation,
  verifyDonation,
  approveDonation,
  reverseDonation,
  issueReceipt,
  getReceiptMetadata,
  validateReceiptEligibility,
  generateReceiptPdfBuffer,
  getDonationSummary,
  exportDonations,
  allocateNextDonationNumber,
  allocateNextReceiptNumber,
  ensureDonationSequenceSynchronized,
  ensureReceiptSequenceSynchronized
};
