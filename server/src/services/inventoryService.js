const mongoose = require('mongoose');
const InventoryItem = require('../models/InventoryItem');
const Ngo = require('../models/Ngo');
const AuditLog = require('../models/AuditLog');
const { writeAuditLog } = require('./auditService');
const logger = require('../utils/logger');

const formatItemCode = (seq) => `INV-${String(seq).padStart(4, '0')}`;

const allocateNextItemCode = async (ngoId) => {
  const ngo = await Ngo.findOneAndUpdate(
    { _id: ngoId },
    { $inc: { inventorySequence: 1 } },
    { returnDocument: 'after', upsert: false }
  );

  if (!ngo) {
    throw new Error('Organization not found for inventory sequence allocation.');
  }

  return formatItemCode(ngo.inventorySequence);
};

const syncInventorySequenceIfHigher = async (ngoId, customCode) => {
  const match = customCode.match(/^INV-(\d+)$/i);
  if (match) {
    const customSeq = parseInt(match[1], 10);
    if (!isNaN(customSeq)) {
      await Ngo.updateOne(
        { _id: ngoId, inventorySequence: { $lt: customSeq } },
        { $set: { inventorySequence: customSeq } }
      );
    }
  }
};

const createInventoryItem = async (itemData, ngoId, actorUser) => {
  const maxRetries = 5;
  let attempt = 0;
  const isCustom = Boolean(itemData.itemCode?.trim());

  while (attempt < maxRetries) {
    attempt++;
    let candidateCode;

    if (isCustom) {
      candidateCode = itemData.itemCode.trim();
      const existing = await InventoryItem.findOne({ ngoId, itemCode: candidateCode });
      if (existing) {
        const err = new Error(`Inventory item with code '${candidateCode}' already exists in this organization.`);
        err.statusCode = 409;
        throw err;
      }
    } else {
      candidateCode = await allocateNextItemCode(ngoId);
    }

    try {
      const initialQty = Number(itemData.initialQuantity) || 0;
      const transactions = [];

      if (initialQty > 0) {
        transactions.push({
          transactionNumber: 'TX-INIT-0001',
          type: 'inflow',
          quantity: initialQty,
          balanceAfter: initialQty,
          reason: 'Initial Opening Stock Entry',
          performedBy: actorUser._id,
          timestamp: new Date()
        });
      }

      const item = await InventoryItem.create({
        ...itemData,
        itemCode: candidateCode,
        quantityOnHand: initialQty,
        transactions,
        ngoId,
        createdBy: actorUser._id
      });

      if (isCustom) {
        await syncInventorySequenceIfHigher(ngoId, candidateCode);
      }

      try {
        await writeAuditLog({
          actor: actorUser,
          ngoId,
          action: 'create',
          entityType: 'inventory_item',
          entityId: item._id,
          metadata: {
            itemCode: item.itemCode,
            name: item.name,
            category: item.category,
            initialQuantity: initialQty
          }
        });
      } catch (auditErr) {
        logger.warn(`Failed to log inventory item creation audit: ${auditErr.message}`);
      }

      logger.info(`Inventory item created: [${item.itemCode}] "${item.name}"`);
      return item;
    } catch (err) {
      if (err.code === 11000 && attempt < maxRetries && !isCustom) {
        logger.warn(`Inventory sequence collision on ${candidateCode}. Retrying (attempt ${attempt}/${maxRetries})...`);
        continue;
      }
      throw err;
    }
  }

  throw new Error('Failed to generate a unique inventory item code after maximum retries.');
};

const recordStockTransaction = async (id, txData, ngoId, actorUser) => {
  const item = await InventoryItem.findOne({ _id: id, ngoId, isArchived: false });
  if (!item) {
    const err = new Error('Inventory item not found.');
    err.statusCode = 404;
    throw err;
  }

  const qty = Number(txData.quantity);
  let newBalance = item.quantityOnHand;

  if (txData.type === 'outflow') {
    if (item.quantityOnHand < qty) {
      const err = new Error(
        `Insufficient stock on hand: current balance is ${item.quantityOnHand} ${item.unitOfMeasure}, requested outflow is ${qty} ${item.unitOfMeasure}.`
      );
      err.statusCode = 400;
      throw err;
    }
    newBalance = item.quantityOnHand - qty;
  } else if (txData.type === 'inflow') {
    newBalance = item.quantityOnHand + qty;
  } else if (txData.type === 'adjustment') {
    newBalance = qty;
  }

  const txSeq = item.transactions.length + 1;
  const transactionNumber = `TX-${String(txSeq).padStart(4, '0')}`;

  const transactionRecord = {
    transactionNumber,
    type: txData.type,
    quantity: qty,
    balanceAfter: newBalance,
    reason: txData.reason.trim(),
    programId: txData.programId || null,
    recipientName: txData.recipientName ? txData.recipientName.trim() : '',
    donorId: txData.donorId || null,
    notes: txData.notes ? txData.notes.trim() : '',
    performedBy: actorUser._id,
    timestamp: new Date()
  };

  item.transactions.push(transactionRecord);
  item.quantityOnHand = newBalance;
  await item.save();

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'update',
      entityType: 'inventory_item',
      entityId: item._id,
      metadata: {
        itemCode: item.itemCode,
        transactionNumber,
        type: txData.type,
        quantity: qty,
        balanceAfter: newBalance
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log stock transaction audit: ${auditErr.message}`);
  }

  return {
    item,
    transaction: item.transactions[item.transactions.length - 1]
  };
};

const getInventoryItems = async (query = {}, ngoId) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = { ngoId, isArchived: false };

  if (query.category && query.category !== 'all') {
    filter.category = query.category;
  }

  if (query.lowStockOnly) {
    filter.$expr = { $lte: ['$quantityOnHand', '$minThreshold'] };
  }

  if (query.search && query.search.trim()) {
    const term = query.search.trim();
    const regex = new RegExp(term, 'i');
    filter.$or = [
      { name: regex },
      { itemCode: regex },
      { description: regex },
      { 'storageLocation.building': regex },
      { 'storageLocation.room': regex }
    ];
  }

  const sortField = query.sortBy || 'createdAt';
  const sortDirection = query.sortOrder === 'asc' ? 1 : -1;
  const sort = { [sortField]: sortDirection };

  const [items, total] = await Promise.all([
    InventoryItem.find(filter)
      .populate('createdBy', 'firstName lastName email')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    InventoryItem.countDocuments(filter)
  ]);

  return {
    items,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1
    }
  };
};

const getInventoryItemById = async (id, ngoId) => {
  const item = await InventoryItem.findOne({ _id: id, ngoId })
    .populate('createdBy', 'firstName lastName email')
    .populate('transactions.performedBy', 'firstName lastName email role')
    .populate('transactions.programId', 'name code')
    .populate('transactions.donorId', 'name donorNumber')
    .lean();

  if (!item) {
    const err = new Error('Inventory item not found.');
    err.statusCode = 404;
    throw err;
  }

  const auditLogs = await AuditLog.find({
    ngoId,
    entityType: 'inventory_item',
    entityId: id
  })
    .sort({ timestamp: -1 })
    .limit(20)
    .populate('actorId', 'firstName lastName email role')
    .lean();

  return {
    ...item,
    auditLogs
  };
};

const updateInventoryItem = async (id, updateData, ngoId, actorUser) => {
  const item = await InventoryItem.findOne({ _id: id, ngoId, isArchived: false });
  if (!item) {
    const err = new Error('Inventory item not found.');
    err.statusCode = 404;
    throw err;
  }

  const allowedFields = [
    'name',
    'category',
    'unitOfMeasure',
    'minThreshold',
    'unitCost',
    'storageLocation',
    'description'
  ];

  const modifiedFields = [];
  allowedFields.forEach((field) => {
    if (updateData[field] !== undefined) {
      item[field] = updateData[field];
      modifiedFields.push(field);
    }
  });

  await item.save();

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'update',
      entityType: 'inventory_item',
      entityId: item._id,
      metadata: {
        itemCode: item.itemCode,
        modifiedFields
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log inventory item update audit: ${auditErr.message}`);
  }

  return item;
};

const getInventorySummary = async (ngoId) => {
  const objectIdNgo = new mongoose.Types.ObjectId(ngoId);

  const [aggregationResult] = await InventoryItem.aggregate([
    { $match: { ngoId: objectIdNgo, isArchived: false } },
    {
      $facet: {
        totals: [
          {
            $group: {
              _id: null,
              totalItems: { $sum: 1 },
              totalStockUnits: { $sum: '$quantityOnHand' },
              totalValuation: {
                $sum: { $multiply: ['$quantityOnHand', '$unitCost'] }
              }
            }
          }
        ],
        lowStockItems: [
          {
            $match: {
              $expr: { $lte: ['$quantityOnHand', '$minThreshold'] }
            }
          },
          { $count: 'count' }
        ],
        outOfStockItems: [
          {
            $match: { quantityOnHand: { $lte: 0 } }
          },
          { $count: 'count' }
        ],
        categoryBreakdown: [
          {
            $group: {
              _id: '$category',
              itemCount: { $sum: 1 },
              stockSum: { $sum: '$quantityOnHand' },
              valuation: {
                $sum: { $multiply: ['$quantityOnHand', '$unitCost'] }
              }
            }
          }
        ]
      }
    }
  ]);

  const totals = aggregationResult?.totals?.[0] || {
    totalItems: 0,
    totalStockUnits: 0,
    totalValuation: 0
  };

  const lowStockCount = aggregationResult?.lowStockItems?.[0]?.count || 0;
  const outOfStockCount = aggregationResult?.outOfStockItems?.[0]?.count || 0;

  const categoryMap = {};
  (aggregationResult?.categoryBreakdown || []).forEach((c) => {
    categoryMap[c._id] = {
      count: c.itemCount,
      stock: c.stockSum,
      valuation: c.valuation
    };
  });

  return {
    totalItems: totals.totalItems,
    totalStockUnits: totals.totalStockUnits,
    totalValuation: totals.totalValuation,
    lowStockCount,
    outOfStockCount,
    categoryBreakdown: categoryMap
  };
};

const deleteInventoryItem = async (id, ngoId, actorUser) => {
  const item = await InventoryItem.findOne({ _id: id, ngoId });
  if (!item) {
    const err = new Error('Inventory item not found.');
    err.statusCode = 404;
    throw err;
  }

  item.isArchived = true;
  await item.save();

  try {
    await writeAuditLog({
      actor: actorUser,
      ngoId,
      action: 'delete',
      entityType: 'inventory_item',
      entityId: id,
      metadata: {
        itemCode: item.itemCode,
        name: item.name
      }
    });
  } catch (auditErr) {
    logger.warn(`Failed to log inventory item archive audit: ${auditErr.message}`);
  }

  return { message: 'Inventory item archived successfully.' };
};

const exportInventoryCsv = async (query = {}, ngoId) => {
  const result = await getInventoryItems({ ...query, limit: 10000 }, ngoId);
  const items = result.items;

  const headers = [
    'Item Code',
    'Name',
    'Category',
    'Quantity on Hand',
    'Unit of Measure',
    'Min Threshold',
    'Unit Cost (INR)',
    'Total Valuation (INR)',
    'Building',
    'Room',
    'Shelf'
  ];

  const escapeCsv = (val) => {
    if (val === null || val === undefined) return '""';
    let str = String(val).replace(/"/g, '""');
    if (/^[=+@\-\t\r]/.test(str)) {
      str = `'${str}`;
    }
    return `"${str}"`;
  };

  const rows = items.map((item) => {
    const valuation = (item.quantityOnHand || 0) * (item.unitCost || 0);
    return [
      escapeCsv(item.itemCode),
      escapeCsv(item.name),
      escapeCsv(item.category),
      escapeCsv(item.quantityOnHand),
      escapeCsv(item.unitOfMeasure),
      escapeCsv(item.minThreshold),
      escapeCsv(item.unitCost),
      escapeCsv(valuation),
      escapeCsv(item.storageLocation?.building || ''),
      escapeCsv(item.storageLocation?.room || ''),
      escapeCsv(item.storageLocation?.shelf || '')
    ];
  });

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
};

module.exports = {
  createInventoryItem,
  recordStockTransaction,
  getInventoryItems,
  getInventoryItemById,
  updateInventoryItem,
  getInventorySummary,
  deleteInventoryItem,
  exportInventoryCsv
};
