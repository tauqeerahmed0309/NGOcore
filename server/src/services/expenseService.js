const Expense = require('../models/Expense');
const Program = require('../models/Program');
const Ngo = require('../models/Ngo');
const AuditLog = require('../models/AuditLog');
const logger = require('../utils/logger');
const { generateCsv, generateExcel, generatePdf } = require('../utils/exportGenerators');

const httpError = (statusCode, message) => Object.assign(new Error(message), { statusCode });

/**
 * Lazy-initializes and synchronizes the tenant expense sequence counter on the Ngo model.
 */
const ensureExpenseSequenceSynchronized = async (ngoId) => {
  const ngo = await Ngo.findById(ngoId).select('expenseSequence').lean();
  if (!ngo || ngo.expenseSequence === undefined || ngo.expenseSequence === null) {
    const existingExpenses = await Expense.find({
      ngoId,
      expenseNumber: /^EXP-\d+$/
    })
      .select('expenseNumber')
      .lean();

    let maxSeq = 0;
    for (const e of existingExpenses) {
      const match = e.expenseNumber?.match(/^EXP-(\d+)$/);
      if (match) {
        const val = parseInt(match[1], 10);
        if (val > maxSeq) maxSeq = val;
      }
    }

    await Ngo.updateOne(
      {
        _id: ngoId,
        $or: [{ expenseSequence: { $exists: false } }, { expenseSequence: null }]
      },
      { $set: { expenseSequence: maxSeq } },
      { timestamps: false }
    );
  }
};

/**
 * Atomically allocates the next sequential expense identifier scoped by NGO tenant.
 * Uses atomic $inc on the Ngo document. Format: EXP-0001, EXP-0002, ...
 */
const allocateNextExpenseNumber = async (ngoId) => {
  await ensureExpenseSequenceSynchronized(ngoId);

  const updatedNgo = await Ngo.findOneAndUpdate(
    { _id: ngoId },
    { $inc: { expenseSequence: 1 } },
    { returnDocument: 'after', timestamps: false }
  );

  const seq = updatedNgo?.expenseSequence || 1;
  return `EXP-${String(seq).padStart(4, '0')}`;
};

/**
 * Decimal-safe round helper
 */
const roundCurrency = (val) => Math.round(Number(val) * 100) / 100;

/**
 * Create a new expense record
 */
const createExpense = async (data, user, ngoId, ngoFilter) => {
  // Validate linked program if provided
  if (data.programId) {
    const prog = await Program.findOne(ngoFilter({ _id: data.programId })).lean();
    if (!prog) {
      throw httpError(404, 'Linked program not found in this organization.');
    }
  }

  let expenseNumber = data.expenseNumber ? data.expenseNumber.trim().toUpperCase() : null;

  if (expenseNumber) {
    const existing = await Expense.findOne(ngoFilter({ expenseNumber })).lean();
    if (existing) {
      throw httpError(409, `Expense with number '${expenseNumber}' already exists in this organization.`);
    }
  }

  const MAX_RETRIES = 5;
  let attempt = 0;
  let savedExpense = null;

  while (attempt < MAX_RETRIES && !savedExpense) {
    attempt++;
    let currentExpNumber = expenseNumber;

    if (!currentExpNumber) {
      currentExpNumber = await allocateNextExpenseNumber(ngoId);
    }

    const initialStatus = data.status || 'approved';
    const isApprovedInitially = initialStatus === 'approved';

    const expenseDoc = new Expense({
      expenseNumber: currentExpNumber,
      ngoId,
      title: data.title.trim(),
      description: data.description?.trim() || '',
      amount: roundCurrency(data.amount),
      currency: data.currency ? data.currency.trim().toUpperCase() : 'INR',
      category: data.category ? data.category.trim().toLowerCase() : 'operational',
      expenseDate: data.expenseDate || new Date(),
      paymentMethod: data.paymentMethod ? data.paymentMethod.trim().toLowerCase() : 'cash',
      vendor: data.vendor?.trim() || '',
      transactionReference: data.transactionReference?.trim().toUpperCase() || '',
      programId: data.programId || null,
      receiptUrl: data.receiptUrl?.trim() || '',
      status: initialStatus,
      notes: data.notes?.trim() || '',
      createdBy: user._id,
      approvedBy: isApprovedInitially ? user._id : null,
      approvedAt: isApprovedInitially ? new Date() : null
    });

    try {
      savedExpense = await expenseDoc.save();
    } catch (err) {
      if (err.code === 11000 && !data.expenseNumber) {
        logger.warn(
          `Collision on auto-generated expense number '${currentExpNumber}' for NGO ${ngoId}. Retrying with next sequence (attempt ${attempt}/${MAX_RETRIES})...`
        );
        continue;
      }
      if (err.code === 11000) {
        throw httpError(409, `Expense with number '${currentExpNumber}' already exists in this organization.`);
      }
      throw err;
    }
  }

  if (!savedExpense) {
    throw httpError(500, 'Failed to allocate a unique expense number after multiple attempts. Please retry.');
  }

  await savedExpense.populate('createdBy', 'firstName lastName email role');
  if (savedExpense.approvedBy) {
    await savedExpense.populate('approvedBy', 'firstName lastName email role');
  }
  if (savedExpense.programId) {
    await savedExpense.populate('programId', 'code name type');
  }

  logger.info(
    `Expense created: [${savedExpense.expenseNumber}] ${savedExpense.currency} ${savedExpense.amount} for "${savedExpense.title}"`
  );

  return savedExpense;
};

/**
 * List expenses with search, multi-filter, pagination, and sorting
 */
const listExpenses = async (queryParams, ngoFilter) => {
  const {
    page = 1,
    limit = 10,
    search = '',
    category,
    paymentMethod,
    status,
    currency,
    programId,
    dateFrom,
    dateTo,
    sortBy = 'expenseDate',
    sortOrder = 'desc'
  } = queryParams;

  const query = ngoFilter({ isArchived: { $ne: true } });

  if (search && search.trim()) {
    const s = search.trim();
    const regex = new RegExp(s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'), 'i');
    query.$or = [
      { title: regex },
      { vendor: regex },
      { expenseNumber: regex },
      { transactionReference: regex },
      { description: regex }
    ];
  }

  if (category && category !== 'all') {
    query.category = category.trim().toLowerCase();
  }

  if (paymentMethod && paymentMethod !== 'all') {
    query.paymentMethod = paymentMethod.trim().toLowerCase();
  }

  if (status && status !== 'all') {
    query.status = status.trim().toLowerCase();
  }

  if (currency && currency !== 'all') {
    query.currency = currency.trim().toUpperCase();
  }

  if (programId && programId !== 'all') {
    query.programId = programId;
  }

  if (dateFrom || dateTo) {
    query.expenseDate = {};
    if (dateFrom) {
      query.expenseDate.$gte = new Date(dateFrom);
    }
    if (dateTo) {
      const toDate = new Date(dateTo);
      toDate.setHours(23, 59, 59, 999);
      query.expenseDate.$lte = toDate;
    }
  }

  const pageNum = Math.max(1, parseInt(page, 10) || 1);
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 10));
  const skip = (pageNum - 1) * limitNum;
  const sortDirection = sortOrder === 'asc' ? 1 : -1;

  const [totalExpenses, expenses] = await Promise.all([
    Expense.countDocuments(query),
    Expense.find(query)
      .populate('createdBy', 'firstName lastName email role')
      .populate('approvedBy', 'firstName lastName email role')
      .populate('programId', 'code name type')
      .sort({ [sortBy]: sortDirection })
      .skip(skip)
      .limit(limitNum)
      .lean({ virtuals: true })
  ]);

  const totalPages = Math.max(1, Math.ceil(totalExpenses / limitNum));

  return {
    expenses,
    pagination: {
      totalExpenses,
      totalPages,
      currentPage: pageNum,
      limit: limitNum,
      hasNextPage: pageNum < totalPages,
      hasPrevPage: pageNum > 1
    }
  };
};

/**
 * Retrieve specific expense by ID with creator, approver, linked program, and audit trail
 */
const getExpenseById = async (id, ngoFilter) => {
  const expense = await Expense.findOne(ngoFilter({ _id: id, isArchived: { $ne: true } }))
    .populate('createdBy', 'firstName lastName email role')
    .populate('approvedBy', 'firstName lastName email role')
    .populate('programId', 'code name type category status')
    .lean({ virtuals: true });

  if (!expense) {
    throw httpError(404, 'Expense record not found.');
  }

  const auditLogs = await AuditLog.find(
    ngoFilter({
      entityType: 'expense',
      entityId: String(id)
    })
  )
    .populate('actorId', 'firstName lastName email role')
    .sort({ createdAt: -1 })
    .limit(20)
    .lean();

  return { expense, auditLogs };
};

/**
 * Update permitted fields on an expense record
 */
const updateExpense = async (id, data, user, ngoFilter) => {
  const expense = await Expense.findOne(ngoFilter({ _id: id, isArchived: { $ne: true } }));
  if (!expense) {
    throw httpError(404, 'Expense record not found.');
  }

  if (expense.status === 'rejected') {
    throw httpError(400, 'Cannot modify a rejected expense record.');
  }

  const isApproved = expense.status === 'approved';
  const modifiedFields = [];

  // Financial locking: if approved, amount and currency cannot be modified unless rejected or admin override
  if (isApproved && user.role !== 'admin' && user.role !== 'ngo_admin') {
    if (data.amount !== undefined && roundCurrency(data.amount) !== expense.amount) {
      throw httpError(
        400,
        'Financial integrity safeguard: Amount cannot be modified on an approved expense. Request an administrator to update or reject the expense.'
      );
    }
    if (data.currency && data.currency.toUpperCase() !== expense.currency) {
      throw httpError(
        400,
        'Financial integrity safeguard: Currency cannot be modified on an approved expense.'
      );
    }
  }

  if (data.amount !== undefined) {
    const newAmount = roundCurrency(data.amount);
    if (newAmount <= 0) {
      throw httpError(400, 'Expense amount must be strictly positive.');
    }
    if (expense.amount !== newAmount) {
      expense.amount = newAmount;
      modifiedFields.push('amount');
    }
  }

  if (data.currency && data.currency.toUpperCase() !== expense.currency) {
    expense.currency = data.currency.toUpperCase();
    modifiedFields.push('currency');
  }

  if (data.title && data.title.trim() !== expense.title) {
    expense.title = data.title.trim();
    modifiedFields.push('title');
  }

  if (data.description !== undefined && data.description.trim() !== expense.description) {
    expense.description = data.description.trim();
    modifiedFields.push('description');
  }

  if (data.category && data.category.toLowerCase() !== expense.category) {
    expense.category = data.category.toLowerCase();
    modifiedFields.push('category');
  }

  if (data.paymentMethod && data.paymentMethod.toLowerCase() !== expense.paymentMethod) {
    expense.paymentMethod = data.paymentMethod.toLowerCase();
    modifiedFields.push('paymentMethod');
  }

  if (data.vendor !== undefined && data.vendor.trim() !== expense.vendor) {
    expense.vendor = data.vendor.trim();
    modifiedFields.push('vendor');
  }

  if (data.transactionReference !== undefined && data.transactionReference.trim().toUpperCase() !== expense.transactionReference) {
    expense.transactionReference = data.transactionReference.trim().toUpperCase();
    modifiedFields.push('transactionReference');
  }

  if (data.programId !== undefined) {
    if (data.programId) {
      const prog = await Program.findOne(ngoFilter({ _id: data.programId })).lean();
      if (!prog) throw httpError(404, 'Linked program not found.');
      expense.programId = prog._id;
    } else {
      expense.programId = null;
    }
    modifiedFields.push('programId');
  }

  if (data.receiptUrl !== undefined && data.receiptUrl.trim() !== expense.receiptUrl) {
    expense.receiptUrl = data.receiptUrl.trim();
    modifiedFields.push('receiptUrl');
  }

  if (data.expenseDate) {
    expense.expenseDate = new Date(data.expenseDate);
    modifiedFields.push('expenseDate');
  }

  if (data.notes !== undefined && data.notes.trim() !== expense.notes) {
    expense.notes = data.notes.trim();
    modifiedFields.push('notes');
  }

  if (modifiedFields.length > 0) {
    await expense.save();
    await expense.populate('createdBy', 'firstName lastName email role');
    if (expense.approvedBy) await expense.populate('approvedBy', 'firstName lastName email role');
    if (expense.programId) await expense.populate('programId', 'code name type');
  }

  logger.info(`Expense updated: [${expense.expenseNumber}] (fields: ${modifiedFields.join(', ') || 'none'})`);
  return { expense, modifiedFields };
};

/**
 * Approve a pending expense (enforces separation of duties)
 */
const approveExpense = async (id, user, ngoFilter) => {
  const expense = await Expense.findOne(ngoFilter({ _id: id, isArchived: { $ne: true } }));
  if (!expense) {
    throw httpError(404, 'Expense record not found.');
  }

  if (expense.status === 'approved') {
    throw httpError(400, 'Expense is already approved.');
  }

  if (expense.status === 'rejected') {
    throw httpError(400, 'Cannot approve a rejected expense. A new expense must be created.');
  }

  // Separation of duties: Staff who created the expense cannot approve it
  if (user.role === 'staff' && String(expense.createdBy) === String(user._id)) {
    throw httpError(
      403,
      'Separation of duties violation: The user who created this expense cannot approve it. An administrator or peer staff member must approve.'
    );
  }

  expense.status = 'approved';
  expense.approvedBy = user._id;
  expense.approvedAt = new Date();
  expense.rejectionReason = '';

  await expense.save();
  await expense.populate('createdBy', 'firstName lastName email role');
  await expense.populate('approvedBy', 'firstName lastName email role');

  logger.info(`Expense approved: [${expense.expenseNumber}] by ${user.email} (${user.role})`);
  return expense;
};

/**
 * Reject an expense with a mandatory justification reason
 */
const rejectExpense = async (id, reason, user, ngoFilter) => {
  const expense = await Expense.findOne(ngoFilter({ _id: id, isArchived: { $ne: true } }));
  if (!expense) {
    throw httpError(404, 'Expense record not found.');
  }

  if (expense.status === 'rejected') {
    throw httpError(400, 'Expense is already rejected.');
  }

  expense.status = 'rejected';
  expense.rejectionReason = reason.trim();
  expense.approvedBy = null;
  expense.approvedAt = null;

  await expense.save();
  await expense.populate('createdBy', 'firstName lastName email role');

  logger.info(`Expense rejected: [${expense.expenseNumber}] reason: "${reason}" by ${user.email}`);
  return expense;
};

/**
 * Safely archive or delete an expense record
 */
const deleteExpense = async (id, user, ngoFilter) => {
  const expense = await Expense.findOne(ngoFilter({ _id: id }));
  if (!expense) {
    throw httpError(404, 'Expense record not found.');
  }

  // Soft delete by setting isArchived: true to maintain historical financial audit integrity
  expense.isArchived = true;
  await expense.save();

  logger.info(`Expense archived: [${expense.expenseNumber}] by ${user.email}`);
  return { message: 'Expense record successfully archived.' };
};

/**
 * Single-roundtrip MongoDB aggregation summary pipeline for expenses
 */
const getExpenseSummary = async (ngoFilter) => {
  const pipeline = [
    { $match: ngoFilter({ isArchived: { $ne: true } }) },
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
                $sum: { $round: [{ $multiply: [{ $ifNull: ['$amount', 0] }, 100] }, 0] }
              },
              approvedCents: {
                $sum: {
                  $cond: [
                    { $eq: ['$status', 'approved'] },
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
              rejectedCents: {
                $sum: {
                  $cond: [
                    { $eq: ['$status', 'rejected'] },
                    { $round: [{ $multiply: [{ $ifNull: ['$amount', 0] }, 100] }, 0] },
                    0
                  ]
                }
              }
            }
          }
        ],
        categories: [
          {
            $match: {
              status: { $ne: 'rejected' }
            }
          },
          {
            $group: {
              _id: { $ifNull: ['$category', 'operational'] },
              count: { $sum: 1 },
              amountCents: {
                $sum: { $round: [{ $multiply: [{ $ifNull: ['$amount', 0] }, 100] }, 0] }
              }
            }
          }
        ],
        paymentMethods: [
          {
            $match: {
              status: { $ne: 'rejected' }
            }
          },
          {
            $group: {
              _id: { $ifNull: ['$paymentMethod', 'cash'] },
              count: { $sum: 1 },
              amountCents: {
                $sum: { $round: [{ $multiply: [{ $ifNull: ['$amount', 0] }, 100] }, 0] }
              }
            }
          }
        ],
        monthlyTrends: [
          {
            $match: {
              status: { $ne: 'rejected' },
              expenseDate: { $type: 'date' }
            }
          },
          {
            $group: {
              _id: {
                $dateToString: {
                  format: '%Y-%m',
                  date: '$expenseDate'
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

  const results = await Expense.aggregate(pipeline);
  const facetResult = results[0] || {};

  const statusCounts = {
    pending: 0,
    approved: 0,
    rejected: 0,
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
      approved: Math.round(c.approvedCents) / 100,
      pending: Math.round(c.pendingCents) / 100,
      rejected: Math.round(c.rejectedCents) / 100,
      count: c.count
    };
  });

  const categoryBreakdown = {};
  (facetResult.categories || []).forEach((item) => {
    if (item._id) {
      categoryBreakdown[item._id] = {
        count: item.count,
        amount: Math.round(item.amountCents) / 100
      };
    }
  });

  const paymentMethodBreakdown = {};
  (facetResult.paymentMethods || []).forEach((item) => {
    if (item._id) {
      paymentMethodBreakdown[item._id] = {
        count: item.count,
        amount: Math.round(item.amountCents) / 100
      };
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
    categoryBreakdown,
    paymentMethodBreakdown,
    monthlyTrends
  };
};

/**
 * Export expense records as CSV
 */
const exportExpenses = async (queryParams, format = 'csv', ngoFilter, ngoName = 'NGO Organization') => {
  const query = ngoFilter({ isArchived: { $ne: true } });

  if (queryParams.category && queryParams.category !== 'all') {
    query.category = queryParams.category;
  }
  if (queryParams.status && queryParams.status !== 'all') {
    query.status = queryParams.status;
  }
  if (queryParams.paymentMethod && queryParams.paymentMethod !== 'all') {
    query.paymentMethod = queryParams.paymentMethod;
  }
  if (queryParams.currency && queryParams.currency !== 'all') {
    query.currency = queryParams.currency;
  }

  const expenses = await Expense.find(query)
    .populate('programId', 'code name')
    .sort({ expenseDate: -1 })
    .limit(1000)
    .lean();

  const columns = [
    { header: 'Expense #', key: 'expenseNumber', widthWeight: 1.2 },
    { header: 'Date', key: 'dateStr', widthWeight: 1 },
    { header: 'Title', key: 'title', widthWeight: 2 },
    { header: 'Category', key: 'category', widthWeight: 1.2 },
    { header: 'Amount', key: 'amountStr', widthWeight: 1 },
    { header: 'Currency', key: 'currency', widthWeight: 0.8 },
    { header: 'Payment Method', key: 'paymentMethod', widthWeight: 1.2 },
    { header: 'Vendor / Payee', key: 'vendor', widthWeight: 1.5 },
    { header: 'Reference', key: 'transactionReference', widthWeight: 1.2 },
    { header: 'Status', key: 'status', widthWeight: 1 },
    { header: 'Linked Program', key: 'program', widthWeight: 1.5 }
  ];

  const exportData = expenses.map((e) => ({
    expenseNumber: e.expenseNumber,
    dateStr: new Date(e.expenseDate).toISOString().slice(0, 10),
    title: e.title,
    category: e.category?.toUpperCase(),
    amountStr: e.amount.toFixed(2),
    currency: e.currency,
    paymentMethod: e.paymentMethod?.replace('_', ' ').toUpperCase(),
    vendor: e.vendor || 'N/A',
    transactionReference: e.transactionReference || 'N/A',
    status: e.status?.toUpperCase(),
    program: e.programId ? `[${e.programId.code}] ${e.programId.name}` : 'N/A'
  }));

  const exportConfig = {
    title: 'Expense Records Report',
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
      filename: `expenses-export-${Date.now()}.xlsx`
    };
  }

  if (format === 'pdf') {
    return {
      buffer: await generatePdf({ ...exportConfig, isLandscape: true }),
      contentType: 'application/pdf',
      filename: `expenses-export-${Date.now()}.pdf`
    };
  }

  return {
    content: generateCsv(exportConfig),
    contentType: 'text/csv; charset=utf-8',
    filename: `expenses-export-${Date.now()}.csv`
  };
};

module.exports = {
  createExpense,
  listExpenses,
  getExpenseById,
  updateExpense,
  approveExpense,
  rejectExpense,
  deleteExpense,
  getExpenseSummary,
  exportExpenses,
  allocateNextExpenseNumber,
  ensureExpenseSequenceSynchronized
};
