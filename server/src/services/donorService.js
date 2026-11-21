const Donor = require('../models/Donor');
const Donation = require('../models/Donation');
const AuditLog = require('../models/AuditLog');
const Ngo = require('../models/Ngo');
const logger = require('../utils/logger');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

/**
 * Lazy-initializes and synchronizes the tenant donor sequence counter on the Ngo model.
 * If donorSequence is uninitialized (missing or null), it scans existing DNR-XXXX donor numbers
 * once to determine the true current maximum sequence and seeds the counter.
 */
const ensureDonorSequenceSynchronized = async (ngoId) => {
  const ngo = await Ngo.findById(ngoId).select('donorSequence').lean();
  if (!ngo || ngo.donorSequence === undefined || ngo.donorSequence === null) {
    const existingDnrDonors = await Donor.find({
      ngoId,
      donorNumber: /^DNR-\d+$/
    })
      .select('donorNumber')
      .lean();

    let maxSeq = 0;
    for (const d of existingDnrDonors) {
      const match = d.donorNumber.match(/^DNR-(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxSeq) maxSeq = val;
      }
    }

    // Atomically set donorSequence only if still missing/null in DB (CAS condition)
    await Ngo.updateOne(
      {
        _id: ngoId,
        $or: [{ donorSequence: { $exists: false } }, { donorSequence: null }]
      },
      { $set: { donorSequence: maxSeq } },
      { timestamps: false }
    );
  }
};

/**
 * Atomically allocates the next sequential donor identifier scoped by NGO tenant.
 * Uses atomic $inc on the Ngo document to prevent race conditions and duplicate keys.
 * Format: DNR-0001, DNR-0002, ..., DNR-9999, DNR-10000
 */
const allocateNextDonorNumber = async (ngoId) => {
  await ensureDonorSequenceSynchronized(ngoId);

  const updatedNgo = await Ngo.findOneAndUpdate(
    { _id: ngoId },
    { $inc: { donorSequence: 1 } },
    { returnDocument: 'after', timestamps: false }
  );

  const seq = updatedNgo?.donorSequence || 1;
  return `DNR-${String(seq).padStart(4, '0')}`;
};

/**
 * Public alias for backward compatibility and test access
 */
const generateDonorNumber = allocateNextDonorNumber;

/**
 * List donors with search, multi-field filtering, sorting, and pagination
 */
const listDonors = async (queryParams, ngoFilter) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    type = 'all',
    category = 'all',
    status = 'all',
    sortBy = 'createdAt',
    sortOrder = 'desc'
  } = queryParams;

  const query = ngoFilter({});

  // Search across name, donor ID, email, phone, contact person, city, state
  if (search && search.trim()) {
    const searchRegex = new RegExp(search.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    query.$or = [
      { name: searchRegex },
      { donorNumber: searchRegex },
      { email: searchRegex },
      { phone: searchRegex },
      { contactPerson: searchRegex },
      { city: searchRegex },
      { state: searchRegex }
    ];
  }

  // Type filter
  if (type && type !== 'all') {
    query.type = type.trim().toLowerCase();
  }

  // Category filter
  if (category && category !== 'all') {
    query.category = category.trim().toLowerCase();
  }

  // Status filter
  if (status && status !== 'all') {
    query.status = status.trim().toLowerCase();
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const [totalDonors, donors] = await Promise.all([
    Donor.countDocuments(query),
    Donor.find(query)
      .populate('createdBy', 'firstName lastName email role')
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true })
  ]);

  const totalPages = Math.max(1, Math.ceil(totalDonors / limitNum));

  return {
    donors,
    pagination: {
      totalDonors,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};

/**
 * Retrieve donor profile by ID with audit log summary
 */
const getDonorById = async (id, ngoFilter) => {
  const donor = await Donor.findOne(ngoFilter({ _id: id }))
    .populate('createdBy', 'firstName lastName email role')
    .lean({ virtuals: true });

  if (!donor) {
    throw httpError(404, 'Donor not found');
  }

  const auditLogs = await AuditLog.find(
    ngoFilter({
      entityType: 'donor',
      entityId: String(id)
    })
  )
    .populate('actorId', 'firstName lastName email role')
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const donations = await Donation.find(ngoFilter({ donorId: id }))
    .sort({ donationDate: -1 })
    .limit(20)
    .lean();

  return { donor, auditLogs, donations };
};

/**
 * Create a new donor profile with concurrency-hardened atomic sequence allocation
 */
const createDonor = async (data, userId, ngoId, ngoFilter) => {
  let donorNumber = data.donorNumber?.trim().toUpperCase();
  const isAutoGenerated = !donorNumber;

  if (!isAutoGenerated) {
    const existing = await Donor.findOne(ngoFilter({ donorNumber }));
    if (existing) {
      throw httpError(409, `Donor with ID '${donorNumber}' already exists in this organization.`);
    }

    // If manual ID follows sequential DNR-XXXX format, advance sequence if manual sequence is higher
    const dnrMatch = donorNumber.match(/^DNR-(\d+)$/);
    if (dnrMatch) {
      const manualSeq = parseInt(dnrMatch[1], 10);
      if (!isNaN(manualSeq) && manualSeq > 0) {
        await ensureDonorSequenceSynchronized(ngoId);
        await Ngo.updateOne(
          { _id: ngoId, donorSequence: { $lt: manualSeq } },
          { $set: { donorSequence: manualSeq } },
          { timestamps: false }
        );
      }
    }
  }

  // Phone normalization: standard Indian formatting if 10-digit number is provided
  let phone = data.phone?.trim() || '';
  if (phone) {
    const cleaned = phone.replace(/[\s\-\(\)\.]/g, '');
    let digits = cleaned;
    if (digits.startsWith('+91')) digits = digits.slice(3);
    else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
    else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
    if (/^[6-9]\d{9}$/.test(digits)) {
      phone = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
    }
  }

  const MAX_RETRIES = 5;
  let attempt = 0;

  while (attempt < MAX_RETRIES) {
    attempt++;
    if (isAutoGenerated) {
      donorNumber = await allocateNextDonorNumber(ngoId);
    }

    try {
      const donor = await Donor.create({
        ngoId,
        donorNumber,
        name: data.name.trim(),
        type: data.type || 'individual',
        contactPerson: data.contactPerson?.trim() || '',
        email: data.email?.trim().toLowerCase() || '',
        phone,
        alternatePhone: data.alternatePhone?.trim() || '',
        address: data.address?.trim() || '',
        city: data.city?.trim() || '',
        state: data.state?.trim() || '',
        pinCode: data.pinCode?.trim() || '',
        country: data.country?.trim() || 'India',
        category: data.category || 'individual',
        registrationDate: data.registrationDate || new Date(),
        communicationPreferences: {
          preferredChannel: data.communicationPreferences?.preferredChannel || 'email',
          optOut: Boolean(data.communicationPreferences?.optOut),
          newsletter: data.communicationPreferences?.newsletter !== false
        },
        status: data.status || 'active',
        notes: data.notes?.trim() || '',
        createdBy: userId
      });

      logger.info(`Donor created: [${donor.donorNumber}] ${donor.name} (type: ${donor.type})`);
      return donor;
    } catch (err) {
      const isDuplicateKey = err.code === 11000 || (err.name === 'MongoServerError' && err.code === 11000);
      if (isDuplicateKey) {
        if (!isAutoGenerated) {
          throw httpError(409, `Donor with ID '${donorNumber}' already exists in this organization.`);
        }
        logger.warn(
          `Collision on auto-generated donor ID '${donorNumber}' for NGO ${ngoId}. Retrying with next sequence (attempt ${attempt}/${MAX_RETRIES})...`
        );
        continue;
      }
      throw err;
    }
  }

  throw httpError(500, 'Failed to allocate a unique donor identifier after maximum retries.');
};

/**
 * Update donor profile details
 */
const updateDonor = async (id, data, ngoFilter) => {
  const donor = await Donor.findOne(ngoFilter({ _id: id }));
  if (!donor) {
    throw httpError(404, 'Donor not found');
  }

  const modifiedFields = [];

  // If donorNumber is changing, verify tenant uniqueness
  if (data.donorNumber) {
    const cleanNumber = data.donorNumber.trim().toUpperCase();
    if (cleanNumber !== donor.donorNumber) {
      const conflict = await Donor.findOne(
        ngoFilter({
          donorNumber: cleanNumber,
          _id: { $ne: id }
        })
      );
      if (conflict) {
        throw httpError(409, `Donor with ID '${cleanNumber}' already exists.`);
      }
      donor.donorNumber = cleanNumber;
      modifiedFields.push('donorNumber');

      // If updated ID matches sequential format, advance sequence if manual sequence is higher
      const dnrMatch = cleanNumber.match(/^DNR-(\d+)$/);
      if (dnrMatch) {
        const manualSeq = parseInt(dnrMatch[1], 10);
        if (!isNaN(manualSeq) && manualSeq > 0) {
          await ensureDonorSequenceSynchronized(donor.ngoId);
          await Ngo.updateOne(
            { _id: donor.ngoId, donorSequence: { $lt: manualSeq } },
            { $set: { donorSequence: manualSeq } },
            { timestamps: false }
          );
        }
      }
    }
  }

  const updatableFields = [
    'name',
    'type',
    'contactPerson',
    'email',
    'phone',
    'alternatePhone',
    'address',
    'city',
    'state',
    'pinCode',
    'country',
    'category',
    'registrationDate',
    'status',
    'notes'
  ];

  updatableFields.forEach((field) => {
    if (data[field] !== undefined) {
      if (field === 'phone' && data[field]) {
        const cleaned = String(data[field]).replace(/[\s\-\(\)\.]/g, '');
        let digits = cleaned;
        if (digits.startsWith('+91')) digits = digits.slice(3);
        else if (digits.startsWith('91') && digits.length === 12) digits = digits.slice(2);
        else if (digits.startsWith('0') && digits.length === 11) digits = digits.slice(1);
        if (/^[6-9]\d{9}$/.test(digits)) {
          const formatted = `+91 ${digits.slice(0, 5)} ${digits.slice(5)}`;
          if (donor[field] !== formatted) {
            donor[field] = formatted;
            modifiedFields.push(field);
          }
          return;
        }
      }

      if (field === 'email' && data[field]) {
        const cleanEmail = data[field].trim().toLowerCase();
        if (donor.email !== cleanEmail) {
          donor.email = cleanEmail;
          modifiedFields.push('email');
        }
        return;
      }

      if (donor[field] !== data[field]) {
        donor[field] = data[field];
        modifiedFields.push(field);
      }
    }
  });

  // Handle communication preferences subdocument
  if (data.communicationPreferences) {
    donor.communicationPreferences = {
      preferredChannel:
        data.communicationPreferences.preferredChannel ||
        donor.communicationPreferences?.preferredChannel ||
        'email',
      optOut:
        data.communicationPreferences.optOut !== undefined
          ? Boolean(data.communicationPreferences.optOut)
          : Boolean(donor.communicationPreferences?.optOut),
      newsletter:
        data.communicationPreferences.newsletter !== undefined
          ? Boolean(data.communicationPreferences.newsletter)
          : donor.communicationPreferences?.newsletter !== false
    };
    modifiedFields.push('communicationPreferences');
  }

  try {
    await donor.save();
  } catch (saveErr) {
    if (saveErr.code === 11000 || (saveErr.name === 'MongoServerError' && saveErr.code === 11000)) {
      throw httpError(409, `Donor with ID '${donor.donorNumber}' already exists.`);
    }
    throw saveErr;
  }
  await donor.populate('createdBy', 'firstName lastName email role');

  logger.info(`Donor updated: [${donor.donorNumber}] ${donor.name} (fields: ${modifiedFields.join(', ')})`);
  return { donor, modifiedFields };
};

/**
 * Update donor record status (active, inactive, archived)
 */
const updateDonorStatus = async (id, status, ngoFilter) => {
  const donor = await Donor.findOne(ngoFilter({ _id: id }));
  if (!donor) {
    throw httpError(404, 'Donor not found');
  }

  donor.status = status;
  await donor.save();
  await donor.populate('createdBy', 'firstName lastName email role');

  logger.info(`Donor status updated: [${donor.donorNumber}] -> ${status}`);
  return donor;
};

/**
 * Delete donor record with safe dependency guard:
 * Blocks deletion if the donor has existing audit history or linked records.
 * Prompts user to set status to 'archived' instead.
 */
const deleteDonor = async (id, ngoFilter) => {
  const donor = await Donor.findOne(ngoFilter({ _id: id }));
  if (!donor) {
    throw httpError(404, 'Donor not found');
  }

  const [auditCount, donationCount] = await Promise.all([
    AuditLog.countDocuments(
      ngoFilter({
        entityType: 'donor',
        entityId: String(id)
      })
    ),
    Donation.countDocuments(ngoFilter({ donorId: id }))
  ]);

  if (auditCount > 0 || donationCount > 0) {
    const error = httpError(
      400,
      "Cannot permanently delete donor with existing audit history or linked records. Please set status to 'archived' to safely deactivate this record."
    );
    error.details = { auditCount, donationCount };
    throw error;
  }

  await Donor.deleteOne(ngoFilter({ _id: id }));
  logger.info(`Donor permanently deleted (clean record with no history): [${donor.donorNumber}] ${donor.name} [${id}]`);
  return { success: true, message: 'Donor record deleted successfully', donorId: id };
};

module.exports = {
  listDonors,
  getDonorById,
  createDonor,
  updateDonor,
  updateDonorStatus,
  deleteDonor,
  generateDonorNumber,
  allocateNextDonorNumber,
  ensureDonorSequenceSynchronized
};
